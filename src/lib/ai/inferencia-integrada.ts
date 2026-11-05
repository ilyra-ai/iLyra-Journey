/**
 * Inferência nativa da Lyra. O llama-server é executado pela própria aplicação
 * e escuta exclusivamente um socket Unix privado; nunca abre uma porta TCP.
 * A API de provedores existente continua a funcionar sem alterações de contrato.
 */
import { createHash, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { request } from 'node:http';
import { Readable } from 'node:stream';

const PASTA_PRIVADA = path.resolve(
  process.cwd(),
  '.lyra-run',
  'inferencia-local'
);
const REGISTRO = path.join(PASTA_PRIVADA, 'registro.json');
const SOCKET = path.join(PASTA_PRIVADA, 'motor-' + process.pid + '.sock');
const MAX_ENTRADAS = 4000;
const LIMITE_MODELOS = 200;
const EXTENSAO = '.gguf';

export interface AjustesDaInferencia {
  contexto: number;
  camadasGpu: number;
  threads: number;
}
interface Registro {
  pastas: string[];
  modelos: Record<string, string>;
  ajustes?: AjustesDaInferencia;
}

export interface ArquivoModeloLocal {
  id: string;
  nome: string;
  caminho: string;
  tamanhoBytes: number;
}

export interface PastaNavegavel {
  nome: string;
  caminho: string;
}

interface EstadoMotor {
  filho: ChildProcess | null;
  modelo: string | null;
  carga: Promise<void> | null;
  log: string;
}

const estado: EstadoMotor = { filho: null, modelo: null, carga: null, log: '' };

export function idDeModelo(caminhoReal: string): string {
  return (
    'lyra-gguf-' +
    createHash('sha256').update(caminhoReal).digest('hex').slice(0, 32)
  );
}

async function prepararPasta(): Promise<void> {
  await fs.mkdir(PASTA_PRIVADA, { recursive: true, mode: 0o700 });
  await fs.chmod(PASTA_PRIVADA, 0o700);
}

async function lerRegistro(): Promise<Registro> {
  try {
    const registro = JSON.parse(
      await fs.readFile(REGISTRO, 'utf8')
    ) as Registro;
    if (
      !Array.isArray(registro.pastas) ||
      !registro.modelos ||
      typeof registro.modelos !== 'object'
    )
      throw new Error('Registro inválido');
    return registro;
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
      return { pastas: [], modelos: {} };
    }
    throw erro;
  }
}

async function gravarRegistro(registro: Registro): Promise<void> {
  await prepararPasta();
  const temporario = REGISTRO + '-' + randomUUID() + '.tmp';
  await fs.writeFile(temporario, JSON.stringify(registro, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  });
  await fs.rename(temporario, REGISTRO);
}

async function pastaReal(caminho: string): Promise<string> {
  if (!path.isAbsolute(caminho) || caminho.includes('\0')) {
    throw new Error('Informe o caminho absoluto da pasta no Linux/WSL2.');
  }
  const real = await fs.realpath(caminho);
  const dados = await fs.stat(real);
  if (!dados.isDirectory()) throw new Error('O caminho não é uma pasta.');
  return real;
}

function dentro(caminho: string, raiz: string): boolean {
  const rel = path.relative(raiz, caminho);
  return (
    !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)
  );
}

function autorizadaParaCadastro(caminho: string): boolean {
  const home = path.resolve(homedir());
  const mounts = path.resolve('/mnt');
  const adicionais = (process.env.LYRA_IA_RAIZES ?? '')
    .split(path.delimiter)
    .filter(Boolean)
    .map((p) => path.resolve(p));
  return (
    dentro(caminho, home) ||
    dentro(caminho, mounts) ||
    adicionais.some((raiz) => dentro(caminho, raiz))
  );
}

async function raizes(): Promise<string[]> {
  const registro = await lerRegistro();
  const candidatos = [
    homedir(),
    ...registro.pastas,
    ...(process.env.LYRA_IA_RAIZES ?? '').split(path.delimiter).filter(Boolean),
  ];
  const existentes: string[] = [];
  for (const candidato of candidatos) {
    try {
      const real = await pastaReal(candidato);
      if (!existentes.includes(real) && autorizadaParaCadastro(real))
        existentes.push(real);
    } catch {
      /* Pastas que não existem não são oferecidas. */
    }
  }
  return existentes;
}

/** O administrador escolhe uma pasta REAL do host WSL; não há acesso ao PC via navegador remoto. */
export async function adicionarPasta(caminho: string): Promise<PastaNavegavel> {
  if (process.platform !== 'linux') {
    throw new Error(
      'A inferência integrada exige que a Lyra execute no Linux/WSL2.'
    );
  }
  const real = await pastaReal(caminho);
  if (!autorizadaParaCadastro(real)) {
    throw new Error(
      'Pasta fora das áreas permitidas. Use sua pasta pessoal, /mnt ou LYRA_IA_RAIZES.'
    );
  }
  const registro = await lerRegistro();
  if (!registro.pastas.includes(real)) {
    registro.pastas.push(real);
    await gravarRegistro(registro);
  }
  return { nome: path.basename(real), caminho: real };
}

async function modeloDoArquivo(
  caminho: string,
  diretoriosPermitidos: string[]
): Promise<ArquivoModeloLocal | null> {
  if (!caminho.toLowerCase().endsWith(EXTENSAO)) return null;
  const real = await fs.realpath(caminho);
  if (!diretoriosPermitidos.some((raiz) => dentro(real, raiz))) return null;
  const dados = await fs.stat(real);
  if (!dados.isFile()) return null;
  const arquivo = await fs.open(real, 'r');
  try {
    const magic = Buffer.alloc(4);
    const { bytesRead } = await arquivo.read(magic, 0, 4, 0);
    if (bytesRead !== 4 || magic.toString('ascii') !== 'GGUF') return null;
  } finally {
    await arquivo.close();
  }
  return {
    id: idDeModelo(real),
    nome: path.basename(caminho),
    caminho: real,
    tamanhoBytes: dados.size,
  };
}

async function registrarModelos(modelos: ArquivoModeloLocal[]): Promise<void> {
  if (modelos.length === 0) return;
  const registro = await lerRegistro();
  let alterado = false;
  for (const modelo of modelos) {
    if (registro.modelos[modelo.id] !== modelo.caminho) {
      registro.modelos[modelo.id] = modelo.caminho;
      alterado = true;
    }
  }
  if (alterado) await gravarRegistro(registro);
}

/** Diretório atual e entradas reais, com checagem de realpath em cada navegação. */
export async function navegarPasta(diretorio?: string): Promise<{
  atual: string | null;
  raizes: PastaNavegavel[];
  pastas: PastaNavegavel[];
  modelos: ArquivoModeloLocal[];
}> {
  const permitidas = await raizes();
  const listaRaizes = permitidas.map((caminho) => ({ nome: caminho, caminho }));
  if (!diretorio)
    return { atual: null, raizes: listaRaizes, pastas: [], modelos: [] };
  const real = await pastaReal(diretorio);
  if (!permitidas.some((raiz) => dentro(real, raiz))) {
    throw new Error('Pasta não autorizada para navegação.');
  }
  const entradas = await fs.readdir(real, { withFileTypes: true });
  if (entradas.length > MAX_ENTRADAS) {
    throw new Error(
      'Pasta com entradas demais: selecione uma subpasta mais específica.'
    );
  }
  const pastas: PastaNavegavel[] = [];
  const modelos: ArquivoModeloLocal[] = [];
  for (const item of entradas) {
    if (item.name === '.' || item.name === '..') continue;
    const arquivo = path.join(real, item.name);
    try {
      const realDoItem = await fs.realpath(arquivo);
      if (!permitidas.some((raiz) => dentro(realDoItem, raiz))) continue;
      const dados = await fs.stat(realDoItem);
      if (dados.isDirectory()) {
        pastas.push({ nome: item.name, caminho: realDoItem });
      } else if (modelos.length < LIMITE_MODELOS && dados.isFile()) {
        const encontrado = await modeloDoArquivo(arquivo, permitidas);
        if (encontrado) modelos.push(encontrado);
      }
    } catch {
      /* Arquivos inacessíveis e links externos não são anunciados. */
    }
  }
  pastas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  modelos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  await registrarModelos(modelos);
  return { atual: real, raizes: listaRaizes, pastas, modelos };
}

/** Inventário limitado de modelos realmente existentes, sem ler pesos inteiros. */
export async function descobrirModelosLocais(): Promise<ArquivoModeloLocal[]> {
  const permitidas = await raizes();
  const encontrados = new Map<string, ArquivoModeloLocal>();
  const visitadas = new Set<string>();
  let entradasLidas = 0;
  const explorar = async (
    diretorio: string,
    profundidade: number
  ): Promise<void> => {
    if (
      profundidade > 7 ||
      encontrados.size >= LIMITE_MODELOS ||
      entradasLidas >= MAX_ENTRADAS ||
      visitadas.has(diretorio)
    )
      return;
    visitadas.add(diretorio);
    let entradas;
    try {
      entradas = await fs.readdir(diretorio, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of entradas) {
      if (encontrados.size >= LIMITE_MODELOS || entradasLidas++ >= MAX_ENTRADAS)
        break;
      if (
        [
          'node_modules',
          '.git',
          '.next',
          'venv',
          '.venv',
          'AppData',
          'Windows',
          'Program Files',
          'Program Files (x86)',
        ].includes(item.name)
      )
        continue;
      const caminho = path.join(diretorio, item.name);
      try {
        const real = await fs.realpath(caminho);
        if (!permitidas.some((raiz) => dentro(real, raiz))) continue;
        const info = await fs.stat(real);
        if (info.isDirectory()) await explorar(real, profundidade + 1);
        else if (info.isFile() && caminho.toLowerCase().endsWith(EXTENSAO)) {
          const modelo = await modeloDoArquivo(caminho, permitidas);
          if (modelo) encontrados.set(modelo.id, modelo);
        }
      } catch {
        /* Modelos inválidos ou locais sem permissão são ignorados. */
      }
    }
  };
  for (const raiz of permitidas) await explorar(raiz, 0);
  const lista = [...encontrados.values()];
  await registrarModelos(lista);
  return lista;
}

async function arquivoDoModelo(id: string): Promise<string> {
  if (!/^lyra-gguf-[a-f0-9]{32}$/.test(id))
    throw new Error('Identificador de modelo local inválido.');
  const registro = await lerRegistro();
  const candidato = registro.modelos[id];
  if (!candidato)
    throw new Error(
      'Modelo não encontrado no inventário local. Escolha novamente a pasta.'
    );
  const real = await fs.realpath(candidato);
  if (
    idDeModelo(real) !== id ||
    !(await raizes()).some((raiz) => dentro(real, raiz))
  ) {
    throw new Error(
      'O arquivo do modelo foi movido ou deixou de estar autorizado.'
    );
  }
  const validado = await modeloDoArquivo(real, await raizes());
  if (!validado)
    throw new Error('O arquivo não é um GGUF íntegro e acessível.');
  return real;
}

export function caminhoDoRuntime(): string {
  return (
    process.env.LYRA_LLAMA_SERVER?.trim() ||
    path.resolve(
      process.cwd(),
      '.lyra-run',
      'llama.cpp',
      'build',
      'bin',
      'llama-server'
    )
  );
}

export async function lerAjustesDaInferencia(): Promise<AjustesDaInferencia> {
  const registro = await lerRegistro();
  return (
    registro.ajustes ?? {
      contexto: Math.max(
        1024,
        Math.min(32768, Number(process.env.LYRA_IA_CONTEXTO) || 8192)
      ),
      camadasGpu: Math.max(
        0,
        Math.min(999, Number(process.env.LYRA_IA_GPU_CAMADAS ?? 99))
      ),
      threads: Math.max(
        1,
        Math.min(32, Number(process.env.LYRA_IA_THREADS) || 8)
      ),
    }
  );
}

export async function salvarAjustesDaInferencia(
  ajustes: AjustesDaInferencia
): Promise<AjustesDaInferencia> {
  const valores = [ajustes.contexto, ajustes.camadasGpu, ajustes.threads];
  if (
    valores.some((valor) => !Number.isInteger(valor)) ||
    ajustes.contexto < 1024 ||
    ajustes.contexto > 32768 ||
    ajustes.camadasGpu < 0 ||
    ajustes.camadasGpu > 999 ||
    ajustes.threads < 1 ||
    ajustes.threads > 32
  ) {
    throw new Error('Parâmetros de inferência fora dos limites permitidos.');
  }
  const registro = await lerRegistro();
  registro.ajustes = ajustes;
  await gravarRegistro(registro);
  await encerrarMotor();
  return ajustes;
}

export async function estadoDaInferencia(): Promise<{
  ajustes: AjustesDaInferencia;
  instalado: boolean;
  executando: boolean;
  modelo: string | null;
  caminhoRuntime: string;
  plataforma: string;
}> {
  const binario = caminhoDoRuntime();
  let instalado = false;
  try {
    // O runtime é instalado no host, fora dos arquivos distribuídos pelo Next.
    instalado = (await fs.stat(/* turbopackIgnore: true */ binario)).isFile();
  } catch {}
  return {
    ajustes: await lerAjustesDaInferencia(),
    instalado,
    executando: Boolean(
      estado.filho &&
      estado.filho.exitCode === null &&
      estado.filho.signalCode === null
    ),
    modelo: estado.modelo,
    caminhoRuntime: binario,
    plataforma: process.platform,
  };
}

function httpNoSocket(
  metodo: 'GET' | 'POST',
  endpoint: string,
  corpo: string | null,
  sinal?: AbortSignal
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath: SOCKET,
        method: metodo,
        path: endpoint,
        headers:
          corpo === null
            ? {}
            : {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(corpo),
              },
        signal: sinal,
      },
      (res) => {
        const headers = new Headers();
        for (const [nome, valor] of Object.entries(res.headers)) {
          if (typeof valor === 'string') headers.set(nome, valor);
        }
        resolve(
          new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, {
            status: res.statusCode ?? 502,
            headers,
          })
        );
      }
    );
    req.once('error', reject);
    req.end(corpo ?? undefined);
  });
}

async function encerrarMotor(): Promise<void> {
  if (!estado.filho) return;
  const anterior = estado.filho;
  estado.filho = null;
  estado.modelo = null;
  anterior.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolve) => anterior.once('exit', () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (anterior.exitCode === null && anterior.signalCode === null)
    anterior.kill('SIGKILL');
}

/** Não altera o sistema, nem executa comandos provenientes do prompt/modelo. */
async function iniciarMotor(id: string): Promise<void> {
  if (process.platform !== 'linux') {
    throw new Error(
      'Runtime nativo disponível somente quando o servidor Lyra roda no Linux/WSL2.'
    );
  }
  const arquivo = await arquivoDoModelo(id);
  const binario = caminhoDoRuntime();
  await fs.access(binario, fs.constants.X_OK);
  await prepararPasta();
  await encerrarMotor();
  await fs.rm(SOCKET, { force: true });
  estado.log = '';
  const { contexto, camadasGpu: gpu, threads } = await lerAjustesDaInferencia();
  const args = [
    '--model',
    arquivo,
    '--alias',
    id,
    '--host',
    SOCKET,
    '--no-webui',
    '--ctx-size',
    String(contexto),
    '--n-gpu-layers',
    String(gpu),
    '--threads',
    String(threads),
    '--parallel',
    '1',
    '--cache-prompt',
  ];
  // O executável e os pesos pertencem ao host; não são assets do bundle.
  const filho = spawn(/* turbopackIgnore: true */ binario, args, {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
    cwd: PASTA_PRIVADA,
    env: process.env,
  });
  estado.filho = filho;
  estado.modelo = id;
  filho.stderr?.on('data', (d: Buffer) => {
    estado.log = (estado.log + d.toString('utf8')).slice(-2500);
  });
  filho.on('error', (erro) => {
    estado.log = (estado.log + '\n' + erro.message).slice(-2500);
  });
  const inicio = Date.now();
  while (Date.now() - inicio < 120000) {
    if (filho.exitCode !== null || filho.signalCode !== null) {
      throw new Error(
        'O motor local encerrou durante a inicialização: ' +
          estado.log.slice(-600)
      );
    }
    try {
      const resposta = await httpNoSocket('GET', '/health', null);
      if (resposta.status === 200) {
        await fs.chmod(SOCKET, 0o600);
        await resposta.body?.cancel();
        return;
      }
      await resposta.body?.cancel();
    } catch {
      /* Socket ainda não está pronto. */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  await encerrarMotor();
  throw new Error(
    'Tempo esgotado ao iniciar o runtime GGUF. ' + estado.log.slice(-600)
  );
}

async function garantirMotor(id: string): Promise<void> {
  if (estado.carga) await estado.carga;
  if (
    estado.modelo === id &&
    estado.filho &&
    estado.filho.exitCode === null &&
    estado.filho.signalCode === null
  )
    return;
  const carga = iniciarMotor(id);
  estado.carga = carga;
  try {
    await carga;
  } finally {
    if (estado.carga === carga) estado.carga = null;
  }
}

/** Encaminha HTTP somente pelo socket privado. Nenhuma API/porta de rede é criada. */
export async function solicitarInferenciaIntegrada(
  id: string,
  corpo: string,
  sinal?: AbortSignal
): Promise<Response> {
  await garantirMotor(id);
  return httpNoSocket('POST', '/v1/chat/completions', corpo, sinal);
}

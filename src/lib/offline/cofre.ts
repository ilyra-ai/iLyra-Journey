import type {
  BaseOffline,
  ContextoOffline,
  OperacaoOffline,
  ReciboOffline,
} from './esquema';
import { operacaoSchema } from './esquema';
export const NOME_DO_BANCO_OFFLINE = 'lyra-registros-protegidos-v1';
export const EVENTO_COFRE = 'lyra:cofre-bloqueado';
const LOJA = 'cofre';
const ID_DA_ABA = crypto.randomUUID();
const ITERACOES = 600000;
const LIMITE_BYTES = 512000;
interface Envelope {
  id: 'principal';
  versao: number;
  titularTag: string;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  cifra: ArrayBuffer;
}
export type EstadoLocal =
  'pendente' | 'enviando' | 'conflito' | 'erro' | 'sincronizado';
export interface ItemLocal {
  operacao: OperacaoOffline;
  estado: EstadoLocal;
  tentada: boolean;
  erro: string | null;
  atual: BaseOffline | null;
  recibo: ReciboOffline | null;
}
export interface ConteudoDoCofre {
  formato: 1;
  contexto: ContextoOffline;
  itens: ItemLocal[];
}
export interface CofreAberto {
  chave: CryptoKey;
  salt: Uint8Array<ArrayBuffer>;
  versao: number;
  conteudo: ConteudoDoCofre;
}
function banco(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined' || !globalThis.crypto?.subtle)
    throw new Error(
      'Este navegador não oferece o armazenamento e a criptografia necessários. Use um navegador atualizado em HTTPS ou localhost.'
    );
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOME_DO_BANCO_OFFLINE, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(LOJA, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error('Não foi possível abrir o armazenamento deste dispositivo.')
      );
    req.onblocked = () =>
      reject(
        new Error('Feche outras abas para atualizar o armazenamento offline.')
      );
  });
}
async function lerEnvelope(): Promise<Envelope | null> {
  const db = await banco();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(LOJA, 'readonly'),
        r = t.objectStore(LOJA).get('principal');
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function existeCofre() {
  return Boolean(await lerEnvelope());
}
async function derivar(frase: string, salt: Uint8Array<ArrayBuffer>) {
  if (frase.normalize('NFC').length < 12)
    throw new Error('Use uma frase local com pelo menos 12 caracteres.');
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(frase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERACOES, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
async function etiquetaDoTitular(
  userId: string,
  salt: Uint8Array<ArrayBuffer>
) {
  const bytes = new Uint8Array([...salt, ...new TextEncoder().encode(userId)]);
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
}
function conferirConteudo(v: unknown): ConteudoDoCofre {
  if (!v || typeof v !== 'object')
    throw new Error('O cofre não contém um documento reconhecido.');
  const p = v as ConteudoDoCofre;
  if (
    p.formato !== 1 ||
    !p.contexto?.titular ||
    !p.contexto.selecao ||
    !Array.isArray(p.contexto.bases) ||
    !Array.isArray(p.itens) ||
    p.itens.length > 32
  )
    throw new Error(
      'O formato do cofre não é compatível. Preserve sua cópia criptografada antes de atualizar.'
    );
  for (const i of p.itens)
    if (
      !operacaoSchema.safeParse(i.operacao).success ||
      !['pendente', 'enviando', 'conflito', 'erro', 'sincronizado'].includes(
        i.estado
      )
    )
      throw new Error(
        'O cofre contém uma operação incompatível. Nenhum dado foi enviado.'
      );
  return p;
}
export async function desbloquearCofre(frase: string): Promise<CofreAberto> {
  const e = await lerEnvelope();
  if (!e) throw new Error('Não há cofre preparado neste navegador.');
  let chave: CryptoKey, conteudo: ConteudoDoCofre;
  try {
    chave = await derivar(frase, e.salt);
    const bytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: e.iv,
        additionalData: new TextEncoder().encode('lyra:cofre:v1'),
      },
      chave,
      e.cifra
    );
    if (bytes.byteLength > LIMITE_BYTES) throw new Error();
    conteudo = conferirConteudo(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new Error(
      'Não foi possível abrir o cofre. Confira a frase local; conteúdo corrompido não pode ser recuperado pela Lyra.'
    );
  }
  return { chave, salt: e.salt, versao: e.versao, conteudo };
}
/** A cifra é preparada antes da transação; a comparação de versão e a gravação são atômicas. */
export async function salvarCofre(
  cofre: CofreAberto,
  conteudo: ConteudoDoCofre
): Promise<CofreAberto> {
  conferirConteudo(conteudo);
  const bytes = new TextEncoder().encode(JSON.stringify(conteudo));
  if (bytes.byteLength > LIMITE_BYTES)
    throw new Error(
      'O limite local foi atingido. Confirme os envios ou remova rascunhos por sua escolha antes de salvar mais.'
    );
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    cifra = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: new TextEncoder().encode('lyra:cofre:v1'),
      },
      cofre.chave,
      bytes
    ),
    db = await banco(),
    titularTag = await etiquetaDoTitular(conteudo.contexto.titular, cofre.salt);
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(LOJA, 'readwrite'),
        loja = t.objectStore(LOJA),
        r = loja.get('principal');
      let motivo =
        'Não foi possível salvar neste dispositivo. Mantenha os campos abertos e tente novamente.';
      r.onsuccess = () => {
        const atual = r.result as Envelope | undefined;
        if ((atual?.versao ?? 0) !== cofre.versao) {
          motivo =
            'O cofre mudou em outra aba. Bloqueie e abra novamente antes de salvar.';
          t.abort();
          return;
        }
        loja.put({
          id: 'principal',
          titularTag,
          versao: cofre.versao + 1,
          salt: cofre.salt,
          iv,
          cifra,
        } satisfies Envelope);
      };
      t.oncomplete = () => resolve();
      t.onerror = () => reject(new Error(motivo));
      t.onabort = () => reject(new Error(motivo));
    });
  } finally {
    db.close();
  }
  avisarOutrasAbas('alterado');
  return { ...cofre, versao: cofre.versao + 1, conteudo };
}
export async function criarCofre(frase: string, contexto: ContextoOffline) {
  if (await existeCofre())
    throw new Error(
      'Já existe um cofre neste navegador. Abra-o ou remova-o explicitamente antes de preparar outro.'
    );
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    chave = await derivar(frase, salt);
  return salvarCofre(
    { chave, salt, versao: 0, conteudo: { formato: 1, contexto, itens: [] } },
    { formato: 1, contexto, itens: [] }
  );
}
function avisarOutrasAbas(tipo: string) {
  if (typeof BroadcastChannel === 'undefined') return;
  const c = new BroadcastChannel('lyra-cofre-local');
  c.postMessage({ tipo, aba: ID_DA_ABA });
  c.close();
}
export function bloquearCofresAbertos() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENTO_COFRE));
  avisarOutrasAbas('bloquear');
}
export function ouvirBloqueio(callback: () => void) {
  const evento = () => callback();
  window.addEventListener(EVENTO_COFRE, evento);
  const c =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('lyra-cofre-local');
  if (c)
    c.onmessage = (evento: MessageEvent<{ aba?: string }>) => {
      if (evento.data?.aba !== ID_DA_ABA) callback();
    };
  return () => {
    window.removeEventListener(EVENTO_COFRE, evento);
    c?.close();
  };
}
export async function removerCofre() {
  bloquearCofresAbertos();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(NOME_DO_BANCO_OFFLINE);
    r.onsuccess = () => resolve();
    r.onerror = () =>
      reject(new Error('Não foi possível remover os dados locais.'));
    r.onblocked = () =>
      reject(new Error('Feche outras abas antes de remover o cofre.'));
  });
}
export function contaPendencias(p: ConteudoDoCofre) {
  return p.itens.filter((i) => i.estado !== 'sincronizado').length;
}

/** Não remove um cofre de outra conta quando a conta conectada é excluída. */
export async function removerCofreDoTitular(userId: string) {
  bloquearCofresAbertos();
  const e = await lerEnvelope();
  if (!e) return;
  if (e.titularTag === (await etiquetaDoTitular(userId, e.salt)))
    await removerCofre();
}

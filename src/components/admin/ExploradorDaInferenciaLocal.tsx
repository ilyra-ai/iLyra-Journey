'use client';

import * as React from 'react';
import {
  Cpu,
  FolderOpen,
  FolderPlus,
  HardDriveDownload,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Modelo = {
  id: string;
  nome: string;
  caminho: string;
  tamanhoBytes: number;
};
type Pasta = { nome: string; caminho: string };
type Navegacao = {
  atual: string | null;
  raizes: Pasta[];
  pastas: Pasta[];
  modelos: Modelo[];
};
type Runtime = {
  instalado: boolean;
  ajustes: { contexto: number; camadasGpu: number; threads: number };
  executando: boolean;
  modelo: string | null;
  caminhoRuntime: string;
  plataforma: string;
  instalacao: {
    estado: 'inativa' | 'executando' | 'concluida' | 'erro';
    mensagem: string;
  };
};

async function buscarJson<T>(url: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
    ...opcoes,
  });
  const corpo = (await resposta.json()) as T & { error?: string };
  if (!resposta.ok) throw new Error(corpo.error || 'Falha na operação local.');
  return corpo;
}

function tamanho(bytes: number): string {
  return (
    (bytes / 1024 ** 3).toLocaleString('pt-BR', {
      maximumFractionDigits: 2,
    }) + ' GiB'
  );
}

interface Propriedades {
  escolhidos: readonly string[];
  desabilitado: boolean;
  selecionar: (id: string) => void;
}

/** Seletor de pastas do filesystem DO SERVIDOR WSL2, autenticado como administrador. */
export function ExploradorDaInferenciaLocal({
  escolhidos,
  desabilitado,
  selecionar,
}: Propriedades) {
  const [dados, setDados] = React.useState<Navegacao | null>(null);
  const [runtime, setRuntime] = React.useState<Runtime | null>(null);
  const [informada, setInformada] = React.useState('');
  const [ajustes, setAjustes] = React.useState({
    contexto: 8192,
    camadasGpu: 99,
    threads: 8,
  });
  const ajustesCarregados = React.useRef(false);
  const [busca, setBusca] = React.useState<Modelo[]>([]);
  const [carregando, setCarregando] = React.useState<string | null>('pasta');
  const [erro, setErro] = React.useState<string | null>(null);

  const atualizarStatus = React.useCallback(async () => {
    try {
      const atual = await buscarJson<Runtime>(
        '/api/admin/ia/local?acao=status'
      );
      setRuntime(atual);
      if (!ajustesCarregados.current) {
        setAjustes(atual.ajustes);
        ajustesCarregados.current = true;
      }
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : 'Falha ao consultar o motor.'
      );
    }
  }, []);

  const abrir = React.useCallback(async (pasta?: string) => {
    setCarregando('pasta');
    setErro(null);
    try {
      const consulta = pasta
        ? '?acao=pastas&diretorio=' + encodeURIComponent(pasta)
        : '?acao=pastas';
      setDados(await buscarJson<Navegacao>('/api/admin/ia/local' + consulta));
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : 'Falha ao abrir a pasta.'
      );
    } finally {
      setCarregando(null);
    }
  }, []);

  React.useEffect(() => {
    let ativo = true;
    void Promise.allSettled([
      buscarJson<Navegacao>('/api/admin/ia/local?acao=pastas'),
      buscarJson<Runtime>('/api/admin/ia/local?acao=status'),
    ]).then(([pastas, motor]) => {
      if (!ativo) return;
      const falhas: string[] = [];
      if (pastas.status === 'fulfilled') setDados(pastas.value);
      else
        falhas.push(
          pastas.reason instanceof Error
            ? pastas.reason.message
            : 'Falha ao abrir a pasta.'
        );
      if (motor.status === 'fulfilled') {
        setRuntime(motor.value);
        setAjustes(motor.value.ajustes);
        ajustesCarregados.current = true;
      } else
        falhas.push(
          motor.reason instanceof Error
            ? motor.reason.message
            : 'Falha ao consultar o motor.'
        );
      setErro(falhas.length ? falhas.join(' ') : null);
      setCarregando(null);
    });
    return () => {
      ativo = false;
    };
  }, []);

  React.useEffect(() => {
    if (runtime?.instalacao.estado !== 'executando') return;
    const controle = window.setInterval(() => {
      void atualizarStatus();
    }, 2000);
    return () => window.clearInterval(controle);
  }, [runtime?.instalacao.estado, atualizarStatus]);

  const configurar = async () => {
    setCarregando('configurar');
    setErro(null);
    try {
      await buscarJson('/api/admin/ia/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'configurar', ...ajustes }),
      });
      await atualizarStatus();
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : 'Falha ao salvar recursos.'
      );
    } finally {
      setCarregando(null);
    }
  };

  const adicionar = async () => {
    setCarregando('adicionar');
    setErro(null);
    try {
      const resposta = await buscarJson<{ pasta: Pasta }>(
        '/api/admin/ia/local',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'pasta', caminho: informada.trim() }),
        }
      );
      await abrir(resposta.pasta.caminho);
      setInformada('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Pasta não encontrada.');
    } finally {
      setCarregando(null);
    }
  };

  const instalar = async () => {
    setCarregando('instalar');
    setErro(null);
    try {
      await buscarJson('/api/admin/ia/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'instalar' }),
      });
      await atualizarStatus();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : 'Falha ao iniciar a instalação.'
      );
    } finally {
      setCarregando(null);
    }
  };

  const procurar = async () => {
    setCarregando('buscar');
    setErro(null);
    try {
      const resposta = await buscarJson<{ modelos: Modelo[] }>(
        '/api/admin/ia/local?acao=modelos'
      );
      setBusca(resposta.modelos);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha na descoberta.');
    } finally {
      setCarregando(null);
    }
  };

  const voltar = () => {
    if (!dados?.atual) return;
    if (dados.raizes.some((raiz) => raiz.caminho === dados.atual)) {
      void abrir();
      return;
    }
    const ultimo = dados.atual.lastIndexOf('/');
    if (ultimo > 0) void abrir(dados.atual.slice(0, ultimo));
    else void abrir();
  };

  const trabalhando = desabilitado || carregando !== null;
  const modelos = new Map<string, Modelo>();
  for (const modelo of [...busca, ...(dados?.modelos ?? [])])
    modelos.set(modelo.id, modelo);
  return (
    <div
      className="grid gap-4 rounded-xl border border-border bg-card p-4"
      aria-label="Inferência integrada à Lyra"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Cpu className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <strong className="text-sm">
            Motor direto da Lyra · sem porta de rede
          </strong>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void atualizarStatus()}
        >
          <RefreshCw aria-hidden="true" /> Verificar
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        A Lyra inicia seu próprio runtime e usa um socket Unix privado. É
        necessário executar a aplicação no mesmo Ubuntu/WSL2 que contém os
        modelos; um app na nuvem não consegue acessar automaticamente os
        arquivos do notebook.
      </p>
      {runtime ? (
        <div className="rounded-lg bg-muted/50 p-3 text-xs" role="status">
          <p>
            <strong>Runtime:</strong>{' '}
            {runtime.instalado ? 'instalado' : 'não instalado'} ·{' '}
            {runtime.executando ? 'em execução' : 'desligado'}
          </p>
          <p className="mt-1 break-all">{runtime.caminhoRuntime}</p>
          <p className="mt-1">Instalação: {runtime.instalacao.estado}</p>
        </div>
      ) : null}
      <fieldset className="grid gap-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold">
          Recursos de inferência
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                chave: 'contexto',
                rotulo: 'Contexto (tokens)',
                min: 1024,
                max: 32768,
              },
              {
                chave: 'camadasGpu',
                rotulo: 'Camadas na GPU',
                min: 0,
                max: 999,
              },
              { chave: 'threads', rotulo: 'Threads da CPU', min: 1, max: 32 },
            ] as const
          ).map((campo) => (
            <div className="grid gap-1" key={campo.chave}>
              <Label htmlFor={'lyra-recurso-' + campo.chave}>
                {campo.rotulo}
              </Label>
              <Input
                id={'lyra-recurso-' + campo.chave}
                type="number"
                min={campo.min}
                max={campo.max}
                step="1"
                value={ajustes[campo.chave]}
                disabled={trabalhando}
                onChange={(e) =>
                  setAjustes((valor) => ({
                    ...valor,
                    [campo.chave]: Number(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          className="w-fit"
          variant="outline"
          disabled={trabalhando}
          onClick={() => void configurar()}
        >
          Salvar recursos
        </Button>
        <p className="text-xs text-muted-foreground">
          Reduzir camadas GPU transfere trabalho para CPU/RAM. Salvar recursos
          reinicia o motor na próxima resposta.
        </p>
      </fieldset>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => void instalar()}
        disabled={
          trabalhando ||
          runtime?.instalacao.estado === 'executando' ||
          runtime?.instalado
        }
      >
        {carregando === 'instalar' ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <HardDriveDownload aria-hidden="true" />
        )}
        Instalar runtime CUDA no WSL2
      </Button>
      {runtime?.instalacao.mensagem ? (
        <pre
          className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs"
          role="status"
        >
          {runtime.instalacao.mensagem}
        </pre>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="lyra-pasta-gguf">
          Escolher pasta de modelos no WSL2
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="lyra-pasta-gguf"
            value={informada}
            autoComplete="off"
            placeholder="Caminho absoluto da pasta no WSL2"
            onChange={(e) => setInformada(e.target.value)}
            disabled={trabalhando}
            aria-describedby="lyra-pasta-ajuda"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void adicionar()}
            disabled={trabalhando || !informada.trim()}
          >
            <FolderPlus aria-hidden="true" /> Abrir pasta
          </Button>
        </div>
        <p id="lyra-pasta-ajuda" className="text-xs text-muted-foreground">
          Aceita pastas sob sua home Linux, /mnt e raízes autorizadas em
          LYRA_IA_RAIZES. Não lê o conteúdo dos modelos nem arquivos de outros
          formatos.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="min-w-0 break-all text-xs">
          {dados?.atual ?? 'Pastas disponíveis neste ambiente'}
        </strong>
        <div className="flex flex-wrap gap-2">
          {dados?.atual ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={voltar}
              disabled={trabalhando}
            >
              Voltar
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void procurar()}
            disabled={trabalhando}
          >
            <RefreshCw aria-hidden="true" /> Localizar GGUF
          </Button>
        </div>
      </div>
      <div className="max-h-64 overflow-auto rounded-lg border border-border">
        <ul
          className="divide-y divide-border"
          aria-label="Pastas e modelos no servidor"
        >
          {(dados?.atual ? dados.pastas : (dados?.raizes ?? [])).map(
            (pasta) => (
              <li key={pasta.caminho}>
                <button
                  type="button"
                  disabled={trabalhando}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => void abrir(pasta.caminho)}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="break-all">{pasta.nome}</span>
                </button>
              </li>
            )
          )}
          {[...modelos.values()].map((modelo) => (
            <li key={modelo.id}>
              <button
                type="button"
                disabled={trabalhando}
                aria-pressed={escolhidos.includes(modelo.id)}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => selecionar(modelo.id)}
              >
                <span className="min-w-0 break-all">
                  {modelo.nome}
                  <span className="block text-muted-foreground">
                    {modelo.caminho}
                  </span>
                </span>
                <span className="shrink-0 font-medium">
                  {escolhidos.includes(modelo.id)
                    ? 'Selecionado'
                    : tamanho(modelo.tamanhoBytes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {erro ? (
        <p className="text-sm text-destructive" role="alert">
          {erro}
        </p>
      ) : null}
      {carregando ? (
        <p className="text-xs text-muted-foreground" role="status">
          Consultando arquivos reais do WSL2.
        </p>
      ) : null}
    </div>
  );
}

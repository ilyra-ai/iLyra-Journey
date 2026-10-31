'use client';
import { useCallback, useEffect, useId, useState } from 'react';
import {
  GraduationCap,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { requisitar } from '@/components/experiencias/transporte';
import type { Avaliacao, EstadoDoTreinamento } from '@/lib/treinamento/esquema';

const quando = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(iso))
    : '';

/**
 * Estado do Treinamento do chat (tarefa 90), só para administradores. As
 * avaliações são gravadas no servidor a cada clique: recarregar ou cair a
 * conexão não perde nada.
 */
export function useTreinamentoDoChat(administrador: boolean) {
  const [estado, setEstado] = useState<EstadoDoTreinamento | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = useCallback(async () => {
    try {
      const novo = await requisitar<EstadoDoTreinamento>(
        '/api/admin/treinamento'
      );
      // Estado e avaliações entram juntos: sem isso, as respostas apareciam
      // por um instante como não avaliadas depois de recarregar.
      const lista =
        novo.sessao?.estado === 'ativa'
          ? (
              await requisitar<{ avaliacoes: Avaliacao[] }>(
                '/api/admin/treinamento/avaliacoes'
              )
            ).avaliacoes
          : [];
      setAvaliacoes(lista);
      setEstado(novo);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Treinamento indisponível.');
    }
  }, []);

  useEffect(() => {
    if (!administrador) return;
    let vivo = true;
    const carregar = () => {
      if (vivo) void atualizar();
    };
    carregar();
    // Enquanto o treino roda, o estado é conferido a cada 10 s.
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, 10_000);
    return () => {
      vivo = false;
      window.clearInterval(intervalo);
    };
  }, [administrador, atualizar]);

  const ativo = estado?.sessao?.estado === 'ativa';
  const porTurno = new Map(avaliacoes.map((a) => [a.turnoId, a]));
  return {
    estado,
    erro,
    ativo,
    avaliacoes,
    porTurno,
    atualizar,
    setEstado,
    setAvaliacoes,
  };
}
export type Treinamento = ReturnType<typeof useTreinamentoDoChat>;

function Metricas({ estado }: { estado: EstadoDoTreinamento }) {
  const aplicada = [estado.sessao, ...estado.historico].find(
    (s) => s?.estado === 'aplicada'
  );
  if (!aplicada?.metricas) return null;
  const { antes, depois } = aplicada.metricas;
  const f = (n: number | null) =>
    n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Versão {aplicada.versaoDoModelo} aplicada a todos em{' '}
      {quando(aplicada.aplicadaEm)} com {aplicada.exemplos} exemplos. Margem
      entre respostas aprovadas e reprovadas: {f(antes.margem)} antes,{' '}
      {f(depois.margem)} depois.
    </p>
  );
}

/** Interruptor "Treinamento" ao lado de "Como a Lyra responde". */
export function ControleDeTreinamento({ treino }: { treino: Treinamento }) {
  const ids = useId();
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { estado } = treino;
  const sessao = estado?.sessao ?? null;
  const treinando = sessao?.estado === 'treinando';

  async function alterar(acao: 'ativar' | 'desativar') {
    setOcupado(true);
    try {
      treino.setEstado(
        await requisitar<EstadoDoTreinamento>(
          '/api/admin/treinamento',
          'POST',
          {
            acao,
          }
        )
      );
      await treino.atualizar();
      toast.success(
        acao === 'ativar'
          ? 'Treinamento ligado: avalie as respostas da Lyra nesta conversa.'
          : 'Treinamento finalizado: o modelo está sendo treinado e a nova versão vale para todos ao terminar.'
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível alterar.');
    } finally {
      setOcupado(false);
      setConfirmar(false);
    }
  }

  async function excluir(a: Avaliacao) {
    try {
      await requisitar(`/api/admin/treinamento/avaliacoes/${a.id}`, 'DELETE', {
        versao: a.versao,
      });
      treino.setAvaliacoes((l) => l.filter((x) => x.id !== a.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <GraduationCap aria-hidden="true" />
          <span className="hidden sm:inline">Treinamento</span>
          <span className="sr-only sm:hidden">Treinamento</span>
          {treino.ativo ? (
            <Badge variant="secondary" className="ml-1">
              On
            </Badge>
          ) : treinando ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              aria-label="treinando"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${ids}-chave`} className="font-semibold">
              Treinamento por feedback humano
            </Label>
            <Switch
              id={`${ids}-chave`}
              aria-describedby={`${ids}-estado`}
              checked={treino.ativo || treinando}
              disabled={
                ocupado ||
                treinando ||
                !estado ||
                (!treino.ativo && !estado.conectado)
              }
              onCheckedChange={(v) =>
                v ? void alterar('ativar') : setConfirmar(true)
              }
            />
          </div>
          <div id={`${ids}-estado`} className="flex flex-col gap-2 text-sm">
            {treino.erro ? (
              <p role="alert" className="text-destructive">
                {treino.erro}
              </p>
            ) : !estado ? (
              <p role="status">Conferindo o modelo conectado…</p>
            ) : treinando ? (
              <p role="status">
                Treinando o modelo com {sessao?.exemplos} exemplos. A nova
                versão passa a responder a todos assim que terminar.
              </p>
            ) : treino.ativo ? (
              <p>
                Ligado desde {quando(sessao!.iniciadaEm)}. Avalie as respostas
                desta conversa: cada avaliação já fica salva. Ao desligar, o
                modelo é treinado ({sessao!.avaliacoes} avaliações; mínimo de{' '}
                {estado.minimo} exemplos).
              </p>
            ) : !estado.conectado ? (
              <p role="alert">{estado.motivo}</p>
            ) : (
              <p>
                Ligue para avaliar as respostas da Lyra e treinar o modelo
                conectado (versão atual {estado.versaoAtiva ?? 0}).
              </p>
            )}
            {!sessao && estado?.historico[0]?.estado === 'falhou' ? (
              <div className="flex flex-col gap-2">
                <p role="alert" className="text-destructive">
                  O último treino não terminou: {estado.historico[0].erro} As{' '}
                  {estado.historico[0].avaliacoes} avaliações continuam salvas.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={ocupado || !estado.conectado}
                  onClick={() => void alterar('desativar')}
                >
                  Tentar o treino de novo
                </Button>
              </div>
            ) : null}
            {estado ? <Metricas estado={estado} /> : null}
            {estado ? (
              <p className="text-xs text-muted-foreground">
                {estado.mecanismo}
              </p>
            ) : null}
          </div>
          {treino.ativo && treino.avaliacoes.length ? (
            <ul
              aria-label="Avaliações desta sessão"
              className="flex max-h-56 flex-col gap-2 overflow-y-auto"
            >
              {treino.avaliacoes.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-xs"
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {a.nota === 1 ? 'Boa' : 'Precisa melhorar'}
                    </span>
                    {a.correcao ? ' · com resposta ideal' : ''}
                    <span className="block truncate text-muted-foreground">
                      {a.pergunta}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Excluir a avaliação de "${a.pergunta.slice(0, 40)}"`}
                    onClick={() => void excluir(a)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </PopoverContent>
      <AlertDialog
        open={confirmar}
        onOpenChange={(v) => !ocupado && setConfirmar(v)}
      >
        <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar o treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              As {sessao?.avaliacoes ?? 0} avaliações desta sessão treinam os
              pesos do modelo conectado. Ao terminar, a nova versão passa a
              responder a todos os usuários, antigos e novos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>
              Continuar avaliando
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={ocupado}
              onClick={(e) => {
                e.preventDefault();
                void alterar('desativar');
              }}
            >
              Finalizar e treinar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Popover>
  );
}

/** Avaliação de uma resposta enquanto o Treinamento está ligado. */
export function AvaliacaoDaResposta({
  turnoId,
  treino,
}: {
  turnoId: string;
  treino: Treinamento;
}) {
  const ids = useId();
  const atual = treino.porTurno.get(turnoId) ?? null;
  // Só o que a pessoa editou fica no estado local; sem edição, vale o que
  // está salvo. Assim salvar não apaga o texto que está sendo digitado e as
  // avaliações carregadas depois aparecem sem remontar o componente.
  const [notaEditada, setNota] = useState<1 | -1 | null>(null);
  const [correcaoEditada, setCorrecao] = useState<string | null>(null);
  const nota = notaEditada ?? atual?.nota ?? null;
  const correcao = correcaoEditada ?? atual?.correcao ?? '';
  const [salvando, setSalvando] = useState(false);

  async function salvar(n: 1 | -1, texto: string) {
    setSalvando(true);
    try {
      const salva = await requisitar<Avaliacao>(
        '/api/admin/treinamento/avaliacoes',
        'POST',
        { turnoId, nota: n, correcao: n === -1 && texto.trim() ? texto : null }
      );
      treino.setAvaliacoes((l) => [
        ...l.filter((x) => x.id !== salva.id),
        salva,
      ]);
      await treino.atualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      role="group"
      aria-label="Avaliar esta resposta para o treinamento"
      className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-border p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Treinamento:
        </span>
        <Button
          type="button"
          size="sm"
          variant={nota === 1 ? 'default' : 'outline'}
          aria-pressed={nota === 1}
          disabled={salvando}
          onClick={() => {
            setNota(1);
            void salvar(1, '');
          }}
        >
          <ThumbsUp aria-hidden="true" />
          Boa resposta
        </Button>
        <Button
          type="button"
          size="sm"
          variant={nota === -1 ? 'default' : 'outline'}
          aria-pressed={nota === -1}
          disabled={salvando}
          onClick={() => {
            setNota(-1);
            void salvar(-1, correcao);
          }}
        >
          <ThumbsDown aria-hidden="true" />
          Precisa melhorar
        </Button>
        {salvando ? (
          <span role="status" className="text-xs text-muted-foreground">
            Salvando…
          </span>
        ) : atual ? (
          <span className="text-xs text-muted-foreground">Avaliação salva</span>
        ) : null}
      </div>
      {nota === -1 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-ideal`} className="text-xs">
            Resposta ideal (opcional): o modelo aprende com ela
          </Label>
          <Textarea
            id={`${ids}-ideal`}
            rows={3}
            maxLength={8000}
            value={correcao}
            onChange={(e) => setCorrecao(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            disabled={salvando || !correcao.trim()}
            onClick={() => void salvar(-1, correcao)}
          >
            Salvar resposta ideal
          </Button>
        </div>
      ) : null}
    </div>
  );
}

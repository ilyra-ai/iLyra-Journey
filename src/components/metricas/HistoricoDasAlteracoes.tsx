'use client';
import { useEffect, useRef, useState } from 'react';
import { History, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  CAMPOS_DO_REGISTRO,
  NOMES_DOS_CAMPOS,
} from '@/lib/metricas/registro-do-dia';
import { avisarMetricasAtualizadas } from '@/lib/metricas/evento-de-atualizacao';
import type { VersaoDoRegistro } from '@/lib/metricas/versoes';

type Linha = Record<string, string | number | null>;
function texto(v: number | null, unidade?: string) {
  return v === null
    ? 'Não informado'
    : `${v.toLocaleString('pt-BR')}${unidade ? ` ${unidade}` : ''}`;
}
function mensagemDaFalha(e: unknown, padrao: string) {
  // Erros nativos de rede/JSON não devem vazar texto técnico em inglês à pessoa.
  return e instanceof Error &&
    !(e instanceof TypeError) &&
    !(e instanceof SyntaxError)
    ? e.message
    : padrao;
}
export function HistoricoDasAlteracoes({
  data,
  aoRestaurar,
}: {
  data: string;
  aoRestaurar: (r: Linha | null) => void;
}) {
  const abrirHistorico = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false),
    [dia, setDia] = useState(data),
    [versoes, setVersoes] = useState<VersaoDoRegistro[]>([]),
    [proximo, setProximo] = useState<number | null>(null),
    [carregando, setCarregando] = useState(false),
    [erro, setErro] = useState(''),
    [revisao, setRevisao] = useState(0),
    [confirmar, setConfirmar] = useState<VersaoDoRegistro | null>(null),
    [salvando, setSalvando] = useState(false);
  const minimo = new Date(`${data}T12:00:00Z`);
  // Retenção das versões (90 dias) mais a janela original de preenchimento (7).
  minimo.setUTCDate(minimo.getUTCDate() - 97);
  useEffect(() => {
    if (!aberto) return;
    const ac = new AbortController();
    async function carregar() {
      setCarregando(true);
      setErro('');
      setVersoes([]);
      setProximo(null);
      try {
        const r = await fetch(
          `/api/metricas/versoes?data=${encodeURIComponent(dia)}`,
          { signal: ac.signal, cache: 'no-store' }
        );
        const b = await r.json();
        if (!r.ok)
          throw new Error(b.error ?? 'Não foi possível ler o histórico.');
        if (!ac.signal.aborted) {
          setVersoes(b.versoes);
          setProximo(b.proximo);
        }
      } catch (e) {
        if (!ac.signal.aborted)
          setErro(
            mensagemDaFalha(
              e,
              'Não foi possível carregar o histórico. Verifique sua conexão e tente novamente.'
            )
          );
      } finally {
        if (!ac.signal.aborted) setCarregando(false);
      }
    }
    void carregar();
    return () => ac.abort();
  }, [aberto, dia, revisao]);
  async function mais() {
    if (proximo === null) return;
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(
        `/api/metricas/versoes?data=${encodeURIComponent(dia)}&antes=${proximo}`,
        { cache: 'no-store' }
      );
      const b = await r.json();
      if (!r.ok)
        throw new Error(b.error ?? 'Não foi possível ler mais versões.');
      setVersoes((v) => [...v, ...b.versoes]);
      setProximo(b.proximo);
    } catch (e) {
      setErro(
        mensagemDaFalha(
          e,
          'Não foi possível carregar mais alterações. Tente novamente.'
        )
      );
    } finally {
      setCarregando(false);
    }
  }
  async function desfazer() {
    if (!confirmar) return;
    setSalvando(true);
    try {
      const r = await fetch('/api/metricas/versoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dia, id: confirmar.id }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? 'Não foi possível desfazer.');
      if (dia === data) aoRestaurar(b.registro);
      avisarMetricasAtualizadas();
      toast.success('Valores anteriores restaurados.');
      setConfirmar(null);
      setRevisao((v) => v + 1);
    } catch (e) {
      toast.error(
        mensagemDaFalha(
          e,
          'Não foi possível desfazer. Atualize o histórico e tente novamente.'
        )
      );
      setConfirmar(null);
      setRevisao((v) => v + 1);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <section
      aria-label="Histórico de alterações manuais"
      className="flex min-w-0 flex-col gap-3"
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        ref={abrirHistorico}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <History data-icon="inline-start" />
        Histórico de alterações
      </Button>
      {aberto ? (
        <>
          <p className="text-sm text-muted-foreground">
            Consulte alterações manuais e recupere os valores anteriores da
            última revisão intacta. Registros de sensores e práticas não são
            versões manuais. As alterações ficam disponíveis por até 90 dias,
            dentro do histórico do plano. A edição continua limitada aos últimos
            sete dias.
          </p>
          <Field>
            <FieldLabel htmlFor="dia-das-alteracoes">
              Dia do histórico
            </FieldLabel>
            <Input
              id="dia-das-alteracoes"
              className="min-h-11"
              type="date"
              min={minimo.toISOString().slice(0, 10)}
              max={data}
              value={dia}
              disabled={carregando || salvando}
              onChange={(e) => {
                if (e.target.value) setDia(e.target.value);
              }}
            />
          </Field>
          {erro ? (
            <Alert variant="destructive">
              <AlertDescription>
                {erro}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setRevisao((v) => v + 1)}
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {carregando ? (
            <div role="status">
              <span className="sr-only">Carregando histórico</span>
              <Skeleton className="h-20 w-full" aria-hidden="true" />
            </div>
          ) : null}
          {!carregando && !erro && !versoes.length ? (
            <p role="status" className="text-sm text-muted-foreground">
              Nenhuma alteração manual guardada para este dia. O histórico
              começa a partir da ativação deste recurso.
            </p>
          ) : null}
          <ol className="flex min-w-0 flex-col gap-4">
            {versoes.map((v) => (
              <li
                key={v.id}
                className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3"
              >
                <p className="text-sm font-medium">
                  {v.tipo === 'desfazer'
                    ? 'Valores restaurados'
                    : 'Registro manual'}{' '}
                  ·{' '}
                  <time dateTime={v.registradaEm}>
                    {new Date(v.registradaEm).toLocaleString('pt-BR')}
                  </time>
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {NOMES_DOS_CAMPOS.filter(
                    (k) => v.mudancas[k] !== undefined
                  ).map((k) => {
                    const m = v.mudancas[k]!;
                    const def: { rotulo: string; unidade?: string } =
                      CAMPOS_DO_REGISTRO[k];
                    return (
                      <li key={k} className="break-words">
                        {def.rotulo}: {texto(m.anterior, def.unidade)} →{' '}
                        {texto(m.novo, def.unidade)}
                      </li>
                    );
                  })}
                </ul>
                {v.podeDesfazer ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setConfirmar(v)}
                    disabled={carregando || salvando}
                  >
                    <Undo2 data-icon="inline-start" />
                    Desfazer esta alteração
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Uma gravação posterior impede desfazer esta versão.
                  </p>
                )}
              </li>
            ))}
          </ol>
          {proximo !== null ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void mais()}
              disabled={carregando}
            >
              Ver alterações anteriores
            </Button>
          ) : null}
        </>
      ) : null}
      <AlertDialog
        open={confirmar !== null}
        onOpenChange={(v) => {
          if (!v && !salvando) setConfirmar(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            abrirHistorico.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer esta alteração?</AlertDialogTitle>
            <AlertDialogDescription>
              Somente os campos desta alteração voltarão aos valores anteriores,
              inclusive os que estavam sem informação. O servidor recusará se o
              registro tiver mudado. Campos ainda não salvos no formulário de
              hoje serão substituídos. Os resultados dependentes serão
              recalculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={salvando}>
              Manter valores atuais
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              disabled={salvando}
              onClick={(e) => {
                e.preventDefault();
                void desfazer();
              }}
            >
              {salvando ? 'Restaurando…' : 'Restaurar valores anteriores'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

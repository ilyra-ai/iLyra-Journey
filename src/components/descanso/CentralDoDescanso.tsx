'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Moon, RefreshCw } from 'lucide-react';
import { PageIntro } from '@/components/layout/PageIntro';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { useAuth } from '@/context/AuthContext';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';
import { avisarLembretesAtualizados } from '@/lib/lembretes/eventos';
import {
  avisarDescansoAtualizado,
  EVENTO_DESCANSO,
} from '@/lib/descanso/evento';
import { estadoDoPeriodo, retornoDoPeriodo } from '@/lib/descanso/calendario';
import { ATIVIDADES } from '@/lib/lembretes/esquema';
import type {
  CentralDoDescanso as Central,
  DadosDoPeriodo,
  PeriodoDeDescanso,
} from '@/lib/descanso/esquema';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
import { EditorDoDescanso } from './EditorDoDescanso';
const carregar = () => requisitar<Central>('/api/descanso');
const rotulos = {
  agendada: 'Agendada',
  ativa: 'Em descanso',
  retorno: 'Retorno gradual',
  encerrada: 'Encerrada',
  cancelada: 'Agendamento cancelado',
};
export function CentralDoDescanso() {
  const { session } = useAuth(),
    {
      data: r,
      error,
      loading,
      refresh,
    } = useKeyedResource<Central | null>(
      session?.user.id ?? null,
      carregar,
      erroNaPagina,
      null
    ),
    rota = useRotaLiberada();
  const [edicao, setEdicao] = useState<{
      central: Central;
      editar: boolean;
      pedidoId: string;
    } | null>(null),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState(''),
    [aviso, setAviso] = useState(''),
    [mais, setMais] = useState<{
      periodos: PeriodoDeDescanso[];
      proximo: string | null;
    } | null>(null);
  const acionador = useRef<HTMLElement | null>(null);
  const focarResultado = useRef(false);
  useEffect(() => {
    if (r && focarResultado.current) {
      document.getElementById('conteudo-descanso')?.focus();
      focarResultado.current = false;
    }
  }, [r]);
  useEffect(() => {
    if (!session) return;
    const atualizar = () => {
      if (document.visibilityState === 'visible' && !edicao && !ocupada)
        void refresh();
    };
    const timer = setInterval(atualizar, 60000);
    window.addEventListener('focus', atualizar);
    window.addEventListener(EVENTO_DESCANSO, atualizar);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', atualizar);
      window.removeEventListener(EVENTO_DESCANSO, atualizar);
    };
  }, [session, refresh, edicao, ocupada]);
  async function atualizar() {
    setMais(null);
    await refresh();
  }
  async function salvar(p: DadosDoPeriodo) {
    if (!edicao || ocupada) return;
    setOcupada(true);
    setFalha('');
    try {
      if (edicao.editar) {
        const atual = edicao.central.atual!;
        await requisitar(`/api/descanso/${atual.id}`, 'PUT', {
          ...p,
          versao: atual.versao,
        });
      } else
        await requisitar('/api/descanso', 'POST', {
          ...p,
          pedidoId: edicao.pedidoId,
        });
      setEdicao(null);
      focarResultado.current = true;
      await atualizar();
      avisarDescansoAtualizado();
      avisarLembretesAtualizados();
      setAviso('Período salvo. Os efeitos já são conferidos pelo servidor.');
    } finally {
      setOcupada(false);
    }
  }
  async function agir(acao: 'encerrar' | 'cancelar' | 'concluir_retorno') {
    if (!r?.atual || ocupada) return;
    setOcupada(true);
    setFalha('');
    setAviso('');
    try {
      await requisitar(`/api/descanso/${r.atual.id}`, 'POST', {
        acao,
        versao: r.atual.versao,
      });
      focarResultado.current = true;
      await atualizar();
      avisarDescansoAtualizado();
      avisarLembretesAtualizados();
      setAviso(
        'Etapa atualizada. Os dias já tocados pela pausa permanecem identificados.'
      );
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    } finally {
      setOcupada(false);
    }
  }
  function abrir(editar: boolean) {
    if (!r) return;
    acionador.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setAviso('');
    setEdicao({ central: r, editar, pedidoId: crypto.randomUUID() });
  }
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar seu descanso</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <Button variant="outline" onClick={() => void atualizar()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (!r) return <Skeleton className="h-48 rounded-xl" />;
  const atual = r.atual,
    historico = [
      ...new Map(
        [...r.historico, ...(mais?.periodos ?? [])].map((p) => [p.id, p])
      ).values(),
    ],
    proximo = mais ? mais.proximo : r.proximo;
  const acao =
    atual?.estado === 'agendada'
      ? 'cancelar'
      : atual?.estado === 'retorno'
        ? 'concluir_retorno'
        : 'encerrar';
  const tituloAcao =
    acao === 'cancelar'
      ? 'Cancelar agendamento'
      : acao === 'concluir_retorno'
        ? 'Concluir retorno gradual'
        : 'Encerrar descanso';
  return (
    <div
      id="conteudo-descanso"
      tabIndex={-1}
      className="flex min-w-0 flex-col gap-6 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <PageIntro
        title="Modo descanso"
        description="Uma pausa escolhida por você, com dias identificados e sem transformar descanso em falta ou progresso inventado."
        actions={
          <>
            <Button
              variant="outline"
              disabled={ocupada || loading}
              onClick={() => void atualizar()}
            >
              <RefreshCw />
              Atualizar
            </Button>
            {!atual && (
              <Button
                disabled={ocupada || loading}
                onClick={() => abrir(false)}
              >
                <Moon />
                Planejar descanso
              </Button>
            )}
          </>
        }
      />
      <Alert>
        <AlertTitle>Seu tempo continua sendo seu</AlertTitle>
        <AlertDescription>
          O modo pausa convites de bem-estar, adapta prazos das metas escolhidas
          e identifica dias neutros. Não pausa a assinatura comercial,
          consultas, registros de saúde ou práticas abertas voluntariamente.
        </AlertDescription>
      </Alert>
      {falha && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{falha}</AlertDescription>
        </Alert>
      )}
      {aviso && (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      )}
      {atual ? (
        <Card>
          <CardHeader>
            <CardTitle>{rotulos[atual.estado]}</CardTitle>
            <CardDescription>
              {dataBreve(atual.inicio)} a{' '}
              {atual.dataEncerramento
                ? dataBreve(atual.dataEncerramento)
                : atual.fim
                  ? dataBreve(atual.fim)
                  : 'encerramento manual'}{' '}
              · {atual.fuso}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <p>
              {atual.estado === 'agendada'
                ? 'O início será aplicado pelo relógio do servidor na data local definida, mesmo que você só abra o app depois.'
                : atual.estado === 'ativa'
                  ? 'Lembretes pessoais e convites do coach estão pausados. Pendências foram dispensadas; não haverá recuperação em lote.'
                  : 'Retomada escolhida por você: os dias continuam neutros para sequências e prazos selecionados. Você pode concluir o retorno antes da data final.'}
            </p>
            <p>
              {atual.retornoDias > 0
                ? `Retorno gradual por ${atual.retornoDias} dias${atual.inicioRetorno ? `, de ${dataBreve(atual.inicioRetorno)} a ${dataBreve(atual.fimRetorno!)}` : ', a partir do encerramento'}. ${atual.atividade ? `Até um lembrete por dia de ${ATIVIDADES[atual.atividade].nome.toLowerCase()}, usando uma recorrência já cadastrada, sem adiamentos.` : 'Retorno sem lembretes automáticos.'}`
                : 'Ao encerrar, volta o ritmo habitual de avisos, sem recuperar os dispensados.'}
            </p>
            <p>
              Alertas do sensor, consultas e avisos da assinatura continuam
              disponíveis. Hábitos, medições, metas e seus alvos permanecem
              guardados. Durante a pausa e o retorno, os dias não contam como
              cumpridos nem quebram a continuidade dos dias realmente
              registrados.
            </p>
            <div className="flex flex-wrap gap-3">
              {(atual.estado === 'ativa' || atual.estado === 'agendada') && (
                <Button
                  variant="outline"
                  disabled={ocupada || loading}
                  onClick={() => abrir(true)}
                >
                  Alterar período
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={ocupada || loading}>{tituloAcao}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  aria-modal="true"
                  className="max-h-[calc(100%-2rem)] overflow-y-auto"
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>{tituloAcao}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {acao === 'cancelar'
                        ? 'O período futuro não será aplicado. Nenhum dia será contado como pausado.'
                        : acao === 'concluir_retorno'
                          ? 'O ritmo habitual de avisos será liberado agora, respeitando seus horários e silêncio. O dia civil de hoje permanece identificado como neutro.'
                          : 'O encerramento usa o horário real de agora. Se você escolheu retorno gradual, ele começa agora; o dia civil de hoje permanece neutro. Não há alteração da assinatura.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter como está</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void agir(acao)}>
                      Confirmar{' '}
                      {acao === 'cancelar' ? 'cancelamento' : 'encerramento'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No seu ritmo habitual</CardTitle>
            <CardDescription>
              Não há pausa ou retorno gradual ativo, nem um novo início
              agendado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você pode começar hoje ou programar o descanso. Não é preciso
              registrar uma justificativa.
            </p>
          </CardContent>
        </Card>
      )}
      {r.adaptacoes.some((a) => a.diasNeutros > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Prazos adaptados, originais preservados</CardTitle>
            <CardDescription>
              Os alvos não são reduzidos, metas não são concluídas
              automaticamente por descansar e os dados reais continuam
              alimentando o progresso.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {r.adaptacoes
              .filter((a) => a.diasNeutros > 0)
              .map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-border p-4 text-sm"
                >
                  <p className="font-medium">
                    {r.metas.find((m) => m.id === a.id)?.titulo ??
                      'Meta vinculada ao descanso'}
                  </p>
                  <p>
                    Original: {dataBreve(a.prazoOriginal)} · efetivo:{' '}
                    {dataBreve(a.prazoEfetivo)} · {a.diasNeutros}{' '}
                    {a.diasNeutros === 1 ? 'dia neutro' : 'dias neutros'}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Dias e períodos preservados</CardTitle>
          <CardDescription>
            O histórico distingue agendamento, pausa real, retorno gradual e
            cancelamento. O relógio não inventa um encerramento manual: períodos
            programados terminam pela data definida.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum período registrado.
            </p>
          ) : (
            historico.map((p) => {
              const estado = estadoDoPeriodo(p, new Date(r.agora)),
                ret = retornoDoPeriodo(p);
              return (
                <article
                  key={p.id}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-border p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium">
                      {dataBreve(p.inicio)} a{' '}
                      {p.dataEncerramento
                        ? dataBreve(p.dataEncerramento)
                        : p.fim
                          ? dataBreve(p.fim)
                          : 'encerramento manual'}
                    </h3>
                    <Badge variant="secondary">{rotulos[estado]}</Badge>
                  </div>
                  <p>
                    Fuso preservado: {p.fuso}.{' '}
                    {p.encerradaEm
                      ? 'Encerramento manual com horário registrado.'
                      : p.fim
                        ? 'Fim programado, sem afirmar ação manual.'
                        : 'Sem fim programado.'}
                  </p>
                  {ret.inicio && ret.fim && estado !== 'cancelada' && (
                    <p>
                      Retorno gradual: {dataBreve(ret.inicio)} a{' '}
                      {dataBreve(ret.fim)}
                      {p.retornoEncerradoEm ? ' · concluído manualmente' : ''}.
                    </p>
                  )}
                  {estado === 'cancelada' && (
                    <p>Agendamento cancelado: não cria dias neutros.</p>
                  )}
                </article>
              );
            })
          )}
          {proximo && (
            <Button
              variant="outline"
              disabled={ocupada || loading}
              onClick={() => {
                setOcupada(true);
                setFalha('');
                void requisitar<Central>(
                  `/api/descanso?antes=${encodeURIComponent(proximo)}`
                )
                  .then((v) =>
                    setMais({
                      periodos: [...(mais?.periodos ?? []), ...v.historico],
                      proximo: v.proximo,
                    })
                  )
                  .catch((e) =>
                    setFalha(
                      e instanceof Error
                        ? e.message
                        : 'Não foi possível carregar o histórico.'
                    )
                  )
                  .finally(() => setOcupada(false));
              }}
            >
              Carregar períodos anteriores
            </Button>
          )}
        </CardContent>
      </Card>
      <nav
        aria-label="Registros e preferências preservados"
        className="flex flex-wrap gap-3"
      >
        {rota('/goals') && (
          <Button asChild variant="outline">
            <Link href="/goals">Ver metas e sequências</Link>
          </Button>
        )}
        {rota('/lembretes') && (
          <Button asChild variant="outline">
            <Link href="/lembretes">Ver horários dos lembretes</Link>
          </Button>
        )}
        {rota('/rotinas') && (
          <Button asChild variant="outline">
            <Link href="/rotinas">Abrir minhas rotinas</Link>
          </Button>
        )}
      </nav>
      <Dialog
        open={edicao !== null}
        onOpenChange={(v) => {
          if (!v && !ocupada) setEdicao(null);
        }}
      >
        <DialogContent
          aria-modal="true"
          className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl"
          onEscapeKeyDown={(e) => {
            if (ocupada) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (ocupada) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (acionador.current?.isConnected) acionador.current.focus();
            else document.getElementById('conteudo-descanso')?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {edicao?.editar ? 'Alterar o período' : 'Planejar seu descanso'}
            </DialogTitle>
            <DialogDescription>
              Confira o início, os efeitos e a retomada. Não há mudança de
              cobrança comercial.
            </DialogDescription>
          </DialogHeader>
          {edicao && (
            <EditorDoDescanso
              central={edicao.central}
              editar={edicao.editar}
              ocupada={ocupada}
              salvar={salvar}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

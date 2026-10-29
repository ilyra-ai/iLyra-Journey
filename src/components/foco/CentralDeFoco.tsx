'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { PageIntro } from '@/components/layout/PageIntro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  CentralDeFoco as Central,
  SessaoDeFoco,
} from '@/lib/foco/esquema';
import { mostrarTempo } from '@/lib/foco/relogio';
async function api<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, {
      method,
      cache: 'no-store',
      credentials: 'include',
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    }),
    b = await r.json().catch(() => null);
  if (!r.ok || b === null)
    throw new Error(
      b?.error ??
        'Não foi possível confirmar a operação. Atualize antes de tentar novamente.'
    );
  return b;
}
interface Foto {
  central: Central;
  recebida: number;
}
const carregar = async (): Promise<Foto | null> => ({
  central: await api<Central>('/api/foco'),
  recebida: performance.now(),
});
export function CentralDeFoco() {
  const { session } = useAuth();
  const [erro, setErro] = useState(''),
    [busy, setBusy] = useState(false),
    [novo, setNovo] = useState<Foto | null>(null),
    [agora, setAgora] = useState(0),
    [minutos, setMinutos] = useState('25'),
    [pausaMin, setPausaMin] = useState('5'),
    [som, setSom] = useState(false),
    [convite, setConvite] = useState(true),
    [ultimo, setUltimo] = useState<SessaoDeFoco | null>(null),
    [editando, setEditando] = useState<SessaoDeFoco | null>(null),
    [nota, setNota] = useState(''),
    [percepcao, setPercepcao] = useState(''),
    [removendo, setRemovendo] = useState<SessaoDeFoco | null>(null),
    [historicoExtra, setHistoricoExtra] = useState<SessaoDeFoco[]>([]),
    [proximo, setProximo] = useState<string | null | undefined>(undefined),
    [mensagem, setMensagem] = useState('');
  const audio = useRef<AudioContext | null>(null),
    avisada = useRef<string | null>(null),
    pedido = useRef<{
      id: string;
      tipo: 'foco' | 'pausa';
      minutos: number;
    } | null>(null),
    enviando = useRef(false);
  const falha = useCallback(
    (e: unknown) =>
      setErro(
        e instanceof TypeError
          ? 'Sem conexão com o servidor. Nenhum salvamento foi confirmado.'
          : e instanceof Error
            ? e.message
            : 'Sem conexão com o servidor. Nenhum salvamento foi confirmado.'
      ),
    []
  );
  const recurso = useKeyedResource<Foto | null>(
      session?.user.id ?? null,
      carregar,
      falha,
      null
    ),
    foto = novo ?? recurso.data,
    c = foto?.central,
    a = c?.ativa;
  const sincronizar = useCallback(async () => {
    try {
      const f = await carregar();
      setNovo(f);
      setHistoricoExtra([]);
      setProximo(undefined);
      setAgora(performance.now());
    } catch (e) {
      falha(e);
    }
  }, [falha]);
  useEffect(() => {
    const id = setInterval(() => setAgora(performance.now()), 1000);
    const visivel = () => {
      if (document.visibilityState === 'visible') void sincronizar();
    };
    window.addEventListener('focus', visivel);
    document.addEventListener('visibilitychange', visivel);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', visivel);
      document.removeEventListener('visibilitychange', visivel);
      void audio.current?.close();
    };
  }, [sincronizar]);
  const decorrido = a
      ? Math.min(
          a.alvoSegundos * 1000,
          a.decorridoMs +
            (a.estado === 'running' && foto
              ? Math.max(0, agora - foto.recebida)
              : 0)
        )
      : 0,
    restante = a ? Math.max(0, a.alvoSegundos * 1000 - decorrido) : 0;
  useEffect(() => {
    if (
      !a ||
      a.estado !== 'running' ||
      restante > 0 ||
      avisada.current === a.id
    )
      return;
    avisada.current = a.id;
    setMensagem(
      'A duração escolhida foi alcançada. Encerre quando estiver pronto.'
    );
    if (!som || document.visibilityState !== 'visible') return;
    let vivo = true;
    void api<{ permitido: boolean; motivo: string }>(
      `/api/foco/${a.id}/aviso`,
      'POST',
      {}
    )
      .then((r) => {
        if (!vivo) return;
        setMensagem(r.motivo);
        if (r.permitido && audio.current?.state === 'running') {
          const ctx = audio.current,
            o = ctx.createOscillator(),
            g = ctx.createGain();
          o.frequency.value = 660;
          g.gain.setValueAtTime(0.08, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.3);
        }
      })
      .catch(falha);
    return () => {
      vivo = false;
    };
  }, [a, restante, som, falha]);
  async function executar(acao: () => Promise<void>) {
    if (enviando.current) return;
    enviando.current = true;
    setBusy(true);
    setErro('');
    try {
      await acao();
    } catch (e) {
      falha(e);
    } finally {
      enviando.current = false;
      setBusy(false);
    }
  }
  async function iniciar(tipo: 'foco' | 'pausa') {
    await executar(async () => {
      const n = Number(tipo === 'foco' ? minutos : pausaMin);
      if (!Number.isInteger(n) || n < 1 || n > (tipo === 'foco' ? 180 : 60))
        throw new Error(
          `Escolha de 1 a ${tipo === 'foco' ? 180 : 60} minutos.`
        );
      if (
        pedido.current &&
        (pedido.current.tipo !== tipo || pedido.current.minutos !== n)
      )
        throw new Error(
          'Há um início sem confirmação. Atualize para conferir antes de mudar a duração.'
        );
      pedido.current ??= { id: crypto.randomUUID(), tipo, minutos: n };
      await api('/api/foco', 'POST', pedido.current);
      pedido.current = null;
      avisada.current = null;
      setUltimo(null);
      setMensagem('Sessão iniciada e confirmada no servidor.');
      await sincronizar();
    });
  }
  async function agir(acao: 'pausar' | 'retomar' | 'encerrar') {
    if (!a) return;
    await executar(async () => {
      const r = await api<SessaoDeFoco>(`/api/foco/${a.id}`, 'POST', {
        acao,
        versao: a.versao,
      });
      if (acao === 'encerrar') {
        setUltimo(r);
        setEditando(r);
        setNota(r.nota ?? '');
        setPercepcao(r.percepcao?.toString() ?? '');
      }
      await sincronizar();
    });
  }
  function editar(s: SessaoDeFoco) {
    setEditando(s);
    setNota(s.nota ?? '');
    setPercepcao(s.percepcao?.toString() ?? '');
  }
  const historico = [...(c?.historico ?? []), ...historicoExtra],
    cursor = proximo === undefined ? c?.proximo : proximo;
  return (
    <>
      <PageIntro
        title="Foco e pausa"
        description="Escolha um intervalo e acompanhe o tempo decorrido. A sessão não mede atenção e não soma minutos à meditação."
        actions={
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void executar(async () => {
                await sincronizar();
                pedido.current = null;
              })
            }
          >
            Atualizar sessões
          </Button>
        }
      />
      {erro && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          {erro}
        </p>
      )}
      {mensagem && (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {mensagem}
        </p>
      )}
      {recurso.loading && !c ? (
        <p role="status">Carregando sessões…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle as="h3">
                {a
                  ? a.tipo === 'foco'
                    ? 'Sessão de foco'
                    : 'Sua pausa'
                  : 'Seu próximo intervalo'}
              </CardTitle>
              <CardDescription>
                O servidor preserva a sessão, as pausas e o encerramento. Aba em
                segundo plano ou aparelho suspenso podem atrasar a tela e o som;
                ao voltar, o relógio é conferido novamente. O tempo civil é
                limitado à duração escolhida, sem afirmar foco contínuo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {a ? (
                <>
                  <p className="text-sm">
                    {a.estado === 'paused' ? 'Pausada' : 'Em curso'} · duração
                    escolhida: {a.alvoSegundos / 60} min
                  </p>
                  <p
                    role="timer"
                    aria-label="Tempo restante"
                    aria-live="off"
                    className="font-display text-5xl tabular-nums"
                  >
                    {mostrarTempo(restante)}
                  </p>
                  {restante === 0 && (
                    <p role="status">
                      Duração alcançada. A sessão só será encerrada após sua
                      confirmação.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {a.estado === 'running' ? (
                      <Button
                        variant="outline"
                        disabled={busy || restante === 0}
                        onClick={() => void agir('pausar')}
                      >
                        Pausar sessão
                      </Button>
                    ) : (
                      <Button
                        disabled={busy || restante === 0}
                        onClick={() => void agir('retomar')}
                      >
                        Retomar sessão
                      </Button>
                    )}
                    <Button
                      disabled={busy}
                      onClick={() => void agir('encerrar')}
                    >
                      Encerrar sessão
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="foco-minutos">
                      Duração de foco (1 a 180 min)
                    </Label>
                    <Input
                      id="foco-minutos"
                      type="number"
                      min={1}
                      max={180}
                      step={1}
                      disabled={busy}
                      value={minutos}
                      onChange={(e) => setMinutos(e.target.value)}
                    />
                  </div>
                  <Button
                    disabled={busy || !c}
                    onClick={() => void iniciar('foco')}
                  >
                    Iniciar foco
                  </Button>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="foco-som"
                  checked={som}
                  onCheckedChange={async (v) => {
                    if (v !== true) {
                      setSom(false);
                      await audio.current?.suspend();
                      return;
                    }
                    try {
                      audio.current ??= new AudioContext();
                      await audio.current.resume();
                      setSom(true);
                    } catch {
                      setSom(false);
                      setErro(
                        'O navegador não permitiu o som. O temporizador visual continua disponível.'
                      );
                    }
                  }}
                />
                <Label htmlFor="foco-som" className="leading-6">
                  Som curto opcional ao alcançar a duração, somente com a página
                  aberta e visível. Respeita o silêncio e o modo descanso; não
                  há alarme garantido em segundo plano.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="foco-convite"
                  checked={convite}
                  onCheckedChange={(v) => setConvite(v === true)}
                />
                <Label htmlFor="foco-convite" className="leading-6">
                  Oferecer uma pausa depois de encerrar o foco
                </Label>
              </div>
            </CardContent>
          </Card>
          {!a && ultimo?.tipo === 'foco' && convite && (
            <Card>
              <CardHeader>
                <CardTitle>Uma pausa, se fizer sentido</CardTitle>
                <CardDescription>
                  Ela começa somente se você escolher. Não altera seus minutos
                  de foco nem os registros de meditação.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pausa-minutos">Pausa (1 a 60 min)</Label>
                  <Input
                    id="pausa-minutos"
                    type="number"
                    min={1}
                    max={60}
                    value={pausaMin}
                    onChange={(e) => setPausaMin(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <Button disabled={busy} onClick={() => void iniciar('pausa')}>
                  Iniciar pausa
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setUltimo(null)}
                >
                  Agora não
                </Button>
              </CardContent>
            </Card>
          )}
          <section
            aria-label="Totais das sessões encerradas"
            className="grid gap-3 sm:grid-cols-2"
          >
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Foco · {c?.totais.focos ?? 0} sessões encerradas
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {mostrarTempo(c?.totais.focoMs ?? 0)} de tempo registrado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Pausa · {c?.totais.pausas ?? 0} sessões encerradas
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {mostrarTempo(c?.totais.pausaMs ?? 0)} de tempo registrado
                </p>
              </CardContent>
            </Card>
          </section>
          <section className="space-y-4" aria-labelledby="foco-historico">
            <h3 id="foco-historico" className="text-xl font-semibold">
              Seu histórico
            </h3>
            {!historico.length && (
              <p className="text-muted-foreground">
                Nenhuma sessão encerrada. Registre apenas o que você escolher
                praticar.
              </p>
            )}
            {historico.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle>
                    {s.tipo === 'foco' ? 'Foco' : 'Pausa'} ·{' '}
                    {new Date(s.iniciadaEm).toLocaleString('pt-BR')}
                  </CardTitle>
                  <CardDescription>
                    {s.estado === 'completed'
                      ? 'Duração alcançada e encerramento confirmado'
                      : 'Encerrada antes da duração escolhida'}{' '}
                    · {mostrarTempo(s.decorridoMs)} registrados de{' '}
                    {s.alvoSegundos / 60} min escolhidos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.percepcao !== null && <p>Percepção: {s.percepcao}/5</p>}
                  {s.nota && (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {s.nota}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => editar(s)}
                      disabled={busy}
                    >
                      Registrar ou editar percepção
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setRemovendo(s)}
                      disabled={busy}
                    >
                      Remover sessão do histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {cursor && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void executar(async () => {
                    const pagina = await api<Central>(
                      '/api/foco?antes=' + encodeURIComponent(cursor)
                    );
                    setHistoricoExtra((h) => [...h, ...pagina.historico]);
                    setProximo(pagina.proximo);
                  })
                }
              >
                Ver mais sessões
              </Button>
            )}
          </section>
        </>
      )}
      <Dialog
        open={Boolean(editando)}
        onOpenChange={(v) => {
          if (!v) setEditando(null);
        }}
      >
        <DialogContent
          aria-modal="true"
          className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Como você ficou depois?</DialogTitle>
            <DialogDescription>
              Percepção opcional. Você pode fechar e registrar depois pelo
              histórico. A nota não altera o tempo registrado.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editando)
                void executar(async () => {
                  await api(`/api/foco/${editando.id}`, 'PUT', {
                    versao: editando.versao,
                    percepcao: percepcao === '' ? null : Number(percepcao),
                    nota,
                  });
                  setEditando(null);
                  await sincronizar();
                });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="foco-percepcao">
                Percepção (1 muito difícil, 5 muito bom)
              </Label>
              <Input
                id="foco-percepcao"
                type="number"
                min={1}
                max={5}
                step={1}
                value={percepcao}
                onChange={(e) => setPercepcao(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foco-nota">
                Nota opcional (até 280 caracteres)
              </Label>
              <Textarea
                id="foco-nota"
                maxLength={280}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                disabled={busy}
              />
            </div>
            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}
            <DialogFooter className="flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditando(null)}
              >
                Depois
              </Button>
              <Button type="submit" disabled={busy}>
                Salvar percepção
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(removendo)}
        onOpenChange={(v) => {
          if (!v) setRemovendo(null);
        }}
      >
        <DialogContent
          aria-modal="true"
          className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Remover esta sessão?</DialogTitle>
            <DialogDescription>
              O registro e a percepção serão removidos e os totais serão
              atualizados. Esta ação não afeta métricas ou meditação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={() => setRemovendo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void executar(async () => {
                  if (removendo)
                    await api(`/api/foco/${removendo.id}`, 'DELETE', {
                      versao: removendo.versao,
                    });
                  setRemovendo(null);
                  await sincronizar();
                })
              }
            >
              Confirmar remoção
            </Button>
          </DialogFooter>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

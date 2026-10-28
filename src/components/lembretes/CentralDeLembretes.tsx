'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Clock3, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PageIntro } from '@/components/layout/PageIntro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useIsAdmin } from '@/hooks/use-is-admin';
import {
  ATIVIDADES,
  DIAS,
  lembreteSchema,
  preferenciasSchema,
  type CentralDeLembretes as Central,
  type DadosDoLembrete,
  type Lembrete,
  type PreferenciasDeLembretes,
} from '@/lib/lembretes/esquema';
import {
  avisarLembretesAtualizados,
  EVENTO_LEMBRETES,
} from '@/lib/lembretes/eventos';

async function requisitar(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, {
    method,
    credentials: 'include',
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  const dados = await r.json();
  if (!r.ok)
    throw new Error(
      typeof dados.error === 'string'
        ? dados.error
        : 'Não foi possível concluir. Tente novamente.'
    );
  return dados;
}
async function carregar(): Promise<Central> {
  return requisitar('/api/lembretes');
}
function falhaDeLeitura() {
  /* O erro é apresentado com retentativa na própria página. */
}
function mensagem(e: unknown) {
  return e instanceof Error
    ? e.message
    : 'Não foi possível concluir. Tente novamente.';
}

function FormularioDeLembrete({
  inicial,
  aoSalvar,
  aoCancelar,
  ocupado,
}: {
  inicial: Lembrete | null;
  aoSalvar: (d: DadosDoLembrete) => Promise<void>;
  aoCancelar: () => void;
  ocupado: boolean;
}) {
  const [dados, setDados] = useState<DadosDoLembrete>(
    inicial
      ? {
          titulo: inicial.titulo,
          atividade: inicial.atividade,
          hora: inicial.hora,
          dias: inicial.dias,
          ativo: inicial.ativo,
        }
      : {
          titulo: '',
          atividade: 'checkin',
          hora: '09:00',
          dias: [1, 2, 3, 4, 5],
          ativo: true,
        }
  );
  const [erro, setErro] = useState('');
  const [invalidos, setInvalidos] = useState<string[]>([]);
  const { data: assinatura } = useAccountSubscription();
  const admin = useIsAdmin();
  const permitida = (tipo: DadosDoLembrete['atividade']) =>
    admin || isPlanFeatureEnabled(assinatura, ATIVIDADES[tipo].recurso);
  const alterar = <K extends keyof DadosDoLembrete>(
    chave: K,
    valor: DadosDoLembrete[K]
  ) => setDados((d) => ({ ...d, [chave]: valor }));
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErro('');
        setInvalidos([]);
        const validado = lembreteSchema.safeParse(dados);
        if (!validado.success) {
          setErro(validado.error.issues.map((i) => i.message).join(' '));
          setInvalidos(validado.error.issues.map((i) => String(i.path[0])));
          return;
        }
        try {
          await aoSalvar(validado.data);
        } catch (e) {
          setErro(mensagem(e));
        }
      }}
    >
      <FieldGroup>
        <Field data-invalid={invalidos.includes('titulo')}>
          <FieldLabel htmlFor="nome-lembrete">Nome do lembrete</FieldLabel>
          <Input
            id="nome-lembrete"
            aria-invalid={invalidos.includes('titulo')}
            value={dados.titulo}
            onChange={(e) => alterar('titulo', e.target.value)}
            maxLength={100}
            required
            disabled={ocupado}
            autoComplete="off"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="atividade-lembrete">
            O que você quer lembrar?
          </FieldLabel>
          <Select
            value={dados.atividade}
            onValueChange={(v) =>
              alterar('atividade', v as DadosDoLembrete['atividade'])
            }
            disabled={ocupado}
          >
            <SelectTrigger id="atividade-lembrete">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(ATIVIDADES).map(([tipo, a]) => (
                  <SelectItem
                    key={tipo}
                    value={tipo}
                    disabled={!permitida(tipo as DadosDoLembrete['atividade'])}
                  >
                    {a.nome}
                    {!permitida(tipo as DadosDoLembrete['atividade'])
                      ? ' · indisponível no plano'
                      : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={invalidos.includes('hora')}>
          <FieldLabel htmlFor="hora-lembrete">Horário</FieldLabel>
          <Input
            id="hora-lembrete"
            aria-invalid={invalidos.includes('hora')}
            type="time"
            required
            value={dados.hora}
            onChange={(e) => alterar('hora', e.target.value)}
            disabled={ocupado}
          />
          <FieldDescription>
            No fuso escolhido em Fuso e descanso.
          </FieldDescription>
        </Field>
        <FieldSet disabled={ocupado} data-invalid={invalidos.includes('dias')}>
          <FieldLegend variant="label">Dias da semana</FieldLegend>
          <ToggleGroup
            type="multiple"
            variant="outline"
            className="flex-wrap justify-start"
            value={dados.dias.map(String)}
            onValueChange={(v) => alterar('dias', v.map(Number))}
            aria-label="Dias do lembrete"
            aria-invalid={invalidos.includes('dias')}
          >
            {DIAS.map((nome, i) => (
              <ToggleGroupItem
                key={i}
                value={String(i)}
                aria-label={
                  [
                    'Domingo',
                    'Segunda-feira',
                    'Terça-feira',
                    'Quarta-feira',
                    'Quinta-feira',
                    'Sexta-feira',
                    'Sábado',
                  ][i]
                }
              >
                {nome}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="lembrete-ativo">Lembrete ativo</FieldLabel>
          <Switch
            id="lembrete-ativo"
            checked={dados.ativo}
            onCheckedChange={(v) => alterar('ativo', v)}
            disabled={ocupado}
          />
        </Field>
      </FieldGroup>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Alterações valem para os próximos avisos. Um aviso já preparado hoje não
        será repetido ao editar ou reativar.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={aoCancelar}
          disabled={ocupado}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={ocupado}>
          {ocupado ? 'Salvando…' : 'Salvar lembrete'}
        </Button>
      </div>
    </form>
  );
}

function Preferencias({
  inicial,
  aoSalvar,
  ocupado,
}: {
  inicial: PreferenciasDeLembretes;
  aoSalvar: (p: PreferenciasDeLembretes) => Promise<void>;
  ocupado: boolean;
}) {
  const [p, setP] = useState(inicial);
  const [erro, setErro] = useState('');
  const [invalidos, setInvalidos] = useState<string[]>([]);
  const fusos = useMemo(
    () =>
      Array.from(
        new Set(['UTC', p.fuso, ...Intl.supportedValuesOf('timeZone')])
      ).sort(),
    [p.fuso]
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuso e descanso</CardTitle>
        <CardDescription>
          Todos os lembretes seguem o mesmo fuso. Durante o silêncio, os avisos
          ficam pendentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="preferencias-lembretes"
          className="flex flex-col gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setErro('');
            setInvalidos([]);
            const r = preferenciasSchema.safeParse(p);
            if (!r.success) {
              setErro(r.error.issues.map((i) => i.message).join(' '));
              setInvalidos(r.error.issues.map((i) => String(i.path[0])));
              return;
            }
            try {
              await aoSalvar(r.data);
            } catch (e) {
              setErro(mensagem(e));
            }
          }}
        >
          <FieldGroup>
            <Field data-invalid={invalidos.includes('fuso')}>
              <FieldLabel htmlFor="fuso-lembretes">Fuso horário</FieldLabel>
              <Select
                value={p.fuso}
                onValueChange={(fuso) => setP({ ...p, fuso })}
                disabled={ocupado}
              >
                <SelectTrigger
                  id="fuso-lembretes"
                  aria-invalid={invalidos.includes('fuso')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {fusos.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.replaceAll('_', ' ').replaceAll('/', ' / ')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 whitespace-normal"
                onClick={() =>
                  setP({
                    ...p,
                    fuso: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  })
                }
                disabled={ocupado}
              >
                Usar fuso deste dispositivo
              </Button>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="silencio-lembretes">
                Período de silêncio
              </FieldLabel>
              <Switch
                id="silencio-lembretes"
                checked={p.silencioAtivo}
                onCheckedChange={(silencioAtivo) =>
                  setP({ ...p, silencioAtivo })
                }
                disabled={ocupado}
              />
            </Field>
            {p.silencioAtivo && (
              <FieldGroup>
                <Field data-invalid={invalidos.includes('inicioSilencio')}>
                  <FieldLabel htmlFor="silencio-inicio">
                    Silêncio a partir de
                  </FieldLabel>
                  <Input
                    id="silencio-inicio"
                    aria-invalid={invalidos.includes('inicioSilencio')}
                    type="time"
                    required
                    value={p.inicioSilencio}
                    onChange={(e) =>
                      setP({ ...p, inicioSilencio: e.target.value })
                    }
                    disabled={ocupado}
                  />
                </Field>
                <Field data-invalid={invalidos.includes('fimSilencio')}>
                  <FieldLabel htmlFor="silencio-fim">
                    Voltar a avisar às
                  </FieldLabel>
                  <Input
                    id="silencio-fim"
                    aria-invalid={invalidos.includes('fimSilencio')}
                    type="time"
                    required
                    value={p.fimSilencio}
                    onChange={(e) =>
                      setP({ ...p, fimSilencio: e.target.value })
                    }
                    disabled={ocupado}
                  />
                </Field>
              </FieldGroup>
            )}
          </FieldGroup>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="preferencias-lembretes"
          disabled={ocupado}
          className="h-auto min-h-10 whitespace-normal"
        >
          {ocupado ? 'Salvando…' : 'Salvar fuso e silêncio'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function CentralDeLembretes() {
  const { session } = useAuth();
  const { data, loading, error, refresh } = useKeyedResource<Central | null>(
    session?.user.id ?? null,
    carregar,
    falhaDeLeitura,
    null,
    carregar,
    true
  );
  const [edicao, setEdicao] = useState<{ lembrete: Lembrete | null } | null>(
    null
  );
  const [exclusao, setExclusao] = useState<Lembrete | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const botaoNovo = useRef<HTMLButtonElement>(null);
  const focoDeRetorno = useRef<HTMLButtonElement | null>(null);
  const tituloDaRotina = useRef<HTMLHeadingElement>(null);
  const devolverFoco = (evento: Event) => {
    evento.preventDefault();
    const alvo = focoDeRetorno.current;
    if (alvo?.isConnected && !alvo.disabled) alvo.focus();
    else if (botaoNovo.current && !botaoNovo.current.disabled)
      botaoNovo.current.focus();
    else tituloDaRotina.current?.focus();
  };
  const rotaLiberada = useRotaLiberada();
  const verificar = useCallback(async () => {
    await requisitar('/api/lembretes/verificar', 'POST');
    await refresh();
  }, [refresh]);
  useEffect(() => {
    const atualizar = () => {
      void refresh();
    };
    window.addEventListener(EVENTO_LEMBRETES, atualizar);
    return () => window.removeEventListener(EVENTO_LEMBRETES, atualizar);
  }, [refresh]);
  const executar = async (
    operacao: () => Promise<unknown>,
    sucesso: string
  ) => {
    setOcupado(true);
    try {
      await operacao();
      await refresh();
      avisarLembretesAtualizados();
      toast.success(sucesso);
    } finally {
      setOcupado(false);
    }
  };
  return (
    <>
      <PageIntro
        eyebrow="No seu ritmo"
        title="Seus lembretes"
        description="Um convite para cuidar da rotina, nos dias e horários que você escolher."
        actions={
          <Button
            ref={botaoNovo}
            onClick={(evento) => {
              focoDeRetorno.current = evento.currentTarget;
              setEdicao({ lembrete: null });
            }}
            disabled={!data || ocupado || data.lembretes.length >= 50}
          >
            <Plus data-icon="inline-start" />
            Novo lembrete
          </Button>
        }
      />
      <Alert>
        <Bell aria-hidden="true" />
        <AlertTitle>Avisos dentro do app</AlertTitle>
        <AlertDescription>
          Mantenha o app aberto e visível. O sino verifica os horários a cada
          minuto e ao voltar para o app; o navegador pode atrasar essa
          verificação. Não há push, e-mail ou aviso com o app fechado. Ao
          voltar, retomamos os horários de hoje; adiamentos e avisos já
          preparados ficam pendentes por até 24 horas, respeitando o silêncio.
        </AlertDescription>
      </Alert>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível atualizar</AlertTitle>
          <AlertDescription>
            {mensagem(error)}{' '}
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!data ? (
        loading && <Skeleton className="h-56 w-full" />
      ) : (
        <>
          <div className="grid items-start gap-6 @4xl/lembretes:grid-cols-[minmax(18rem,1fr)_minmax(0,2fr)]">
            <Preferencias
              key={data.preferencias.versao}
              inicial={data.preferencias}
              ocupado={ocupado}
              aoSalvar={(p) =>
                executar(
                  () => requisitar('/api/lembretes/preferencias', 'PUT', p),
                  'Fuso e silêncio salvos.'
                )
              }
            />
            <section
              className="flex min-w-0 flex-col gap-4"
              aria-labelledby="lista-lembretes"
            >
              <h3
                id="lista-lembretes"
                ref={tituloDaRotina}
                tabIndex={-1}
                className="font-display text-xl font-semibold"
              >
                Sua rotina{' '}
                <span className="text-muted-foreground">
                  ({data.lembretes.length}/50)
                </span>
              </h3>
              {data.lembretes.length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Seu primeiro lembrete</CardTitle>
                    <CardDescription>
                      Escolha uma pausa, um hábito ou um momento para registrar
                      como foi seu dia.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      onClick={(evento) => {
                        focoDeRetorno.current = evento.currentTarget;
                        setEdicao({ lembrete: null });
                      }}
                    >
                      Criar lembrete
                    </Button>
                  </CardFooter>
                </Card>
              )}
              {data.lembretes.map((l) => (
                <Card key={l.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="min-w-0 break-words">
                        {l.titulo}
                      </CardTitle>
                      <Badge variant={l.ativo ? 'secondary' : 'outline'}>
                        {l.ativo ? 'Ativo' : 'Desativado'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {ATIVIDADES[l.atividade].nome} · {l.hora} ·{' '}
                      {l.dias.map((d) => DIAS[d]).join(', ')}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={(evento) => {
                        focoDeRetorno.current = evento.currentTarget;
                        setEdicao({ lembrete: l });
                      }}
                      disabled={ocupado}
                      aria-label={`Editar ${l.titulo}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={ocupado}
                      onClick={() =>
                        void executar(
                          () =>
                            requisitar(`/api/lembretes/${l.id}`, 'PUT', {
                              ...l,
                              id: undefined,
                              ativo: !l.ativo,
                            }),
                          l.ativo ? 'Lembrete desativado.' : 'Lembrete ativado.'
                        ).catch((e) => toast.error(mensagem(e)))
                      }
                      aria-label={`${l.ativo ? 'Desativar' : 'Ativar'} ${l.titulo}`}
                    >
                      {l.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={ocupado}
                      onClick={(evento) => {
                        focoDeRetorno.current = evento.currentTarget;
                        setExclusao(l);
                      }}
                      aria-label={`Excluir ${l.titulo}`}
                    >
                      Excluir
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </section>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Avisos recentes e adiados</CardTitle>
              <CardDescription>
                Adiar muda somente este aviso. A recorrência continua no horário
                escolhido.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {data.avisos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum aviso pendente ou recebido nas últimas 24 horas.
                </p>
              )}
              {data.avisos.map((a) => (
                <div
                  key={a.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">{a.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.estado === 'pending'
                        ? 'Pendente para'
                        : 'Recebido para'}{' '}
                      {new Intl.DateTimeFormat('pt-BR', {
                        timeZone: data.preferencias.fuso,
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(a.previstoEm))}
                    </p>
                  </div>
                  {a.estado === 'delivered' && (
                    <div className="flex flex-wrap gap-2">
                      {rotaLiberada(ATIVIDADES[a.atividade].destino) && (
                        <Button variant="outline" asChild>
                          <Link href={ATIVIDADES[a.atividade].destino}>
                            Abrir {ATIVIDADES[a.atividade].nome.toLowerCase()}
                          </Link>
                        </Button>
                      )}
                      {[10, 30, 60].map((minutos) => (
                        <Button
                          key={minutos}
                          variant="outline"
                          disabled={ocupado}
                          onClick={() =>
                            void executar(
                              () =>
                                requisitar(
                                  `/api/lembretes/avisos/${a.id}`,
                                  'POST',
                                  { acao: 'adiar', minutos, versao: a.versao }
                                ),
                              `Aviso adiado por ${minutos} minutos.`
                            ).catch((e) => toast.error(mensagem(e)))
                          }
                          aria-label={`Adiar ${a.titulo} por ${minutos} minutos`}
                        >
                          <Clock3 data-icon="inline-start" />
                          {minutos} min
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        disabled={ocupado}
                        onClick={() =>
                          void executar(
                            () =>
                              requisitar(
                                `/api/lembretes/avisos/${a.id}`,
                                'POST',
                                { acao: 'dispensar', versao: a.versao }
                              ),
                            'Aviso dispensado.'
                          ).catch((e) => toast.error(mensagem(e)))
                        }
                        aria-label={`Dispensar ${a.titulo}`}
                      >
                        Dispensar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                disabled={ocupado || loading}
                onClick={() =>
                  void verificar()
                    .then(() => avisarLembretesAtualizados())
                    .catch((e) => toast.error(mensagem(e)))
                }
              >
                <RefreshCw data-icon="inline-start" />
                Verificar agora
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
      <Dialog
        open={edicao !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !ocupado) setEdicao(null);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto"
          onCloseAutoFocus={devolverFoco}
        >
          <DialogHeader>
            <DialogTitle>
              {edicao?.lembrete ? 'Editar lembrete' : 'Novo lembrete'}
            </DialogTitle>
            <DialogDescription>
              Escolha a atividade, o horário e os dias. Você pode desativar
              depois.
            </DialogDescription>
          </DialogHeader>
          {edicao && (
            <FormularioDeLembrete
              key={edicao.lembrete?.id ?? 'novo'}
              inicial={edicao.lembrete}
              ocupado={ocupado}
              aoCancelar={() => setEdicao(null)}
              aoSalvar={async (dados) => {
                const l = edicao.lembrete;
                await executar(
                  () =>
                    requisitar(
                      l ? `/api/lembretes/${l.id}` : '/api/lembretes',
                      l ? 'PUT' : 'POST',
                      l ? { ...dados, versao: l.versao } : dados
                    ),
                  'Lembrete salvo.'
                );
                setEdicao(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={exclusao !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !ocupado) setExclusao(null);
        }}
      >
        <AlertDialogContent onCloseAutoFocus={devolverFoco}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              “{exclusao?.titulo}” e seus avisos serão removidos. Seus hábitos e
              registros de bem-estar serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={ocupado}
              onClick={(e) => {
                e.preventDefault();
                if (!exclusao) return;
                const l = exclusao;
                void executar(
                  () =>
                    requisitar(`/api/lembretes/${l.id}`, 'DELETE', {
                      versao: l.versao,
                    }),
                  'Lembrete excluído.'
                )
                  .then(() => setExclusao(null))
                  .catch((e) => toast.error(mensagem(e)));
              }}
            >
              Excluir lembrete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

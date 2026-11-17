'use client';

import { useCallback, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  ExternalLink,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { usePlanFeatureAccess } from '@/hooks/use-plan-feature-access';
import { buscarJson } from '@/lib/http/transporte';
import { NOMES_DOS_VINCULOS } from '@/lib/lyra/vinculos-familiares';
import {
  CONDICOES,
  type ItemDoPlano,
  NOME_DA_CONDICAO,
  NOME_DO_PARENTE,
  PARENTES,
  type SituacaoDoExame,
} from '@/lib/prevencao/plano';
import type { PlanoComDados } from '@/lib/prevencao/servico';
import { cn } from '@/lib/utils';

const ROTA = '/api/prevencao';

const SITUACAO: Record<
  SituacaoDoExame,
  {
    rotulo: string;
    variante: 'success' | 'warning' | 'destructive' | 'info';
    ponto: string;
  }
> = {
  'em-dia': { rotulo: 'Em dia', variante: 'success', ponto: 'bg-success' },
  pendente: { rotulo: 'Fazer', variante: 'warning', ponto: 'bg-warning' },
  vencido: {
    rotulo: 'Vencido',
    variante: 'destructive',
    ponto: 'bg-destructive',
  },
  conversar: {
    rotulo: 'Conversar com o médico',
    variante: 'info',
    ponto: 'bg-info',
  },
};

/** Prioridade na lista do card: o que pede ação primeiro. */
const PRIORIDADE: Record<SituacaoDoExame, number> = {
  vencido: 0,
  pendente: 1,
  conversar: 2,
  'em-dia': 3,
};

/**
 * Sinais que pedem atendimento logo, em qualquer idade e mesmo com os
 * exames em dia (Ministério da Saúde e INCA).
 */
const SINAIS_DE_ALERTA = [
  'Dor ou aperto no peito, falta de ar súbita ou desmaio: procure atendimento de urgência (SAMU 192).',
  'Fraqueza ou dormência de um lado do corpo, boca torta ou fala enrolada: pode ser AVC, ligue 192 na hora.',
  'Nódulo na mama ou em outra parte do corpo que cresce, endurece ou não some; secreção com sangue pelo mamilo.',
  'Sangue nas fezes ou na urina, ou mudança persistente no hábito intestinal.',
  'Perda de peso sem explicação, cansaço intenso que não passa, febre persistente.',
  'Muita sede, urina em excesso e visão embaçada.',
  'Pensamentos de se ferir ou de não querer viver: ligue para o CVV (188, gratuito, 24 horas) ou procure ajuda.',
];

function dataBr(iso: string) {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
}

/** Anel de progresso dos exames em dia. */
function Anel({ emDia, total }: { emDia: number; total: number }) {
  const raio = 30;
  const volta = 2 * Math.PI * raio;
  const fracao = total === 0 ? 0 : emDia / total;
  return (
    <div className="relative size-20 shrink-0">
      <svg
        viewBox="0 0 72 72"
        className="size-20 -rotate-90"
        role="img"
        aria-label={`${emDia} de ${total} exames de rotina em dia`}
      >
        <circle
          cx="36"
          cy="36"
          r={raio}
          fill="none"
          strokeWidth="7"
          className="stroke-muted"
        />
        <circle
          cx="36"
          cy="36"
          r={raio}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-success transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - fracao)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-xl font-semibold text-foreground tabular-nums">
          {emDia}/{total}
        </span>
        <span className="mt-0.5 text-[0.65rem] text-muted-foreground">
          em dia
        </span>
      </span>
    </div>
  );
}

function Exame({
  item,
  salvando,
  aoSalvar,
}: {
  item: ItemDoPlano;
  salvando: boolean;
  aoSalvar: (data: string | null) => void;
}) {
  const [data, setData] = useState(item.ultimoEm ?? '');
  const situacao = SITUACAO[item.situacao];
  const campo = `exame-${item.id}`;
  return (
    <article className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-display text-base font-semibold text-foreground">
          {item.nome}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={situacao.variante}>{situacao.rotulo}</Badge>
          {!item.conferido ? (
            <Badge variant="outline">Recomendação em revisão</Badge>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-6 text-foreground/90">
        <span className="font-medium">Procura: </span>
        {item.procura}.
      </p>
      <p className="text-sm leading-6 text-foreground/90">{item.motivo}</p>
      {item.historicoNaFamilia.length > 0 ? (
        <p className="rounded-md bg-warning-light px-3 py-2 text-xs leading-5 text-warning">
          Na sua família: {item.historicoNaFamilia.join('; ')}.
        </p>
      ) : null}
      {item.paraQuem ? (
        <p className="text-xs text-muted-foreground">{item.paraQuem}</p>
      ) : null}
      <details className="text-sm leading-6 text-foreground/90">
        <summary className="cursor-pointer font-medium text-primary">
          Orientação oficial
        </summary>
        <p className="mt-2">{item.orientacao}</p>
        <a
          href={item.fonte.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
        >
          {item.fonte.nome}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </details>
      {item.situacao !== 'conversar' ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label htmlFor={campo} className="text-xs">
              Último exame
            </Label>
            <Input
              id={campo}
              type="date"
              value={data}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(evento) => setData(evento.target.value)}
              className="h-9 w-44"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={salvando || !data || data === item.ultimoEm}
            onClick={() => aoSalvar(data)}
          >
            Salvar data
          </Button>
          {item.ultimoEm ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={salvando}
              onClick={() => {
                setData('');
                aoSalvar(null);
              }}
            >
              Apagar registro
            </Button>
          ) : null}
          {item.proximoEm ? (
            <p className="w-full text-xs text-muted-foreground">
              Próximo a partir de {dataBr(item.proximoEm)}.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Prevenção no painel principal (tarefa 210): exames indicados para a
 * pessoa, a situação de cada um, o histórico da família e o cuidado com o
 * estresse dos vínculos que pesam. O cálculo é do motor da Lyra, com as
 * recomendações oficiais revisadas pela administração.
 */
export function PrevencaoCard({ className }: { className?: string }) {
  const { session } = useAuth();
  const acesso = usePlanFeatureAccess('daily_checkin');
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<PlanoComDados | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pedir = useCallback(async () => {
    const resposta = await buscarJson(ROTA, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as PlanoComDados;
  }, []);
  const avisar = useCallback(() => {
    // Sem o plano, o card simplesmente não aparece; o erro já foi registrado
    // pela rota.
  }, []);
  const { data: carregado, loading } = useKeyedResource<PlanoComDados | null>(
    session && acesso.enabled ? `prevencao:${session.user.id}` : null,
    pedir,
    avisar,
    null
  );
  const plano = atual ?? carregado;

  async function alterar(corpo: unknown, sucesso: string) {
    setSalvando(true);
    const resposta = await buscarJson(ROTA, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    setSalvando(false);
    if (!resposta.ok) {
      toast.error('Não foi possível salvar.', {
        description: resposta.falha.message,
      });
      return;
    }
    setAtual(resposta.corpo as PlanoComDados);
    toast.success(sucesso);
  }

  if (!session || !acesso.enabled) return null;
  if (loading) {
    return (
      <section className={cn('p-5 sm:p-6', className)} aria-busy="true">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-4 h-24 w-full" />
      </section>
    );
  }
  if (!plano) return null;

  const ordenados = [...plano.itens].sort(
    (a, b) => PRIORIDADE[a.situacao] - PRIORIDADE[b.situacao]
  );
  const destaque = ordenados.slice(0, 3);
  const temHistorico = (parente: string, condicao: string) =>
    plano.historico.some(
      (h) => h.parente === parente && h.condicao === condicao
    );

  return (
    <section
      className={cn('space-y-5 p-5 sm:p-6', className)}
      aria-labelledby="titulo-prevencao"
    >
      <div className="flex flex-wrap items-start gap-5">
        <Anel emDia={plano.emDia} total={plano.total} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2
            id="titulo-prevencao"
            className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground"
          >
            <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
            Cuidar de você: prevenção
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Exames indicados para a sua idade e o seu histórico, pelas
            recomendações oficiais. Fazer na hora certa é o que permite
            descobrir cedo.
          </p>
        </div>
      </div>

      {plano.faltando.includes('idade') ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Informe sua data de nascimento no perfil para ver os exames indicados
          para você.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {destaque.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-4 transition-shadow duration-(--duracao-rapida) hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    SITUACAO[item.situacao].ponto
                  )}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {SITUACAO[item.situacao].rotulo}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold leading-snug text-foreground">
                {item.nome}
              </h3>
              <p className="line-clamp-2 text-sm leading-6 text-foreground/80">
                Procura {item.procura}.
              </p>
            </li>
          ))}
        </ul>
      )}

      {plano.estresse ? (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning-light p-4">
          <HeartPulse
            className="mt-0.5 size-5 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p className="text-sm leading-6 text-warning">
            Você disse que o vínculo com{' '}
            {plano.estresse.vinculos.join(', ').toLowerCase()} pesa. O estresse
            prolongado também é cuidado de saúde: veja os exames e as
            orientações em “Abrir para saber mais”.
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={() => setAberto(true)}
        className="gap-1.5"
      >
        Abrir para saber mais
        <ChevronRight aria-hidden="true" />
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <div className="space-y-1 pr-6">
            <DialogTitle className="font-display text-2xl">
              Cuidar de você: prevenção
            </DialogTitle>
            <DialogDescription className="leading-6">
              {plano.aviso}
            </DialogDescription>
          </div>
          <Tabs defaultValue="exames" className="mt-2">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="exames" className="gap-1.5 whitespace-normal">
                <CalendarCheck className="size-4" aria-hidden="true" />
                Seus exames
              </TabsTrigger>
              <TabsTrigger
                value="familia"
                className="gap-1.5 whitespace-normal"
              >
                <Users className="size-4" aria-hidden="true" />
                Família
              </TabsTrigger>
              <TabsTrigger
                value="vinculos"
                className="gap-1.5 whitespace-normal"
              >
                <HeartPulse className="size-4" aria-hidden="true" />
                Vínculos e estresse
              </TabsTrigger>
              <TabsTrigger value="alerta" className="gap-1.5 whitespace-normal">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Sinais de alerta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exames" className="space-y-3 pt-3">
              {plano.itens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Informe sua data de nascimento no perfil para ver os exames
                  indicados.
                </p>
              ) : (
                ordenados.map((item) => (
                  <Exame
                    key={`${item.id}:${item.ultimoEm ?? ''}`}
                    item={item}
                    salvando={salvando}
                    aoSalvar={(data) =>
                      void alterar(
                        {
                          tipo: 'exame',
                          recomendacaoId: item.id,
                          realizadoEm: data,
                        },
                        data ? 'Data do exame salva.' : 'Registro apagado.'
                      )
                    }
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="familia" className="space-y-4 pt-3">
              <p className="text-sm leading-6 text-foreground/90">
                Marque o que parentes de sangue já tiveram. O histórico da
                família muda quando e como alguns exames devem ser feitos; a
                Lyra usa isso só para orientar a sua prevenção.
              </p>
              <div className="space-y-4">
                {CONDICOES.map((condicao) => (
                  <fieldset
                    key={condicao}
                    className="rounded-xl border border-border p-4"
                  >
                    <legend className="px-1 text-sm font-semibold text-foreground">
                      {NOME_DA_CONDICAO[condicao]}
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                      {PARENTES.map((parente) => {
                        const id = `historico-${condicao}-${parente}`;
                        return (
                          <div
                            key={parente}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={id}
                              checked={temHistorico(parente, condicao)}
                              disabled={salvando}
                              onCheckedChange={(marcado) =>
                                void alterar(
                                  {
                                    tipo: 'historico',
                                    parente,
                                    condicao,
                                    presente: marcado === true,
                                  },
                                  'Histórico da família atualizado.'
                                )
                              }
                            />
                            <Label htmlFor={id} className="text-sm font-normal">
                              {NOME_DO_PARENTE[parente]}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="vinculos" className="space-y-4 pt-3">
              <p className="text-sm leading-6 text-foreground/90">
                O mapa sugere temas; quem diz se um vínculo pesa é você. Quando
                pesa por muito tempo, o estresse afeta o corpo, e cuidar disso
                também é prevenção.
              </p>
              <ul className="space-y-3">
                {Object.entries(NOMES_DOS_VINCULOS).map(([id, nome]) => (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <span
                      id={`vinculo-${id}`}
                      className="text-sm font-medium text-foreground"
                    >
                      {nome}: este vínculo pesa para você hoje?
                    </span>
                    <ToggleGroup
                      type="single"
                      aria-labelledby={`vinculo-${id}`}
                      value={plano.vinculosRespondidos[id] ?? ''}
                      disabled={salvando}
                      onValueChange={(valor) => {
                        if (!valor) return;
                        void alterar(
                          { tipo: 'vinculo', vinculoId: id, pesa: valor },
                          'Resposta salva.'
                        );
                      }}
                      className="gap-1"
                    >
                      <ToggleGroupItem value="sim" size="sm">
                        Sim
                      </ToggleGroupItem>
                      <ToggleGroupItem value="as-vezes" size="sm">
                        Às vezes
                      </ToggleGroupItem>
                      <ToggleGroupItem value="nao" size="sm">
                        Não
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </li>
                ))}
              </ul>
              {plano.estresse ? (
                <div className="space-y-2 rounded-xl border border-warning/30 bg-warning-light p-4 text-sm leading-6 text-warning">
                  <p>{plano.estresse.texto}</p>
                  {plano.estresse.exames.length > 0 ? (
                    <p>
                      Exames para acompanhar:{' '}
                      {plano.itens
                        .filter((item) =>
                          plano.estresse!.exames.includes(item.id)
                        )
                        .map((item) => item.nome)
                        .join(', ')}
                      .
                    </p>
                  ) : null}
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="alerta" className="space-y-3 pt-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Stethoscope
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                Procure atendimento logo, em qualquer idade, se notar:
              </p>
              <ul className="space-y-2">
                {SINAIS_DE_ALERTA.map((sinal) => (
                  <li
                    key={sinal}
                    className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive-light px-3 py-2 text-sm leading-6 text-destructive"
                  >
                    <AlertTriangle
                      className="mt-1 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {sinal}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </section>
  );
}

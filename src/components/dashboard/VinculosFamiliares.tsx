'use client';

import { useState } from 'react';
import {
  ChevronRight,
  HeartHandshake,
  HeartPulse,
  Lightbulb,
  LoaderCircle,
  ScrollText,
  Sprout,
  Users,
  Waves,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { buscarJson } from '@/lib/http/transporte';
import type {
  IdDoVinculo,
  LeituraDoVinculo,
  VinculosFamiliares as Vinculos,
} from '@/lib/lyra/vinculos-familiares';
import type { PlanoComDados } from '@/lib/prevencao/servico';
import type { SituacaoDoExame } from '@/lib/prevencao/plano';
import { cn } from '@/lib/utils';

const TOM = {
  apoio: {
    rotulo: 'Mais apoio',
    variante: 'success',
    ponto: 'bg-success',
  },
  atrito: {
    rotulo: 'Pede atenção',
    variante: 'warning',
    ponto: 'bg-warning',
  },
  equilibrio: {
    rotulo: 'Em equilíbrio',
    variante: 'info',
    ponto: 'bg-info',
  },
} as const;

const PESO = [
  { valor: 'sim', rotulo: 'Sim, pesa' },
  { valor: 'as-vezes', rotulo: 'Às vezes' },
  { valor: 'nao', rotulo: 'Não pesa' },
] as const;
type Peso = (typeof PESO)[number]['valor'];

const SITUACAO: Record<SituacaoDoExame, { rotulo: string; ponto: string }> = {
  'em-dia': { rotulo: 'Em dia', ponto: 'bg-success' },
  pendente: { rotulo: 'Fazer', ponto: 'bg-warning' },
  vencido: { rotulo: 'Vencido', ponto: 'bg-destructive' },
  conversar: { rotulo: 'Conversar com o médico', ponto: 'bg-info' },
};

/** Nomes curtos nos botões do resumo; o detalhe mostra o nome completo. */
const NOME_NO_BOTAO: Partial<Record<IdDoVinculo, string>> = {
  conjuge: 'Cônjuge',
};

const ROTA_DA_PREVENCAO = '/api/prevencao';

function Secao({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof Users;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Icone className="size-4 text-primary" aria-hidden="true" />
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Lista({ itens, vazio }: { itens: readonly string[]; vazio: string }) {
  return itens.length > 0 ? (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground/90">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="text-sm leading-6 text-muted-foreground">{vazio}</p>
  );
}

/**
 * Cuidar de você (tarefa 213): a pessoa diz se o vínculo pesa, e ao lado
 * aparecem os exames de prevenção indicados pela idade e pelo corpo, do
 * catálogo oficial do motor. Não associa doença a conflito: o estresse que
 * pesa é motivo para cuidar também do corpo, com os exames em dia.
 */
function CuidarDeVoce({
  vinculo,
  plano,
  carregando,
  aoResponder,
}: {
  vinculo: LeituraDoVinculo;
  plano: PlanoComDados | null | 'indisponivel';
  carregando: boolean;
  aoResponder: (id: IdDoVinculo, peso: Peso) => void;
}) {
  if (plano === 'indisponivel') {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        A prevenção não está disponível no seu plano agora.
      </p>
    );
  }
  if (!plano) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Carregando a sua prevenção…
      </p>
    );
  }
  const resposta = plano.vinculosRespondidos[vinculo.id] as Peso | undefined;
  const exames = plano.itens.filter((item) => item.situacao !== 'em-dia');
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm leading-6 text-foreground/90">
          Este vínculo pesa para você hoje?
        </legend>
        <div className="flex flex-wrap gap-2">
          {PESO.map((opcao) => (
            <Button
              key={opcao.valor}
              type="button"
              size="sm"
              variant={resposta === opcao.valor ? 'default' : 'outline'}
              aria-pressed={resposta === opcao.valor}
              disabled={carregando}
              onClick={() => aoResponder(vinculo.id, opcao.valor)}
            >
              {opcao.rotulo}
            </Button>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          A resposta fica só com você e ajuda a Lyra a lembrar do cuidado com o
          estresse.
        </p>
      </fieldset>

      {resposta && resposta !== 'nao' && plano.estresse ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6 text-foreground/90">
          {plano.estresse.texto}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {exames.length
            ? 'Exames de prevenção indicados para você agora'
            : 'Seus exames de prevenção estão em dia.'}
        </p>
        {exames.length ? (
          <ul className="space-y-2">
            {exames.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    SITUACAO[item.situacao].ponto
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">
                    {item.nome}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {SITUACAO[item.situacao].rotulo}
                    </span>
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {item.motivo}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs leading-5 text-muted-foreground">{plano.aviso}</p>
      </div>
    </div>
  );
}

/**
 * Vínculos familiares no painel principal (tarefas 208 e 213): um resumo
 * compacto com os parentes, que abre a tela completa; cada parente abre a
 * leitura simbólica do mapa védico e o cuidado com a prevenção. Sem
 * diagnóstico nem previsão.
 */
export function VinculosFamiliares({
  dados,
  className,
}: {
  dados: Vinculos | null;
  className?: string;
}) {
  const [todosAbertos, setTodosAbertos] = useState(false);
  const [aberto, setAberto] = useState<LeituraDoVinculo | null>(null);
  const [plano, setPlano] = useState<PlanoComDados | null | 'indisponivel'>(
    null
  );
  const [salvando, setSalvando] = useState(false);
  if (!dados) return null;

  async function lerPrevencao() {
    if (plano !== null) return;
    const resposta = await buscarJson(ROTA_DA_PREVENCAO, {
      cache: 'no-store',
    });
    setPlano(resposta.ok ? (resposta.corpo as PlanoComDados) : 'indisponivel');
  }

  function abrirVinculo(vinculo: LeituraDoVinculo) {
    setAberto(vinculo);
    void lerPrevencao();
  }

  async function responder(id: IdDoVinculo, peso: Peso) {
    setSalvando(true);
    const resposta = await buscarJson(ROTA_DA_PREVENCAO, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'vinculo', vinculoId: id, pesa: peso }),
    });
    setSalvando(false);
    if (!resposta.ok) {
      toast.error('Não foi possível salvar a resposta.', {
        description: resposta.falha.message,
      });
      return;
    }
    setPlano(resposta.corpo as PlanoComDados);
  }

  return (
    <section
      className={cn('flex min-h-0 flex-col gap-3 p-5 sm:p-6', className)}
      aria-labelledby="titulo-vinculos"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="titulo-vinculos"
            className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground"
          >
            <Users className="size-6 text-primary" aria-hidden="true" />
            Vínculos familiares
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Toque em um parente para ver a leitura do seu mapa.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setTodosAbertos(true)}
        >
          Ver tudo
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {/* Só a lista rola, se faltar altura: o título e as margens do cartão
          ficam fixos e os botões não encostam nas bordas. */}
      <ul
        className="-mx-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto px-1 py-1 sm:grid-cols-3"
        aria-label="Parentes"
      >
        {dados.vinculos.map((vinculo) => (
          <li key={vinculo.id}>
            <button
              type="button"
              onClick={() => abrirVinculo(vinculo)}
              className="flex w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/60 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${vinculo.nome}: ${TOM[vinculo.tom].rotulo}`}
              title={vinculo.nome}
            >
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  TOM[vinculo.tom].ponto
                )}
                aria-hidden="true"
              />
              <span className="truncate">
                {NOME_NO_BOTAO[vinculo.id] ?? vinculo.nome}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Tela completa: todos os vínculos com o resumo de cada um. */}
      <Dialog open={todosAbertos} onOpenChange={setTodosAbertos}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <div className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle className="flex items-center gap-2 font-display text-2xl">
                <Users className="size-6 text-primary" aria-hidden="true" />
                Vínculos familiares no seu mapa
              </DialogTitle>
              <DialogDescription className="leading-6">
                Possíveis pontos de atrito e de apoio com a família, lidos de
                forma simbólica no mapa védico. Servem para reflexão, não
                descrevem as pessoas reais.
              </DialogDescription>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dados.vinculos.map((vinculo) => (
                <li
                  key={vinculo.id}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {vinculo.nome}
                    </h3>
                    <Badge variant={TOM[vinculo.tom].variante}>
                      {TOM[vinculo.tom].rotulo}
                    </Badge>
                  </div>
                  <p className="line-clamp-4 text-sm leading-6 text-foreground/90">
                    {vinculo.resumo}
                  </p>
                  <button
                    type="button"
                    className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => abrirVinculo(vinculo)}
                  >
                    Abrir para saber mais
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-5 text-muted-foreground">
              {dados.limite} Primos e tios paternos não têm regra fixa na
              tradição e não aparecem aqui.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhe de um parente, por cima da tela completa quando aberta. */}
      <Dialog
        open={aberto !== null}
        onOpenChange={(valor) => {
          if (!valor) setAberto(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {aberto ? (
            <div className="space-y-5">
              <div className="space-y-2 pr-6">
                <Badge variant={TOM[aberto.tom].variante}>
                  {TOM[aberto.tom].rotulo}
                </Badge>
                <DialogTitle className="font-display text-2xl">
                  {aberto.nome}
                </DialogTitle>
                <DialogDescription className="leading-6">
                  {aberto.resumo}
                </DialogDescription>
              </div>
              <Secao
                icone={HeartHandshake}
                titulo="O que este vínculo representa"
              >
                <p className="text-sm leading-6 text-foreground/90">
                  Na tradição védica, este vínculo fala de {aberto.tema}.
                </p>
              </Secao>
              <Secao icone={Waves} titulo="Possíveis pontos de atrito">
                <Lista
                  itens={aberto.atritos}
                  vazio="O mapa não mostra sinais tradicionais de atrito neste vínculo."
                />
              </Secao>
              <Secao icone={Sprout} titulo="O que fortalece o vínculo">
                <Lista
                  itens={aberto.apoios}
                  vazio="O mapa não mostra sinais tradicionais de apoio destacados neste vínculo."
                />
              </Secao>
              <Secao icone={Lightbulb} titulo="Para refletir">
                <Lista itens={aberto.reflexoes} vazio="" />
              </Secao>
              <Secao icone={HeartPulse} titulo="Cuidar de você">
                {salvando ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <LoaderCircle
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Salvando…
                  </p>
                ) : null}
                <CuidarDeVoce
                  vinculo={aberto}
                  plano={plano}
                  carregando={salvando}
                  aoResponder={(id, peso) => void responder(id, peso)}
                />
              </Secao>
              <Secao icone={ScrollText} titulo="De onde vem esta leitura">
                <p className="text-sm leading-6 text-foreground/90">
                  {aberto.origem}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {dados.limite}
                </p>
              </Secao>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

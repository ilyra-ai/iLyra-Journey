'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import type { PainelDoFunil, Taxa } from '@/lib/funil/painel';
import { buscarJson } from '@/lib/http/transporte';

const PERIODOS = [7, 30, 90] as const;

const NOMES_DOS_DETALHES: Record<string, string> = {
  email: 'E-mail',
  google: 'Google',
  apple: 'Apple',
  inicio: 'Botão da página inicial',
  mapa: 'Cartão do mapa ocidental',
  link: 'Link de cartão compartilhado',
  signo: 'Com signo',
  incerto: 'Data de troca de signo',
  compartilhar: 'Compartilhar',
  baixar: 'Baixar',
  plano: 'Plano sem contribuição',
  outro_preco: 'Preço fora das opções',
  'landing-feature-1': 'Védico',
  'landing-feature-2': 'Lyra DM Samādhi',
  'landing-feature-3': 'Quantum',
};

function nomeDoDetalhe(detalhe: string) {
  const contribuicao = /^colaboracao_(\d+)$/.exec(detalhe);
  if (contribuicao)
    return `Contribuição de ${(Number(contribuicao[1]) / 100).toLocaleString(
      'pt-BR',
      { style: 'currency', currency: 'BRL' }
    )}`;
  return NOMES_DOS_DETALHES[detalhe] ?? detalhe;
}

const inteiro = (n: number) => n.toLocaleString('pt-BR');
const porcentagem = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const dataCurta = (dia: string) => dia.split('-').reverse().join('/');

function LinhaDaTaxa({ taxa }: { taxa: Taxa }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 last:border-0">
      <span>{taxa.rotulo}</span>
      <span className="font-medium tabular-nums">
        {taxa.valor === null
          ? 'sem dados'
          : `${porcentagem(taxa.valor)} (${inteiro(taxa.numerador)} de ${inteiro(taxa.denominador)})`}
      </span>
    </li>
  );
}

function Fato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-2xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

function retorno({
  coorte,
  retornaram,
}: {
  coorte: number;
  retornaram: number;
}) {
  return coorte === 0
    ? 'sem contas na idade'
    : `${porcentagem(retornaram / coorte)} (${inteiro(retornaram)} de ${inteiro(coorte)})`;
}

/**
 * Painel do funil (tarefa 170). Sem gráfico decorativo: números da tabela,
 * com "sem dados" quando não há base para a porcentagem.
 */
export function FunilAdmin() {
  const { session } = useAuth();
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);

  const pedir = useCallback(async () => {
    const resposta = await buscarJson(`/api/admin/funil?dias=${dias}`, {
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as PainelDoFunil;
  }, [dias]);
  const avisar = useCallback((erro: unknown) => {
    toast.error('Não foi possível ler o funil.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const { data: painel, loading } = useKeyedResource<PainelDoFunil | null>(
    session ? `funil:${session.user.id}:${dias}` : null,
    pedir,
    avisar,
    null
  );

  const semEtapas = painel?.etapas.every((e) => e.total === 0) ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={String(dias)}
          onValueChange={(valor) => {
            if (valor) setDias(Number(valor) as (typeof PERIODOS)[number]);
          }}
          aria-label="Período do painel"
          variant="outline"
        >
          {PERIODOS.map((p) => (
            <ToggleGroupItem
              key={p}
              value={String(p)}
              className="min-h-11 px-4"
            >
              {p} dias
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {painel ? (
          <p className="text-sm text-muted-foreground">
            {dataCurta(painel.periodo.de)} a {dataCurta(painel.periodo.ate)},
            horário de Brasília
          </p>
        ) : null}
      </div>

      {loading && !painel ? <Skeleton className="h-96 w-full" /> : null}

      {painel ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Etapas da descoberta</CardTitle>
              <CardDescription>
                Contagens anônimas: sem nome, data de nascimento, e-mail ou
                identificador de pessoa ou aparelho. Visitas contam uma vez por
                aba; robôs conhecidos ficam de fora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {semEtapas ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma etapa registrada neste período.
                </p>
              ) : (
                <ol className="grid gap-2">
                  {painel.etapas.map((e) => (
                    <li
                      key={e.etapa}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span>{e.rotulo}</span>
                        <span className="text-lg font-semibold tabular-nums">
                          {inteiro(e.total)}
                        </span>
                      </div>
                      {e.detalhes.length ? (
                        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {e.detalhes.map((d) => (
                            <li key={d.detalhe}>
                              {nomeDoDetalhe(d.detalhe)}: {inteiro(d.total)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxas entre etapas</CardTitle>
              <CardDescription>
                Proporções no mesmo período. Contagens anônimas não seguem a
                mesma pessoa de uma etapa à outra: leia como tendência, não como
                conversão individual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                {painel.taxas.map((t) => (
                  <LinhaDaTaxa key={t.rotulo} taxa={t} />
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cobrança e contas</CardTitle>
              <CardDescription>
                Lido das tabelas de contas e de cobrança. Pagamento só conta
                depois de confirmado pelo webhook da Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Fato
                  rotulo="Contas criadas no período"
                  valor={inteiro(painel.fatos.contasCriadas)}
                />
                <Fato
                  rotulo="Pagamentos confirmados no período"
                  valor={inteiro(painel.fatos.pagamentosConfirmados)}
                />
                <Fato
                  rotulo="Faturas pagas no período"
                  valor={inteiro(painel.fatos.faturasPagas)}
                />
                <Fato
                  rotulo="Cancelamentos no período"
                  valor={inteiro(painel.fatos.cancelamentos)}
                />
                <Fato
                  rotulo="Assinaturas ativas agora"
                  valor={inteiro(painel.fatos.assinaturasAtivas)}
                />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Composição das assinaturas ativas
                </p>
                {painel.fatos.contribuicoes.length ? (
                  <ul className="mt-1 text-sm">
                    {painel.fatos.contribuicoes.map((c) => (
                      <li key={c.opcao}>
                        {nomeDoDetalhe(c.opcao)}: {inteiro(c.assinaturas)} (
                        {porcentagem(
                          c.assinaturas / painel.fatos.assinaturasAtivas
                        )}
                        )
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma assinatura ativa pela Stripe.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Retorno das contas</CardTitle>
                <CardDescription>
                  Contas de pessoas criadas nos últimos 90 dias que voltaram a
                  conversar com a Lyra a partir do 7º e do 30º dia.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>
                  <span className="font-medium">D7:</span>{' '}
                  {retorno(painel.retencao.d7)}
                </p>
                <p>
                  <span className="font-medium">D30:</span>{' '}
                  {retorno(painel.retencao.d30)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Custo de IA em {painel.custoDeIa.mes}</CardTitle>
                <CardDescription>
                  Pelos preços cadastrados em Configuração de IA. Modelos locais
                  não têm custo por token.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>Chamadas no mês: {inteiro(painel.custoDeIa.chamadas)}</p>
                {painel.custoDeIa.porMoeda.length ? (
                  painel.custoDeIa.porMoeda.map((m) => (
                    <p key={m.moeda}>
                      {m.total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: m.moeda,
                        maximumFractionDigits: 4,
                      })}{' '}
                      no total
                      {m.porAssinante === null
                        ? ''
                        : `, ${m.porAssinante.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: m.moeda,
                            maximumFractionDigits: 4,
                          })} por assinatura ativa`}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    Sem custo calculado neste mês.
                  </p>
                )}
                {painel.custoDeIa.chamadasSemPreco > 0 ? (
                  <p className="text-muted-foreground">
                    {inteiro(painel.custoDeIa.chamadasSemPreco)} chamadas em
                    nuvem sem preço cadastrado ficaram fora do custo.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

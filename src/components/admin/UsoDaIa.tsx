'use client';

import { useCallback, useState } from 'react';
import { Coins, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import type { LinhaDoResumo, Preco } from '@/lib/ai/uso-servico';
import { buscarJson } from '@/lib/http/transporte';

const ROTA = '/api/admin/ia/uso';

interface Resumo {
  mes: string;
  linhas: LinhaDoResumo[];
  precos: Preco[];
}

const inteiro = new Intl.NumberFormat('pt-BR');

function moeda(valor: number, codigo: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: codigo,
    maximumFractionDigits: 4,
  }).format(valor);
}

const PRECO_VAZIO = {
  provedor: '',
  modelo: '',
  moeda: 'USD',
  entradaPorMilhao: '',
  saidaPorMilhao: '',
  fonte: '',
  consultadoEm: '',
};

/**
 * Uso de tokens e custo da IA (tarefa 163): totais do mês por provedor e
 * modelo, sem dados de quem usou. O custo só aparece para modelos em nuvem
 * com preço cadastrado a partir da tabela oficial do provedor.
 */
export function UsoDaIa() {
  const { session } = useAuth();
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [atual, setAtual] = useState<Resumo | null>(null);
  const [preco, setPreco] = useState(PRECO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const pedir = useCallback(async () => {
    const resposta = await buscarJson(`${ROTA}?mes=${mes}`, {
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    return resposta.corpo as Resumo;
  }, [mes]);
  const avisar = useCallback((erro: unknown) => {
    toast.error('Não foi possível ler o uso de IA.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const { data, loading } = useKeyedResource<Resumo | null>(
    session ? `uso-ia:${session.user.id}:${mes}` : null,
    pedir,
    avisar,
    null
  );
  const resumo = atual?.mes === mes ? atual : data;

  async function salvarPreco() {
    setSalvando(true);
    const resposta = await buscarJson(ROTA, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...preco,
        moeda: preco.moeda.trim().toUpperCase(),
        entradaPorMilhao: Number(preco.entradaPorMilhao.replace(',', '.')),
        saidaPorMilhao: Number(preco.saidaPorMilhao.replace(',', '.')),
      }),
    });
    setSalvando(false);
    if (!resposta.ok) {
      toast.error('Não foi possível salvar o preço.', {
        description: resposta.falha.message,
      });
      return;
    }
    setPreco(PRECO_VAZIO);
    toast.success('Preço salvo.');
    const novo = await pedir().catch(() => null);
    if (novo) setAtual(novo);
  }

  async function retirar(p: Preco) {
    const resposta = await buscarJson(
      `${ROTA}?${new URLSearchParams({ provedor: p.provedor, modelo: p.modelo })}`,
      { method: 'DELETE' }
    );
    if (!resposta.ok) {
      toast.error('Não foi possível retirar o preço.', {
        description: resposta.falha.message,
      });
      return;
    }
    const novo = await pedir().catch(() => null);
    if (novo) setAtual(novo);
  }

  const totais = (resumo?.linhas ?? []).reduce(
    (soma, l) => ({
      chamadas: soma.chamadas + l.chamadas,
      entrada: soma.entrada + l.tokensEntrada,
      saida: soma.saida + l.tokensSaida,
    }),
    { chamadas: 0, entrada: 0, saida: 0 }
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins aria-hidden="true" className="size-5" />
          Uso e custo da IA
        </CardTitle>
        <CardDescription>
          Tokens de cada modelo no mês, sem dados de quem usou. O custo é
          estimado só para modelos em nuvem com preço cadastrado; modelos locais
          não cobram por token.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="uso-ia-mes">Mês</Label>
            <Input
              id="uso-ia-mes"
              type="month"
              value={mes}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              className="w-44"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {inteiro.format(totais.chamadas)} chamadas ·{' '}
            {inteiro.format(totais.entrada)} tokens de entrada ·{' '}
            {inteiro.format(totais.saida)} de saída
          </p>
        </div>

        {loading && !resumo ? (
          <Skeleton className="h-24 w-full" />
        ) : resumo && resumo.linhas.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Uso de IA por modelo no mês</caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Modelo</th>
                  <th className="py-2 pr-3 text-right font-medium">Chamadas</th>
                  <th className="py-2 pr-3 text-right font-medium">Entrada</th>
                  <th className="py-2 pr-3 text-right font-medium">Saída</th>
                  <th className="py-2 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
                {resumo.linhas.map((l) => (
                  <tr
                    key={`${l.provedor}:${l.modelo}`}
                    className="border-t border-border"
                  >
                    <td className="py-2 pr-3">
                      <span className="font-medium">{l.modelo}</span>{' '}
                      <span className="text-muted-foreground">
                        · {l.provedor}
                      </span>{' '}
                      {l.local ? (
                        <Badge variant="secondary">local</Badge>
                      ) : null}
                      {l.falhas ? (
                        <span className="block text-xs text-muted-foreground">
                          {inteiro.format(l.falhas)} com falha
                          {l.semContagem
                            ? ` · ${inteiro.format(l.semContagem)} sem contagem do provedor`
                            : ''}
                        </span>
                      ) : l.semContagem ? (
                        <span className="block text-xs text-muted-foreground">
                          {inteiro.format(l.semContagem)} sem contagem do
                          provedor
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {inteiro.format(l.chamadas)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {inteiro.format(l.tokensEntrada)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {inteiro.format(l.tokensSaida)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {l.local
                        ? 'sem custo por token'
                        : l.custo !== null && l.moeda
                          ? moeda(l.custo, l.moeda)
                          : 'sem preço cadastrado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma chamada a modelo de IA neste mês.
          </p>
        )}

        <section className="space-y-3" aria-labelledby="uso-ia-precos">
          <h3 id="uso-ia-precos" className="font-medium">
            Preços oficiais por milhão de tokens
          </h3>
          <p className="text-sm text-muted-foreground">
            Copie o preço da página oficial do provedor e informe o endereço e a
            data da consulta. O provedor e o modelo precisam ser escritos como
            aparecem na tabela acima.
          </p>
          {resumo?.precos.length ? (
            <ul className="space-y-2 text-sm">
              {resumo.precos.map((p) => (
                <li
                  key={`${p.provedor}:${p.modelo}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <span>
                    <span className="font-medium">{p.modelo}</span> ·{' '}
                    {p.provedor}: entrada {moeda(p.entradaPorMilhao, p.moeda)},
                    saída {moeda(p.saidaPorMilhao, p.moeda)} ·{' '}
                    <a
                      href={p.fonte}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      fonte
                    </a>{' '}
                    de {p.consultadoEm.split('-').reverse().join('/')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void retirar(p)}
                    aria-label={`Retirar o preço de ${p.modelo}`}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['provedor', 'Provedor', 'text'],
                ['modelo', 'Modelo', 'text'],
                ['entradaPorMilhao', 'Entrada por milhão', 'text'],
                ['saidaPorMilhao', 'Saída por milhão', 'text'],
                ['moeda', 'Moeda (ex.: USD)', 'text'],
                ['consultadoEm', 'Data da consulta', 'date'],
              ] as const
            ).map(([campo, rotulo, tipo]) => (
              <div key={campo} className="grid gap-1.5">
                <Label htmlFor={`uso-ia-${campo}`}>{rotulo}</Label>
                <Input
                  id={`uso-ia-${campo}`}
                  type={tipo}
                  inputMode={campo.endsWith('Milhao') ? 'decimal' : undefined}
                  value={preco[campo]}
                  onChange={(e) =>
                    setPreco({ ...preco, [campo]: e.target.value })
                  }
                />
              </div>
            ))}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="uso-ia-fonte">
                Página oficial do preço (https)
              </Label>
              <Input
                id="uso-ia-fonte"
                type="url"
                value={preco.fonte}
                onChange={(e) => setPreco({ ...preco, fonte: e.target.value })}
              />
            </div>
          </div>
          <Button
            onClick={() => void salvarPreco()}
            disabled={
              salvando ||
              !preco.provedor ||
              !preco.modelo ||
              !preco.entradaPorMilhao ||
              !preco.saidaPorMilhao ||
              !preco.fonte ||
              !preco.consultadoEm
            }
          >
            Salvar preço
          </Button>
        </section>
      </CardContent>
    </Card>
  );
}

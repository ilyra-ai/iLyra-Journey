'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';
import type { QualidadeDoModelo } from '@/lib/qualidade/ia';
import type { ResultadoDasVerificacoes } from '@/lib/qualidade/verificacao';

interface Resposta {
  calculos: ResultadoDasVerificacoes & { duracaoMs: number };
  ia: { dias: number; modelos: QualidadeDoModelo[] };
}

const numero = (n: number, casas = 4) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: casas });
const ms = (n: number | null) =>
  n === null
    ? '—'
    : `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
const pct = (n: number | null) =>
  n === null
    ? '—'
    : n.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

/**
 * Centro de qualidade (tarefa 183). Cálculos: esperado, obtido, desvio e
 * tolerância de cada verificação contra Swiss Ephemeris e JPL, rodadas
 * agora. IA: falhas, cortes e latência por modelo, do registro de uso.
 */
export function QualidadeAdmin() {
  const { session } = useAuth();
  const [dias, setDias] = useState(30);
  const [soReprovadas, setSoReprovadas] = useState(false);

  const pedir = useCallback(async () => {
    const r = await buscarJson(`/api/admin/qualidade?dias=${dias}`, {
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(r.falha.message);
    return r.corpo as Resposta;
  }, [dias]);
  const avisar = useCallback((erro: unknown) => {
    toast.error('Não foi possível ler o centro de qualidade.', {
      description: erro instanceof Error ? erro.message : undefined,
    });
  }, []);
  const { data, loading } = useKeyedResource<Resposta | null>(
    session ? `qualidade:${session.user.id}:${dias}` : null,
    pedir,
    avisar,
    null
  );

  if (loading && !data) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;
  const { calculos, ia } = data;
  const lista = soReprovadas
    ? calculos.verificacoes.filter((v) => !v.aprovado)
    : calculos.verificacoes;

  return (
    <div className="min-w-0 space-y-6">
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Cálculos do Motor</CardTitle>
            <Badge variant={calculos.aprovado ? 'secondary' : 'destructive'}>
              {calculos.aprovado
                ? `Aprovado: ${calculos.total} de ${calculos.total}`
                : `${calculos.reprovadas} de ${calculos.total} fora da tolerância`}
            </Badge>
          </div>
          <CardDescription>
            Conjunto de verificações versão {calculos.versao}, executado agora
            em {calculos.duracaoMs} ms. Fontes independentes:{' '}
            {calculos.fontes.swiss}; {calculos.fontes.jpl}. O mesmo conjunto
            roda nos testes: uma regressão não passa nos gates de publicação.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soReprovadas}
              onChange={(e) => setSoReprovadas(e.target.checked)}
              className="size-4 accent-primary"
            />
            Mostrar só as reprovadas
          </label>
          {lista.length ? (
            <Table
              scrollLabel="Verificações do Motor (rolável)"
              caption="Esperado, obtido, desvio e tolerância de cada verificação"
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Caso</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Obtido</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                  <TableHead className="text-right">Tolerância</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.caso}</TableCell>
                    <TableCell>
                      {v.item}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({v.fonte === 'jpl' ? 'JPL' : 'Swiss'})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {v.unidade === 'dia' ? '0 dia' : `${numero(v.esperado)}°`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {v.unidade === 'dia'
                        ? `${numero(v.obtido, 2)} dia`
                        : `${numero(v.obtido)}°`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number.isFinite(v.desvio)
                        ? numero(v.desvio, 5)
                        : 'período errado'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numero(v.tolerancia, 3)}
                    </TableCell>
                    <TableCell>
                      {v.aprovado ? (
                        'dentro'
                      ) : (
                        <span className="font-semibold text-destructive">
                          fora
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma verificação reprovada.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Modelos de IA</CardTitle>
            <ToggleGroup
              type="single"
              value={String(dias)}
              onValueChange={(v) => {
                if (v) setDias(Number(v));
              }}
              aria-label="Período dos modelos"
              variant="outline"
            >
              {[7, 30, 90].map((p) => (
                <ToggleGroupItem
                  key={p}
                  value={String(p)}
                  className="min-h-11 px-4"
                >
                  {p} dias
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <CardDescription>
            Do registro de uso (só números, nunca pedidos ou respostas). A
            latência conta chamadas concluídas. O custo é do mês corrente pelo
            preço cadastrado. Nada aqui troca o modelo em produção; a cadeia
            continua a de Configuração de IA. A proveniência de cada resposta
            ainda não é registrada, então não há taxa de resposta sem fonte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ia.modelos.length ? (
            <Table
              scrollLabel="Qualidade por modelo (rolável)"
              caption="Chamadas, falhas, cortes e latência de cada modelo"
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Falhas</TableHead>
                  <TableHead className="text-right">Cortadas</TableHead>
                  <TableHead className="text-right">Recusadas</TableHead>
                  <TableHead className="text-right">p50</TableHead>
                  <TableHead className="text-right">p95</TableHead>
                  <TableHead className="text-right">Custo do mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ia.modelos.map((m) => (
                  <TableRow key={`${m.provedor}:${m.modelo}`}>
                    <TableCell>
                      {m.modelo}
                      <span className="block text-xs text-muted-foreground">
                        {m.provedor}
                        {m.local ? ' · local' : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.chamadas}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.falhas} ({pct(m.taxaDeFalha)})
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.cortadas}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.recusadas}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ms(m.latenciaP50)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ms(m.latenciaP95)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.local
                        ? 'local'
                        : m.custoDoMes === null || !m.moeda
                          ? 'sem preço'
                          : m.custoDoMes.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: m.moeda,
                              maximumFractionDigits: 4,
                            })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma chamada de IA registrada no período.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

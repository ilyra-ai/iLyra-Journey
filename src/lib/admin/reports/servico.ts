import { z } from 'zod';
import { HttpError } from '@/lib/http-error';
import { lerFiltros } from '@/lib/admin/analytics/filtros';
import { janela } from '@/lib/admin/analytics/periodo';
import { carregarPainel } from '@/lib/admin/analytics/consultas';
import { lerFiltrosFaturamento } from '@/lib/billing/admin/filtros';
import { carregarFaturamento } from '@/lib/billing/admin/consultas';
import { carregarSaldo } from '@/lib/billing/admin/saldos';
import { linhasDeUso, linhasFinanceiras } from './contrato';

export function lerPedidoRelatorio(params: URLSearchParams) {
  const tipo = z.enum(['uso', 'financeiro']).parse(params.get('tipo') ?? 'uso');
  const p = new URLSearchParams(params);
  p.delete('tipo');
  if (tipo === 'uso') {
    for (const chave of p.keys())
      if (
        !['inicio', 'fim', 'plano', 'agrupamento', 'paginaEventos'].includes(
          chave
        )
      )
        throw new HttpError('Filtro de relatório desconhecido.', 400);
    const { paginaEventos, ...f } = lerFiltros(p);
    return {
      tipo,
      filtros: {
        inicio: f.inicio,
        fim: f.fim,
        plano: f.plano,
        agrupamento: f.agrupamento,
      },
      paginaEventos,
    } as const;
  }
  const paginaSaldos = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(1)
    .parse(p.get('paginaSaldos') ?? undefined);
  p.delete('paginaSaldos');
  return { tipo, filtros: lerFiltrosFaturamento(p), paginaSaldos } as const;
}
export async function carregarRelatorio(
  p: ReturnType<typeof lerPedidoRelatorio>
) {
  const iniciadoEm = new Date().toISOString();
  if (p.tipo === 'uso') {
    const dados = await carregarPainel(p.filtros, p.paginaEventos);
    const exportacao = {
      formato: 'lyra-metacare/indicadores-administrativos',
      versao: 1,
      tipo: p.tipo,
      filtros: p.filtros,
      anterior: dados.anterior,
      iniciadoEm,
      geradoEm: new Date().toISOString(),
      linhas: linhasDeUso(dados),
    };
    return { tipo: p.tipo, dados, exportacao } as const;
  }
  const f = p.filtros,
    anterior = janela(f).anterior;
  const anteriorFiltros = { ...f, ...anterior, pagina: 1 };
  const faturas = await carregarFaturamento(f);
  const saldos = await carregarSaldo({ ...f, pagina: p.paginaSaldos });
  const faturasAnteriores = await carregarFaturamento(anteriorFiltros);
  const saldosAnteriores = await carregarSaldo(anteriorFiltros);
  const exportacao = {
    formato: 'lyra-metacare/indicadores-administrativos',
    versao: 1,
    tipo: p.tipo,
    filtros: f,
    anterior,
    iniciadoEm,
    geradoEm: new Date().toISOString(),
    linhas: [
      ...linhasFinanceiras(faturas, saldos, 'atual'),
      ...linhasFinanceiras(faturasAnteriores, saldosAnteriores, 'anterior'),
    ],
  };
  return { tipo: p.tipo, faturas, saldos, exportacao } as const;
}
export type RelatorioAdministrativo = Awaited<
  ReturnType<typeof carregarRelatorio>
>;

import { queryRows, withTransaction } from '@/lib/mysql/pool';
import type { FiltrosFaturamento } from './filtros';
export interface GrupoDeSaldo {
  ambiente: string;
  moeda: string;
  tipo: string;
  categoria: string;
  estado: string;
  movimentos: number;
  bruto: string;
  taxas: string;
  liquido: string;
}
export interface MovimentoDeSaldo {
  id: string;
  externa: string;
  origem: string | null;
  ambiente: string;
  moeda: string;
  tipo: string;
  categoria: string;
  estado: string;
  bruto: string;
  taxas: string;
  liquido: string;
  data: string;
  disponivelEm: string;
  sincronizadoEm: string;
}
export interface SerieDeSaldo {
  data: string;
  ambiente: string;
  moeda: string;
  movimentos: number;
  bruto: string;
  taxas: string;
  liquido: string;
}
export interface PainelDeSaldo {
  grupos: GrupoDeSaldo[];
  serie: SerieDeSaldo[];
  itens: MovimentoDeSaldo[];
  total: number;
  pagina: number;
  porPagina: number;
}
const soma = (c: string) => `CAST(SUM(${c}) AS CHAR)`;
export async function carregarSaldo(
  f: FiltrosFaturamento
): Promise<PainelDeSaldo> {
  return withTransaction(async (db) => {
    const p = [
      f.ambiente,
      f.ambiente,
      f.provedor,
      f.provedor,
      f.moeda ?? null,
      f.moeda ?? null,
      f.inicio + ' 00:00:00',
      new Date(Date.parse(f.fim) + 86400000).toISOString().slice(0, 10) +
        ' 00:00:00',
    ];
    const from =
      "FROM billing_balance_records WHERE (?='todos' OR environment=?) AND (?='todos' OR provider=?) AND (? IS NULL OR currency_code=?) AND provider_created_at>=? AND provider_created_at<?";
    const grupos = await queryRows<GrupoDeSaldo>(
      `SELECT environment ambiente,currency_code moeda,type tipo,reporting_category categoria,status estado,COUNT(*) movimentos,${soma('amount')} bruto,${soma('fee')} taxas,${soma('net')} liquido ${from} GROUP BY environment,currency_code,type,reporting_category,status ORDER BY environment,currency_code,reporting_category`,
      p,
      db
    );
    const formato =
      f.agrupamento === 'dia'
        ? '%Y-%m-%d'
        : f.agrupamento === 'mes'
          ? '%Y-%m-01'
          : '%Y-01-01';
    const serie = await queryRows<SerieDeSaldo>(
      `SELECT DATE_FORMAT(provider_created_at,'${formato}') data,environment ambiente,currency_code moeda,COUNT(*) movimentos,${soma('amount')} bruto,${soma('fee')} taxas,${soma('net')} liquido ${from} GROUP BY 1,environment,currency_code ORDER BY 1,2,3`,
      p,
      db
    );
    const [total] = await queryRows<{ n: number }>(
      `SELECT COUNT(*) n ${from}`,
      p,
      db
    );
    const itens = await queryRows<MovimentoDeSaldo>(
      `SELECT id,external_transaction_id externa,source_id origem,environment ambiente,currency_code moeda,type tipo,reporting_category categoria,status estado,CAST(amount AS CHAR) bruto,CAST(fee AS CHAR) taxas,CAST(net AS CHAR) liquido,provider_created_at data,available_at disponivelEm,synced_at sincronizadoEm ${from} ORDER BY provider_created_at DESC,id DESC LIMIT 20 OFFSET ?`,
      [...p, (f.pagina - 1) * 20],
      db
    );
    return {
      grupos,
      serie,
      itens,
      total: Number(total.n),
      pagina: f.pagina,
      porPagina: 20,
    };
  });
}

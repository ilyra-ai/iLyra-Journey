import { z } from 'zod';

import { executeStatement, queryRows } from '@/lib/mysql/pool';

import type { RegistroDeUso } from './uso';

/**
 * Gravação e consulta do uso de tokens (tarefa 163). Nada de conteúdo: só
 * rótulo, provedor, modelo, resultado, tokens e duração.
 */

export async function gravarUsoNoBanco(r: RegistroDeUso) {
  await executeStatement(
    `INSERT INTO ia_uso
       (user_id, rotulo, provedor, modelo, local, resultado,
        tokens_entrada, tokens_saida, tokens_raciocinio, milissegundos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.titular,
      r.rotulo.slice(0, 60),
      r.provedor.slice(0, 80),
      r.modelo.slice(0, 200),
      r.local,
      r.resultado,
      r.uso.entrada,
      r.uso.saida,
      r.uso.raciocinio,
      Math.max(0, Math.round(r.milissegundos)),
    ]
  );
}

/** Mês no formato AAAA-MM; o intervalo vai do dia 1 ao dia 1 seguinte (UTC). */
export const esquemaDoMes = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe o mês no formato AAAA-MM.');

function intervaloDoMes(mes: string) {
  const [ano, numero] = mes.split('-').map(Number);
  const inicio = new Date(Date.UTC(ano, numero - 1, 1));
  const fim = new Date(Date.UTC(ano, numero, 1));
  return [inicio, fim] as const;
}

export interface LinhaDoResumo {
  provedor: string;
  modelo: string;
  local: boolean;
  chamadas: number;
  falhas: number;
  /** Chamadas sem contagem de tokens informada pelo provedor. */
  semContagem: number;
  tokensEntrada: number;
  tokensSaida: number;
  tokensRaciocinio: number;
  /** Custo estimado pelo preço cadastrado; `null` sem preço ou local. */
  custo: number | null;
  moeda: string | null;
}

export interface Preco {
  provedor: string;
  modelo: string;
  moeda: string;
  entradaPorMilhao: number;
  saidaPorMilhao: number;
  fonte: string;
  consultadoEm: string;
}

export async function listarPrecos(): Promise<Preco[]> {
  const linhas = await queryRows<{
    provedor: string;
    modelo: string;
    moeda: string;
    entrada_por_milhao: string;
    saida_por_milhao: string;
    fonte: string;
    consultado_em: Date | string;
  }>(
    `SELECT provedor, modelo, moeda, entrada_por_milhao, saida_por_milhao,
            fonte, consultado_em
       FROM ia_precos ORDER BY provedor, modelo`
  );
  return linhas.map((l) => ({
    provedor: l.provedor,
    modelo: l.modelo,
    moeda: l.moeda,
    entradaPorMilhao: Number(l.entrada_por_milhao),
    saidaPorMilhao: Number(l.saida_por_milhao),
    fonte: l.fonte,
    consultadoEm:
      l.consultado_em instanceof Date
        ? l.consultado_em.toISOString().slice(0, 10)
        : String(l.consultado_em).slice(0, 10),
  }));
}

export const esquemaDoPreco = z
  .object({
    provedor: z.string().trim().min(1).max(80),
    modelo: z.string().trim().min(1).max(200),
    moeda: z.string().regex(/^[A-Z]{3}$/, 'Moeda com 3 letras (ex.: USD).'),
    entradaPorMilhao: z.number().min(0).max(1_000_000),
    saidaPorMilhao: z.number().min(0).max(1_000_000),
    fonte: z.url({ protocol: /^https$/ }).max(500),
    consultadoEm: z.iso.date(),
  })
  .strict();

export async function gravarPreco(
  preco: z.infer<typeof esquemaDoPreco>,
  administrador: string
) {
  await executeStatement(
    `INSERT INTO ia_precos
       (provedor, modelo, moeda, entrada_por_milhao, saida_por_milhao,
        fonte, consultado_em, atualizado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       moeda = VALUES(moeda),
       entrada_por_milhao = VALUES(entrada_por_milhao),
       saida_por_milhao = VALUES(saida_por_milhao),
       fonte = VALUES(fonte),
       consultado_em = VALUES(consultado_em),
       atualizado_por = VALUES(atualizado_por)`,
    [
      preco.provedor,
      preco.modelo,
      preco.moeda,
      preco.entradaPorMilhao,
      preco.saidaPorMilhao,
      preco.fonte,
      preco.consultadoEm,
      administrador,
    ]
  );
}

export async function apagarPreco(provedor: string, modelo: string) {
  await executeStatement(
    'DELETE FROM ia_precos WHERE provedor = ? AND modelo = ?',
    [provedor, modelo]
  );
}

/**
 * Agregado do mês por provedor e modelo, para a administração. Sem dados
 * de quem usou: só totais.
 */
export async function resumoDoUso(mes: string): Promise<LinhaDoResumo[]> {
  const [inicio, fim] = intervaloDoMes(mes);
  const linhas = await queryRows<{
    provedor: string;
    modelo: string;
    local: number;
    chamadas: number;
    falhas: string;
    sem_contagem: string;
    entrada: string | null;
    saida: string | null;
    raciocinio: string | null;
  }>(
    `SELECT provedor, modelo, local,
            COUNT(*) AS chamadas,
            SUM(resultado = 'falhou') AS falhas,
            SUM(resultado <> 'falhou' AND tokens_entrada IS NULL
                AND tokens_saida IS NULL) AS sem_contagem,
            SUM(tokens_entrada) AS entrada,
            SUM(tokens_saida) AS saida,
            SUM(tokens_raciocinio) AS raciocinio
       FROM ia_uso
      WHERE created_at >= ? AND created_at < ?
      GROUP BY provedor, modelo, local
      ORDER BY chamadas DESC`,
    [inicio, fim]
  );
  const precos = new Map(
    (await listarPrecos()).map((p) => [`${p.provedor}\u0000${p.modelo}`, p])
  );
  return linhas.map((l) => {
    const local = Boolean(l.local);
    const entrada = Number(l.entrada ?? 0);
    const saida = Number(l.saida ?? 0);
    const preco = local ? null : precos.get(`${l.provedor}\u0000${l.modelo}`);
    return {
      provedor: l.provedor,
      modelo: l.modelo,
      local,
      chamadas: Number(l.chamadas),
      falhas: Number(l.falhas ?? 0),
      semContagem: Number(l.sem_contagem ?? 0),
      tokensEntrada: entrada,
      tokensSaida: saida,
      tokensRaciocinio: Number(l.raciocinio ?? 0),
      custo: preco
        ? (entrada * preco.entradaPorMilhao + saida * preco.saidaPorMilhao) /
          1_000_000
        : null,
      moeda: preco?.moeda ?? null,
    };
  });
}

/** Uso da própria conta no mês (painel do titular). */
export async function usoDoTitular(titular: string, mes: string) {
  const [inicio, fim] = intervaloDoMes(mes);
  const [linha] = await queryRows<{
    chamadas: number;
    entrada: string | null;
    saida: string | null;
    locais: string | null;
  }>(
    `SELECT COUNT(*) AS chamadas,
            SUM(tokens_entrada) AS entrada,
            SUM(tokens_saida) AS saida,
            SUM(local) AS locais
       FROM ia_uso
      WHERE user_id = ? AND created_at >= ? AND created_at < ?
        AND resultado <> 'falhou'`,
    [titular, inicio, fim]
  );
  return {
    mes,
    chamadas: Number(linha?.chamadas ?? 0),
    tokensEntrada: Number(linha?.entrada ?? 0),
    tokensSaida: Number(linha?.saida ?? 0),
    chamadasLocais: Number(linha?.locais ?? 0),
  };
}

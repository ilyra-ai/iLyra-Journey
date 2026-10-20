import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { chamarMemoria, fatoSchema, origemDoAppParaMemoria } from './cliente';

interface Preferencias extends RowDataPacket {
  user_id: string;
  enabled: number;
  allow_cloud: number;
  generation: number;
  purge_pending: number;
}
interface Episodio extends RowDataPacket {
  id: string;
  user_id: string;
  content: string;
  generation: number;
  reference_at: string;
  corrects_fact_id: string | null;
  attempts: number;
}

export async function preferenciasDaMemoria(usuario: string) {
  const [preferencias] = await queryRows<Preferencias>(
    'SELECT * FROM memory_preferences WHERE user_id = ?',
    [usuario]
  );
  return preferencias ?? null;
}

export async function configurarMemoria(
  usuario: string,
  ativa: boolean,
  nuvem: boolean
) {
  await withTransaction(async (conexao) => {
    await conexao.execute(
      'INSERT IGNORE INTO memory_preferences (user_id) VALUES (?)',
      [usuario]
    );
    const [linhas] = await conexao.query<Preferencias[]>(
      'SELECT * FROM memory_preferences WHERE user_id = ? FOR UPDATE',
      [usuario]
    );
    if (linhas[0].purge_pending)
      throw new HttpError('Aguarde a conclusão da exclusão da memória.', 409);
    await conexao.execute(
      'UPDATE memory_preferences SET enabled = ?, allow_cloud = ?, updated_at = UTC_TIMESTAMP(3) WHERE user_id = ?',
      [ativa, nuvem, usuario]
    );
  });
}

export async function guardarRelato(
  usuario: string,
  texto: string,
  turno: string | null = null,
  corrige: string | null = null
) {
  if (corrige) {
    const preferencias = await preferenciasDaMemoria(usuario);
    if (!preferencias?.enabled || preferencias.purge_pending)
      throw new HttpError(
        'Ative a memória antes de corrigir uma lembrança.',
        409
      );
    await chamarMemoria(
      usuario,
      `/fatos/${corrige}?geracao=${preferencias.generation}`,
      fatoSchema
    );
  }
  await withTransaction(async (conexao) => {
    const [linhas] = await conexao.query<Preferencias[]>(
      'SELECT * FROM memory_preferences WHERE user_id = ? FOR UPDATE',
      [usuario]
    );
    const preferencias = linhas[0];
    if (!preferencias?.enabled || preferencias.purge_pending) {
      throw new HttpError(
        'Ative a memória antes de acrescentar um relato.',
        409
      );
    }
    await conexao.execute(
      `INSERT IGNORE INTO memory_episodes (id, user_id, turn_id, content, reference_at, corrects_fact_id, generation)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), ?, ?)`,
      [randomUUID(), usuario, turno, texto, corrige, preferencias.generation]
    );
  });
}

export async function importarHistoricoNaMemoria(usuario: string) {
  return withTransaction(async (conexao) => {
    const [linhas] = await conexao.query<Preferencias[]>(
      'SELECT * FROM memory_preferences WHERE user_id = ? FOR UPDATE',
      [usuario]
    );
    const preferencias = linhas[0];
    if (!preferencias?.enabled || preferencias.purge_pending)
      throw new HttpError(
        'Ative a memória para aprender com o histórico.',
        409
      );
    const [turnos] = await conexao.query<RowDataPacket[]>(
      `SELECT id, question, created_at FROM chat_turns WHERE user_id = ? AND status = 'concluido' AND memory_excluded = FALSE
       ORDER BY created_at, id`,
      [usuario]
    );
    for (const turno of turnos) {
      await conexao.execute(
        `INSERT IGNORE INTO memory_episodes (id, user_id, turn_id, content, reference_at, generation)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          usuario,
          turno.id,
          turno.question,
          turno.created_at,
          preferencias.generation,
        ]
      );
    }
    return { mensagens: turnos.length };
  });
}

const paginaDeFatos = z.object({
  fatos: z.array(fatoSchema),
  proximo: z.number().nullable(),
});

export async function consultarMemoria(usuario: string, inicio: number) {
  const preferencias = await preferenciasDaMemoria(usuario);
  const [contagem] = await queryRows<{
    fila: number;
    prontos: number;
    erros: number;
  }>(
    `SELECT COALESCE(SUM(status IN ('fila','processando')),0) AS fila,
            COALESCE(SUM(status = 'pronto'),0) AS prontos, COALESCE(SUM(status = 'erro'),0) AS erros
     FROM memory_episodes WHERE user_id = ?`,
    [usuario]
  );
  const estado = {
    ativa: Boolean(preferencias?.enabled),
    nuvem: Boolean(preferencias?.allow_cloud),
    apagando: Boolean(preferencias?.purge_pending),
    ...contagem,
  };
  if (!preferencias || preferencias.purge_pending)
    return { ...estado, fatos: [], proximo: null, disponivel: true };
  try {
    const pagina = await chamarMemoria(
      usuario,
      `/fatos?geracao=${preferencias.generation}&inicio=${inicio}`,
      paginaDeFatos
    );
    const ids = [
      ...new Set(pagina.fatos.flatMap((fato) => fato.episodes.slice(-3))),
    ];
    const relatos = ids.length
      ? await queryRows<{
          id: string;
          content: string;
          reference_at: string;
          conversation_id: string | null;
          title: string | null;
        }>(
          `SELECT e.id, e.content, e.reference_at, t.conversation_id, c.title
       FROM memory_episodes e LEFT JOIN chat_turns t ON t.id = e.turn_id AND t.user_id = e.user_id
       LEFT JOIN chat_conversations c ON c.id = t.conversation_id AND c.user_id = e.user_id
       WHERE e.user_id = ? AND e.id IN (${ids.map(() => '?').join(',')})`,
          [usuario, ...ids]
        )
      : [];
    const porId = new Map(relatos.map((relato) => [relato.id, relato]));
    pagina.fatos = pagina.fatos.map((fato) => ({
      ...fato,
      origens: fato.episodes.slice(-3).flatMap((id) => {
        const relato = porId.get(id);
        return relato
          ? [
              {
                texto: relato.content,
                data: `${relato.reference_at.replace(' ', 'T')}Z`,
                conversaId: relato.conversation_id,
                titulo: relato.title,
              },
            ]
          : [];
      }),
    }));
    return { ...estado, ...pagina, disponivel: true };
  } catch {
    return { ...estado, fatos: [], proximo: null, disponivel: false };
  }
}

export async function recuperarMemorias(
  usuario: string,
  pergunta: string,
  privada: boolean,
  externa: boolean
) {
  if (privada) return [];
  const preferencias = await preferenciasDaMemoria(usuario);
  if (
    !preferencias?.enabled ||
    preferencias.purge_pending ||
    (externa && !preferencias.allow_cloud)
  )
    return [];
  try {
    const { fatos } = await chamarMemoria(
      usuario,
      '/buscar',
      z.object({ fatos: z.array(fatoSchema) }),
      {
        metodo: 'POST',
        corpo: {
          geracao: preferencias.generation,
          origem_do_app: origemDoAppParaMemoria(),
          pergunta,
        },
        tempo: 5000,
      }
    );
    const corrigidos = await queryRows<{ corrects_fact_id: string }>(
      'SELECT corrects_fact_id FROM memory_episodes WHERE user_id = ? AND corrects_fact_id IS NOT NULL',
      [usuario]
    );
    const excluir = new Set(corrigidos.map((linha) => linha.corrects_fact_id));
    return fatos
      .filter((fato) => !excluir.has(fato.uuid))
      .map((fato) => ({
        relato: fato.fact,
        registradoEm: fato.created_at,
        validoDesde: fato.valid_at,
        origem: fato.episodes,
        tipo: 'Informação extraída de um relato da própria pessoa; não é diagnóstico.',
      }));
  } catch {
    return [];
  }
}

export async function concluirExclusaoDaMemoria(usuario: string) {
  const preferencias = await preferenciasDaMemoria(usuario);
  if (!preferencias?.purge_pending) return;
  await chamarMemoria(usuario, '', z.object({ apagado: z.literal(true) }), {
    metodo: 'DELETE',
    corpo: { geracao: preferencias.generation },
    tempo: 15_000,
  });
  await withTransaction(async (conexao) => {
    const [linhas] = await conexao.query<Preferencias[]>(
      'SELECT * FROM memory_preferences WHERE user_id = ? FOR UPDATE',
      [usuario]
    );
    if (linhas[0]?.generation !== preferencias.generation) return;
    await conexao.execute('DELETE FROM memory_episodes WHERE user_id = ?', [
      usuario,
    ]);
    await conexao.execute(
      'UPDATE memory_preferences SET purge_pending = FALSE, updated_at = UTC_TIMESTAMP(3) WHERE user_id = ?',
      [usuario]
    );
  });
}

export async function apagarMemorias(usuario: string) {
  const preferencias = await preferenciasDaMemoria(usuario);
  if (!preferencias) return;
  await executeStatement(
    `UPDATE memory_preferences SET enabled = FALSE, allow_cloud = FALSE,
     generation = generation + IF(purge_pending,0,1), purge_pending = TRUE, updated_at = UTC_TIMESTAMP(3) WHERE user_id = ?`,
    [usuario]
  );
  await concluirExclusaoDaMemoria(usuario);
}

export async function exportarMemorias(usuario: string) {
  const preferencias = await preferenciasDaMemoria(usuario);
  if (!preferencias) return null;
  if (preferencias.purge_pending)
    throw new HttpError(
      'Aguarde a exclusão da memória antes de exportar.',
      409
    );
  return chamarMemoria(
    usuario,
    `/exportar?geracao=${preferencias.generation}`,
    z.object({
      nos: z.array(z.record(z.string(), z.unknown())),
      relacoes: z.array(z.record(z.string(), z.unknown())),
    })
  );
}

/** Um episódio por execução; a posse do lease é conferida ao concluir. */
export async function processarFilaDaMemoria() {
  const exclusoes = await queryRows<{ user_id: string }>(
    'SELECT user_id FROM memory_preferences WHERE purge_pending = TRUE LIMIT 10'
  );
  for (const { user_id } of exclusoes) {
    try {
      await concluirExclusaoDaMemoria(user_id);
    } catch {
      /* Permanece pendente para a próxima execução. */
    }
  }
  const lease = randomUUID();
  const episodio = await withTransaction(async (conexao) => {
    const [pessoas] = await conexao.query<Preferencias[]>(
      `SELECT p.* FROM memory_preferences p WHERE p.enabled = TRUE AND p.purge_pending = FALSE
       AND (SELECT e.next_attempt_at FROM memory_episodes e WHERE e.user_id = p.user_id AND e.generation = p.generation
         AND e.status <> 'pronto' ORDER BY e.reference_at, e.created_at, e.id LIMIT 1) <= UTC_TIMESTAMP(3)
       AND NOT EXISTS (SELECT 1 FROM memory_episodes e WHERE e.user_id = p.user_id
         AND e.lease_until > UTC_TIMESTAMP(3))
       ORDER BY p.updated_at LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    const pessoa = pessoas[0];
    if (!pessoa) return null;
    const [episodios] = await conexao.query<Episodio[]>(
      `SELECT * FROM memory_episodes WHERE user_id = ? AND generation = ? AND status <> 'pronto'
       ORDER BY reference_at, created_at, id LIMIT 1 FOR UPDATE`,
      [pessoa.user_id, pessoa.generation]
    );
    const escolhido = episodios[0];
    if (!escolhido) return null;
    const [pronto] = await conexao.query<RowDataPacket[]>(
      'SELECT id FROM memory_episodes WHERE id = ? AND next_attempt_at <= UTC_TIMESTAMP(3)',
      [escolhido.id]
    );
    if (!pronto.length) return null;
    await conexao.execute(
      `UPDATE memory_episodes SET status = 'processando', lease_id = ?, lease_until = UTC_TIMESTAMP(3) + INTERVAL 15 MINUTE,
       attempts = attempts + 1, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
      [lease, escolhido.id]
    );
    // A pessoa volta ao fim da fila depois de cada tentativa. Uma importação
    // extensa não pode impedir as lembranças das outras contas de avançar.
    await conexao.execute(
      'UPDATE memory_preferences SET updated_at = UTC_TIMESTAMP(3) WHERE user_id = ?',
      [pessoa.user_id]
    );
    return escolhido;
  });
  if (!episodio) return { processado: false };
  try {
    await chamarMemoria(
      episodio.user_id,
      '/episodios',
      z.object({ gravado: z.literal(true) }),
      {
        metodo: 'POST',
        tempo: 550_000,
        corpo: {
          geracao: episodio.generation,
          origem_do_app: origemDoAppParaMemoria(),
          id: episodio.id,
          texto: episodio.content,
          referencia: `${episodio.reference_at.replace(' ', 'T')}Z`,
          corrige_fato: episodio.corrects_fact_id,
        },
      }
    );
    await executeStatement(
      `UPDATE memory_episodes SET status = 'pronto', lease_id = NULL, lease_until = NULL, error_message = NULL,
       updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND lease_id = ?`,
      [episodio.id, lease]
    );
    return { processado: true };
  } catch {
    const espera = Math.min(3600, 15 * 2 ** Math.min(episodio.attempts, 8));
    await executeStatement(
      `UPDATE memory_episodes SET status = 'erro', lease_id = NULL, lease_until = NULL,
       next_attempt_at = TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP(3)), error_message = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND lease_id = ?`,
      [
        espera,
        'A extração não terminou. O aplicativo tentará novamente automaticamente.',
        episodio.id,
        lease,
      ]
    );
    return { processado: false };
  }
}

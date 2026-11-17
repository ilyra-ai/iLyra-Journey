import { executeStatement, queryRows } from '@/lib/mysql/pool';

import type { AcessoInternet, ModoDeAcesso } from './dominios';

export {
  type AcessoInternet,
  dominiosSchema,
  hostPermitido,
  type ModoDeAcesso,
  normalizarDominio,
} from './dominios';

export async function lerAcessoInternet(): Promise<AcessoInternet> {
  const [linha] = await queryRows<{
    modo: ModoDeAcesso;
    dominios: unknown;
    atualizado_em: string | Date;
  }>(
    'SELECT modo, dominios, atualizado_em FROM ia_acesso_internet WHERE id = 1'
  );
  if (!linha) {
    return {
      modo: 'desligado',
      dominios: [],
      atualizadoEm: new Date(0).toISOString(),
    };
  }
  const dados =
    typeof linha.dominios === 'string'
      ? (JSON.parse(linha.dominios) as unknown)
      : linha.dominios;
  return {
    modo: linha.modo,
    dominios: Array.isArray(dados)
      ? dados.filter((d): d is string => typeof d === 'string')
      : [],
    atualizadoEm:
      linha.atualizado_em instanceof Date
        ? linha.atualizado_em.toISOString()
        : new Date(`${linha.atualizado_em.replace(' ', 'T')}Z`).toISOString(),
  };
}

export async function salvarAcessoInternet(
  acesso: { modo: ModoDeAcesso; dominios: string[] },
  administrador: string
) {
  await executeStatement(
    `INSERT INTO ia_acesso_internet (id, modo, dominios, atualizado_por)
     VALUES (1, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE modo = novo.modo, dominios = novo.dominios,
       atualizado_por = novo.atualizado_por`,
    [acesso.modo, JSON.stringify(acesso.dominios), administrador]
  );
}

/** Registro de cada busca e página consultada (sem dado de usuário). */
export async function registrarConsulta(consulta: {
  tarefa: string;
  tipo: 'busca' | 'pagina';
  alvo: string;
  situacao: string;
}) {
  await executeStatement(
    'INSERT INTO ia_consultas_internet (tarefa, tipo, alvo, situacao) VALUES (?, ?, ?, ?)',
    [
      consulta.tarefa.slice(0, 60),
      consulta.tipo,
      consulta.alvo.slice(0, 600),
      consulta.situacao.slice(0, 60),
    ]
  );
}

export async function ultimasConsultas(limite = 50) {
  return queryRows<{
    id: number;
    tarefa: string;
    tipo: 'busca' | 'pagina';
    alvo: string;
    situacao: string;
    created_at: string | Date;
  }>(
    `SELECT id, tarefa, tipo, alvo, situacao, created_at
       FROM ia_consultas_internet ORDER BY id DESC LIMIT ?`,
    [limite]
  );
}

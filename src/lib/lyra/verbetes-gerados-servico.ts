import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

import type { AutorDoModelo } from '@/lib/ai/cadeia-de-modelos';

import type { AreaDoConhecimento, Verbete } from './conhecimento/tipos';
import { definirVerbetesGerados } from './responder';
import {
  hashDoVerbete,
  idDoTitulo,
  type VerbeteEscrito,
  verbeteDaBase,
} from './verbetes-gerados';

/**
 * Persistência dos verbetes escritos automaticamente (tarefas 198 e 199). A
 * tabela não guarda a pergunta nem quem perguntou: o verbete é
 * compartilhado entre todas as contas. Todo verbete nasce pendente e só é
 * consultado pelo motor depois de aprovado por um administrador.
 */

export type SituacaoDoVerbete = 'pendente' | 'aprovado';

interface LinhaDoVerbete {
  id: string;
  area: AreaDoConhecimento;
  titulo: string;
  resumo: string;
  pontos: unknown;
  pratica: string;
  palavras_chave: unknown;
  fonte: string;
  provedor: string;
  modelo: string;
  created_at: string | Date;
  aprovado_em: string | Date | null;
}

function lista(valor: unknown): string[] {
  const dados =
    typeof valor === 'string' ? (JSON.parse(valor) as unknown) : valor;
  return Array.isArray(dados)
    ? dados.filter((item): item is string => typeof item === 'string')
    : [];
}

function instante(valor: string | Date) {
  return valor instanceof Date
    ? valor.toISOString()
    : new Date(`${valor.replace(' ', 'T')}Z`).toISOString();
}

function daLinha(linha: LinhaDoVerbete): Verbete {
  return {
    id: linha.id,
    area: linha.area,
    titulo: linha.titulo,
    resumo: linha.resumo,
    pontos: lista(linha.pontos),
    pratica: linha.pratica,
    palavrasChave: lista(linha.palavras_chave),
    fonte: linha.fonte,
    gerado: {
      provedor: linha.provedor,
      modelo: linha.modelo,
      criadoEm: instante(linha.created_at),
      aprovadoEm: linha.aprovado_em ? instante(linha.aprovado_em) : null,
    },
  };
}

/**
 * Verbetes escritos automaticamente, do mais antigo ao mais novo. Sem
 * `situacao`, todos (administração).
 */
export async function listarVerbetesGerados(
  situacao?: SituacaoDoVerbete
): Promise<Verbete[]> {
  const linhas = await queryRows<LinhaDoVerbete>(
    `SELECT id, area, titulo, resumo, pontos, pratica, palavras_chave, fonte,
            provedor, modelo, created_at, aprovado_em
       FROM lyra_verbetes_gerados
      ${situacao ? 'WHERE status = ?' : ''}
      ORDER BY created_at, id`,
    situacao ? [situacao] : []
  );
  return linhas.map(daLinha);
}

const VALIDADE_DO_CACHE_MS = 60_000;
let carregadoEm = 0;

/**
 * Atualiza os verbetes aprovados que o motor consulta, no máximo uma vez por
 * minuto por processo. `forcar` recarrega na hora (após aprovar ou apagar).
 * Verbetes pendentes nunca chegam ao motor.
 */
export async function sincronizarVerbetesGerados(
  agora = Date.now(),
  forcar = false
) {
  if (!forcar && agora - carregadoEm < VALIDADE_DO_CACHE_MS) return;
  definirVerbetesGerados(await listarVerbetesGerados('aprovado'));
  carregadoEm = agora;
}

/**
 * Grava o verbete conferido como pendente. Devolve `false` quando o mesmo
 * identificador ou o mesmo conteúdo já existe (duas conversas gerando ao
 * mesmo tempo, ou um tema já pendente de aprovação).
 */
export async function gravarVerbeteGerado(
  escrito: VerbeteEscrito,
  autor: Pick<AutorDoModelo, 'provedor' | 'modelo' | 'local'>
): Promise<boolean> {
  const verbete = verbeteDaBase(escrito, autor, new Date());
  const resultado = await executeStatement(
    `INSERT IGNORE INTO lyra_verbetes_gerados
       (id, area, titulo, resumo, pontos, pratica, palavras_chave, fonte,
        provedor, modelo, modelo_local, conteudo_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      verbete.id,
      verbete.area,
      verbete.titulo,
      verbete.resumo,
      JSON.stringify(verbete.pontos),
      verbete.pratica,
      JSON.stringify(verbete.palavrasChave),
      verbete.fonte,
      autor.provedor.slice(0, 120),
      autor.modelo.slice(0, 160),
      autor.local,
      hashDoVerbete(escrito),
    ]
  );
  return resultado.affectedRows === 1;
}

function conferirId(id: string) {
  if (id.length === 0 || id !== idDoTitulo(id)) {
    throw new HttpError('Identificador de verbete inválido.', 400);
  }
}

/** Aprova um verbete pendente; a partir daí o motor passa a consultá-lo. */
export async function aprovarVerbeteGerado(id: string, administrador: string) {
  conferirId(id);
  const resultado = await executeStatement(
    `UPDATE lyra_verbetes_gerados
        SET status = 'aprovado', aprovado_em = CURRENT_TIMESTAMP(3),
            aprovado_por = ?
      WHERE id = ? AND status = 'pendente'`,
    [administrador, id]
  );
  if (resultado.affectedRows === 0) {
    const [existente] = await queryRows<{ status: SituacaoDoVerbete }>(
      'SELECT status FROM lyra_verbetes_gerados WHERE id = ?',
      [id]
    );
    throw existente
      ? new HttpError('Este verbete já foi aprovado.', 409)
      : new HttpError('Verbete não encontrado.', 404);
  }
  await sincronizarVerbetesGerados(Date.now(), true);
}

/** Remove um verbete escrito automaticamente, pendente ou aprovado. */
export async function apagarVerbeteGerado(id: string) {
  conferirId(id);
  const resultado = await executeStatement(
    'DELETE FROM lyra_verbetes_gerados WHERE id = ?',
    [id]
  );
  if (resultado.affectedRows === 0) {
    throw new HttpError('Verbete não encontrado.', 404);
  }
  await sincronizarVerbetesGerados(Date.now(), true);
}

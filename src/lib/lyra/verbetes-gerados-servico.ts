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
 * Persistência dos verbetes escritos automaticamente (tarefa 198). A tabela
 * não guarda a pergunta nem quem perguntou: o verbete é compartilhado entre
 * todas as contas.
 */

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
    },
  };
}

/** Todos os verbetes escritos automaticamente, do mais antigo ao mais novo. */
export async function listarVerbetesGerados(): Promise<Verbete[]> {
  const linhas = await queryRows<LinhaDoVerbete>(
    `SELECT id, area, titulo, resumo, pontos, pratica, palavras_chave, fonte,
            provedor, modelo, created_at
       FROM lyra_verbetes_gerados
      ORDER BY created_at, id`
  );
  return linhas.map(daLinha);
}

const VALIDADE_DO_CACHE_MS = 60_000;
let carregadoEm = 0;

/**
 * Atualiza os verbetes gerados que o motor consulta, no máximo uma vez por
 * minuto por processo. `forcar` recarrega na hora (após gravar ou apagar).
 */
export async function sincronizarVerbetesGerados(
  agora = Date.now(),
  forcar = false
) {
  if (!forcar && agora - carregadoEm < VALIDADE_DO_CACHE_MS) return;
  definirVerbetesGerados(await listarVerbetesGerados());
  carregadoEm = agora;
}

/**
 * Grava o verbete conferido. Devolve `false` quando o mesmo identificador ou
 * o mesmo conteúdo já existe (duas conversas gerando ao mesmo tempo).
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
  const gravou = resultado.affectedRows === 1;
  if (gravou) await sincronizarVerbetesGerados(Date.now(), true);
  return gravou;
}

/** Remove um verbete escrito automaticamente (administração). */
export async function apagarVerbeteGerado(id: string) {
  if (id !== idDoTitulo(id) || id.length === 0) {
    throw new HttpError('Identificador de verbete inválido.', 400);
  }
  const resultado = await executeStatement(
    'DELETE FROM lyra_verbetes_gerados WHERE id = ?',
    [id]
  );
  if (resultado.affectedRows === 0) {
    throw new HttpError('Verbete não encontrado.', 404);
  }
  await sincronizarVerbetesGerados(Date.now(), true);
}

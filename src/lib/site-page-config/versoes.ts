import { randomUUID } from 'node:crypto';

import type { PoolConnection } from 'mysql2/promise';

import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import type { SitePageKey } from '@/lib/site-page-config/schema';
import { parseStoredJson } from '@/lib/site-page-config/storage';

/**
 * Versões publicadas das páginas do construtor (tarefa 184). Cada
 * publicação com mudança real vira uma versão, com autor, data e nota.
 */

export type OrigemDaVersao = 'migracao' | 'publicacao' | 'reversao';

/** JSON com as chaves em ordem: o MySQL reordena as chaves ao guardar. */
export function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`;
  if (valor && typeof valor === 'object')
    return `{${Object.keys(valor as Record<string, unknown>)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${jsonCanonico((valor as Record<string, unknown>)[k])}`
      )
      .join(',')}}`;
  return JSON.stringify(valor ?? null);
}

/**
 * Grava a versão dentro da transação da publicação. Devolve o número da
 * versão nova, ou `null` quando o conteúdo é igual ao da última versão
 * (publicar de novo a mesma coisa não cria histórico).
 */
export async function registrarVersao(
  conexao: PoolConnection,
  dados: {
    pageKey: SitePageKey;
    config: unknown;
    origem: Exclude<OrigemDaVersao, 'migracao'>;
    nota: string | null;
    autor: string;
  }
) {
  const [ultima] = await queryRows<{ versao: number; config: unknown }>(
    `SELECT versao, config FROM site_page_config_versoes
      WHERE page_key = ? ORDER BY versao DESC LIMIT 1 FOR UPDATE`,
    [dados.pageKey],
    conexao
  );
  if (
    ultima &&
    jsonCanonico(
      parseStoredJson(ultima.config as string | Record<string, unknown> | null)
    ) === jsonCanonico(dados.config)
  )
    return null;
  const versao = (ultima?.versao ?? 0) + 1;
  await executeStatement(
    `INSERT INTO site_page_config_versoes
       (id, page_key, versao, config, origem, nota, publicado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      dados.pageKey,
      versao,
      JSON.stringify(dados.config),
      dados.origem,
      dados.nota,
      dados.autor,
    ],
    conexao
  );
  return versao;
}

export interface VersaoPublicada {
  versao: number;
  origem: OrigemDaVersao;
  nota: string | null;
  autor: string | null;
  publicadoEm: string;
}

export async function listarVersoes(
  pageKey: SitePageKey
): Promise<VersaoPublicada[]> {
  const linhas = await queryRows<{
    versao: number;
    origem: OrigemDaVersao;
    nota: string | null;
    autor: string | null;
    publicado_em: Date;
  }>(
    `SELECT v.versao, v.origem, v.nota, v.publicado_em,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
              p.email
            ) AS autor
       FROM site_page_config_versoes v
       LEFT JOIN profiles p ON p.id = v.publicado_por
      WHERE v.page_key = ?
      ORDER BY v.versao DESC
      LIMIT 100`,
    [pageKey]
  );
  return linhas.map((l) => ({
    versao: Number(l.versao),
    origem: l.origem,
    nota: l.nota,
    autor: l.autor,
    publicadoEm: new Date(l.publicado_em).toISOString(),
  }));
}

export async function configDaVersao(pageKey: SitePageKey, versao: number) {
  const [linha] = await queryRows<{ config: unknown }>(
    'SELECT config FROM site_page_config_versoes WHERE page_key = ? AND versao = ? LIMIT 1',
    [pageKey, versao]
  );
  if (!linha) throw new HttpError('Versão não encontrada.', 404);
  return parseStoredJson(
    linha.config as string | Record<string, unknown> | null
  );
}

export interface Mudanca {
  caminho: string;
  tipo: 'adicionado' | 'removido' | 'alterado';
  antes: unknown;
  depois: unknown;
}

/** Folhas do JSON por caminho legível (ex.: "hero.title", "sidebar.items[3].label"). */
function folhas(
  valor: unknown,
  prefixo = '',
  saida = new Map<string, unknown>()
) {
  if (Array.isArray(valor)) {
    if (valor.length === 0) saida.set(prefixo, []);
    valor.forEach((item, i) => {
      // Itens com identidade (href, id, key) são comparados por ela, não pela
      // posição: reordenar não vira "tudo alterado".
      const chave =
        item && typeof item === 'object'
          ? ((item as Record<string, unknown>).href ??
            (item as Record<string, unknown>).id ??
            (item as Record<string, unknown>).key)
          : undefined;
      folhas(
        item,
        `${prefixo}[${typeof chave === 'string' ? chave : i}]`,
        saida
      );
    });
  } else if (valor && typeof valor === 'object') {
    const chaves = Object.keys(valor as Record<string, unknown>);
    if (chaves.length === 0) saida.set(prefixo, {});
    for (const k of chaves)
      folhas(
        (valor as Record<string, unknown>)[k],
        prefixo ? `${prefixo}.${k}` : k,
        saida
      );
  } else saida.set(prefixo, valor);
  return saida;
}

/** Diferença semântica entre duas configurações (tarefa 184). */
export function diferencas(antes: unknown, depois: unknown): Mudanca[] {
  const a = folhas(antes);
  const b = folhas(depois);
  const lista: Mudanca[] = [];
  for (const [caminho, valor] of b) {
    if (!a.has(caminho))
      lista.push({
        caminho,
        tipo: 'adicionado',
        antes: undefined,
        depois: valor,
      });
    else if (jsonCanonico(a.get(caminho)) !== jsonCanonico(valor))
      lista.push({
        caminho,
        tipo: 'alterado',
        antes: a.get(caminho),
        depois: valor,
      });
  }
  for (const [caminho, valor] of a)
    if (!b.has(caminho))
      lista.push({
        caminho,
        tipo: 'removido',
        antes: valor,
        depois: undefined,
      });
  return lista.sort((x, y) => x.caminho.localeCompare(y.caminho));
}

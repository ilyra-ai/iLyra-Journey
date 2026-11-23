import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { isSitePageKey, type SitePageKey } from '@/lib/site-page-config/schema';
import {
  getAdminSitePageConfig,
  publishSitePageDraft,
} from '@/lib/site-page-config/service';
import { validatePageConfigOrThrow } from '@/lib/site-page-config/storage';
import {
  configDaVersao,
  diferencas,
  listarVersoes,
} from '@/lib/site-page-config/versoes';

export const runtime = 'nodejs';

async function lerPagina(params: Promise<{ pageKey: string }>) {
  const { pageKey } = await params;
  if (!isSitePageKey(pageKey))
    throw new HttpError(`Página não suportada: ${pageKey}`, 404);
  return pageKey as SitePageKey;
}

const nota = z
  .string()
  .trim()
  .min(5, 'Escreva por que está publicando (pelo menos 5 caracteres).')
  .max(300, 'A justificativa pode ter até 300 caracteres.');

const esquemaDaAcao = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('publicar'), nota }).strict(),
  z
    .object({
      acao: z.literal('reverter'),
      versao: z.number().int().positive(),
      nota,
    })
    .strict(),
]);

/**
 * Estúdio de publicação (tarefa 184), só administradores. GET devolve as
 * versões e a diferença do rascunho para o publicado; com ?versao=N, a
 * diferença do publicado atual para aquela versão (o que uma reversão
 * mudaria).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  try {
    await requireAdminSession();
    const pageKey = await lerPagina(params);
    const atual = await getAdminSitePageConfig(pageKey);
    const versao = new URL(request.url).searchParams.get('versao');
    if (versao !== null) {
      const numero = Number(versao);
      if (!Number.isInteger(numero) || numero < 1)
        throw new HttpError('Versão inválida.', 400);
      return NextResponse.json({
        versao: numero,
        mudancas: diferencas(
          atual.publishedConfig,
          await configDaVersao(pageKey, numero)
        ),
      });
    }
    return NextResponse.json(
      {
        pageKey,
        versoes: await listarVersoes(pageKey),
        rascunho: diferencas(atual.publishedConfig, atual.draftConfig),
      },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível ler as versões.');
  }
}

/** Publica o rascunho salvo ou reverte para uma versão, com justificativa. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  try {
    const session = await requireAdminSession();
    const pageKey = await lerPagina(params);
    const acao = await lerJson(request, esquemaDaAcao);
    if (acao.acao === 'publicar') {
      const r = await publishSitePageDraft({
        pageKey,
        actorUserId: session.user.id,
        nota: acao.nota,
      });
      return NextResponse.json({ versaoPublicada: r.versaoPublicada });
    }
    const antiga = await configDaVersao(pageKey, acao.versao);
    // Só reverte o que ainda é válido no esquema atual da página: uma versão
    // de antes de uma mudança incompatível não é publicada às cegas.
    let config: unknown;
    try {
      config = validatePageConfigOrThrow(pageKey, antiga);
    } catch {
      throw new HttpError(
        'Esta versão não é compatível com a estrutura atual da página e não pode ser restaurada.',
        409
      );
    }
    const r = await publishSitePageDraft({
      pageKey,
      actorUserId: session.user.id,
      config,
      nota: acao.nota,
      origem: 'reversao',
    });
    return NextResponse.json({ versaoPublicada: r.versaoPublicada });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível publicar.');
  }
}

import { describe, expect, it } from 'vitest';

import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { queryRows } from '@/lib/mysql/pool';

import * as paginaAdmin from './page-config/[pageKey]/route';
import * as estudio from './publicacao/[pageKey]/route';

interface Estado {
  versoes: Array<{ versao: number; origem: string; nota: string | null }>;
  rascunho: Array<{ caminho: string; tipo: string }>;
}

const params = { pageKey: 'login' };

async function ler(usuario: Awaited<ReturnType<typeof criarUsuario>>) {
  return (await chamar(estudio.GET, { usuario, params })).json as Estado;
}

describe('estúdio de publicação (tarefa 184)', () => {
  it('só administradores; justificativa obrigatória; página desconhecida é 404', async () => {
    const pessoa = await criarUsuario();
    const admin = await criarUsuario('admin');
    expect((await chamar(estudio.GET, { usuario: null, params })).status).toBe(
      401
    );
    expect(
      (await chamar(estudio.GET, { usuario: pessoa, params })).status
    ).toBe(403);
    expect(
      (
        await chamar(estudio.GET, {
          usuario: admin,
          params: { pageKey: 'nada' },
        })
      ).status
    ).toBe(404);
    expect(
      (
        await chamar(estudio.POST, {
          usuario: admin,
          method: 'POST',
          params,
          body: { acao: 'publicar', nota: 'ok' },
        })
      ).status
    ).toBe(400);
  });

  it('publica com versão, não duplica sem mudança e reverte como nova versão', async () => {
    const admin = await criarUsuario('admin');
    const original = (await chamar(paginaAdmin.GET, { usuario: admin, params }))
      .json as { publishedConfig: { auth: Record<string, unknown> } };
    const tituloOriginal = original.publishedConfig.auth.loginTabLabel;

    // Rascunho com uma mudança: o estúdio mostra a diferença antes de publicar.
    const rascunho = structuredClone(original.publishedConfig);
    rascunho.auth.loginTabLabel = 'Entrar agora';
    await chamar(paginaAdmin.PUT, {
      usuario: admin,
      method: 'PUT',
      params,
      body: { config: rascunho },
    });
    const antes = await ler(admin);
    expect(antes.rascunho).toEqual([
      expect.objectContaining({
        caminho: 'auth.loginTabLabel',
        tipo: 'alterado',
      }),
    ]);

    const publicado = await chamar(estudio.POST, {
      usuario: admin,
      method: 'POST',
      params,
      body: { acao: 'publicar', nota: 'Texto mais direto na aba' },
    });
    expect(publicado.status).toBe(200);
    const versao = (publicado.json as { versaoPublicada: number })
      .versaoPublicada;
    expect(versao).toBeGreaterThanOrEqual(1);
    const depois = await ler(admin);
    expect(depois.versoes[0]).toMatchObject({
      versao,
      origem: 'publicacao',
      nota: 'Texto mais direto na aba',
    });
    expect(depois.rascunho).toEqual([]);

    // Mesmo conteúdo de novo: nenhuma versão nova.
    const repetido = await chamar(estudio.POST, {
      usuario: admin,
      method: 'POST',
      params,
      body: { acao: 'publicar', nota: 'Publicando de novo' },
    });
    expect(
      (repetido.json as { versaoPublicada: number | null }).versaoPublicada
    ).toBeNull();

    // A diferença de uma versão anterior para o publicado atual.
    const anterior = depois.versoes.find((v) => v.versao < versao);
    if (anterior) {
      const diff = await chamar(estudio.GET, {
        usuario: admin,
        params,
        path: `/api/admin/publicacao/login?versao=${anterior.versao}`,
      });
      expect(diff.status).toBe(200);
    }

    // Segunda publicação e reversão para a primeira: vira uma versão nova.
    const outro = structuredClone(rascunho);
    outro.auth.loginTabLabel = 'Acessar';
    await chamar(paginaAdmin.PUT, {
      usuario: admin,
      method: 'PUT',
      params,
      body: { config: outro },
    });
    const segunda = (
      await chamar(estudio.POST, {
        usuario: admin,
        method: 'POST',
        params,
        body: { acao: 'publicar', nota: 'Segunda mudança de texto' },
      })
    ).json as { versaoPublicada: number };
    expect(segunda.versaoPublicada).toBe(versao + 1);
    const revertido = await chamar(estudio.POST, {
      usuario: admin,
      method: 'POST',
      params,
      body: { acao: 'reverter', versao, nota: 'Volta à primeira mudança' },
    });
    expect(revertido.status).toBe(200);
    expect(
      (revertido.json as { versaoPublicada: number }).versaoPublicada
    ).toBe(versao + 2);
    const final = await ler(admin);
    expect(final.versoes[0]).toMatchObject({
      versao: versao + 2,
      origem: 'reversao',
    });
    const publicadoAgora = async () => {
      const [linha] = await queryRows<{ published_config: unknown }>(
        "SELECT published_config FROM site_page_configs WHERE page_key = 'login'"
      );
      return (
        typeof linha.published_config === 'string'
          ? JSON.parse(linha.published_config)
          : linha.published_config
      ) as { auth: Record<string, unknown> };
    };
    expect((await publicadoAgora()).auth.loginTabLabel).toBe('Entrar agora');

    // Deixa a página como estava, publicando de novo o conteúdo original.
    await chamar(paginaAdmin.PUT, {
      usuario: admin,
      method: 'PUT',
      params,
      body: { config: original.publishedConfig },
    });
    await chamar(estudio.POST, {
      usuario: admin,
      method: 'POST',
      params,
      body: { acao: 'publicar', nota: 'Fim do teste: conteúdo original' },
    });
    expect((await publicadoAgora()).auth.loginTabLabel).toBe(tituloOriginal);

    expect(
      (
        await chamar(estudio.POST, {
          usuario: admin,
          method: 'POST',
          params,
          body: {
            acao: 'reverter',
            versao: 99999,
            nota: 'Versão que não existe',
          },
        })
      ).status
    ).toBe(404);
  });
});

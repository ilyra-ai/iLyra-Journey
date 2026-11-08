import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import { CHAVES_DOS_GRUPOS, GRUPOS_FUNCIONAIS } from '@/lib/plataforma/grupos';
import {
  lerEstadoDosGrupos,
  listarControlesFuncionais,
} from '@/lib/plataforma/funcionalidades';
import {
  getAccountSubscriptionSummary,
  requireFeatureEnabled,
} from '@/lib/plans/service';
import { montarPainelDoChat, filtrarPaineisDoChat } from '@/lib/chat/painel';
import { proxy } from '@/proxy';
import { SESSION_COOKIE_NAME, signSessionToken } from '@/lib/auth/session';
import * as controle from './admin/funcionalidades/route';
import * as dados from './data/[table]/route';
import * as painelAdministrativo from './admin/dashboard/route';
import * as catalogoPublico from './public/plans/route';
import * as assistente from './functions/ask-ai-assistant/route';
import * as localizacao from './perfil/localizacao/route';
import { buscarCidades } from '@/lib/geo/cidades';
import type { PainelAnalitico } from '@/lib/admin/analytics/definicoes';
import { DOMINIOS } from '@/lib/admin/analytics/definicoes';
import { opcoesDoRelatorio } from '@/lib/relatorio-pessoal/servico';
import type { PlanMatrixResponse, PlanFeatureKey } from '@/types/subscription';

beforeEach(async () => {
  await executeStatement(
    `UPDATE platform_feature_switches SET enabled=0 WHERE switch_key IN (${CHAVES_DOS_GRUPOS.map(() => '?').join(',')})`,
    CHAVES_DOS_GRUPOS
  );
});

describe('Desativação reversível integral (tarefa 144)', () => {
  it('mantém o chat sem gerar briefing de saúde com o grupo desligado', async () => {
    const pessoa = await criarUsuario('admin', 'Chat sem briefing');
    await executeStatement(
      "UPDATE profiles SET birth_date = '1988-03-21', birth_time = '07:15:00' WHERE id = ?",
      [pessoa.id]
    );
    const cidade = buscarCidades('sao paulo, sp')[0];
    for (const tipo of ['nascimento', 'moradia']) {
      const resposta = await chamar(localizacao.PATCH, {
        method: 'PATCH',
        body: { tipo, cidadeId: cidade.id },
        usuario: pessoa,
      });
      expect(resposta.status).toBe(200);
    }
    const resposta = await chamar(assistente.POST, {
      method: 'POST',
      body: { query: 'Quero entender meu mapa védico.' },
      usuario: pessoa,
    });
    expect(resposta.status).toBe(200);
    expect(
      (resposta.json as { response: string }).response.length
    ).toBeGreaterThan(0);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM daily_briefings WHERE user_id = ?',
        [pessoa.id]
      )
    ).toBe(0);
  });

  it('recusa todas as famílias de API e páginas controladas, sem depender do papel', async () => {
    const admin = await criarUsuario('admin', 'Navegação');
    const token = await signSessionToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
    const headers = { cookie: SESSION_COOKIE_NAME + '=' + token };
    for (const grupo of Object.values(GRUPOS_FUNCIONAIS)) {
      for (const api of grupo.apis) {
        const resposta = await proxy(
          new NextRequest('http://localhost:3000' + api, { headers })
        );
        expect(resposta.status, api).toBe(403);
      }
      for (const pagina of grupo.paginas) {
        const resposta = await proxy(
          new NextRequest('http://localhost:3000' + pagina, { headers })
        );
        expect(resposta.status, pagina).toBe(307);
        expect(resposta.headers.get('location')).toBe('http://localhost:3000/');
      }
    }
  });

  it('recusa recursos também ao administrador no serviço e no resumo do plano', async () => {
    for (const papel of ['patient', 'admin'] as const) {
      const usuario = await criarUsuario(papel, 'Controle');
      const resumo = await getAccountSubscriptionSummary(usuario.id, papel);
      expect(Object.values(resumo.gruposFuncionais!)).toEqual(
        CHAVES_DOS_GRUPOS.map(() => false)
      );
      for (const recurso of new Set(
        Object.values(GRUPOS_FUNCIONAIS).flatMap((grupo) => [...grupo.recursos])
      )) {
        await expect(
          requireFeatureEnabled(usuario.session, recurso)
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(
          resumo.features.find((item) => item.key === recurso)
        ).toMatchObject({ enabled: false, globalmenteDesativado: true });
      }
    }
  });

  it('reativa por controle real, preserva registros e audita alteração e concorrência', async () => {
    const admin = await criarUsuario('admin', 'Controle');
    const pessoa = await criarUsuario();
    const id = randomUUID();
    await executeStatement(
      'INSERT INTO goals(id,user_id,title) VALUES(?,?,?)',
      [id, pessoa.id, 'Registro preservado']
    );
    const leitura = () =>
      chamar(dados.GET, { usuario: pessoa, params: { table: 'goals' } });
    expect((await leitura()).status).toBe(403);
    const estados = await listarControlesFuncionais();
    const atual = estados.find((item) => item.chave === 'metas_habitos_plano')!;
    const body = { chave: atual.chave, ativo: true, versao: atual.versao };
    expect(
      (await chamar(controle.PUT, { method: 'PUT', usuario: pessoa, body }))
        .status
    ).toBe(403);
    expect(
      (await chamar(controle.PUT, { method: 'PUT', usuario: admin, body }))
        .status
    ).toBe(200);
    expect((await lerEstadoDosGrupos()).metas_habitos_plano).toBe(true);
    expect((await leitura()).status).toBe(200);
    expect(
      await contar('SELECT COUNT(*) total FROM goals WHERE id=? AND title=?', [
        id,
        'Registro preservado',
      ])
    ).toBe(1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM platform_feature_switch_events WHERE switch_key=? AND actor_id=? AND next_enabled=1',
        [atual.chave, admin.id]
      )
    ).toBe(1);
    expect(
      (await chamar(controle.PUT, { method: 'PUT', usuario: admin, body }))
        .status
    ).toBe(409);
    expect((await lerEstadoDosGrupos()).registros_saude).toBe(false);
  });

  it('preserva painéis e consulta de dados históricos no chat e nos relatórios', async () => {
    const pessoa = await criarUsuario('admin', 'Painel');
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,steps) VALUES(?,?,UTC_DATE(),?)',
      [randomUUID(), pessoa.id, 1234]
    );
    expect(await montarPainelDoChat(pessoa.id)).toMatchObject([
      { tipo: 'painel', dias: [{ passos: 1234 }] },
    ]);
    expect(await opcoesDoRelatorio(pessoa.session)).toMatchObject({
      metricas: true,
      reflexoes: true,
      acontecimentos: true,
      alimentacao: true,
    });
    expect(
      await filtrarPaineisDoChat(pessoa.id, [
        {
          tipo: 'painel',
          versao: 1,
          titulo: 'Histórico',
          geradoEm: new Date().toISOString(),
          indisponivel: null,
          dias: [],
        },
      ])
    ).toMatchObject([{ tipo: 'painel' }]);
  });

  it('preserva indicadores administrativos e deixa de oferecer somente os recursos desativados no catálogo público', async () => {
    const admin = await criarUsuario('admin', 'Indicadores');
    const resposta = await chamar(painelAdministrativo.GET, { usuario: admin });
    expect(resposta.status).toBe(200);
    const painel = resposta.json as PainelAnalitico;
    expect(painel.dominios.map((dominio) => dominio.chave).sort()).toEqual(
      Object.keys(DOMINIOS).sort()
    );
    expect(painel.catalogo.dicas).not.toBeNull();
    expect(
      (
        await chamar(painelAdministrativo.GET, {
          usuario: admin,
          path: '/api/admin/dashboard?detalhe=metricas',
        })
      ).status
    ).toBe(200);
    const catalogo = await chamar(catalogoPublico.GET);
    expect(catalogo.status).toBe(200);
    const controlados = new Set<PlanFeatureKey>(
      Object.values(GRUPOS_FUNCIONAIS).flatMap((grupo) => [...grupo.recursos])
    );
    for (const plano of (catalogo.json as PlanMatrixResponse).plans) {
      expect(
        plano.features.some((feature) => controlados.has(feature.key))
      ).toBe(false);
    }
  });

  it('todos os oito controles podem ser reativados e desligados por API administrativa real', async () => {
    const admin = await criarUsuario('admin', 'Reativação');
    for (const chave of CHAVES_DOS_GRUPOS) {
      const atual = (await listarControlesFuncionais()).find(
        (item) => item.chave === chave
      )!;
      expect(
        (
          await chamar(controle.PUT, {
            method: 'PUT',
            usuario: admin,
            body: { chave, ativo: true, versao: atual.versao },
          })
        ).status
      ).toBe(200);
      expect((await lerEstadoDosGrupos())[chave]).toBe(true);
      expect(
        (
          await chamar(controle.PUT, {
            method: 'PUT',
            usuario: admin,
            body: { chave, ativo: false, versao: atual.versao + 1 },
          })
        ).status
      ).toBe(200);
      expect((await lerEstadoDosGrupos())[chave]).toBe(false);
    }
  });

  it('preserva conta, mapas, chat, privacidade e controles administrativos', async () => {
    for (const caminho of [
      '/profile',
      '/chat',
      '/api/account/export',
      '/api/astrologia/mapa',
      '/api/plataforma/funcionalidades',
    ]) {
      const resposta = await proxy(
        new NextRequest('http://localhost:3000' + caminho)
      );
      expect(resposta.headers.get('x-middleware-next'), caminho).toBe('1');
    }
  });
});

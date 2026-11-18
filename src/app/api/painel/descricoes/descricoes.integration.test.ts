import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import {
  iniciarServidorOpenAiCompativel,
  type ServidorOpenAiCompativel,
} from '../../../../../tests/support/servidor-openai-compativel';
import { salvarConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import { CATALOGO_DAS_EXPLICACOES } from '@/lib/painel/catalogo';
import { obterDescricoesDoPainel } from '@/lib/painel/servico';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import * as rota from './route';

const hoje = () => new Date().toISOString().slice(0, 10);
let servidor: ServidorOpenAiCompativel;
const chamadas = () =>
  servidor.requisicoes.filter((r) => r.caminho === '/v1/chat/completions')
    .length;
describe('explicações persistentes em MySQL e contrato HTTP identificado', () => {
  beforeAll(async () => {
    servidor = await iniciarServidorOpenAiCompativel();
    const admin = await criarUsuario('admin');
    await salvarConfiguracaoDeIa(
      {
        provedores: [
          {
            preset: 'jan',
            baseUrl: servidor.baseUrl,
            modelos: [servidor.modelos[0]],
            tempoMaximoSegundos: 15,
            temperatura: 0.3,
          },
        ],
        ordem: [
          { tipo: 'modelo', preset: 'jan', modelo: servidor.modelos[0] },
          { tipo: 'lyra' },
        ],
      },
      admin.id
    );
    servidor.responder(
      JSON.stringify({
        descricoes: Object.fromEntries(
          CATALOGO_DAS_EXPLICACOES.map((m) => [m.id, m.descricao])
        ),
      })
    );
  });
  afterAll(async () => {
    const admin = await criarUsuario('admin');
    await salvarConfiguracaoDeIa(
      { provedores: [], ordem: [{ tipo: 'lyra' }] },
      admin.id
    );
    await servidor.fechar();
  });
  it('persiste uma geração concorrente, reabre do cache e atualiza após novas medidas', async () => {
    const p = await criarUsuario('admin');
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,steps) VALUES(?,?,?,?)',
      [randomUUID(), p.id, hoje(), 0]
    );
    const antes = chamadas();
    const retornos = await Promise.all([
      obterDescricoesDoPainel(p.session, hoje(), false),
      obterDescricoesDoPainel(p.session, hoje(), false),
    ]);
    expect(retornos.some((r) => r.estado === 'pronto')).toBe(true);
    expect(chamadas() - antes).toBe(1);
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), false)).estado
    ).toBe('pronto');
    expect(chamadas() - antes).toBe(1);
    await executeStatement('UPDATE daily_metrics SET steps=5 WHERE user_id=?', [
      p.id,
    ]);
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), false)).estado
    ).toBe('pronto');
    expect(chamadas() - antes).toBe(2);
    const [valor] = await queryRows<{ steps: number }>(
      'SELECT steps FROM daily_metrics WHERE user_id=?',
      [p.id]
    );
    expect(valor.steps).toBe(5);
    expect(JSON.stringify(await exportarDadosDoTitular(p.id))).toContain(
      'descricoes_do_painel'
    );
    await excluirConta(p.id);
    expect(
      await queryRows(
        'SELECT user_id FROM dashboard_descriptions WHERE user_id=?',
        [p.id]
      )
    ).toEqual([]);
  });
  it('privacidade não chama modelo nem grava conteúdo; cache de outra conta não é reutilizado', async () => {
    const p = await criarUsuario('admin');
    const antes = chamadas();
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), true)).estado
    ).toBe('privado');
    expect(chamadas()).toBe(antes);
    expect(
      await queryRows(
        'SELECT user_id FROM dashboard_descriptions WHERE user_id=?',
        [p.id]
      )
    ).toEqual([]);
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), false)).estado
    ).toBe('pronto');
    expect(chamadas()).toBe(antes + 1);
  });
  it('conteúdo inválido não é salvo como pronto, tem intervalo e respeita limite de tentativas', async () => {
    const p = await criarUsuario('admin');
    servidor.responder('{"descricoes":{}}');
    const antes = chamadas();
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), false)).estado
    ).toBe('falha');
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), false)).estado
    ).toBe('falha');
    expect(chamadas()).toBe(antes + 1);
    await executeStatement(
      'UPDATE dashboard_descriptions SET next_attempt=NULL WHERE user_id=?',
      [p.id]
    );
    await executeStatement(
      'UPDATE dashboard_description_usage SET attempts=6 WHERE user_id=? AND usage_date=UTC_DATE()',
      [p.id]
    );
    expect(
      (await obterDescricoesDoPainel(p.session, hoje(), false)).estado
    ).toBe('limite');
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    expect(
      (await obterDescricoesDoPainel(p.session, ontem, false)).estado
    ).toBe('limite');
    expect(chamadas()).toBe(antes + 1);
  });
  it('recusa recurso e histórico desativados antes de qualquer geração', async () => {
    const pessoa = await criarUsuario();
    const direitos = await queryRows<{ id: string; enabled: number }>(
      `SELECT e.id,e.enabled FROM plan_entitlements e
       JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id
       WHERE p.plan_key='care' AND f.feature_key IN ('health_intelligence','metrics_history_days')`
    );
    const antes = chamadas();
    try {
      for (const recurso of ['health_intelligence', 'metrics_history_days']) {
        await executeStatement(
          `UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id
           JOIN plan_features f ON f.id=e.feature_id SET e.enabled=FALSE
           WHERE p.plan_key='care' AND f.feature_key=?`,
          [recurso]
        );
        expect(
          (
            await chamar(rota.POST, {
              usuario: pessoa,
              method: 'POST',
              path: '/api/painel/descricoes',
              body: { data: hoje(), privado: false },
            })
          ).status
        ).toBe(403);
        for (const d of direitos)
          await executeStatement(
            'UPDATE plan_entitlements SET enabled=? WHERE id=?',
            [d.enabled, d.id]
          );
      }
      expect(chamadas()).toBe(antes);
    } finally {
      for (const d of direitos)
        await executeStatement(
          'UPDATE plan_entitlements SET enabled=? WHERE id=?',
          [d.enabled, d.id]
        );
    }
  });
  it('sem consentimento não chama um provedor externo nem consome cota', async () => {
    const admin = await criarUsuario('admin');
    const salvar = (baseUrl: string) =>
      salvarConfiguracaoDeIa(
        {
          provedores: [
            {
              preset: 'jan',
              baseUrl,
              modelos: [servidor.modelos[0]],
              tempoMaximoSegundos: 15,
              temperatura: 0.3,
            },
          ],
          ordem: [
            { tipo: 'modelo', preset: 'jan', modelo: servidor.modelos[0] },
            { tipo: 'lyra' },
          ],
        },
        admin.id
      );
    const antes = chamadas();
    try {
      // Destino externo real, mas nenhuma chamada pode sair sem autorização.
      await salvar('https://api.openai.com/v1');
      expect(
        (await obterDescricoesDoPainel(admin.session, hoje(), false)).estado
      ).toBe('sem_modelo');
      expect(chamadas()).toBe(antes);
      expect(
        await queryRows(
          'SELECT * FROM dashboard_description_usage WHERE user_id=?',
          [admin.id]
        )
      ).toEqual([]);
    } finally {
      await salvar(servidor.baseUrl);
    }
  });
  it('a rota exige sessão e não aceita escolher outro titular', async () => {
    expect(
      (
        await chamar(rota.POST, {
          path: '/api/painel/descricoes',
          method: 'POST',
          usuario: null,
          body: { data: hoje(), privado: true },
        })
      ).status
    ).toBe(401);
    const p = await criarUsuario('admin');
    expect(
      (
        await chamar(rota.POST, {
          usuario: p,
          path: '/api/painel/descricoes',
          method: 'POST',
          body: { data: hoje(), privado: true, userId: randomUUID() },
        })
      ).status
    ).toBe(400);
  });
});

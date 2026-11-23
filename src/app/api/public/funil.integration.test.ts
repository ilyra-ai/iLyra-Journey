import { describe, expect, it } from 'vitest';

import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import type { PainelDoFunil } from '@/lib/funil/painel';
import { contarEtapa } from '@/lib/funil/registro';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

import { GET as PAINEL } from '../admin/funil/route';
import { POST as DESCOBERTA } from './descoberta/route';
import { POST } from './funil/route';

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';

function informar(corpo: unknown, userAgent = NAVEGADOR, ip = '203.0.113.70') {
  return chamar(POST, {
    method: 'POST',
    body: corpo,
    headers: { 'user-agent': userAgent, 'x-forwarded-for': ip },
  });
}

async function totalDe(etapa: string, detalhe = '') {
  const [linha] = await queryRows<{ total: string | null }>(
    `SELECT SUM(total) AS total FROM funil_contagens_diarias
      WHERE etapa = ? AND detalhe = ?`,
    [etapa, detalhe]
  );
  return Number(linha?.total ?? 0);
}

describe('funil anônimo: rota pública (tarefa 170)', () => {
  it('conta a etapa do navegador sem gravar nada além do nome e do detalhe', async () => {
    const antes = await totalDe('iniciou_descoberta', 'link');
    const resposta = await informar({
      etapa: 'iniciou_descoberta',
      detalhe: 'link',
    });
    expect(resposta.status).toBe(204);
    expect(await totalDe('iniciou_descoberta', 'link')).toBe(antes + 1);
    // A tabela só tem dia, etapa, detalhe e total: nada de IP ou agente.
    const colunas = await queryRows<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funil_contagens_diarias'
        ORDER BY ORDINAL_POSITION`
    );
    expect(colunas.map((c) => c.COLUMN_NAME)).toEqual([
      'dia',
      'etapa',
      'detalhe',
      'total',
      'atualizado_em',
    ]);
  });

  it('recusa etapa do servidor e texto livre, e ignora robôs', async () => {
    const antes = await totalDe('cadastro_concluido', 'email');
    expect(
      (await informar({ etapa: 'cadastro_concluido', detalhe: 'email' })).status
    ).toBe(400);
    expect(await totalDe('cadastro_concluido', 'email')).toBe(antes);
    expect(
      (await informar({ etapa: 'visita_landing', detalhe: '1990-05-01' }))
        .status
    ).toBe(400);
    const visitas = await totalDe('visita_landing');
    expect(
      (await informar({ etapa: 'visita_landing' }, 'Googlebot/2.1')).status
    ).toBe(204);
    expect(await totalDe('visita_landing')).toBe(visitas);
  });

  it('a descoberta gratuita é contada no servidor, sem a data', async () => {
    const antes = await totalDe('leitura_entregue', 'signo');
    const validadas = await totalDe('nascimento_validado');
    const resposta = await chamar(DESCOBERTA, {
      method: 'POST',
      body: { nome: 'Ana Teste', dataDeNascimento: '2000-08-10' },
      headers: { 'x-forwarded-for': '203.0.113.71' },
    });
    expect(resposta.status).toBe(200);
    expect(await totalDe('leitura_entregue', 'signo')).toBe(antes + 1);
    expect(await totalDe('nascimento_validado')).toBe(validadas + 1);
  });
});

describe('painel do funil na administração (tarefa 170)', () => {
  it('só administradores; período fora da lista é recusado', async () => {
    const pessoa = await criarUsuario();
    const admin = await criarUsuario('admin');
    expect((await chamar(PAINEL, { usuario: null })).status).toBe(401);
    expect((await chamar(PAINEL, { usuario: pessoa })).status).toBe(403);
    expect(
      (
        await chamar(PAINEL, {
          usuario: admin,
          path: '/api/admin/funil?dias=45',
        })
      ).status
    ).toBe(400);
  });

  it('soma as etapas do período e calcula a taxa só com denominador', async () => {
    const admin = await criarUsuario('admin');
    const ler = async () =>
      (
        await chamar(PAINEL, {
          usuario: admin,
          path: '/api/admin/funil?dias=7',
        })
      ).json as PainelDoFunil;
    const antes = await ler();
    // Acima da coorte mínima (10), para a taxa aparecer.
    for (let i = 0; i < 12; i += 1) await contarEtapa('modal_visto');
    await contarEtapa('contribuicao_escolhida', 'colaboracao_1999');
    // Fora do período de 7 dias: não entra.
    await contarEtapa('modal_visto', '', new Date(Date.now() - 20 * 864e5));
    const depois = await ler();
    const total = (p: PainelDoFunil, etapa: string) =>
      p.etapas.find((e) => e.etapa === etapa)?.total ?? 0;
    expect(total(depois, 'modal_visto') - total(antes, 'modal_visto')).toBe(12);
    expect(
      depois.etapas
        .find((e) => e.etapa === 'contribuicao_escolhida')
        ?.detalhes.find((d) => d.detalhe === 'colaboracao_1999')?.total
    ).toBeGreaterThanOrEqual(1);
    const convite = depois.taxas.find((t) => t.rotulo.includes('convite'));
    expect(convite?.denominador).toBe(total(depois, 'modal_visto'));
    expect(convite?.valor).not.toBeNull();
  });

  it('receita e reembolso vêm dos webhooks, separados por ambiente (tarefa 185)', async () => {
    const admin = await criarUsuario('admin');
    const ler = async (ambiente: string) =>
      (
        await chamar(PAINEL, {
          usuario: admin,
          path: `/api/admin/funil?dias=7&ambiente=${ambiente}`,
        })
      ).json as PainelDoFunil;
    const reais = (p: PainelDoFunil, campo: 'receita' | 'reembolsado') =>
      p.faturamento[campo].find((v) => v.moeda === 'BRL')?.total ?? 0;
    const antesLive = await ler('live');
    const antesTeste = await ler('test');
    const evento = async (
      tipo: string,
      livemode: boolean,
      objeto: Record<string, unknown>,
      status = 'processed'
    ) =>
      executeStatement(
        `INSERT INTO billing_webhook_events
           (id, provider, external_event_id, event_type, status, payload)
         VALUES (UUID(), 'stripe', ?, ?, ?, ?)`,
        [
          `evt_funil_${crypto.randomUUID()}`,
          tipo,
          status,
          JSON.stringify({ livemode, type: tipo, data: { object: objeto } }),
        ]
      );
    await evento('invoice.paid', true, { amount_paid: 1999, currency: 'brl' });
    await evento('invoice.paid', false, { amount_paid: 999, currency: 'brl' });
    // Com erro no processamento: não entra na receita.
    await evento(
      'invoice.paid',
      true,
      { amount_paid: 5000, currency: 'brl' },
      'error'
    );
    await evento('charge.refunded', true, {
      amount_refunded: 1999,
      currency: 'brl',
    });
    const live = await ler('live');
    const teste = await ler('test');
    expect(reais(live, 'receita') - reais(antesLive, 'receita')).toBeCloseTo(
      19.99
    );
    expect(reais(teste, 'receita') - reais(antesTeste, 'receita')).toBeCloseTo(
      9.99
    );
    expect(live.faturamento.reembolsos - antesLive.faturamento.reembolsos).toBe(
      1
    );
    expect(
      reais(live, 'reembolsado') - reais(antesLive, 'reembolsado')
    ).toBeCloseTo(19.99);
    expect(teste.faturamento.reembolsos).toBe(
      antesTeste.faturamento.reembolsos
    );
    expect(live.fatos.faturasPagas - antesLive.fatos.faturasPagas).toBe(1);
    expect(live).toMatchObject({
      versao: 2,
      ambiente: 'live',
      coorteMinima: 10,
    });
    expect(
      (
        await chamar(PAINEL, {
          usuario: admin,
          path: '/api/admin/funil?dias=7&ambiente=producao',
        })
      ).status
    ).toBe(400);
  });

  it('contas criadas e retorno D7 vêm das tabelas reais', async () => {
    const admin = await criarUsuario('admin');
    const ler = async () =>
      (
        await chamar(PAINEL, {
          usuario: admin,
          path: '/api/admin/funil?dias=30',
        })
      ).json as PainelDoFunil;
    const antes = await ler();
    // Conta criada há 10 dias que conversou no 8º dia: entra na coorte D7 e
    // retornou; não entra na D30.
    const antiga = await criarUsuario();
    await executeStatement(
      'UPDATE users SET created_at = UTC_TIMESTAMP() - INTERVAL 10 DAY WHERE id = ?',
      [antiga.id]
    );
    const conversa = crypto.randomUUID();
    await executeStatement(
      `INSERT INTO chat_conversations (id, user_id, title)
       VALUES (?, ?, 'Teste do funil')`,
      [conversa, antiga.id]
    );
    await executeStatement(
      `INSERT INTO chat_turns
         (id, conversation_id, user_id, question, status, attempt_id, created_at)
       VALUES (?, ?, ?, 'Oi', 'concluido', ?, UTC_TIMESTAMP() - INTERVAL 2 DAY)`,
      [crypto.randomUUID(), conversa, antiga.id, crypto.randomUUID()]
    );
    const depois = await ler();
    expect(depois.retencao.d7.coorte - antes.retencao.d7.coorte).toBe(1);
    expect(depois.retencao.d7.retornaram - antes.retencao.d7.retornaram).toBe(
      1
    );
    expect(depois.retencao.d30.coorte).toBe(antes.retencao.d30.coorte);
    expect(depois.fatos.contasCriadas).toBeGreaterThanOrEqual(1);
    expect(depois.periodo.dias).toBe(30);
  });
});

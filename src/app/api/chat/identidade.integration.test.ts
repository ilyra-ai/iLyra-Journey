import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { lerConversa } from '@/lib/chat/servico';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import { resolverTratamento } from '@/lib/lyra/preferencias';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { iniciarServidorOpenAiCompativel } from '../../../../tests/support/servidor-openai-compativel';
import { PUT } from '../admin/ia/route';
import { POST } from '../functions/ask-ai-assistant/route';

describe('identidade global do Motor Lyra com MySQL real', () => {
  it('envia a identidade ao provedor por HTTP e grava a expressão uma única vez', async () => {
    const servidor = await iniciarServidorOpenAiCompativel();
    const admin = await criarUsuario('admin');
    try {
      const configurada = await chamar(PUT, {
        usuario: admin,
        method: 'PUT',
        body: {
          provedores: [
            {
              preset: 'jan',
              baseUrl: servidor.baseUrl,
              modelos: ['qwen2.5:7b-instruct'],
              tempoMaximoSegundos: 10,
              temperatura: 0.3,
            },
          ],
          ordem: [
            { tipo: 'modelo', preset: 'jan', modelo: 'qwen2.5:7b-instruct' },
            { tipo: 'lyra' },
          ],
        },
      });
      expect(configurada.status).toBe(200);
      servidor.responder('Vamos aprender sobre o seu mapa.');
      const resposta = await chamar(POST, {
        usuario: admin,
        method: 'POST',
        body: {
          query: 'Explique meu mapa.',
          conversationId: randomUUID(),
          turnId: randomUUID(),
        },
      });
      expect(resposta.status).toBe(200);
      expect((resposta.json as { response: string }).response).toBe(
        '💡 Vamos aprender sobre o seu mapa.'
      );
      expect(servidor.requisicoes).toHaveLength(1);
      const enviado = JSON.stringify(servidor.requisicoes[0].corpo);
      expect(enviado).toContain('Douglas Mosken');
      expect(enviado).toContain('Organização e destaque');
      expect(enviado).toContain('Não presuma que ela é Douglas');
      expect(enviado).toContain('Não tenho memória oculta');
      await resolverTratamento(admin.id, 'Me chame de Bia.', 'Pessoa');
      servidor.responder('Olá, xuxu!');
      const depoisDaEscolha = await chamar(POST, {
        usuario: admin,
        method: 'POST',
        body: {
          query: 'Olá!',
          conversationId: randomUUID(),
          turnId: randomUUID(),
        },
      });
      expect(depoisDaEscolha.status).toBe(200);
      expect((depoisDaEscolha.json as { response: string }).response).toContain(
        'Olá, Bia!'
      );
      expect(
        (depoisDaEscolha.json as { response: string }).response
      ).not.toMatch(/\bxuxu(?:zinho)?\b/iu);
      expect(JSON.stringify(servidor.requisicoes.at(-1)?.corpo)).toContain(
        'Bia'
      );
    } finally {
      await servidor.fechar();
      const restaurada = await chamar(PUT, {
        usuario: admin,
        method: 'PUT',
        body: { provedores: [], ordem: [{ tipo: 'lyra' }] },
      });
      expect(restaurada.status).toBe(200);
    }
  });

  it('aplica a contas existentes e novas e mantém os históricos separados', async () => {
    const antiga = await criarUsuario('patient', 'Ana');
    await executeStatement('UPDATE users SET created_at = ? WHERE id = ?', [
      '2025-01-01 00:00:00',
      antiga.id,
    ]);
    const nova = await criarUsuario('patient', 'Bruno');
    for (const pessoa of [antiga, nova]) {
      const conversationId = randomUUID();
      const resposta = await chamar(POST, {
        usuario: pessoa,
        method: 'POST',
        body: {
          query: 'Quem é seu criador?',
          conversationId,
          turnId: randomUUID(),
          privacyMode: true,
        },
      });
      expect(resposta.status).toBe(200);
      const texto = (resposta.json as { response: string }).response;
      expect(texto).toMatch(/^💖 /);
      expect(texto).toContain('Douglas Mosken');
      expect(texto).toContain('narrativa de origem');
      const gravada = await lerConversa(pessoa.id, conversationId);
      expect(gravada.turnos[0]?.resposta).toBe(texto);
      await expect(
        lerConversa(
          pessoa.id === antiga.id ? nova.id : antiga.id,
          conversationId
        )
      ).rejects.toThrow();
    }
  });

  it('persiste nome escolhido entre conversas, mantém o padrão nas outras contas e exporta a preferência', async () => {
    const ana = await criarUsuario('patient', 'Ana');
    const bruno = await criarUsuario('patient', 'Bruno');
    const perguntar = async (usuario: typeof ana, query: string) => {
      const resposta = await chamar(POST, {
        usuario,
        method: 'POST',
        body: {
          query,
          conversationId: randomUUID(),
          turnId: randomUUID(),
          privacyMode: true,
        },
      });
      expect(resposta.status).toBe(200);
      return (resposta.json as { response: string }).response;
    };
    expect(await perguntar(ana, 'Olá!')).toContain('Olá, xuxu!');
    expect(
      await perguntar(ana, 'Não me chame de xuxu, me chame de Bia.')
    ).toContain('Combinado, Bia.');
    expect(await perguntar(ana, 'Olá!')).toContain('Olá, Bia!');
    expect(await perguntar(bruno, 'Olá!')).toContain('Olá, xuxu!');
    expect(
      await resolverTratamento(ana.id, 'Como está meu dia?', 'Ana')
    ).toMatchObject({ nome: 'Bia', carinhoso: false });
    const dados = await exportarDadosDoTitular(ana.id);
    expect(JSON.stringify(dados)).toContain('lyra_address_preferences');
    expect(JSON.stringify(dados)).toContain('Bia');
    expect(await perguntar(ana, 'Me chame pelo meu nome.')).toContain(
      'Combinado, Ana.'
    );
    expect(await perguntar(ana, 'Olá!')).toContain('Olá, Ana!');
    expect(await perguntar(ana, 'Pode voltar a me chamar de xuxu.')).toContain(
      'Combinado, xuxu.'
    );
    expect(await perguntar(ana, 'Olá!')).toContain('Olá, xuxu!');
    await executeStatement('DELETE FROM users WHERE id = ?', [ana.id]);
    expect(
      await queryRows(
        'SELECT user_id FROM lyra_address_preferences WHERE user_id = ?',
        [ana.id]
      )
    ).toHaveLength(0);
  });
});

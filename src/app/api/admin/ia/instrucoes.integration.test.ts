import { afterEach, expect, it } from 'vitest';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { iniciarServidorOpenAiCompativel } from '../../../../../tests/support/servidor-openai-compativel';
import { GET, PUT } from './route';
import { POST as testar } from './testar/route';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

afterEach(async () => {
  await executeStatement('DELETE FROM ai_model_chain');
  await executeStatement('DELETE FROM ai_provider_connections');
  await executeStatement(
    'INSERT INTO ai_model_chain (position, connection_id, model) VALUES (1, NULL, NULL)'
  );
});

const provedor = (
  preset: string,
  baseUrl: string,
  extra: Record<string, unknown> = {}
) => ({
  preset,
  baseUrl,
  modelos: ['qwen3'],
  tempoMaximoSegundos: 10,
  temperatura: 0.2,
  ...extra,
});

it('grava, devolve e troca "instruções na mensagem" por provedor; ausente é desligada', async () => {
  const admin = await criarUsuario('admin');
  const salvar = (provedores: unknown[]) =>
    chamar(PUT, {
      usuario: admin,
      method: 'PUT',
      body: {
        provedores,
        ordem: [{ tipo: 'modelo', preset: 'jan', modelo: 'qwen3' }],
      },
    });

  const primeira = await salvar([
    provedor('jan', 'http://127.0.0.1:1337/v1', { instrucoesNaMensagem: true }),
    provedor('ollama', 'http://127.0.0.1:11434/v1'),
  ]);
  expect(primeira.status).toBe(200);
  const linhas = await queryRows<{
    preset: string;
    instructions_in_user_message: number;
  }>(
    'SELECT preset, instructions_in_user_message FROM ai_provider_connections ORDER BY preset'
  );
  expect(
    linhas.map((l) => [l.preset, Number(l.instructions_in_user_message)])
  ).toEqual([
    ['jan', 1],
    ['ollama', 0],
  ]);

  const lida = await chamar(GET, { usuario: admin });
  const porPreset = Object.fromEntries(
    (
      lida.json as {
        provedores: Array<{ preset: string; instrucoesNaMensagem: boolean }>;
      }
    ).provedores.map((p) => [p.preset, p.instrucoesNaMensagem])
  );
  expect(porPreset).toEqual({ jan: true, ollama: false });

  const segunda = await salvar([
    provedor('jan', 'http://127.0.0.1:1337/v1', {
      instrucoesNaMensagem: false,
    }),
  ]);
  expect(segunda.status).toBe(200);
  expect(
    (segunda.json as { provedores: Array<{ instrucoesNaMensagem: boolean }> })
      .provedores[0].instrucoesNaMensagem
  ).toBe(false);

  const invalida = await salvar([
    provedor('jan', 'http://127.0.0.1:1337/v1', {
      instrucoesNaMensagem: 'sim',
    }),
  ]);
  expect(invalida.status).toBe(400);
});

it('o teste de conexão respeita a opção: uma só mensagem do usuário quando ligada', async () => {
  const admin = await criarUsuario('admin');
  const servidor = await iniciarServidorOpenAiCompativel();
  try {
    servidor.responder('Funcionando.');
    for (const ligada of [false, true]) {
      const r = await chamar(testar, {
        usuario: admin,
        method: 'POST',
        body: {
          preset: 'jan',
          baseUrl: servidor.baseUrl,
          tempoMaximoSegundos: 10,
          temperatura: 0.2,
          modelo: 'qwen3',
          instrucoesNaMensagem: ligada,
        },
      });
      expect(r.status).toBe(200);
    }
    const papeis = servidor.requisicoes
      .filter((r) => r.caminho === '/v1/chat/completions')
      .map((r) =>
        (r.corpo as { messages: Array<{ role: string }> }).messages.map(
          (m) => m.role
        )
      );
    expect(papeis).toEqual([['system', 'user'], ['user']]);
  } finally {
    await servidor.fechar();
  }
});

it('usuário comum não altera a configuração', async () => {
  const usuario = await criarUsuario('patient');
  const r = await chamar(PUT, {
    usuario,
    method: 'PUT',
    body: {
      provedores: [
        provedor('jan', 'http://127.0.0.1:1337/v1', {
          instrucoesNaMensagem: true,
        }),
      ],
      ordem: [{ tipo: 'modelo', preset: 'jan', modelo: 'qwen3' }],
    },
  });
  expect(r.status).toBe(403);
});

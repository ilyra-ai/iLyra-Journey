import { expect, it } from 'vitest';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { iniciarServidorOpenAiCompativel } from '../../../../../tests/support/servidor-openai-compativel';
import { POST as listar } from './modelos/route';
import {
  salvarConfiguracaoDeIa,
  lerConfiguracaoDeIa,
} from '@/lib/ai/provedores-da-plataforma';
import { executeStatement } from '@/lib/mysql/pool';

it('confirma resposta real e recusa de conexão sem apagar o modelo e a URL salvos', async () => {
  const admin = await criarUsuario('admin');
  const servidor = await iniciarServidorOpenAiCompativel();
  const baseUrl = servidor.baseUrl;
  let fechado = false;
  try {
    await salvarConfiguracaoDeIa(
      {
        provedores: [
          {
            preset: 'jan',
            baseUrl,
            modelos: ['llama3.2:3b'],
            tempoMaximoSegundos: 10,
            temperatura: 0.7,
          },
        ],
        ordem: [
          { tipo: 'lyra' },
          { tipo: 'modelo', preset: 'jan', modelo: 'llama3.2:3b' },
        ],
      },
      admin.id
    );
    const body = {
      preset: 'jan',
      baseUrl,
      tempoMaximoSegundos: 10,
      temperatura: 0.7,
    };
    const ativa = await chamar(listar, {
      usuario: admin,
      method: 'POST',
      body,
    });
    expect(ativa.status).toBe(200);
    expect(ativa.json).toMatchObject({
      modelos: ['llama3.2:3b', 'qwen2.5:7b-instruct'],
    });
    await servidor.fechar();
    fechado = true;
    const parada = await chamar(listar, {
      usuario: admin,
      method: 'POST',
      body,
    });
    expect(parada.status).toBe(502);
    const salvo = await lerConfiguracaoDeIa();
    expect(salvo.provedores[0]).toMatchObject({
      baseUrl,
      modelos: ['llama3.2:3b'],
    });
  } finally {
    if (!fechado) await servidor.fechar();
    await executeStatement('DELETE FROM ai_model_chain');
    await executeStatement('DELETE FROM ai_provider_connections');
    await executeStatement(
      'INSERT INTO ai_model_chain (position, connection_id, model) VALUES (1, NULL, NULL)'
    );
  }
});

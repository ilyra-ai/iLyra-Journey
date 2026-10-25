import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, expect, it } from 'vitest';
import sharp from 'sharp';
import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { GET } from '@/app/api/chat/imagens/[id]/route';
import { salvarConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import { gerarImagemDoTurno } from './imagens';
import { iniciarTurno, concluirTurno, lerConversa } from './servico';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

let pedidos: Array<{ model: string; prompt: string }> = [];
const servidor = createServer(async (req, res) => {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(Buffer.from(parte));
  pedidos.push(JSON.parse(Buffer.concat(partes).toString()));
  const png = await sharp({
    create: { width: 24, height: 24, channels: 3, background: '#087878' },
  })
    .png()
    .toBuffer();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({ created: 1, data: [{ b64_json: png.toString('base64') }] })
  );
});
beforeAll(
  () => new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve))
);
afterAll(async () => {
  await executeStatement('DELETE FROM ai_model_chain');
  await executeStatement('DELETE FROM ai_provider_connections');
  await executeStatement(
    'INSERT INTO ai_model_chain (position, connection_id, model) VALUES (1, NULL, NULL)'
  );
  await new Promise<void>((resolve) => {
    servidor.closeAllConnections();
    servidor.close(() => resolve());
  });
});

it('usa o segundo modelo, persiste imagem privada, permite reabrir e bloqueia outra conta', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const outra = await criarUsuario();
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/v1`;
  await salvarConfiguracaoDeIa(
    {
      provedores: [
        {
          preset: 'localai',
          baseUrl: url,
          modelos: ['imagem-a', 'imagem-b'],
          tempoMaximoSegundos: 10,
          temperatura: 0.7,
        },
      ],
      ordem: [
        { tipo: 'lyra' },
        { tipo: 'modelo', preset: 'localai', modelo: 'imagem-b' },
      ],
    },
    admin.id
  );
  const pedido = {
    conversationId: randomUUID(),
    turnId: randomUUID(),
    query: 'Crie uma imagem de uma flor',
  };
  const turno = await iniciarTurno(pessoa.id, pedido);
  await concluirTurno(pessoa.id, turno, 'Pedido registrado', false, {
    tipo: 'solicitada',
    prompt: pedido.query,
  });
  pedidos = [];
  const imagem = await gerarImagemDoTurno(pessoa.session, turno.turnId);
  expect(imagem).toMatchObject({
    estado: 'pronta',
    modelo: 'imagem-b',
    largura: 24,
    altura: 24,
  });
  expect(pedidos).toEqual([
    {
      model: 'imagem-b',
      prompt: pedido.query,
      n: 1,
      response_format: 'b64_json',
    },
  ]);
  const reaberta = await lerConversa(pessoa.id, pedido.conversationId);
  expect(reaberta.turnos[0].imagem).toMatchObject({
    estado: 'pronta',
    modelo: 'imagem-b',
  });
  expect(JSON.stringify(reaberta)).not.toContain('image_data');
  const arquivo = await chamar(GET, {
    usuario: pessoa,
    params: { id: turno.turnId },
    path: `/api/chat/imagens/${turno.turnId}?arquivo=1`,
  });
  expect(arquivo.status).toBe(200);
  const proibida = await chamar(GET, {
    usuario: outra,
    params: { id: turno.turnId },
  });
  expect(proibida.status).toBe(404);
  const anonima = await chamar(GET, {
    usuario: null,
    params: { id: turno.turnId },
  });
  expect(anonima.status).toBe(401);
  await gerarImagemDoTurno(pessoa.session, turno.turnId);
  expect(pedidos).toHaveLength(1);
  await executeStatement(
    'DELETE FROM chat_conversations WHERE id = ? AND user_id = ?',
    [pedido.conversationId, pessoa.id]
  );
  expect(
    await queryRows(
      'SELECT turn_id FROM chat_generated_images WHERE turn_id = ?',
      [turno.turnId]
    )
  ).toHaveLength(0);
});

it('privacidade impede geração sem chamar o provedor e preserva o erro', async () => {
  const pessoa = await criarUsuario();
  const pedido = {
    conversationId: randomUUID(),
    turnId: randomUUID(),
    query: 'Gere uma imagem',
  };
  const turno = await iniciarTurno(pessoa.id, pedido);
  await concluirTurno(pessoa.id, turno, 'Pedido registrado', true, {
    tipo: 'solicitada',
    prompt: pedido.query,
  });
  const antes = pedidos.length;
  const imagem = await gerarImagemDoTurno(pessoa.session, turno.turnId);
  expect(imagem.estado).toBe('erro');
  expect(imagem.erro).toMatch(/Privacidade/);
  expect(pedidos).toHaveLength(antes);
});

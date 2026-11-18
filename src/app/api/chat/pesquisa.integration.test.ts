import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { criarUsuario, contar } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { iniciarTurno, concluirTurno, lerConversa } from '@/lib/chat/servico';
import { definirFavorita, pesquisarNoChat } from '@/lib/chat/pesquisa';
import { montarPainelDoChat } from '@/lib/chat/painel';
import type { PaginaDaPesquisa, PaginaDaConversa } from '@/lib/chat/tipos';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import * as pesquisa from './pesquisa/route';
import * as favorita from './favoritos/[id]/route';
import * as detalhe from './conversas/[id]/route';

async function gravar(
  usuario: string,
  pergunta: string,
  resposta: string,
  conversaId = randomUUID()
) {
  const pedido = {
    conversationId: conversaId,
    turnId: randomUUID(),
    query: pergunta,
  };
  const turno = await iniciarTurno(usuario, pedido);
  await concluirTurno(usuario, turno, resposta, false, null, false);
  return pedido;
}
const buscar = (
  u: Awaited<ReturnType<typeof criarUsuario>>,
  termo: string,
  favoritos = false,
  cursor: string | null = null
) =>
  chamar(pesquisa.POST, {
    method: 'POST',
    usuario: u,
    body: { termo, favoritos, cursor },
  });

describe('busca e favoritas usando histórico e MySQL reais', () => {
  it('exige sessão em busca, salvar e remover', async () => {
    for (const [handler, method] of [
      [pesquisa.POST, 'POST'],
      [favorita.PUT, 'PUT'],
      [favorita.DELETE, 'DELETE'],
    ] as const)
      expect(
        (
          await chamar(handler, {
            method,
            params: { id: randomUUID() },
            usuario: null,
            body: { termo: 'sono' },
          })
        ).status
      ).toBe(401);
  });
  it('encontra acentos, maiúsculas, Unicode e trechos no fim de respostas longas', async () => {
    const u = await criarUsuario();
    const p = await gravar(
      u.id,
      'Café à noite 🌙',
      `${'Texto anterior. '.repeat(100)}Disposição para respirar com calma.`
    );
    for (const termo of ['CAFE', 'café', '🌙', 'disposicao']) {
      const r = await buscar(u, termo);
      expect(r.status).toBe(200);
      expect(r.headers.get('cache-control')).toBe('private, no-store');
      const [item] = (r.json as PaginaDaPesquisa).resultados;
      expect(item.turnoId).toBe(p.turnId);
      if (termo === 'disposicao') expect(item.resposta).toContain('Disposição');
    }
  });
  it('não interpreta porcentagem, sublinhado ou apóstrofo como SQL ou curinga', async () => {
    const u = await criarUsuario();
    const p = await gravar(
      u.id,
      "Água 100%_sincera! d'água",
      'Uma orientação registrada.'
    );
    await gravar(u.id, 'Água 100 pontos sincera', 'Outro registro.');
    for (const termo of ['100%', '%_', 'sincera!', "d'água"]) {
      const r = await buscar(u, termo);
      expect(
        (r.json as PaginaDaPesquisa).resultados.map((i) => i.turnoId)
      ).toEqual([p.turnId]);
    }
    expect((await buscar(u, "' OR 1=1 --")).json).toMatchObject({
      resultados: [],
      proximoCursor: null,
    });
  });
  it('busca perguntas sem resposta sem inventar texto da Lyra', async () => {
    const u = await criarUsuario();
    const p = {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'Minha pergunta ainda sem resposta',
    };
    await iniciarTurno(u.id, p);
    expect((await buscar(u, 'ainda sem')).json).toMatchObject({
      resultados: [{ turnoId: p.turnId, resposta: null }],
    });
    expect(
      (
        await chamar(favorita.PUT, {
          method: 'PUT',
          usuario: u,
          params: { id: p.turnId },
        })
      ).status
    ).toBe(409);
  });
  it('isola busca, favoritos e destino da mensagem entre titulares', async () => {
    const a = await criarUsuario(),
      b = await criarUsuario();
    const p = await gravar(
      a.id,
      'Assunto pessoal isolado',
      'Só a pessoa titular lê.'
    );
    await definirFavorita(a.id, p.turnId, true);
    expect((await buscar(b, 'isolado')).json).toMatchObject({ resultados: [] });
    expect((await buscar(b, '', true)).json).toMatchObject({ resultados: [] });
    for (const handler of [favorita.PUT, favorita.DELETE])
      expect(
        (
          await chamar(handler, {
            method: handler === favorita.PUT ? 'PUT' : 'DELETE',
            usuario: b,
            params: { id: p.turnId },
          })
        ).status
      ).toBe(404);
    expect(
      (
        await chamar(detalhe.GET, {
          usuario: b,
          params: { id: p.conversationId },
          path: `/api/chat/conversas/${p.conversationId}?alvo=${p.turnId}`,
        })
      ).status
    ).toBe(404);
  });
  it('salvar é idempotente, não duplica sob concorrência e remover persiste', async () => {
    const u = await criarUsuario();
    const p = await gravar(
      u.id,
      'Uma resposta importante',
      'Respire no seu ritmo.'
    );
    await Promise.all(
      Array.from({ length: 5 }, () => definirFavorita(u.id, p.turnId, true))
    );
    expect(
      await contar(
        'SELECT COUNT(*) total FROM chat_favorites WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
    expect((await lerConversa(u.id, p.conversationId)).turnos[0].favorita).toBe(
      true
    );
    expect((await buscar(u, '', true)).json).toMatchObject({
      resultados: [{ turnoId: p.turnId, favorita: true }],
    });
    expect(
      (
        await chamar(favorita.DELETE, {
          method: 'DELETE',
          usuario: u,
          params: { id: p.turnId },
        })
      ).status
    ).toBe(200);
    expect((await lerConversa(u.id, p.conversationId)).turnos[0].favorita).toBe(
      false
    );
    expect((await buscar(u, '', true)).json).toMatchObject({ resultados: [] });
  });
  it('pagina todos os resultados e favoritas sem repetir ou perder mensagens', async () => {
    const u = await criarUsuario();
    const conversa = randomUUID();
    const ids: string[] = [];
    for (let i = 0; i < 45; i++) {
      const p = await gravar(
        u.id,
        `Busca paginada ${i}`,
        'Resposta para conferir a paginação.',
        conversa
      );
      ids.push(p.turnId);
      if (i < 25) await definirFavorita(u.id, p.turnId, true);
    }
    for (const favoritos of [false, true]) {
      let cursor: string | null = null;
      const encontrados: string[] = [];
      let paginas = 0;
      do {
        const r = await pesquisarNoChat(u.id, {
          termo: favoritos ? '' : 'Busca paginada',
          favoritos,
          cursor,
        });
        expect(r.resultados.length).toBeLessThanOrEqual(20);
        encontrados.push(...r.resultados.map((i) => i.turnoId));
        cursor = r.proximoCursor;
        paginas++;
        expect(paginas).toBeLessThan(5);
      } while (cursor);
      expect(new Set(encontrados).size).toBe(favoritos ? 25 : 45);
      expect(encontrados).toHaveLength(favoritos ? 25 : 45);
    }
    const primeiro = await pesquisarNoChat(u.id, {
      termo: 'Busca paginada',
      favoritos: false,
      cursor: null,
    });
    await expect(
      pesquisarNoChat(u.id, {
        termo: 'outra busca',
        favoritos: false,
        cursor: primeiro.proximoCursor,
      })
    ).rejects.toThrow(/outra busca/);
  });
  it('abre mensagem antiga e percorre anteriores e seguintes na ordem original', async () => {
    const u = await criarUsuario();
    const conversa = randomUUID();
    const ids: string[] = [];
    for (let i = 0; i < 95; i++)
      ids.push(
        (await gravar(u.id, `Turno ${i}`, `Resposta ${i}`, conversa)).turnId
      );
    const r = await chamar(detalhe.GET, {
      usuario: u,
      params: { id: conversa },
      path: `/api/chat/conversas/${conversa}?alvo=${ids[45]}`,
    });
    expect(r.status).toBe(200);
    const inicial = r.json as PaginaDaConversa;
    expect(inicial.turnos.at(-1)?.id).toBe(ids[45]);
    expect(inicial.antes).not.toBeNull();
    expect(inicial.depois).not.toBeNull();
    const anteriores = await lerConversa(u.id, conversa, inicial.antes);
    const todos = [...anteriores.turnos, ...inicial.turnos];
    let depois = inicial.depois ?? null;
    while (depois !== null) {
      const p = await lerConversa(u.id, conversa, null, depois);
      todos.push(...p.turnos);
      depois = p.depois ?? null;
      expect(todos.length).toBeLessThanOrEqual(95);
    }
    expect(todos.map((t) => t.id)).toEqual(ids);
    expect((await lerConversa(u.id, conversa)).turnos.at(-1)?.id).toBe(
      ids.at(-1)
    );
  });
  it('recusa alvo de outra conversa e marcadores combinados ou inválidos', async () => {
    const u = await criarUsuario();
    const a = await gravar(u.id, 'Primeira conversa', 'Primeira resposta'),
      b = await gravar(u.id, 'Segunda conversa', 'Segunda resposta');
    for (const [consulta, status] of [
      [`alvo=${a.turnId}`, 404],
      ['alvo=invalido', 400],
      [`alvo=${b.turnId}&antes=1`, 400],
      ['depois=0', 400],
    ] as const)
      expect(
        (
          await chamar(detalhe.GET, {
            usuario: u,
            params: { id: b.conversationId },
            path: `/api/chat/conversas/${b.conversationId}?${consulta}`,
          })
        ).status
      ).toBe(status);
    expect((await buscar(u, 'sono', false, 'invalido')).status).toBe(400);
  });
  it('preserva painéis e imagens privadas ao abrir o resultado original', async () => {
    const u = await criarUsuario('admin');
    const partes = await montarPainelDoChat(u.id);
    const pedido = {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'Painel com imagem da conversa',
    };
    const turno = await iniciarTurno(u.id, pedido);
    await concluirTurno(
      u.id,
      turno,
      'Seus registros e a imagem vinculada.',
      false,
      null,
      false,
      partes
    );
    const imagem = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .webp()
      .toBuffer();
    await executeStatement(
      "INSERT INTO chat_generated_images(turn_id,request_kind,status,prompt,attempt_id,deadline_at,image_data,mime_type,width,height) VALUES(?,'solicitada','pronta','Fixture de imagem para conferir histórico',?,UTC_TIMESTAMP(),?,'image/webp',2,2)",
      [pedido.turnId, randomUUID(), imagem]
    );
    await definirFavorita(u.id, pedido.turnId, true);
    const p = await lerConversa(
      u.id,
      pedido.conversationId,
      null,
      null,
      pedido.turnId
    );
    expect(p.turnos[0]).toMatchObject({
      favorita: true,
      partes,
      imagem: { turnoId: pedido.turnId, estado: 'pronta' },
    });
    expect((await buscar(u, 'imagem')).json).toMatchObject({
      resultados: [{ turnoId: pedido.turnId }],
    });
  });
  it('respeita a revogação do histórico e mantém dados até exclusão autorizada', async () => {
    const u = await criarUsuario();
    const p = await gravar(
      u.id,
      'Histórico do titular',
      'Resposta preservada.'
    );
    await definirFavorita(u.id, p.turnId, true);
    await executeStatement(
      "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=FALSE WHERE p.plan_key='care' AND f.feature_key='chat_history'"
    );
    try {
      expect((await buscar(u, 'Histórico')).status).toBe(403);
      expect(
        (
          await chamar(favorita.DELETE, {
            method: 'DELETE',
            usuario: u,
            params: { id: p.turnId },
          })
        ).status
      ).toBe(403);
      expect(
        (
          await chamar(detalhe.GET, {
            usuario: u,
            params: { id: p.conversationId },
          })
        ).status
      ).toBe(403);
      expect((await exportarDadosDoTitular(u.id)).chat_favorites).toHaveLength(
        1
      );
    } finally {
      await executeStatement(
        "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=TRUE WHERE p.plan_key='care' AND f.feature_key='chat_history'"
      );
    }
  });
  it('acompanha a resposta atual após refazer e elimina vínculos em cascata', async () => {
    const u = await criarUsuario();
    const p = await gravar(
      u.id,
      'Minha orientação',
      'Primeira versão da resposta.'
    );
    await definirFavorita(u.id, p.turnId, true);
    const turno = await iniciarTurno(u.id, { ...p, regenerate: true });
    await concluirTurno(
      u.id,
      turno,
      'Resposta refeita e atual.',
      false,
      null,
      false
    );
    expect(
      (
        await pesquisarNoChat(u.id, {
          termo: '',
          favoritos: true,
          cursor: null,
        })
      ).resultados[0].resposta
    ).toBe('Resposta refeita e atual.');
    await executeStatement(
      'DELETE FROM chat_conversations WHERE id=? AND user_id=?',
      [p.conversationId, u.id]
    );
    expect(
      await contar(
        'SELECT COUNT(*) total FROM chat_favorites WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    const nova = await gravar(u.id, 'Outra conversa', 'Outra resposta.');
    await definirFavorita(u.id, nova.turnId, true);
    await excluirConta(u.id);
    expect(
      await queryRows('SELECT turn_id FROM chat_favorites WHERE user_id=?', [
        u.id,
      ])
    ).toEqual([]);
  });
});

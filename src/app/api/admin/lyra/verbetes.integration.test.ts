import { afterAll, describe, expect, it } from 'vitest';

import { definirVerbetesGerados, encontrarVerbete } from '@/lib/lyra/responder';
import type { VerbeteEscrito } from '@/lib/lyra/verbetes-gerados';
import {
  gravarVerbeteGerado,
  listarVerbetesGerados,
  sincronizarVerbetesGerados,
} from '@/lib/lyra/verbetes-gerados-servico';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { DELETE, GET, PATCH } from './verbetes/route';

const VAYUS: VerbeteEscrito = {
  area: 'yoga',
  titulo: 'Os cinco Vayus',
  resumo:
    'A tradição do Yoga descreve a energia vital dividida em cinco movimentos, os Vayus, cada um com uma função no corpo e na mente.',
  pontos: [
    'Prana Vayu, no peito, rege a inspiração e o que entra.',
    'Apana Vayu, no baixo ventre, rege a eliminação e o que sai.',
  ],
  pratica:
    'Observe a respiração por alguns minutos, notando a entrada e a saída do ar, sem forçar.',
  palavrasChave: ['vayus', 'apana', 'samana'],
  fonte: 'Prashna Upanishad, cap. 3',
};
const AUTOR = { provedor: 'Ollama', modelo: 'modelo-local', local: true };
const ROTA = '/api/admin/lyra/verbetes';

describe('Verbetes escritos automaticamente, com aprovação', () => {
  afterAll(async () => {
    await executeStatement('DELETE FROM lyra_verbetes_gerados');
    definirVerbetesGerados([]);
  });

  it('grava pendente, sem dado de quem perguntou, e não duplica', async () => {
    expect(await gravarVerbeteGerado(VAYUS, AUTOR)).toBe(true);
    // Mesmo identificador ou mesmo conteúdo: ignorado.
    expect(await gravarVerbeteGerado(VAYUS, AUTOR)).toBe(false);
    expect(
      await gravarVerbeteGerado({ ...VAYUS, titulo: 'Os cinco Vayus.' }, AUTOR)
    ).toBe(false);

    const colunas = await queryRows<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'lyra_verbetes_gerados'`
    );
    const nomes = colunas.map((coluna) => coluna.COLUMN_NAME);
    for (const pessoal of ['user_id', 'pergunta', 'email']) {
      expect(nomes).not.toContain(pessoal);
    }
    const [verbete] = await listarVerbetesGerados();
    expect(verbete).toMatchObject({
      id: 'os-cinco-vayus',
      area: 'yoga',
      pontos: VAYUS.pontos,
      palavrasChave: VAYUS.palavrasChave,
      gerado: { provedor: 'Ollama', modelo: 'modelo-local', aprovadoEm: null },
    });
    expect(new Date(verbete.gerado!.criadoEm).getTime()).not.toBeNaN();
    expect(await listarVerbetesGerados('pendente')).toHaveLength(1);
    expect(await listarVerbetesGerados('aprovado')).toEqual([]);
  });

  it('pendente não chega ao motor', async () => {
    await sincronizarVerbetesGerados(Date.now(), true);
    expect(encontrarVerbete('o que são os vayus')).toBeNull();
  });

  it('o banco recusa aprovação incompleta', async () => {
    await expect(
      executeStatement(
        "UPDATE lyra_verbetes_gerados SET status = 'aprovado' WHERE id = 'os-cinco-vayus'"
      )
    ).rejects.toThrow();
  });

  it('só administradores listam, aprovam e removem', async () => {
    const paciente = await criarUsuario();
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    expect((await chamar(GET, { usuario: paciente })).status).toBe(403);
    expect(
      (
        await chamar(PATCH, {
          usuario: paciente,
          method: 'PATCH',
          body: { id: 'os-cinco-vayus', acao: 'aprovar' },
        })
      ).status
    ).toBe(403);
    expect(
      (
        await chamar(DELETE, {
          usuario: paciente,
          method: 'DELETE',
          path: `${ROTA}?id=os-cinco-vayus`,
        })
      ).status
    ).toBe(403);
    expect(await listarVerbetesGerados('pendente')).toHaveLength(1);
  });

  it('o administrador aprova e o motor passa a consultar o verbete', async () => {
    const admin = await criarUsuario('admin');
    const pendentes = await chamar(GET, {
      usuario: admin,
      path: `${ROTA}?situacao=pendente`,
    });
    expect(pendentes.status).toBe(200);
    expect(pendentes.headers.get('Cache-Control')).toBe('private, no-store');
    expect(pendentes.json).toMatchObject({
      verbetes: [{ id: 'os-cinco-vayus', gerado: { aprovadoEm: null } }],
    });
    expect(
      (await chamar(GET, { usuario: admin, path: `${ROTA}?situacao=outra` }))
        .status
    ).toBe(400);

    const aprovar = (body: unknown) =>
      chamar(PATCH, { usuario: admin, method: 'PATCH', body });
    expect((await aprovar({ id: 'os-cinco-vayus' })).status).toBe(400);
    expect(
      (await aprovar({ id: 'Os Cinco Vayus', acao: 'aprovar' })).status
    ).toBe(400);
    expect((await aprovar({ id: 'nao-existe', acao: 'aprovar' })).status).toBe(
      404
    );
    const aprovado = await aprovar({ id: 'os-cinco-vayus', acao: 'aprovar' });
    expect(aprovado.status).toBe(200);
    expect(aprovado.json).toEqual({ aprovado: 'os-cinco-vayus' });
    expect(
      (await aprovar({ id: 'os-cinco-vayus', acao: 'aprovar' })).status
    ).toBe(409);

    const [linha] = await queryRows<{ aprovado_por: string }>(
      "SELECT aprovado_por FROM lyra_verbetes_gerados WHERE id = 'os-cinco-vayus'"
    );
    expect(linha.aprovado_por).toBe(admin.id);
    expect(encontrarVerbete('o que são os vayus')?.id).toBe('os-cinco-vayus');
    const [verbete] = await listarVerbetesGerados('aprovado');
    expect(new Date(verbete.gerado!.aprovadoEm!).getTime()).not.toBeNaN();
  });

  it('o administrador retira o verbete e o motor deixa de consultá-lo', async () => {
    const admin = await criarUsuario('admin');
    const remover = (path: string) =>
      chamar(DELETE, { usuario: admin, method: 'DELETE', path });
    expect((await remover(ROTA)).status).toBe(400);
    expect((await remover(`${ROTA}?id=Os%20Cinco%20Vayus`)).status).toBe(400);
    expect((await remover(`${ROTA}?id=nao-existe`)).status).toBe(404);
    const removido = await remover(`${ROTA}?id=os-cinco-vayus`);
    expect(removido.status).toBe(200);
    expect(removido.json).toEqual({ removido: 'os-cinco-vayus' });
    expect(await listarVerbetesGerados()).toEqual([]);
    expect(encontrarVerbete('o que são os vayus')).toBeNull();
  });
});

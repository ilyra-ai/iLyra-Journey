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
import { DELETE, GET } from './verbetes/route';

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

describe('Verbetes escritos automaticamente', () => {
  afterAll(async () => {
    await executeStatement('DELETE FROM lyra_verbetes_gerados');
    definirVerbetesGerados([]);
  });

  it('grava sem dado de quem perguntou e não duplica', async () => {
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
      gerado: { provedor: 'Ollama', modelo: 'modelo-local' },
    });
    expect(new Date(verbete.gerado!.criadoEm).getTime()).not.toBeNaN();
  });

  it('o motor passa a encontrar o verbete gravado', async () => {
    definirVerbetesGerados([]);
    expect(encontrarVerbete('o que são os vayus')).toBeNull();
    await sincronizarVerbetesGerados(Date.now(), true);
    expect(encontrarVerbete('o que são os vayus')?.id).toBe('os-cinco-vayus');
  });

  it('a rota administrativa lista e remove; os demais não alcançam', async () => {
    const paciente = await criarUsuario();
    const admin = await criarUsuario('admin');

    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    expect((await chamar(GET, { usuario: paciente })).status).toBe(403);
    expect(
      (
        await chamar(DELETE, {
          usuario: paciente,
          method: 'DELETE',
          path: '/api/admin/lyra/verbetes?id=os-cinco-vayus',
        })
      ).status
    ).toBe(403);

    const lista = await chamar(GET, { usuario: admin });
    expect(lista.status).toBe(200);
    expect(lista.headers.get('Cache-Control')).toBe('private, no-store');
    expect(lista.json).toMatchObject({
      verbetes: [{ id: 'os-cinco-vayus' }],
    });

    const remover = (path: string) =>
      chamar(DELETE, { usuario: admin, method: 'DELETE', path });
    expect((await remover('/api/admin/lyra/verbetes')).status).toBe(400);
    expect(
      (await remover('/api/admin/lyra/verbetes?id=Os%20Cinco%20Vayus')).status
    ).toBe(400);
    expect(
      (await remover('/api/admin/lyra/verbetes?id=nao-existe')).status
    ).toBe(404);
    const removido = await remover(
      '/api/admin/lyra/verbetes?id=os-cinco-vayus'
    );
    expect(removido.status).toBe(200);
    expect(removido.json).toEqual({ removido: 'os-cinco-vayus' });

    expect(await listarVerbetesGerados()).toEqual([]);
    expect(encontrarVerbete('o que são os vayus')).toBeNull();
  });
});

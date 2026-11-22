import { afterEach, describe, expect, it } from 'vitest';

import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { gravarUsoNoBanco } from '@/lib/ai/uso-servico';
import { executeStatement } from '@/lib/mysql/pool';

import { GET as GET_DA_CONTA } from '../../account/uso-de-ia/route';
import { DELETE, GET, PUT } from './uso/route';

const MES = new Date().toISOString().slice(0, 7);
const PRECO = {
  provedor: 'Provedor de teste',
  modelo: 'modelo-nuvem-teste',
  moeda: 'USD',
  entradaPorMilhao: 2,
  saidaPorMilhao: 8,
  fonte: 'https://exemplo.test/precos',
  consultadoEm: '2026-11-22',
};

afterEach(async () => {
  await executeStatement("DELETE FROM ia_uso WHERE provedor LIKE '%teste%'");
  await executeStatement("DELETE FROM ia_precos WHERE provedor LIKE '%teste%'");
});

function uso(titular: string | null, local: boolean, modelo: string) {
  return gravarUsoNoBanco({
    titular,
    rotulo: 'chat',
    provedor: local ? 'Local de teste' : PRECO.provedor,
    modelo,
    local,
    resultado: 'ok',
    uso: { entrada: 1_000_000, saida: 500_000, raciocinio: null },
    milissegundos: 1200,
  });
}

describe('uso de tokens e custo da IA (tarefa 163)', () => {
  it('só administradores veem o agregado e cadastram preços', async () => {
    const pessoa = await criarUsuario();
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    expect((await chamar(GET, { usuario: pessoa })).status).toBe(403);
    expect(
      (await chamar(PUT, { usuario: pessoa, method: 'PUT', body: PRECO }))
        .status
    ).toBe(403);
  });

  it('agrega por modelo e calcula o custo só com preço cadastrado', async () => {
    const admin = await criarUsuario('admin');
    await uso(admin.id, false, PRECO.modelo);
    await uso(null, true, 'modelo-local-teste');
    const linha = (modelo: string, json: unknown) =>
      (json as { linhas: Array<Record<string, unknown>> }).linhas.find(
        (l) => l.modelo === modelo
      );

    const antes = await chamar(GET, {
      usuario: admin,
      path: `/api/admin/ia/uso?mes=${MES}`,
    });
    expect(antes.status).toBe(200);
    expect(linha(PRECO.modelo, antes.json)).toMatchObject({ custo: null });

    const gravado = await chamar(PUT, {
      usuario: admin,
      method: 'PUT',
      body: PRECO,
    });
    expect(gravado.status).toBe(200);

    const depois = await chamar(GET, {
      usuario: admin,
      path: `/api/admin/ia/uso?mes=${MES}`,
    });
    // 1 milhão de entrada a 2 + meio milhão de saída a 8 = 6.
    expect(linha(PRECO.modelo, depois.json)).toMatchObject({
      chamadas: 1,
      tokensEntrada: 1_000_000,
      tokensSaida: 500_000,
      custo: 6,
      moeda: 'USD',
    });
    // Modelo local não tem custo por token.
    expect(linha('modelo-local-teste', depois.json)).toMatchObject({
      local: true,
      custo: null,
    });
    // O agregado não traz quem usou.
    expect(JSON.stringify(depois.json)).not.toContain(admin.id);

    const retirado = await chamar(DELETE, {
      usuario: admin,
      method: 'DELETE',
      path: `/api/admin/ia/uso?${new URLSearchParams({ provedor: PRECO.provedor, modelo: PRECO.modelo })}`,
    });
    expect((retirado.json as { precos: unknown[] }).precos).toEqual([]);
  });

  it('recusa preço sem fonte https, moeda inválida ou mês fora do formato', async () => {
    const admin = await criarUsuario('admin');
    for (const corpo of [
      { ...PRECO, fonte: 'http://exemplo.test/precos' },
      { ...PRECO, moeda: 'dolar' },
      { ...PRECO, entradaPorMilhao: -1 },
    ])
      expect(
        (await chamar(PUT, { usuario: admin, method: 'PUT', body: corpo }))
          .status
      ).toBe(400);
    expect(
      (
        await chamar(GET, {
          usuario: admin,
          path: '/api/admin/ia/uso?mes=2026-13',
        })
      ).status
    ).toBe(400);
  });

  it('cada conta vê só o próprio uso do mês', async () => {
    const ana = await criarUsuario();
    const bia = await criarUsuario();
    await uso(ana.id, false, PRECO.modelo);
    await uso(ana.id, true, 'modelo-local-teste');
    const daAna = await chamar(GET_DA_CONTA, { usuario: ana });
    expect(daAna.status).toBe(200);
    expect(daAna.json).toMatchObject({
      mes: MES,
      chamadas: 2,
      tokensEntrada: 2_000_000,
      chamadasLocais: 1,
    });
    expect((await chamar(GET_DA_CONTA, { usuario: bia })).json).toMatchObject({
      chamadas: 0,
    });
    expect((await chamar(GET_DA_CONTA, { usuario: null })).status).toBe(401);
  });
});

import { describe, expect, it } from 'vitest';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import { buscarCidades } from '@/lib/geo/cidades';
import { dataLocal } from '@/lib/astrology/tempo';
import type { PainelCelestial } from '@/lib/astrology/painel-celestial';
import * as painel from './painel/route';
import * as localizacao from '../perfil/localizacao/route';
import * as mapa from './mapa/route';

describe('painel celestial com dados e motores reais', () => {
  it('exige sessão e não inventa leituras para perfil incompleto', async () => {
    expect((await chamar(painel.GET, { usuario: null })).status).toBe(401);
    const pessoa = await criarUsuario('patient', 'PainelSemDados');
    const resposta = await chamar(painel.GET, { usuario: pessoa });
    expect(resposta.status).toBe(200);
    expect(resposta.json).toMatchObject({
      mapa: null,
      leitura: null,
      hoje: null,
      dias: [],
      faltando: ['data', 'hora', 'local'],
    });
  });

  it('reúne sete dias consecutivos no fuso do perfil e preserva o motor natal', async () => {
    const pessoa = await criarUsuario('patient', 'PainelCompleto');
    await executeStatement(
      "UPDATE profiles SET birth_date='1990-12-01', birth_time='10:30:00' WHERE id=?",
      [pessoa.id]
    );
    const cidade = buscarCidades('sao paulo, sp')[0];
    expect(
      (
        await chamar(localizacao.PATCH, {
          method: 'PATCH',
          usuario: pessoa,
          body: { tipo: 'nascimento', cidadeId: cidade.id },
        })
      ).status
    ).toBe(200);
    const resposta = await chamar(painel.GET, { usuario: pessoa });
    expect(resposta.status).toBe(200);
    const corpo = resposta.json as PainelCelestial;
    expect(corpo.fuso).toBe(cidade.fuso);
    expect(corpo.hoje).toBe(dataLocal(new Date(), cidade.fuso));
    expect(corpo.dias).toHaveLength(7);
    expect(corpo.dias[0].data).toBe(corpo.hoje);
    for (const [indice, item] of corpo.dias.entries()) {
      expect(item.erro).toBeNull();
      expect(item.dia?.data).toBe(item.data);
      expect(item.leitura?.tipos.map((tipo) => tipo.tipo)).toEqual([
        'vedico',
        'samadhi',
        'quantum',
      ]);
      if (indice > 0)
        expect(
          Date.parse(item.data) - Date.parse(corpo.dias[indice - 1].data)
        ).toBe(86_400_000);
    }
    const natal = await chamar(mapa.GET, { usuario: pessoa });
    expect(corpo.mapa).toEqual((natal.json as { mapa: unknown }).mapa);
    const outra = await criarUsuario('patient', 'PainelOutroTitular');
    const isolado = await chamar(painel.GET, { usuario: outra });
    expect((isolado.json as PainelCelestial).mapa).toBeNull();
    expect((isolado.json as PainelCelestial).dias).toEqual([]);
  });
});

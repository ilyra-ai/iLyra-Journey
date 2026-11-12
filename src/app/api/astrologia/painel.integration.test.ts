import { describe, expect, it } from 'vitest';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { buscarCidades } from '@/lib/geo/cidades';
import { dataLocal } from '@/lib/astrology/tempo';
import type { PainelCelestial } from '@/lib/astrology/painel-celestial';
import { carregarPainelDoTitular } from '@/lib/astrology/persistencia-painel';
import * as painel from './painel/route';
import * as localizacao from '../perfil/localizacao/route';
import * as mapa from './mapa/route';

describe('painel celestial com dados e motores reais', () => {
  it('reutiliza a linha temporal no dia civil e renova na virada do fuso', async () => {
    const pessoa = await criarUsuario();
    await executeStatement(
      `UPDATE profiles SET birth_date='1990-12-01', birth_time='10:30',
       birth_location='São Paulo', birth_latitude=-23.5505,
       birth_longitude=-46.6333, birth_timezone='America/Sao_Paulo' WHERE id=?`,
      [pessoa.id]
    );
    const cache = async () => {
      const [salvo] = await queryRows<{
        input_hash: string;
        payload: string;
        atualizado: string;
      }>(
        `SELECT input_hash, payload, DATE_FORMAT(updated_at,'%Y-%m-%d') AS atualizado
         FROM astrological_daily_panels WHERE user_id=?`,
        [pessoa.id]
      );
      return salvo;
    };
    const ler = (instante: string) =>
      carregarPainelDoTitular(pessoa.id, new Date(instante));
    const inicial = await ler('2026-11-12T13:00:00Z');
    const assinatura = (await cache()).input_hash;
    await executeStatement(
      "UPDATE astrological_daily_panels SET updated_at='2001-01-01' WHERE user_id=?",
      [pessoa.id]
    );

    expect(await ler('2026-11-13T02:59:59Z')).toEqual(inicial);
    expect((await cache()).atualizado).toBe('2001-01-01');
    const renovado = await ler('2026-11-13T03:00:00Z');
    expect(inicial.hoje).toBe('2026-11-12');
    expect(renovado.hoje).toBe('2026-11-13');
    expect(renovado.dias[0].data).toBe('2026-11-13');
    expect((await cache()).input_hash).not.toBe(assinatura);

    await executeStatement(
      "UPDATE astrological_daily_panels SET payload='{}' WHERE user_id=?",
      [pessoa.id]
    );
    expect(await ler('2026-11-13T03:10:00Z')).toEqual(renovado);
    expect(JSON.parse((await cache()).payload)).toEqual(renovado);
  });

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

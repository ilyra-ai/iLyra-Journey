import { describe, expect, it } from 'vitest';

import { calcularMapaNatal } from '@/lib/astrology/mapa-natal';
import { REGENTE_DO_SIGNO } from '@/lib/astrology/sideral';

import { lerMapaComoLyra } from './leitura-do-mapa';
import {
  LIMITE_DOS_VINCULOS,
  lerVinculosFamiliares,
} from './vinculos-familiares';

const sp = {
  latitude: -23.5475,
  longitude: -46.6361,
  fuso: 'America/Sao_Paulo',
};
const agora = new Date('2026-11-17T12:00:00Z');
const comHora = calcularMapaNatal(
  { ...sp, data: '1990-12-01', hora: '10:30' },
  agora
);

/**
 * Termos que transformariam a leitura simbólica em diagnóstico ou previsão.
 * "câncer" só em minúscula: Câncer, com maiúscula, é o signo.
 */
const PROIBIDO =
  /doen[çc]a|diagn[óo]stic|c[âa]ncer|tumor|morte|morrer|vai acontecer|com certeza|abuso|trauma/;
const PROIBIDO_SEM_CAIXA = /doen[çc]a|diagn[óo]stic|tumor|morte|morrer/i;

describe('Vínculos familiares no mapa', () => {
  const leitura = lerVinculosFamiliares(comHora)!;

  it('lê os sete vínculos a partir do Lagna, com a casa tradicional de cada um', () => {
    expect(leitura.referencia).toBe('lagna');
    expect(leitura.vinculos.map((v) => v.id)).toEqual([
      'mae',
      'pai',
      'irmaos-mais-novos',
      'irmaos-mais-velhos',
      'tios-maternos',
      'avos-paternos',
      'avos-maternos',
    ]);
    expect(leitura.indisponiveis).toEqual(['primos', 'tios paternos']);
    const mae = leitura.vinculos[0];
    expect(mae.origem).toMatch(/casa 4/);
    expect(mae.origem).toMatch(/Lua/);
    expect(leitura.vinculos[1].origem).toMatch(/casa 9.*Sol/);
  });

  it('cita o regente real da casa do vínculo', () => {
    const signoDaCasa4 = (comHora.lagna!.signo + 3) % 12;
    const regente = REGENTE_DO_SIGNO[signoDaCasa4];
    const nome = comHora.planetas
      .find((p) => p.graha === regente)!
      .nome.split(' (')[0];
    const mae = leitura.vinculos[0];
    const textos = [...mae.atritos, ...mae.apoios].join(' ');
    // O regente aparece quando está em casa difícil, de apoio ou com dignidade.
    const casaDoRegente =
      ((comHora.planetas.find((p) => p.graha === regente)!.signo -
        comHora.lagna!.signo +
        12) %
        12) +
      1;
    if ([1, 4, 5, 6, 7, 8, 9, 10, 12].includes(casaDoRegente)) {
      expect(textos).toContain(nome);
    }
  });

  it('o tom acompanha a contagem de sinais e o resumo o declara', () => {
    for (const vinculo of leitura.vinculos) {
      const esperado =
        vinculo.atritos.length > vinculo.apoios.length
          ? 'atrito'
          : vinculo.apoios.length > vinculo.atritos.length
            ? 'apoio'
            : 'equilibrio';
      expect(vinculo.tom).toBe(esperado);
      expect(vinculo.resumo).toMatch(/^No seu mapa, este vínculo aparece/);
      expect(vinculo.reflexoes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('não usa linguagem de diagnóstico, doença ou previsão', () => {
    for (const vinculo of leitura.vinculos) {
      const textos = [
        vinculo.resumo,
        vinculo.tema,
        ...vinculo.atritos,
        ...vinculo.apoios,
        ...vinculo.reflexoes,
      ].join(' ');
      expect(textos).not.toMatch(PROIBIDO);
      expect(textos).not.toMatch(PROIBIDO_SEM_CAIXA);
    }
    expect(leitura.limite).toMatch(/não é avaliação psicológica ou de saúde/);
  });

  it('é determinística', () => {
    expect(lerVinculosFamiliares(comHora)).toEqual(leitura);
  });

  it('sem hora e com a Lua estável, conta as casas a partir da Lua e avisa', () => {
    for (let i = 0; i < 400; i += 1) {
      const data = new Date(Date.UTC(1990, 0, 1 + i))
        .toISOString()
        .slice(0, 10);
      const mapa = calcularMapaNatal({ ...sp, data, hora: null }, agora);
      if (mapa.possibilidades!.signosDaLua.length === 1) {
        const semHora = lerVinculosFamiliares(mapa)!;
        expect(semHora.referencia).toBe('lua');
        expect(semHora.limite).toMatch(/Chandra Lagna/);
        return;
      }
    }
    throw new Error('nenhuma data com a Lua estável encontrada');
  });

  it('sem hora e com a Lua mudando de signo no dia, não há leitura', () => {
    // Em 01/12/1990 a Lua trocou de signo.
    const mapa = calcularMapaNatal(
      { ...sp, data: '1990-12-01', hora: null },
      agora
    );
    expect(lerVinculosFamiliares(mapa)).toBeNull();
  });

  it('chega à leitura da Lyra usada pelo painel', () => {
    expect(lerMapaComoLyra(comHora).vinculos).toEqual(leitura);
    expect(LIMITE_DOS_VINCULOS).toMatch(/não prevê acontecimentos/);
  });
});

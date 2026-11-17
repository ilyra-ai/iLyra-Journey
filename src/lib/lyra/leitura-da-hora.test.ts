import { describe, expect, it } from 'vitest';

import { getAstrologicalContext } from '@/lib/astrology/engine';
import { calcularMapaNatal, mapaNatalNaData } from '@/lib/astrology/mapa-natal';
import { mapaParaJson } from '@/lib/astrology/serializacao';
import { NAKSHATRAS, SIGNOS } from '@/lib/astrology/sideral';
import { dashaSimples, faseDaVida } from '@/lib/coach/leitura-vedica';

import { lerMapaComoLyra } from './leitura-do-mapa';
import { instrucoesDoChatComoLyra } from './modelos-como-lyra';
import { responderComoLyra } from './responder';

const saoPaulo = {
  latitude: -23.5475,
  longitude: -46.6361,
  fuso: 'America/Sao_Paulo',
};
const nascimento = { data: '1990-12-01', ...saoPaulo };
const agora = new Date('2026-11-16T12:00:00Z');
const HORAS_DO_DIA = [
  '00:05',
  '03:00',
  '06:00',
  '09:00',
  '12:00',
  '15:00',
  '18:00',
  '21:00',
  '23:55',
];
const ANO = /\b(19|20)\d{2}\b/;

describe('Hora de nascimento desconhecida', () => {
  const semHora = calcularMapaNatal({ ...nascimento, hora: null }, agora);
  const comHora = HORAS_DO_DIA.map((hora) =>
    calcularMapaNatal({ ...nascimento, hora }, agora)
  );

  it('não afirma um período de vida e lista o que é possível no dia', () => {
    expect(semHora.precisaoDaHora).toBe('desconhecida');
    expect(semHora.dasha).toBeNull();
    const possibilidades = semHora.possibilidades!;

    // Naquele dia a Lua trocou de signo e de nakshatra, e o período vigente
    // hoje depende da hora: as alternativas reais estão todas na lista.
    for (const mapa of comHora) {
      expect(possibilidades.signosDaLua).toContain(mapa.lua.signo);
      expect(possibilidades.nakshatrasDaLua).toContain(mapa.lua.nakshatra);
      expect(possibilidades.mahadashas).toContain(mapa.dasha!.mahadasha.graha);
    }
    expect(possibilidades.signosDaLua).toEqual([
      ...new Set(comHora.map((mapa) => mapa.lua.signo)),
    ]);
    expect(possibilidades.nakshatrasDaLua).toEqual([
      ...new Set(comHora.map((mapa) => mapa.lua.nakshatra)),
    ]);
    expect(possibilidades.mahadashas).toEqual([
      ...new Set(comHora.map((mapa) => mapa.dasha!.mahadasha.graha)),
    ]);
    expect(possibilidades.mahadashas.length).toBeGreaterThan(1);
  });

  it('com hora conhecida não há possibilidades nem dia de nascimento', () => {
    for (const mapa of comHora) {
      expect(mapa.possibilidades).toBeNull();
      expect(mapa.diaDeNascimento).toBeNull();
      expect(mapa.dasha).not.toBeNull();
    }
  });

  it('projetar outra data refaz as possibilidades como o cálculo direto', () => {
    for (const data of ['2000-01-01T00:00:00Z', '2040-06-15T12:00:00Z']) {
      const referencia = new Date(data);
      expect(mapaNatalNaData(semHora, referencia)).toEqual(
        calcularMapaNatal({ ...nascimento, hora: null }, referencia)
      );
    }
  });

  it('a leitura declara a incerteza da Lua e do período, sem datas', () => {
    const leitura = lerMapaComoLyra(semHora);
    const possibilidades = semHora.possibilidades!;

    expect(leitura.avisoDaHora).toMatch(/Sem a hora de nascimento/);
    expect(leitura.vedico.lagna).toMatch(/indisponível/);
    for (const signo of possibilidades.signosDaLua) {
      expect(leitura.vedico.lua).toContain(SIGNOS[signo]);
    }
    for (const nakshatra of possibilidades.nakshatrasDaLua) {
      expect(leitura.vedico.lua).toContain(NAKSHATRAS[nakshatra]);
    }
    expect(leitura.vedico.lua).not.toMatch(/pada/);
    expect(leitura.vedico.dasha).toMatch(/não pode ser determinado/);
    expect(leitura.vedico.dasha).not.toMatch(ANO);
    expect(leitura.vedico.dosha.texto).toMatch(/sem a hora de nascimento/);
    expect(leitura.vedico.dosha.texto).not.toMatch(/regente do Lagna/);
    expect(leitura.samadhi.sintese).not.toMatch(/Lua em/);
    expect(leitura.percepcoes.length).toBeGreaterThanOrEqual(3);
    expect(leitura.percepcoes.join(' ')).not.toMatch(/Período atual/);
  });

  it('quando a Lua não muda no dia, signo e nakshatra são afirmados e o período único é dito sem datas', () => {
    // Procura, de forma determinística, um dia em que a Lua fica num só
    // nakshatra e há um único Mahadasha possível.
    let mapa = semHora;
    for (let dia = 0; dia < 400; dia += 1) {
      const data = new Date(Date.UTC(1990, 0, 1 + dia))
        .toISOString()
        .slice(0, 10);
      const candidato = calcularMapaNatal(
        { ...nascimento, data, hora: null },
        agora
      );
      const p = candidato.possibilidades!;
      if (
        p.signosDaLua.length === 1 &&
        p.nakshatrasDaLua.length === 1 &&
        p.mahadashas.length === 1
      ) {
        mapa = candidato;
        break;
      }
    }
    expect(mapa.possibilidades!.nakshatrasDaLua).toHaveLength(1);
    expect(mapa.possibilidades!.signosDaLua).toHaveLength(1);
    const leitura = lerMapaComoLyra(mapa);
    expect(leitura.vedico.lua).toContain(
      `Lua em ${mapa.lua.nomeDoSigno}, no nakshatra ${mapa.lua.nomeDoNakshatra}`
    );
    expect(leitura.vedico.lua).not.toMatch(/pada/);
    expect(leitura.vedico.dasha).toMatch(/Em qualquer hora daquele dia/);
    expect(leitura.vedico.dasha).not.toMatch(ANO);
  });

  it('o mapa serializado leva as possibilidades por nome e o contexto não informa dasha', () => {
    const json = mapaParaJson(semHora);
    expect(json.dasha).toBeNull();
    expect(json.possibilidades!.signosDaLua).toEqual(
      semHora.possibilidades!.signosDaLua.map((i) => SIGNOS[i])
    );
    expect(json.possibilidades!.mahadashas.length).toBeGreaterThan(1);

    const contexto = getAstrologicalContext(agora, {
      birth_date: nascimento.data,
      birth_time: null,
      birth_latitude: saoPaulo.latitude,
      birth_longitude: saoPaulo.longitude,
      birth_timezone: saoPaulo.fuso,
    });
    expect(contexto.currentDasha).toBeUndefined();
  });
});

describe('Hora de nascimento estimada pela pessoa', () => {
  const informada = calcularMapaNatal({ ...nascimento, hora: '10:30' }, agora);
  const estimada = calcularMapaNatal(
    { ...nascimento, hora: '10:30', horaEstimada: true },
    agora
  );

  it('a leitura avisa a estimativa e não mostra datas dos períodos', () => {
    const leitura = lerMapaComoLyra(estimada);
    expect(leitura.avisoDaHora).toMatch(/estimada por você/);
    expect(leitura.vedico.lagna).toMatch(/pela hora que você escolheu/);
    expect(leitura.vedico.lagna).toContain(estimada.lagna!.nomeDoSigno);
    expect(leitura.vedico.lagna).not.toMatch(/nakshatra/);
    expect(leitura.vedico.dasha).toContain(estimada.dasha!.mahadasha.nome);
    expect(leitura.vedico.dasha).toMatch(/aproximadas/);
    expect(leitura.vedico.dasha).not.toMatch(ANO);
  });

  it('a hora informada continua com Ascendente completo e datas', () => {
    const leitura = lerMapaComoLyra(informada);
    expect(leitura.avisoDaHora).toBeNull();
    expect(leitura.vedico.lagna).toMatch(/no nakshatra/);
    expect(leitura.vedico.dasha).toMatch(ANO);
    expect(informada.possibilidades).toBeNull();
  });

  it('a fase de vida do coach sai só como ano aproximado', () => {
    const exata = dashaSimples(informada.dasha!);
    const aproximada = dashaSimples(estimada.dasha!, true);
    expect(exata.fimDoMahadasha).toMatch(/^\d{4}$/);
    expect(aproximada.fimDoMahadasha).toBe(
      `por volta de ${exata.fimDoMahadasha}`
    );
    expect(aproximada.fimDoAntardasha).toMatch(/^por volta de \d{4}$/);
    expect(faseDaVida(aproximada)).toMatch(/até por volta de \d{4}/);
  });

  it('o contexto do céu informa o período sem data de término', () => {
    const base = {
      birth_date: nascimento.data,
      birth_time: '10:30:00',
      birth_latitude: saoPaulo.latitude,
      birth_longitude: saoPaulo.longitude,
      birth_timezone: saoPaulo.fuso,
    };
    const exato = getAstrologicalContext(agora, base).currentDasha!;
    const aproximado = getAstrologicalContext(agora, {
      ...base,
      birth_time_estimate: '10:30:00',
    }).currentDasha!;
    expect(exato).toMatch(/\(até \d{2}\/\d{2}\/\d{4}\)/);
    expect(aproximado).toMatch(/hora de nascimento estimada/);
    expect(aproximado).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // Outra hora digitada no perfil deixa de ser estimativa.
    expect(
      getAstrologicalContext(agora, {
        ...base,
        birth_time_estimate: '07:00:00',
      }).currentDasha
    ).toBe(exato);
  });

  it('os modelos conectados e a resposta local recebem o limite do mapa', () => {
    const instrucoes = instrucoesDoChatComoLyra({
      pergunta: 'Como é o meu mapa?',
      respostaDoMotor: 'Resposta do motor.',
      mapa: estimada,
    });
    expect(instrucoes).toMatch(/Limite deste mapa/);
    expect(instrucoes).toMatch(/estimada por você/);
    expect(
      instrucoesDoChatComoLyra({
        pergunta: 'Como é o meu mapa?',
        respostaDoMotor: 'Resposta do motor.',
        mapa: informada,
      })
    ).not.toMatch(/Limite deste mapa/);

    const resposta = responderComoLyra('como é o meu mapa?', {
      mapa: estimada,
    });
    expect(resposta!.texto).toMatch(/estimada por você/);
  });
});

describe('Leitura de nascimento além do Círculo Polar', () => {
  it('explica o limite do Ascendente sem pedir a hora', () => {
    const mapa = calcularMapaNatal(
      {
        data: '1990-06-21',
        hora: '12:00',
        latitude: 69.6492,
        longitude: 18.9553,
        fuso: 'Europe/Oslo',
      },
      agora
    );
    const leitura = lerMapaComoLyra(mapa);
    expect(leitura.vedico.lagna).toMatch(/além do Círculo Polar/);
    expect(leitura.vedico.lagna).not.toMatch(/Informe a hora/);
    expect(leitura.avisoDaHora).toBeNull();
    expect(mapaParaJson(mapa).limiteDoLagna).toBe('latitude-polar');
  });
});

describe('Leitura com hora no horário de verão', () => {
  it('avisa a hora repetida e a inexistente', () => {
    const sp = {
      latitude: -23.5475,
      longitude: -46.6361,
      fuso: 'America/Sao_Paulo',
    };
    const repetida = lerMapaComoLyra(
      calcularMapaNatal({ ...sp, data: '1990-02-10', hora: '23:30' }, agora)
    );
    expect(repetida.avisoDaHora).toMatch(/aconteceu duas vezes/);
    const inexistente = lerMapaComoLyra(
      calcularMapaNatal({ ...sp, data: '1990-10-21', hora: '00:30' }, agora)
    );
    expect(inexistente.avisoDaHora).toMatch(/não existiu naquele dia/);
    // Hora estimada e repetida: os dois avisos.
    const ambos = lerMapaComoLyra(
      calcularMapaNatal(
        { ...sp, data: '1990-02-10', hora: '23:30', horaEstimada: true },
        agora
      )
    );
    expect(ambos.avisoDaHora).toMatch(/duas vezes[\s\S]*estimada por você/);
  });
});

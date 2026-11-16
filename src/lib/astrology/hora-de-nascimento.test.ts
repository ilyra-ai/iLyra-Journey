import { describe, expect, it } from 'vitest';

import { SIGNOS_INFO } from '@/lib/lyra/conhecimento/jyotish';

import { calcularJanelasDeHora, LATITUDE_POLAR } from './hora-de-nascimento';
import { calcularMapaNatal } from './mapa-natal';
import { ascendenteSideral } from './sideral';
import { dataLocal, horaLocal, localParaUtc } from './tempo';

const saoPaulo = {
  latitude: -23.5475,
  longitude: -46.6361,
  fuso: 'America/Sao_Paulo',
};
const agora = new Date('2026-11-16T12:00:00Z');

const signoNoInstante = (
  instante: Date,
  local: { latitude: number; longitude: number }
) =>
  Math.floor(ascendenteSideral(instante, local.latitude, local.longitude) / 30);

describe('Janelas de hora do dia de nascimento', () => {
  it('cobre o dia civil inteiro com janelas contíguas e signos em sequência', () => {
    const janelas = calcularJanelasDeHora({ data: '1990-12-01', ...saoPaulo });

    expect(janelas.length).toBeGreaterThanOrEqual(12);
    expect(janelas.length).toBeLessThanOrEqual(13);
    expect(janelas[0].inicioUtc).toEqual(
      localParaUtc('1990-12-01', '00:00', saoPaulo.fuso)
    );
    expect(janelas.at(-1)!.fimUtc).toEqual(
      localParaUtc('1990-12-02', '00:00', saoPaulo.fuso)
    );
    for (let i = 1; i < janelas.length; i += 1) {
      expect(janelas[i].inicioUtc).toEqual(janelas[i - 1].fimUtc);
      expect(janelas[i].signo).toBe((janelas[i - 1].signo + 1) % 12);
    }
    // Os doze signos aparecem ao longo do dia.
    expect(new Set(janelas.map((j) => j.signo)).size).toBe(12);
  });

  it('coloca a hora conhecida na janela do Lagna calculado pelo mapa natal', () => {
    const janelas = calcularJanelasDeHora({ data: '1990-12-01', ...saoPaulo });
    // Mesmo nascimento conferido contra o Swiss Ephemeris em sideral.test.ts.
    const mapa = calcularMapaNatal(
      { data: '1990-12-01', hora: '10:30', ...saoPaulo },
      agora
    );
    const instante = mapa.nascimentoUtc.getTime();
    const janela = janelas.find(
      (j) => instante >= j.inicioUtc.getTime() && instante < j.fimUtc.getTime()
    )!;

    expect(janela.signo).toBe(mapa.lagna!.signo);
    expect(janela.inicio <= '10:30' && '10:30' < janela.fim).toBe(true);
  });

  it('troca de signo exatamente na fronteira, com precisão de segundos', () => {
    const janelas = calcularJanelasDeHora({ data: '1990-12-01', ...saoPaulo });
    for (const janela of janelas.slice(1)) {
      const fronteira = janela.inicioUtc.getTime();
      expect(signoNoInstante(new Date(fronteira), saoPaulo)).toBe(janela.signo);
      expect(signoNoInstante(new Date(fronteira - 2_000), saoPaulo)).toBe(
        (janela.signo + 11) % 12
      );
    }
  });

  it.each([
    ['dia comum', '1990-12-01', 24],
    ['dia de 23 horas (início do horário de verão)', '1990-10-21', 23],
    ['dia de 25 horas (fim do horário de verão)', '1990-02-10', 25],
  ] as const)(
    'a hora estimada de cada janela reproduz o mesmo Lagna: %s',
    (_rotulo, data, horas) => {
      const janelas = calcularJanelasDeHora({ data, ...saoPaulo });
      const duracao =
        janelas.at(-1)!.fimUtc.getTime() - janelas[0].inicioUtc.getTime();
      expect(duracao).toBe(horas * 3_600_000);

      let semRepresentacao = 0;
      for (const janela of janelas) {
        if (janela.horaEstimada === null) {
          // Só a janela inteiramente dentro da hora repetida fica sem hora:
          // o relógio local daquele trecho aponta para a primeira ocorrência.
          semRepresentacao += 1;
          for (
            let ms = janela.inicioUtc.getTime();
            ms < janela.fimUtc.getTime();
            ms += 60_000
          ) {
            const deVolta = localParaUtc(
              data,
              horaLocal(new Date(ms), saoPaulo.fuso),
              saoPaulo.fuso
            ).getTime();
            expect(deVolta).toBeLessThan(janela.inicioUtc.getTime());
          }
          continue;
        }
        expect(janela.horaEstimada).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
        const mapa = calcularMapaNatal(
          { data, hora: janela.horaEstimada, ...saoPaulo },
          agora
        );
        expect(dataLocal(mapa.nascimentoUtc, saoPaulo.fuso)).toBe(data);
        expect(mapa.nascimentoUtc.getTime()).toBeGreaterThanOrEqual(
          janela.inicioUtc.getTime()
        );
        expect(mapa.nascimentoUtc.getTime()).toBeLessThan(
          janela.fimUtc.getTime()
        );
        expect(mapa.lagna!.signo).toBe(janela.signo);
      }
      expect(semRepresentacao).toBe(horas === 25 ? 1 : 0);
    }
  );

  it.each([
    ['hemisfério norte', 51.5074, -0.1278, 'Europe/London', '1985-06-15'],
    ['próximo ao equador', 1.3521, 103.8198, 'Asia/Singapore', '2001-03-09'],
    ['latitude alta', 64.1466, -21.9426, 'Atlantic/Reykjavik', '1975-01-20'],
  ] as const)(
    'mantém cobertura e sequência em %s',
    (_rotulo, latitude, longitude, fuso, data) => {
      const janelas = calcularJanelasDeHora({
        data,
        latitude,
        longitude,
        fuso,
      });
      expect(new Set(janelas.map((j) => j.signo)).size).toBe(12);
      for (let i = 1; i < janelas.length; i += 1) {
        expect(janelas[i].inicioUtc).toEqual(janelas[i - 1].fimUtc);
        expect(janelas[i].signo).toBe((janelas[i - 1].signo + 1) % 12);
      }
      for (const janela of janelas) {
        const meio = new Date(
          (janela.inicioUtc.getTime() + janela.fimUtc.getTime()) / 2
        );
        expect(signoNoInstante(meio, { latitude, longitude })).toBe(
          janela.signo
        );
      }
    }
  );

  it('é determinístico para a mesma entrada', () => {
    const entrada = { data: '1990-12-01', ...saoPaulo };
    expect(calcularJanelasDeHora(entrada)).toEqual(
      calcularJanelasDeHora(entrada)
    );
  });

  it('recusa data inexistente, fuso desconhecido, local inválido e latitude polar', () => {
    expect(() =>
      calcularJanelasDeHora({ data: '1990-02-30', ...saoPaulo })
    ).toThrow(RangeError);
    expect(() =>
      calcularJanelasDeHora({ data: '01/12/1990', ...saoPaulo })
    ).toThrow(RangeError);
    expect(() =>
      calcularJanelasDeHora({
        data: '1990-12-01',
        ...saoPaulo,
        fuso: 'Marte/Olympus',
      })
    ).toThrow(RangeError);
    expect(() =>
      calcularJanelasDeHora({
        data: '1990-12-01',
        ...saoPaulo,
        longitude: 200,
      })
    ).toThrow(RangeError);
    expect(() =>
      calcularJanelasDeHora({
        data: '1990-12-01',
        latitude: LATITUDE_POLAR,
        longitude: 18.95,
        fuso: 'Europe/Oslo',
      })
    ).toThrow(/latitude polar/);
  });
});

describe('Palavra de cada janela na base curada', () => {
  it('tem uma única palavra por signo, todas distintas', () => {
    const palavras = SIGNOS_INFO.map((signo) => signo.essencia);
    expect(palavras).toHaveLength(12);
    expect(new Set(palavras).size).toBe(12);
    for (const palavra of palavras) {
      expect(palavra).toMatch(/^\p{Lu}\p{Ll}+$/u);
    }
  });
});

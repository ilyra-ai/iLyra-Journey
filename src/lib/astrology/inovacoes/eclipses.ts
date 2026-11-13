import {
  Body,
  Equator,
  Horizon,
  MakeTime,
  NextGlobalSolarEclipse,
  NextLocalSolarEclipse,
  NextLunarEclipse,
  Observer,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarEclipse,
} from 'astronomy-engine';
import { conferirInstantes, limitarLocal } from './numerica';

/** Eclipses físicos com visibilidade geométrica local, sem LLM ou banco. */
export function calcularCalendarioDeEclipses(
  inicio: Date,
  fim: Date,
  latitude: number,
  longitude: number
) {
  conferirInstantes(inicio, fim, 370);
  limitarLocal(latitude, longitude);
  const observador = new Observer(latitude, longitude, 0);

  function luaAcimaDoHorizonte(pico: Date, semiduracaoMinutos: number) {
    const semiduracao = Math.max(0, semiduracaoMinutos) * 60_000;
    const inicioEvento = pico.getTime() - semiduracao;
    const fimEvento = pico.getTime() + semiduracao;
    for (let ms = inicioEvento; ms <= fimEvento; ms += 60_000) {
      const tempo = MakeTime(new Date(ms));
      const equatorial = Equator(Body.Moon, tempo, observador, true, true);
      const horizontal = Horizon(
        tempo,
        observador,
        equatorial.ra,
        equatorial.dec,
        ''
      );
      if (horizontal.altitude > 0) return true;
    }
    const tempoFinal = MakeTime(new Date(fimEvento));
    const ultimo = Equator(Body.Moon, tempoFinal, observador, true, true);
    return (
      Horizon(tempoFinal, observador, ultimo.ra, ultimo.dec, '').altitude > 0
    );
  }

  const eventos: {
    tipo: 'solar' | 'lunar';
    classificacao: string;
    utc: string;
    visivel: boolean;
    obscuracao: number | null;
    detalhe: string;
  }[] = [];

  let global = SearchGlobalSolarEclipse(inicio);
  let local = SearchLocalSolarEclipse(inicio, observador);
  // Eclipses locais são uma série distinta: avance a cada evento local,
  // não reutilize indevidamente só o primeiro eclipse encontrado.
  for (let i = 0; i < 10 && global.peak.date < fim; i += 1) {
    const pico = global.peak.date;
    while (local.peak.time.date.getTime() < pico.getTime() - 86_400_000) {
      local = NextLocalSolarEclipse(local.peak.time, observador);
    }
    const mesmo =
      Math.abs(local.peak.time.date.getTime() - pico.getTime()) < 86_400_000;
    const visivel =
      mesmo &&
      [
        local.partial_begin,
        local.peak,
        local.partial_end,
        local.total_begin,
        local.total_end,
      ].some((fase) => fase !== undefined && fase.altitude > 0);
    eventos.push({
      tipo: 'solar',
      classificacao: String(global.kind),
      utc: pico.toISOString(),
      visivel,
      obscuracao: mesmo ? local.obscuration : null,
      detalhe: visivel
        ? 'Há pelo menos uma fase do eclipse solar acima do horizonte geométrico local.'
        : 'Eclipse solar global sem visibilidade confirmada no local consultado.',
    });
    global = NextGlobalSolarEclipse(global.peak);
  }

  let lunar = SearchLunarEclipse(inicio);
  for (let i = 0; i < 10 && lunar.peak.date < fim; i += 1) {
    eventos.push({
      tipo: 'lunar',
      classificacao: String(lunar.kind),
      utc: lunar.peak.date.toISOString(),
      visivel: luaAcimaDoHorizonte(lunar.peak.date, lunar.sd_penum),
      obscuracao: lunar.obscuration,
      detalhe:
        'Visibilidade lunar considera o horizonte geométrico durante o eclipse penumbral, sem nuvens ou relevo.',
    });
    lunar = NextLunarEclipse(lunar.peak);
  }
  eventos.sort((a, b) => a.utc.localeCompare(b.utc));
  return {
    versao: 1,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    local: { latitude, longitude },
    eventos,
    interpretacao:
      'Eclipses são fenômenos astronômicos; leituras astrológicas são interpretações simbólicas.',
  };
}

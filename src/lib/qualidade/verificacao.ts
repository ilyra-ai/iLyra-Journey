import { calcularMapaNatal } from '@/lib/astrology/mapa-natal';
import {
  ascendenteSideral,
  ayanamshaLahiri,
  longitudeSideral,
  type Graha,
} from '@/lib/astrology/sideral';
import { calcularMapaTropicalPorLocal } from '@/lib/astrology/tropical';

import {
  type Fonte,
  FONTES,
  REFERENCIA_DO_DASHA_SP_1990,
  REFERENCIA_TROPICAL_1990,
  REFERENCIAS_DO_SOL_TROPICAL,
  REFERENCIAS_SIDERAIS,
  TOLERANCIAS,
} from './referencias';

/**
 * Executa o Motor de verdade contra as referências independentes (tarefa
 * 183). O resultado mostra, para cada verificação, o esperado, o obtido, o
 * desvio e a tolerância. Só cálculo determinístico: interpretação simbólica
 * não tem "valor certo" e não entra aqui.
 */

/** Versão do conjunto de verificações; muda quando as referências mudam. */
export const VERSAO_DAS_VERIFICACOES = 1;

export interface Verificacao {
  id: string;
  grupo: 'sideral' | 'tropical' | 'vimshottari';
  caso: string;
  item: string;
  fonte: Fonte;
  unidade: 'grau' | 'dia';
  esperado: number;
  obtido: number;
  desvio: number;
  tolerancia: number;
  aprovado: boolean;
}

export interface ResultadoDasVerificacoes {
  versao: number;
  fontes: typeof FONTES;
  aprovado: boolean;
  total: number;
  reprovadas: number;
  verificacoes: Verificacao[];
}

const diferencaAngular = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);

const arredondar = (n: number, casas = 4) =>
  Math.round(n * 10 ** casas) / 10 ** casas;

function verificacao(
  dados: Omit<Verificacao, 'desvio' | 'aprovado' | 'obtido'> & {
    obtido: number;
    desvio: number;
  }
): Verificacao {
  return {
    ...dados,
    obtido: arredondar(dados.obtido),
    desvio: arredondar(dados.desvio, 5),
    aprovado: dados.desvio <= dados.tolerancia,
  };
}

function siderais(): Verificacao[] {
  return REFERENCIAS_SIDERAIS.flatMap((ref) => {
    const instante = new Date(ref.instante);
    const lista: Verificacao[] = [];
    const ayanamsha = ayanamshaLahiri(instante);
    lista.push(
      verificacao({
        id: `${ref.id}:ayanamsha`,
        grupo: 'sideral',
        caso: ref.rotulo,
        item: 'Ayanamsha Lahiri',
        fonte: 'swiss',
        unidade: 'grau',
        esperado: ref.ayanamsha,
        obtido: ayanamsha,
        desvio: Math.abs(ayanamsha - ref.ayanamsha),
        tolerancia: TOLERANCIAS.ayanamsha,
      })
    );
    const lagna = ascendenteSideral(instante, ref.latitude, ref.longitude);
    lista.push(
      verificacao({
        id: `${ref.id}:lagna`,
        grupo: 'sideral',
        caso: ref.rotulo,
        item: 'Lagna',
        fonte: 'swiss',
        unidade: 'grau',
        esperado: ref.lagna,
        obtido: lagna,
        desvio: diferencaAngular(lagna, ref.lagna),
        tolerancia: TOLERANCIAS.lagna,
      })
    );
    for (const [graha, esperado] of Object.entries(ref.planetas)) {
      const obtido = longitudeSideral(graha as Graha, instante);
      lista.push(
        verificacao({
          id: `${ref.id}:${graha}`,
          grupo: 'sideral',
          caso: ref.rotulo,
          item: graha,
          fonte: 'swiss',
          unidade: 'grau',
          esperado,
          obtido,
          desvio: diferencaAngular(obtido, esperado),
          tolerancia: TOLERANCIAS.longitude,
        })
      );
    }
    return lista;
  });
}

/** Greenwich, em UTC no inverno: hora local igual à hora UTC das referências. */
function tropicalEmGreenwich(instante: string, planeta: string) {
  const [data, horario] = instante.slice(0, 16).split('T');
  const mapa = calcularMapaTropicalPorLocal(
    {
      data,
      hora: horario,
      local: {
        nome: 'Greenwich',
        latitude: 51.48,
        longitude: 0,
        fuso: 'Etc/UTC',
      },
    },
    new Date('2026-11-23T12:00:00Z')
  );
  const encontrado = mapa.planetas.find((p) => p.planeta === planeta);
  if (!encontrado)
    throw new Error(`Planeta ausente no mapa tropical: ${planeta}`);
  return encontrado.posicao.longitude;
}

function tropicais(): Verificacao[] {
  const sol = REFERENCIAS_DO_SOL_TROPICAL.map((ref) => {
    const obtido = tropicalEmGreenwich(ref.instante, 'sol');
    return verificacao({
      id: `sol-tropical:${ref.instante}`,
      grupo: 'tropical',
      caso: `Sol em ${ref.instante.replace('T', ' ').slice(0, 16)} UTC`,
      item: 'sol',
      fonte: 'jpl',
      unidade: 'grau',
      esperado: ref.longitude,
      obtido,
      desvio: diferencaAngular(obtido, ref.longitude),
      tolerancia: TOLERANCIAS.longitude,
    });
  });
  const planetas = Object.entries(REFERENCIA_TROPICAL_1990.planetas).map(
    ([planeta, esperado]) => {
      const obtido = tropicalEmGreenwich(
        REFERENCIA_TROPICAL_1990.instante,
        planeta
      );
      return verificacao({
        id: `tropical-1990:${planeta}`,
        grupo: 'tropical',
        caso: '01/12/1990 12:30 UTC',
        item: planeta,
        fonte: 'jpl',
        unidade: 'grau',
        esperado,
        obtido,
        desvio: diferencaAngular(obtido, esperado),
        tolerancia: TOLERANCIAS.longitude,
      });
    }
  );
  return [...sol, ...planetas];
}

function vimshottari(): Verificacao[] {
  const ref = REFERENCIA_DO_DASHA_SP_1990;
  const mapa = calcularMapaNatal(ref.nascimento, new Date(ref.agora));
  const dia = 86_400_000;
  const lista: Verificacao[] = [];
  for (const nivel of ['mahadasha', 'antardasha'] as const) {
    const periodo = mapa.dasha?.[nivel];
    for (const limite of ['inicio', 'fim'] as const) {
      const esperado = Date.parse(`${ref[nivel][limite]}T12:00:00Z`);
      const obtido = periodo?.[limite].getTime() ?? Number.NaN;
      const mesmoGraha = periodo?.graha === ref[nivel].graha;
      lista.push(
        verificacao({
          id: `dasha-sp-1990:${nivel}:${limite}`,
          grupo: 'vimshottari',
          caso: `São Paulo 1990 · ${nivel} de ${ref[nivel].graha}`,
          item: `${nivel} (${limite})`,
          fonte: 'swiss',
          unidade: 'dia',
          esperado: 0,
          obtido: (obtido - esperado) / dia,
          // Graha errado reprova, mesmo com a data perto.
          desvio: mesmoGraha
            ? Math.abs(obtido - esperado) / dia
            : Number.POSITIVE_INFINITY,
          tolerancia: TOLERANCIAS.diasDoDasha,
        })
      );
    }
  }
  return lista;
}

export function verificarCalculos(): ResultadoDasVerificacoes {
  const verificacoes = [...siderais(), ...tropicais(), ...vimshottari()];
  const reprovadas = verificacoes.filter((v) => !v.aprovado).length;
  return {
    versao: VERSAO_DAS_VERIFICACOES,
    fontes: FONTES,
    aprovado: reprovadas === 0,
    total: verificacoes.length,
    reprovadas,
    verificacoes,
  };
}

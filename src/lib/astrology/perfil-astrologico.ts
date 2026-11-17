import { queryRows } from '@/lib/mysql/pool';
import type { PoolConnection } from 'mysql2/promise';

import {
  chandraBala,
  type ChandraBala,
  taraBala,
  type TaraBala,
} from './dia-pessoal';
import { calcularMapaNatal, type MapaNatal } from './mapa-natal';
import { calcularPanchang, type Panchang } from './panchang';
import { dataLocal, fusoValido } from './tempo';

/**
 * Dados astrológicos de uma pessoa a partir do perfil: mapa natal (com data,
 * hora e cidade de nascimento) e o dia védico no local onde ela mora (ou, sem
 * moradia informada, no local de nascimento).
 */

interface LinhaDoPerfil {
  birth_date: string | Date | null;
  birth_time: string | null;
  birth_time_estimate: string | null;
  birth_location: string | null;
  birth_latitude: string | number | null;
  birth_longitude: string | number | null;
  birth_timezone: string | null;
  residence_location: string | null;
  residence_latitude: string | number | null;
  residence_longitude: string | number | null;
  residence_timezone: string | null;
}

export interface Local {
  rotulo: string;
  latitude: number;
  longitude: number;
  fuso: string;
}

export interface PerfilAstrologico {
  nascimento: {
    data: string | null;
    hora: string | null;
    /**
     * A hora foi estimada pela própria pessoa ao escolher uma janela do dia
     * de nascimento (`birth_time_estimate` igual a `birth_time`).
     */
    horaEstimada: boolean;
    local: Local | null;
  };
  moradia: Local | null;
  /** Local usado para o dia (moradia ou, sem ela, nascimento). */
  localDoDia: Local | null;
  /** O que falta para o mapa natal completo. */
  faltando: Array<'data' | 'hora' | 'local'>;
}

function numero(valor: string | number | null) {
  if (valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function local(
  rotulo: string | null,
  latitude: string | number | null,
  longitude: string | number | null,
  fuso: string | null
): Local | null {
  const lat = numero(latitude);
  const lon = numero(longitude);
  if (!rotulo || lat === null || lon === null || !fuso || !fusoValido(fuso)) {
    return null;
  }
  return { rotulo, latitude: lat, longitude: lon, fuso };
}

function dataIso(valor: string | Date | null) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : null;
}

export async function lerPerfilAstrologico(
  userId: string,
  connection?: PoolConnection
): Promise<PerfilAstrologico> {
  const [linha] = await queryRows<LinhaDoPerfil>(
    `SELECT birth_date, birth_time, birth_time_estimate, birth_location, birth_latitude,
            birth_longitude, birth_timezone, residence_location,
            residence_latitude, residence_longitude, residence_timezone
       FROM profiles WHERE id = ? LIMIT 1`,
    [userId],
    connection
  );
  const nascimentoLocal = linha
    ? local(
        linha.birth_location,
        linha.birth_latitude,
        linha.birth_longitude,
        linha.birth_timezone
      )
    : null;
  const moradia = linha
    ? local(
        linha.residence_location,
        linha.residence_latitude,
        linha.residence_longitude,
        linha.residence_timezone
      )
    : null;
  const data = dataIso(linha?.birth_date ?? null);
  const hora = linha?.birth_time ? linha.birth_time.slice(0, 5) : null;
  const horaEstimada =
    hora !== null && linha?.birth_time_estimate?.slice(0, 5) === hora;
  const faltando: PerfilAstrologico['faltando'] = [];
  if (!data) faltando.push('data');
  if (!hora) faltando.push('hora');
  if (!nascimentoLocal) faltando.push('local');
  return {
    nascimento: { data, hora, horaEstimada, local: nascimentoLocal },
    moradia,
    localDoDia: moradia ?? nascimentoLocal,
    faltando,
  };
}

/** Mapa natal; null sem data ou sem cidade de nascimento. */
export function mapaDoPerfil(
  perfil: PerfilAstrologico,
  agora = new Date()
): MapaNatal | null {
  const { data, hora, horaEstimada, local: lugar } = perfil.nascimento;
  if (!data || !lugar) return null;
  return calcularMapaNatal(
    {
      data,
      hora,
      horaEstimada,
      latitude: lugar.latitude,
      longitude: lugar.longitude,
      fuso: lugar.fuso,
    },
    agora
  );
}

export interface DiaVedico {
  local: Local;
  panchang: Panchang;
  /** Só com mapa natal: como o dia conversa com a Lua natal. */
  pessoal: {
    tara: TaraBala;
    /** Tara depois que o nakshatra do dia muda (se mudar antes do pôr do sol seguinte). */
    taraDepois: (TaraBala & { aPartirDe: Date }) | null;
    chandra: ChandraBala;
  } | null;
  /**
   * Motivo de não haver dia pessoal mesmo com mapa natal: sem a hora de
   * nascimento, a Lua natal pode estar em mais de um nakshatra ou signo
   * naquele dia, e Tara Bala ou Chandra Bala mudariam conforme a hora.
   */
  pessoalIndisponivel: 'hora-de-nascimento' | null;
}

/** Dia védico (Panchang e dia pessoal) na data local do lugar do dia. */
export function diaVedicoDoPerfil(
  perfil: PerfilAstrologico,
  mapa: MapaNatal | null,
  data?: string
): DiaVedico | null {
  const lugar = perfil.localDoDia;
  if (!lugar) return null;
  const panchang = calcularPanchang({
    data: data ?? dataLocal(new Date(), lugar.fuso),
    latitude: lugar.latitude,
    longitude: lugar.longitude,
    fuso: lugar.fuso,
  });
  if (!mapa)
    return { local: lugar, panchang, pessoal: null, pessoalIndisponivel: null };

  // Sem a hora, só vale o que é igual para toda Lua possível naquele dia.
  if (mapa.possibilidades) {
    const taras = new Set(
      mapa.possibilidades.nakshatrasDaLua.map(
        (nakshatra) => taraBala(nakshatra, panchang.nakshatra.indice).nome
      )
    );
    const casas = new Set(
      mapa.possibilidades.signosDaLua.map(
        (signo) => chandraBala(signo, panchang.signoDaLua.indice).casa
      )
    );
    if (taras.size > 1 || casas.size > 1) {
      return {
        local: lugar,
        panchang,
        pessoal: null,
        pessoalIndisponivel: 'hora-de-nascimento',
      };
    }
  }

  const proximoNakshatra = (panchang.nakshatra.indice + 1) % 27;
  const mudaNoDia =
    panchang.nakshatra.termina.getTime() <
    panchang.proximoNascerDoSol.getTime();
  return {
    local: lugar,
    panchang,
    pessoal: {
      tara: taraBala(mapa.lua.nakshatra, panchang.nakshatra.indice),
      taraDepois: mudaNoDia
        ? {
            ...taraBala(mapa.lua.nakshatra, proximoNakshatra),
            aPartirDe: panchang.nakshatra.termina,
          }
        : null,
      chandra: chandraBala(mapa.lua.signo, panchang.signoDaLua.indice),
    },
    pessoalIndisponivel: null,
  };
}

import {
  dataLocal,
  horaLocal,
  localParaUtc,
  partesLocais,
} from '@/lib/astrology/tempo';
import type { DadosDoLembrete, PreferenciasDeLembretes } from './esquema';

/** Reutiliza o conversor IANA; antecipa também repetições de meia hora. */
export function horarioDoLembrete(data: string, hora: string, fuso: string) {
  const base = localParaUtc(data, hora, fuso);
  for (const minutos of [120, 90, 60, 30]) {
    const antes = new Date(base.getTime() - minutos * 60_000);
    if (dataLocal(antes, fuso) === data && horaLocal(antes, fuso) === hora)
      return antes;
  }
  return base;
}

export function estaEmSilencio(agora: Date, p: PreferenciasDeLembretes) {
  if (!p.silencioAtivo) return false;
  const hora = horaLocal(agora, p.fuso);
  return p.inicioSilencio < p.fimSilencio
    ? hora >= p.inicioSilencio && hora < p.fimSilencio
    : hora >= p.inicioSilencio || hora < p.fimSilencio;
}

export function ocorrenciaDeHoje(
  lembrete: DadosDoLembrete,
  p: PreferenciasDeLembretes,
  agora: Date,
  aPartirDe: Date
) {
  if (
    !lembrete.ativo ||
    !lembrete.dias.includes(partesLocais(agora, p.fuso).diaDaSemana)
  )
    return null;
  const data = dataLocal(agora, p.fuso);
  const instante = horarioDoLembrete(data, lembrete.hora, p.fuso);
  return instante >= aPartirDe && instante <= agora ? { data, instante } : null;
}

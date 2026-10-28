import { dataLocal } from '@/lib/astrology/tempo';
import { somarDias } from '@/lib/acontecimentos/analise';
import type { PeriodoDeDescanso, EstadoDoPeriodo } from './esquema';
export function retornoDoPeriodo(p: PeriodoDeDescanso) {
  const fim = p.dataEncerramento ?? p.fim;
  const inicio =
    fim === null || p.retornoDias === 0
      ? null
      : p.encerradaEm
        ? fim
        : somarDias(fim, 1);
  const previsto = inicio ? somarDias(inicio, p.retornoDias - 1) : null;
  return {
    inicio,
    fim:
      previsto && p.dataFimRetorno && p.dataFimRetorno < previsto
        ? p.dataFimRetorno
        : previsto,
  };
}
export function estadoDoPeriodo(
  p: PeriodoDeDescanso,
  agora: Date
): EstadoDoPeriodo {
  if (p.canceladaEm) return 'cancelada';
  const hoje = dataLocal(agora, p.fuso);
  if (hoje < p.inicio || agora.getTime() < Date.parse(p.criadaEm))
    return 'agendada';
  const manual = p.encerradaEm && agora.getTime() >= Date.parse(p.encerradaEm);
  if (!manual && (p.fim === null || hoje <= p.fim)) return 'ativa';
  const ret = retornoDoPeriodo(p);
  if (
    ret.inicio &&
    ret.fim &&
    hoje >= ret.inicio &&
    hoje <= ret.fim &&
    (!p.retornoEncerradoEm ||
      agora.getTime() < Date.parse(p.retornoEncerradoEm))
  )
    return 'retorno';
  return 'encerrada';
}
/** Estado de avisos no instante real, distinto da neutralidade do dia civil. */
export function politicaNoInstante(periodos: PeriodoDeDescanso[], agora: Date) {
  for (const p of periodos) {
    if (
      agora.getTime() < Date.parse(p.criadaEm) ||
      (p.ativadaEm && agora.getTime() < Date.parse(p.ativadaEm))
    )
      continue;
    const estado = estadoDoPeriodo(p, agora);
    if (estado === 'ativa' || estado === 'retorno')
      return {
        estado,
        atividade: estado === 'retorno' ? p.atividade : null,
        fuso: p.fuso,
        periodoId: p.id,
      };
  }
  return null;
}
/** Intervalos inclusivos neutros, sem transformá-los em dias cumpridos. */
export function intervalosNeutros(
  p: PeriodoDeDescanso,
  ate: string
): [string, string][] {
  if (p.canceladaEm || p.inicio > ate) return [];
  const fim = [p.dataEncerramento ?? p.fim ?? ate, ate].sort()[0],
    out: [string, string][] = [];
  if (fim >= p.inicio) out.push([p.inicio, fim]);
  const ret = retornoDoPeriodo(p);
  if (ret.inicio && ret.fim && ret.inicio <= ate)
    out.push([ret.inicio, [ret.fim, ate].sort()[0]]);
  return out;
}
export function unirIntervalos(
  intervalos: readonly [string, string][]
): [string, string][] {
  const out: [string, string][] = [];
  for (const [a, b] of [...intervalos].sort((x, y) =>
    x[0].localeCompare(y[0])
  )) {
    const ultimo = out.at(-1);
    if (ultimo && a <= somarDias(ultimo[1], 1)) {
      if (b > ultimo[1]) ultimo[1] = b;
    } else out.push([a, b]);
  }
  return out;
}
export function contarDiasNeutros(intervalos: readonly [string, string][]) {
  return unirIntervalos(intervalos).reduce(
    (n, [a, b]) => n + (Date.parse(b) - Date.parse(a)) / 86400000 + 1,
    0
  );
}
export function datasNeutras(
  periodos: PeriodoDeDescanso[],
  inicio: string,
  fim: string
) {
  const datas = new Set<string>();
  for (const [a, b] of unirIntervalos(
    periodos.flatMap((p) => intervalosNeutros(p, fim))
  ))
    for (let d = a < inicio ? inicio : a; d <= b; d = somarDias(d, 1))
      datas.add(d);
  return datas;
}

/** Impede criar uma pendência antiga depois que uma etapa restritiva passou. */
export function avisoAtravessouPausa(
  periodos: PeriodoDeDescanso[],
  previsto: Date,
  agora: Date,
  atividade: NonNullable<PeriodoDeDescanso['atividade']>
) {
  const politicaAtual = politicaNoInstante(periodos, agora);
  if (
    politicaAtual?.estado === 'retorno' &&
    dataLocal(previsto, politicaAtual.fuso) !==
      dataLocal(agora, politicaAtual.fuso)
  )
    return true;
  for (const p of periodos) {
    if (
      p.canceladaEm ||
      agora.getTime() < Date.parse(p.criadaEm) ||
      (p.ativadaEm && agora.getTime() < Date.parse(p.ativadaEm)) ||
      dataLocal(agora, p.fuso) < p.inicio
    )
      continue;
    const terminouDepoisDoHorario = p.encerradaEm
      ? Date.parse(p.encerradaEm) > previsto.getTime()
      : p.fim === null || dataLocal(previsto, p.fuso) <= p.fim;
    if (terminouDepoisDoHorario) return true;
    const politicaOriginal = politicaNoInstante([p], previsto);
    if (
      politicaOriginal?.estado === 'retorno' &&
      (politicaOriginal.atividade !== atividade ||
        politicaAtual?.estado !== 'retorno' ||
        politicaAtual.periodoId !== p.id)
    )
      return true;
  }
  return false;
}

import type {
  Agrupamento,
  FiltrosAnaliticos,
  PontoTemporal,
} from './definicoes';
const DIA = 86_400_000;
export function padraoDoPeriodo(agora = new Date()): FiltrosAnaliticos {
  const fim = agora.toISOString().slice(0, 10);
  return {
    inicio: new Date(Date.parse(`${fim}T00:00:00Z`) - 29 * DIA)
      .toISOString()
      .slice(0, 10),
    fim,
    plano: 'todos',
    agrupamento: 'dia',
  };
}
export function janela(f: Pick<FiltrosAnaliticos, 'inicio' | 'fim'>) {
  const inicio = Date.parse(`${f.inicio}T00:00:00Z`),
    fim = Date.parse(`${f.fim}T00:00:00Z`) + DIA;
  const dias = (fim - inicio) / DIA;
  const iso = (n: number) => new Date(n).toISOString().slice(0, 10);
  return {
    inicio: f.inicio + ' 00:00:00',
    fim: iso(fim) + ' 00:00:00',
    inicioAnterior: iso(inicio - dias * DIA) + ' 00:00:00',
    anterior: { inicio: iso(inicio - dias * DIA), fim: iso(inicio - DIA) },
  };
}
function balde(d: Date, grupo: Agrupamento) {
  if (grupo === 'mes') d.setUTCDate(1);
  if (grupo === 'semana')
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
/** Pessoas ativas não são somadas entre dias: o SQL já calcula o DISTINCT por balde. */
export function preencherSerie(
  inicio: string,
  fim: string,
  grupo: Agrupamento,
  linhas: PontoTemporal[]
) {
  const mapa = new Map(linhas.map((l) => [l.data, l]));
  const saida = new Map<string, PontoTemporal>();
  for (let t = Date.parse(inicio); t <= Date.parse(fim); t += DIA) {
    const data = balde(new Date(t), grupo);
    saida.set(
      data,
      mapa.get(data) ?? { data, cadastros: 0, ativos: 0, chat: 0, metricas: 0 }
    );
  }
  return [...saida.values()];
}

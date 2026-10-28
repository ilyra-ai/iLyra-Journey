import { CAMPOS_DO_REGISTRO } from '@/lib/metricas/registro-do-dia';
import type {
  Comparacao,
  ParDeObservacao,
  PedidoDaComparacao,
} from './esquema';

/** Critérios do produto para exibir descrições, não um teste de significância. */
export const CRITERIOS = {
  pares: 14,
  porGrupo: 5,
  cobertura: 0.7,
  amplitudeDias: 13,
} as const;
export function somarDias(data: string, quantidade: number) {
  const d = new Date(data + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + quantidade);
  return d.toISOString().slice(0, 10);
}
export function mediana(valores: number[]) {
  const n = [...valores].sort((a, b) => a - b);
  if (!n.length) return null;
  const i = Math.floor(n.length / 2);
  return n.length % 2 ? n[i] : (n[i - 1] + n[i]) / 2;
}
export function valorValido(
  metrica: PedidoDaComparacao['metrica'],
  valor: unknown
): number | null {
  if ((typeof valor !== 'number' && typeof valor !== 'string') || valor === '')
    return null;
  const n = Number(valor),
    d = CAMPOS_DO_REGISTRO[metrica === 'sono' ? 'sono' : 'energia'];
  return Number.isFinite(n) &&
    Number.isInteger(n) &&
    n >= d.minimo &&
    n <= d.maximo
    ? n
    : null;
}
export function analisarPares(
  pedido: PedidoDaComparacao,
  marcador: string,
  pares: ParDeObservacao[],
  agora = new Date()
): Comparacao {
  const validos = pares.filter(
      (p) => p.confirmado && p.presenca !== null && p.valor !== null
    ),
    com = validos.filter((p) => p.presenca),
    sem = validos.filter((p) => !p.presenca);
  const dias =
      (Date.parse(pedido.fim) - Date.parse(pedido.inicio)) / 86400000 + 1,
    cobertura = validos.length / dias,
    motivos: string[] = [];
  if (validos.length < CRITERIOS.pares)
    motivos.push(
      `São necessários ao menos ${CRITERIOS.pares} dias confirmados com valor válido; há ${validos.length}.`
    );
  if (com.length < CRITERIOS.porGrupo || sem.length < CRITERIOS.porGrupo)
    motivos.push(
      `Precisamos de ao menos ${CRITERIOS.porGrupo} dias em cada grupo; há ${com.length} com e ${sem.length} sem o marcador.`
    );
  if (cobertura < CRITERIOS.cobertura)
    motivos.push(
      `A cobertura de dias com par válido é ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(cobertura * 100)}%; o mínimo deste recurso é 70%.`
    );
  const datas = validos.map((p) => p.data).sort();
  if (
    !datas.length ||
    (Date.parse(datas.at(-1)!) - Date.parse(datas[0])) / 86400000 <
      CRITERIOS.amplitudeDias
  )
    motivos.push(
      'Os pares válidos precisam abranger ao menos 14 dias de calendário.'
    );
  let resumo: Comparacao['resumo'] = null;
  if (!motivos.length) {
    const medianaCom = mediana(com.map((p) => p.valor!))!,
      medianaSem = mediana(sem.map((p) => p.valor!))!;
    const meio = somarDias(pedido.inicio, Math.floor(dias / 2));
    const diferenca = (a: ParDeObservacao[]) => {
      const x = a.filter((p) => p.presenca).map((p) => p.valor!),
        y = a.filter((p) => !p.presenca).map((p) => p.valor!);
      return x.length >= 2 && y.length >= 2 ? mediana(x)! - mediana(y)! : null;
    };
    const primeira = diferenca(validos.filter((p) => p.data < meio)),
      segunda = diferenca(validos.filter((p) => p.data >= meio));
    resumo = {
      medianaCom,
      medianaSem,
      diferenca: medianaCom - medianaSem,
      contraditorio:
        primeira !== null && segunda !== null && primeira * segunda < 0,
      outrosMarcadoresEm: com.filter((p) => p.outrosMarcadores > 0).length,
    };
  }
  return {
    pedido,
    marcador,
    unidade: pedido.metrica === 'sono' ? 'min' : '1–5',
    nomeMetrica:
      pedido.metrica === 'sono' ? 'Sono da última noite' : 'Energia percebida',
    pares,
    qualidade: {
      dias,
      paresValidos: validos.length,
      com: com.length,
      sem: sem.length,
      cobertura,
      apta: motivos.length === 0,
      motivos,
    },
    resumo,
    calculadaEm: agora.toISOString(),
  };
}

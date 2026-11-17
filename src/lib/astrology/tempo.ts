/**
 * Conversões de horário local ↔ UTC por fuso IANA, com o histórico de horário
 * de verão do banco de fusos do próprio Node (ICU). Necessário para o mapa
 * natal: uma hora de nascimento local só vira instante real com o fuso e as
 * regras de verão vigentes naquela data.
 */

export interface PartesLocais {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
  /** 0 = domingo. */
  diaDaSemana: number;
}

const formatadores = new Map<string, Intl.DateTimeFormat>();

function formatador(fuso: string) {
  let existente = formatadores.get(fuso);
  if (!existente) {
    existente = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    formatadores.set(fuso, existente);
  }
  return existente;
}

const DIAS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fusoValido(fuso: string) {
  try {
    formatador(fuso);
    return true;
  } catch {
    return false;
  }
}

export function partesLocais(instante: Date, fuso: string): PartesLocais {
  const partes = Object.fromEntries(
    formatador(fuso)
      .formatToParts(instante)
      .map((parte) => [parte.type, parte.value])
  );
  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
    segundo: Number(partes.second),
    diaDaSemana: DIAS.indexOf(partes.weekday),
  };
}

/** Diferença do fuso para o UTC naquele instante, em minutos (ex.: -180). */
export function deslocamentoEmMinutos(instante: Date, fuso: string) {
  const p = partesLocais(instante, fuso);
  const comoUtc = Date.UTC(
    p.ano,
    p.mes - 1,
    p.dia,
    p.hora,
    p.minuto,
    p.segundo
  );
  return Math.round(
    (comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60_000
  );
}

/**
 * Instante UTC de uma data e hora locais no fuso. Em horários que não
 * existem (início do horário de verão) usa o deslocamento de antes da
 * mudança; em horários repetidos (fim do verão) fica com a primeira
 * ocorrência.
 */
export function localParaUtc(data: string, hora: string, fuso: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [h = 0, m = 0, s = 0] = hora.split(':').map(Number);
  const comoUtc = Date.UTC(ano, mes - 1, dia, h, m, s);
  // O instante é exato quando, no fuso, ele mostra a hora pedida.
  const confere = (instante: number) =>
    comoUtc - deslocamentoEmMinutos(new Date(instante), fuso) * 60_000 ===
    instante;
  // 1º palpite: deslocamento de algumas horas antes (anterior a uma mudança
  // de verão que esteja no meio); 2º: deslocamento no próprio palpite.
  const primeiro =
    comoUtc - deslocamentoEmMinutos(new Date(comoUtc), fuso) * 60_000;
  const segundo =
    comoUtc - deslocamentoEmMinutos(new Date(primeiro), fuso) * 60_000;
  if (confere(segundo)) {
    // Hora repetida no fim do verão: fica com a primeira ocorrência.
    const umaHoraAntes = segundo - 3_600_000;
    return new Date(confere(umaHoraAntes) ? umaHoraAntes : segundo);
  }
  if (confere(primeiro)) return new Date(primeiro);
  // Hora que não existe (início do verão): deslocamento de antes da mudança,
  // o que equivale a avançar o relógio (02:30 vira 03:30).
  return new Date(primeiro);
}

/** "AAAA-MM-DD" do instante no fuso. */
export function dataLocal(instante: Date, fuso: string) {
  const p = partesLocais(instante, fuso);
  return `${p.ano}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
}

/** "HH:mm" do instante no fuso. */
export function horaLocal(instante: Date, fuso: string) {
  const p = partesLocais(instante, fuso);
  return `${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`;
}

/**
 * Instantes UTC em que o relógio local do fuso mostrou `data` e `hora`
 * ("HH:mm"), em ordem. Um instante: hora comum. Dois: hora repetida no fim
 * do horário de verão. Nenhum: hora que não existiu no início do horário de
 * verão ou numa mudança de fuso. Usado pelo mapa védico e pelo ocidental.
 */
export function ocorrenciasLocais(
  data: string,
  hora: string,
  fuso: string
): number[] {
  const base = localParaUtc(data, hora, fuso).getTime();
  const [ano, mes, dia] = data.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  const candidatos: number[] = [];
  for (
    let deslocamento = -3 * 3_600_000;
    deslocamento <= 3 * 3_600_000;
    deslocamento += 15 * 60_000
  ) {
    const valor = base + deslocamento;
    const p = partesLocais(new Date(valor), fuso);
    if (
      p.ano === ano &&
      p.mes === mes &&
      p.dia === dia &&
      p.hora === h &&
      p.minuto === m
    )
      candidatos.push(valor);
  }
  return candidatos;
}

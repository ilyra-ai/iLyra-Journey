/** Tempo civil observado pelo servidor, limitado ao alvo; não mede atenção nem execução contínua do navegador. */
export function tempoDecorrido(
  acumulado: number,
  desde: string | null,
  agora: Date,
  alvoSegundos: number
) {
  const inicio = desde
    ? Date.parse(desde.replace(' ', 'T') + 'Z')
    : agora.getTime();
  return Math.min(
    alvoSegundos * 1000,
    Math.max(0, acumulado) + Math.max(0, agora.getTime() - inicio)
  );
}
export function mostrarTempo(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

/** Pausa somente convites conhecidos; alertas do sensor e outros avisos permanecem. */
export function convitePodeSerPausado(tipo: string, chave: string) {
  return (
    tipo === 'coach_dia' ||
    tipo === 'lembrete_pessoal' ||
    (tipo === 'coach_alerta' && chave.startsWith('alerta:'))
  );
}

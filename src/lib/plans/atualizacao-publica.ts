export const EVENTO_PLANOS_ATUALIZADOS = 'lyra:planos-atualizados';
export function notificarPlanosAtualizados() {
  window.dispatchEvent(new Event(EVENTO_PLANOS_ATUALIZADOS));
  // O evento nativo storage alcança as outras abas da mesma origem.
  try {
    localStorage.setItem(EVENTO_PLANOS_ATUALIZADOS, crypto.randomUUID());
  } catch {
    /* A reconsulta periódica continua quando o armazenamento está indisponível. */
  }
}

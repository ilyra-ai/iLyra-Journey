export const EVENTO_DESCANSO = 'lyra:descanso-atualizado';
export function avisarDescansoAtualizado() {
  window.dispatchEvent(new Event(EVENTO_DESCANSO));
}

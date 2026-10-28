export const EVENTO_LEMBRETES = 'lyra:lembretes-atualizados';

export function avisarLembretesAtualizados() {
  window.dispatchEvent(new Event(EVENTO_LEMBRETES));
}

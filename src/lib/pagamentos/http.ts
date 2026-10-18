/**
 * Chamada às APIs dos provedores de pagamento com prazo e sem cache, usada
 * pelo "Testar conexão" de Admin → Pagamentos. Devolve o status e o corpo em
 * JSON (ou `null` quando o corpo não é JSON).
 */
export const TEMPO_DA_CHAMADA_MS = 15_000;

export async function chamarProvedor(
  url: string,
  init: RequestInit
): Promise<{ status: number; corpo: Record<string, unknown> | null }> {
  const resposta = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TEMPO_DA_CHAMADA_MS),
    cache: 'no-store',
  });
  const corpo = (await resposta.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { status: resposta.status, corpo };
}

export function textoDe(valor: unknown) {
  return typeof valor === 'string' && valor.length > 0 ? valor : null;
}

/** O erro foi o prazo da chamada (AbortSignal.timeout). */
export function estourouOPrazo(erro: unknown) {
  return (
    erro instanceof Error &&
    (erro.name === 'TimeoutError' || erro.name === 'AbortError')
  );
}

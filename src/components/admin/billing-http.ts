'use client';
/** Erros administrativos já são saneados no servidor; não imprime payload financeiro. */
export async function consultarFinanceiro<T>(
  url: string,
  body?: unknown
): Promise<T> {
  const r = await fetch(url, {
    cache: 'no-store',
    ...(body !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'Não foi possível consultar o faturamento.'
    );
  return data as T;
}

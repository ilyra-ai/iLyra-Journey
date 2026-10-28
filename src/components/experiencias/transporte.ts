'use client';
import { buscarJson } from '@/lib/http/transporte';
export async function requisitar<T>(
  url: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const r = await buscarJson(url, {
    method,
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  if (!r.ok) throw new Error(r.falha.message);
  return r.corpo as T;
}
export function erroNaPagina() {
  /* A falha é exibida junto da operação com retentativa. */
}

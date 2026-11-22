'use client';

import type { EtapaDoFunil } from './etapas';

const PREFIXO = 'lyra:funil:';

/**
 * Informa uma etapa do funil (tarefa 170) sem atrasar a interface: usa
 * `sendBeacon`, que sobrevive à troca de página, e cai para `fetch` com
 * `keepalive`. Nenhum identificador ou dado pessoal vai no corpo, e a rota
 * não lê cookie nem sessão.
 *
 * `umaVezPorSessao` evita contar a mesma etapa a cada recarga da aba. A
 * marca fica só no `sessionStorage` deste navegador e nunca é enviada.
 * Falhas são ignoradas de propósito: medir nunca pode atrapalhar a pessoa.
 */
export function marcarEtapa(
  etapa: EtapaDoFunil,
  detalhe = '',
  opcoes: { umaVezPorSessao?: boolean } = {}
) {
  if (typeof window === 'undefined') return;
  const marca = `${PREFIXO}${etapa}:${detalhe}`;
  if (opcoes.umaVezPorSessao) {
    try {
      if (window.sessionStorage.getItem(marca)) return;
      window.sessionStorage.setItem(marca, '1');
    } catch {
      // Armazenamento bloqueado (aba privada): conta mesmo assim.
    }
  }
  const corpo = JSON.stringify({ etapa, detalhe });
  const blob = new Blob([corpo], { type: 'application/json' });
  if (navigator.sendBeacon?.('/api/public/funil', blob)) return;
  void fetch('/api/public/funil', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: corpo,
    credentials: 'omit',
    keepalive: true,
  }).catch(() => undefined);
}

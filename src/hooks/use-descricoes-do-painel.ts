'use client';
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useAgora } from '@/hooks/use-agora';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import { ouvirMetricasAtualizadas } from '@/lib/metricas/evento-de-atualizacao';
import { CATALOGO_DAS_EXPLICACOES } from '@/lib/painel/catalogo';
import type { ResultadoDasDescricoes } from '@/lib/painel/servico';

const SEM_DESCRICOES: ResultadoDasDescricoes | null = null;
function avisar() {
  /* A falha é apresentada junto das explicações, sem dados pessoais no log. */
}
export function useDescricoesDoPainel(habilitado: boolean) {
  const { session } = useAuth();
  const { privacyMode } = usePrivacyMode();
  const agora = useAgora();
  const data = agora ? format(agora, 'yyyy-MM-dd') : null;
  const [versao, setVersao] = useState(0);
  useEffect(() => ouvirMetricasAtualizadas(() => setVersao((v) => v + 1)), []);
  const ler = useCallback(async (): Promise<ResultadoDasDescricoes> => {
    const r = await fetch('/api/painel/descricoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, privado: privacyMode }),
    });
    if (!r.ok) throw new Error('Não foi possível preparar as explicações.');
    const corpo = (await r.json()) as ResultadoDasDescricoes;
    const estados = [
      'pronto',
      'sem_modelo',
      'privado',
      'atualizando',
      'limite',
      'falha',
    ];
    if (
      !corpo ||
      !estados.includes(corpo.estado) ||
      !corpo.descricoes ||
      typeof corpo.descricoes !== 'object'
    )
      throw new Error('Resposta de explicações inválida.');
    for (const item of CATALOGO_DAS_EXPLICACOES) {
      const texto = corpo.descricoes[item.id];
      if (
        texto !== undefined &&
        (typeof texto !== 'string' || texto.length > 420)
      )
        throw new Error('Explicação inválida.');
    }
    return corpo;
  }, [data, privacyMode]);
  const resultado = useKeyedResource(
    habilitado && session && data
      ? `descricoes:${session.user.id}:${data}:${privacyMode}:${versao}`
      : null,
    ler,
    avisar,
    SEM_DESCRICOES
  );
  const estado = resultado.data?.estado;
  const { refresh } = resultado;
  useEffect(() => {
    if (estado !== 'atualizando' && estado !== 'falha') return;
    const timer = setTimeout(
      () => void refresh(),
      estado === 'atualizando' ? 3000 : 120000
    );
    return () => clearTimeout(timer);
  }, [estado, refresh, resultado.data]);
  return resultado;
}

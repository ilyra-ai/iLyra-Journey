'use client';

import { useSyncExternalStore } from 'react';

export const ABAS_DO_PAINEL = [
  { id: 'resumo', nome: 'Resumo' },
  { id: 'registros', nome: 'Registros' },
  { id: 'evolucao', nome: 'Evolução' },
  { id: 'orientacoes', nome: 'Orientações' },
  { id: 'avaliacoes', nome: 'Como me sinto' },
] as const;
export const GRUPOS_DO_PAINEL = [
  { id: 'sono', nome: 'Sono', titulo: 'Sono e cronobiologia' },
  {
    id: 'recuperacao',
    nome: 'Recuperação',
    titulo: 'Recuperação e resiliência',
  },
  { id: 'movimento', nome: 'Movimento', titulo: 'Cardio e atividade física' },
  { id: 'glicose', nome: 'Glicose', titulo: 'Metabolismo e glicose' },
  { id: 'alimentacao', nome: 'Alimentação', titulo: 'Nutrição e composição' },
  { id: 'mente', nome: 'Mente e foco', titulo: 'Saúde mental e foco' },
  { id: 'corpo', nome: 'Corpo', titulo: 'Saúde geral' },
] as const;
export type AbaDoPainel = (typeof ABAS_DO_PAINEL)[number]['id'];
export type GrupoDoPainel = (typeof GRUPOS_DO_PAINEL)[number]['id'];
const evento = 'lyra:aba-do-painel';

function assinar(avisar: () => void) {
  window.addEventListener('popstate', avisar);
  window.addEventListener(evento, avisar);
  return () => {
    window.removeEventListener('popstate', avisar);
    window.removeEventListener(evento, avisar);
  };
}
const ler = () => window.location.search;
const noServidor = () => '';

/** URL contém somente escolhas de apresentação; nunca dados pessoais. */
export function useAbasDoPainel() {
  const consulta = useSyncExternalStore(assinar, ler, noServidor);
  const parametros = new URLSearchParams(consulta);
  const aba =
    ABAS_DO_PAINEL.find((item) => item.id === parametros.get('aba'))?.id ??
    'resumo';
  const grupo =
    GRUPOS_DO_PAINEL.find((item) => item.id === parametros.get('grupo'))?.id ??
    'sono';
  const selecionar = (novaAba: string, novoGrupo?: string) => {
    if (!ABAS_DO_PAINEL.some((item) => item.id === novaAba)) return;
    const url = new URL(window.location.href);
    url.searchParams.set('aba', novaAba);
    if (novoGrupo && GRUPOS_DO_PAINEL.some((item) => item.id === novoGrupo))
      url.searchParams.set('grupo', novoGrupo);
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(evento));
  };
  return { aba, grupo, selecionar };
}

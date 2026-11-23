import { carregarNatalDoTitular } from '@/lib/astrology/persistencia-natal';
import { grausEMinutos } from '@/lib/astrology/sideral';
import { lerMapaComoLyra } from '@/lib/lyra/leitura-do-mapa';
import { contaTemRecurso } from '@/lib/plans/service';

import {
  type GRAHAS_DO_CHAT,
  pontoDoMapaSchema,
  type ParteDoChat,
} from './partes';

/**
 * Parte "ponto do mapa" (tarefa 180), montada só pelo servidor a partir do
 * mapa calculado do próprio titular. Sem o recurso de mapas no plano, sem
 * mapa calculado ou sem o planeta, não há parte: a resposta segue só texto.
 */
export async function montarPontoDoChat(
  usuario: string,
  graha: (typeof GRAHAS_DO_CHAT)[number],
  agora = new Date()
): Promise<ParteDoChat[]> {
  if (!(await contaTemRecurso(usuario, 'vedic_insights'))) return [];
  const { mapa } = await carregarNatalDoTitular(usuario, agora);
  if (!mapa) return [];
  const planeta = mapa.planetas.find((p) => p.graha === graha);
  if (!planeta) return [];
  const leitura =
    lerMapaComoLyra(mapa).vedico.planetas.find((l) => l.graha === graha)
      ?.texto ?? null;
  return [
    pontoDoMapaSchema.parse({
      tipo: 'ponto-do-mapa',
      versao: 1,
      graha,
      nome: planeta.nome.split(' (')[0],
      signo: planeta.nomeDoSigno,
      grau: grausEMinutos(planeta.grauNoSigno),
      nakshatra: planeta.nomeDoNakshatra,
      pada: planeta.pada,
      casa: planeta.casa,
      retrogrado: planeta.retrogrado,
      precisaoDaHora: mapa.precisaoDaHora,
      leitura: leitura ? leitura.slice(0, 1200) : null,
      geradoEm: agora.toISOString(),
    }),
  ];
}

import type { MapaNatal } from '@/lib/astrology/mapa-natal';
import { pedidoDeAnalise } from '@/lib/lyra/analise-aprofundada';
import type { PedidoDeImagemDoTurno } from './tipos';

/** Pedidos de criação são diferentes de perguntas sobre como imagens funcionam. */
export function solicitouCriacaoDeImagem(mensagem: string): boolean {
  const { pergunta } = pedidoDeAnalise(mensagem);
  return (
    /^(?:por favor[,\s]+)?(?:lyra[,\s]+)?(?:(?:voce|você)\s+)?(?:(?:pode|poderia|consegue)\s+)?(?:me\s+)?(?:crie|cria|criar|gere|gera|gerar|desenhe|desenha|desenhar|faça|faz|fazer|produza|produzir)\b[^.!?]*\b(?:imagem|ilustra[çc][ãa]o|desenho|foto|retrato)\b/iu.test(
      pergunta
    ) ||
    /^quero\s+(?:(?:que\s+(?:voce|você)\s+)?(?:crie|gere|desenhe)\s+)?(?:uma?\s+)?(?:imagem|ilustra[çc][ãa]o|desenho|foto|retrato)\b/iu.test(
      pergunta
    )
  );
}

export function pedidoDeImagemParaConversa(
  mensagem: string,
  mapa: MapaNatal | null
): PedidoDeImagemDoTurno | null {
  if (solicitouCriacaoDeImagem(mensagem)) {
    return { tipo: 'solicitada', prompt: pedidoDeAnalise(mensagem).pergunta };
  }
  if (
    !mapa ||
    /^(?:não|nao)\b/iu.test(mensagem.trim()) ||
    !/\b(?:meu mapa|mapa pessoal|mapa natal|mapa v[ée]dico)\b/iu.test(
      mensagem
    ) ||
    /^(?:o que|como funciona|qual a diferen[çc]a)/iu.test(mensagem.trim())
  ) {
    return null;
  }
  // O provedor recebe somente posições calculadas, sem nome, e-mail, data,
  // hora, coordenadas ou métricas de saúde do titular.
  const dados = {
    sistema: 'Zodíaco sideral, ayanamsha Lahiri e casas por signo inteiro',
    horaConhecida: mapa.horaConhecida,
    ascendente: mapa.lagna ? { signo: mapa.lagna.signo } : null,
    planetas: mapa.planetas.map((planeta) => ({
      nome: planeta.nome,
      signo: planeta.signo,
      casa: planeta.casa,
      retrogrado: planeta.retrogrado,
    })),
  };
  return {
    tipo: 'mapa',
    prompt: [
      'Crie uma ilustração simbólica do mapa pessoal com visual claro, legível e organizado. Use os dados calculados abaixo como referência, sem inventar posições, casas, ascendente ou informações pessoais ausentes.',
      'A imagem é uma interpretação visual gerada por IA, não um novo cálculo astronômico. Evite números ou rótulos que não consiga reproduzir com fidelidade; os dados de referência permanecem disponíveis na leitura textual.',
      JSON.stringify(dados),
    ].join('\n'),
  };
}

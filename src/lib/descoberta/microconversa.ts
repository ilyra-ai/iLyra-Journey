import { z } from 'zod';

import { responderPelaBase } from '@/lib/lyra/responder';

/**
 * Microconversa do Experimente Grátis (tarefa 158): o visitante pergunta e
 * o Motor Lyra responde pela base curada, sem modelo de IA, sem custo de
 * tokens e sem guardar a pergunta. Sem verbete para o tema, a Lyra diz o
 * que a versão gratuita alcança, sem inventar resposta.
 */

export const esquemaDaPergunta = z
  .object({
    pergunta: z
      .string()
      .trim()
      .min(3, 'Escreva uma pergunta.')
      .max(300, 'A pergunta pode ter até 300 caracteres.'),
  })
  .strict();

export interface RespostaAoVisitante {
  texto: string;
  /** "por que esta frase": verbete da base curada ou o limite da versão. */
  origem: string;
}

export const SEM_VERBETE =
  'Ainda não tenho um verbete sobre isso na versão gratuita. Aqui eu converso sobre os temas da base da Lyra, como signos, planetas, Vedanta, yoga e meditação. A leitura do seu mapa completo e a conversa sobre a sua vida ficam na conta da Lyra.';

export function responderAoVisitante(pergunta: string): RespostaAoVisitante {
  const resposta = responderPelaBase(pergunta);
  if (!resposta)
    return {
      texto: SEM_VERBETE,
      origem:
        'Limite declarado da versão gratuita: só a base curada da Lyra, sem modelo de IA.',
    };
  return {
    texto: resposta.texto,
    origem: `Verbete "${resposta.assunto}" da base curada da Lyra, escolhido pela busca por termos, sem modelo de IA.`,
  };
}

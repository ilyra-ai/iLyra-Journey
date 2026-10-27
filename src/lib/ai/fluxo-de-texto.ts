import { z } from 'zod';
import { eventosSse } from '@/lib/chat/eventos-sse';

const eventoSchema = z.object({
  error: z.unknown().optional(),
  type: z.string().optional(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({ content: z.string().nullable().optional() })
          .optional(),
        finish_reason: z.string().nullable().optional(),
      })
    )
    .optional(),
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  text: z.string().optional(),
                  thought: z.boolean().optional(),
                })
              )
              .optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      })
    )
    .optional(),
  delta: z
    .object({
      type: z.string().optional(),
      text: z.string().optional(),
      stop_reason: z.string().nullable().optional(),
    })
    .optional(),
});

/** Retém até a abertura de uma etiqueta partida, sem expor raciocínio. */
export function textoPublicoDoFluxo(texto: string) {
  let publico = texto
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '');
  for (let tamanho = 1; tamanho < '<think>'.length; tamanho += 1) {
    if (publico.toLowerCase().endsWith('<think>'.slice(0, tamanho))) {
      publico = publico.slice(0, -tamanho);
      break;
    }
  }
  return publico;
}

/** Só publica texto; pensamento, ferramentas e metadados nunca vão ao chat. */
export async function lerFluxoDoProvedor(
  corpo: ReadableStream<Uint8Array>,
  tipo: 'openai_compativel' | 'gemini' | 'anthropic',
  aoTexto: (texto: string) => void,
  sinal?: AbortSignal
) {
  let texto = '',
    motivo = '',
    terminou = false;
  for await (const dados of eventosSse(corpo, sinal)) {
    if (dados === '[DONE]') break;
    const evento = eventoSchema.parse(JSON.parse(dados));
    if (evento.error !== undefined || evento.type === 'error')
      throw new Error('O provedor interrompeu a resposta.');
    let trecho = '';
    if (tipo === 'openai_compativel') {
      trecho = evento.choices?.[0]?.delta?.content ?? '';
      if (evento.choices?.[0]?.finish_reason) {
        motivo = evento.choices[0].finish_reason;
        terminou = true;
      }
    } else if (tipo === 'gemini') {
      trecho = (evento.candidates?.[0]?.content?.parts ?? [])
        .filter((parte) => !parte.thought)
        .map((parte) => parte.text ?? '')
        .join('');
      if (evento.candidates?.[0]?.finishReason) {
        motivo = evento.candidates[0].finishReason;
        terminou = true;
      }
    } else {
      if (
        evento.type === 'content_block_delta' &&
        evento.delta?.type === 'text_delta'
      )
        trecho = evento.delta.text ?? '';
      if (evento.delta?.stop_reason) motivo = evento.delta.stop_reason;
      if (evento.type === 'message_stop') terminou = true;
    }
    if (trecho) {
      texto += trecho;
      aoTexto(textoPublicoDoFluxo(texto));
    }
  }
  if (!terminou)
    throw new Error('A transmissão da resposta terminou antes da conclusão.');
  if (tipo === 'openai_compativel')
    return {
      choices: [{ message: { content: texto }, finish_reason: motivo }],
    };
  if (tipo === 'gemini')
    return {
      candidates: [
        { content: { parts: [{ text: texto }] }, finishReason: motivo },
      ],
    };
  return { content: [{ type: 'text', text: texto }], stop_reason: motivo };
}

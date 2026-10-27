import { z } from 'zod';
import { mensagemDaFalha } from '@/lib/http/transporte';
import { partesDoChatSchema } from './partes';
import { eventosSse } from './eventos-sse';
import type { RespostaDoChat } from './tipos';

const resultadoSchema = z.object({
  response: z.string().min(1),
  conversationId: z.uuid().optional(),
  turnId: z.uuid().optional(),
  partes: partesDoChatSchema.optional(),
  imagem: z
    .object({
      turnoId: z.uuid(),
      tipo: z.enum(['solicitada', 'mapa']),
      estado: z.enum(['pendente', 'gerando', 'pronta', 'erro']),
      provedor: z.string().nullable(),
      modelo: z.string().nullable(),
      largura: z.number().nullable(),
      altura: z.number().nullable(),
      erro: z.string().nullable(),
    })
    .nullable()
    .optional(),
});
const eventoSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('data-texto'),
    data: z.object({ conteudo: z.string(), reiniciar: z.boolean() }),
  }),
  z.object({ type: z.literal('data-resultado'), data: resultadoSchema }),
  z.object({ type: z.literal('data-falha'), data: z.string() }),
  z.object({ type: z.literal('data-progresso'), data: z.string() }),
  z.object({ type: z.literal('error'), errorText: z.string() }),
]);

/** Legado JSON e SSE usam o mesmo contrato; só o resultado final é concluído. */
export async function enviarAoChat(
  pedido: Record<string, unknown>,
  sinal: AbortSignal,
  aoTexto: (texto: string) => void,
  buscar: typeof fetch = fetch
): Promise<RespostaDoChat> {
  let resposta: Response;
  try {
    resposta = await buscar('/api/functions/ask-ai-assistant', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      signal: sinal,
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pedido),
    });
  } catch (erro) {
    throw new Error(mensagemDaFalha(erro).message);
  }
  const tipo = resposta.headers.get('content-type') ?? '';
  if (!resposta.ok) {
    const corpo: unknown = tipo.includes('application/json')
      ? await resposta.json()
      : null;
    const erro = z
      .object({
        error: z.union([z.string(), z.object({ message: z.string() })]),
      })
      .safeParse(corpo);
    throw new Error(
      erro.success
        ? typeof erro.data.error === 'string'
          ? erro.data.error
          : erro.data.error.message
        : `O servidor recusou o pedido (HTTP ${resposta.status}). Tente novamente.`
    );
  }
  if (tipo.includes('application/json'))
    return resultadoSchema.parse(await resposta.json());
  if (!tipo.includes('text/event-stream') || !resposta.body)
    throw new Error(
      'A resposta do servidor veio em um formato inesperado. Tente novamente.'
    );
  let texto = '',
    resultado: RespostaDoChat | null = null;
  for await (const dados of eventosSse(resposta.body, sinal)) {
    if (dados === '[DONE]') break;
    const evento = eventoSchema.parse(JSON.parse(dados));
    if (evento.type === 'data-falha') throw new Error(evento.data);
    if (evento.type === 'error') throw new Error(evento.errorText);
    if (evento.type === 'data-texto') {
      texto = evento.data.reiniciar
        ? evento.data.conteudo
        : texto + evento.data.conteudo;
      aoTexto(texto);
    }
    if (evento.type === 'data-resultado') resultado = evento.data;
  }
  if (!resultado)
    throw new Error(
      'A conexão foi interrompida antes de concluir a resposta. Tente novamente.'
    );
  return resultado;
}

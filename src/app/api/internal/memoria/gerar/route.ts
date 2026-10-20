import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { extrairJson, gerarTextoDetalhado } from '@/lib/ai/cliente-de-ia';
import { montarCadeia } from '@/lib/ai/cadeia-de-modelos';
import { lerConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { preferenciasDaMemoria } from '@/lib/memoria/servico';

export const runtime = 'nodejs';

const entrada = z.object({
  mensagens: z
    .array(
      z.object({
        papel: z.enum(['system', 'user', 'assistant']),
        texto: z.string().max(100_000),
      })
    )
    .min(1)
    .max(30),
  esquema: z.record(z.string(), z.unknown()).nullable(),
  maximoDeTokens: z.number().int().min(1).max(8192),
});

export async function POST(request: Request) {
  try {
    const segredo = process.env.LYRA_MEMORIA_SEGREDO;
    const recebido = Buffer.from(request.headers.get('authorization') ?? '');
    const esperado = Buffer.from(`Bearer ${segredo ?? ''}`);
    if (
      !segredo ||
      segredo.length < 32 ||
      recebido.length !== esperado.length ||
      !timingSafeEqual(recebido, esperado)
    ) {
      throw new HttpError('Acesso recusado.', 401);
    }
    const usuario = z.uuid().parse(request.headers.get('x-lyra-usuario'));
    const preferencias = await preferenciasDaMemoria(usuario);
    if (!preferencias?.enabled || preferencias.purge_pending)
      throw new HttpError('A memória está desativada.', 409);
    const pedido = await lerJson(request, entrada);
    const cadeia = montarCadeia(await lerConfiguracaoDeIa());
    for (const elo of cadeia) {
      if (
        elo.tipo === 'lyra' ||
        (!elo.autor.local && !preferencias.allow_cloud)
      )
        continue;
      try {
        const gerado = await gerarTextoDetalhado(
          {
            ...elo.conexao,
            temperatura: 0,
            tempoMaximoSegundos: Math.min(
              150,
              Math.max(60, elo.conexao.tempoMaximoSegundos)
            ),
          },
          {
            sistema: pedido.mensagens
              .filter((mensagem) => mensagem.papel === 'system')
              .map((mensagem) => mensagem.texto)
              .join('\n\n'),
            usuario: pedido.mensagens
              .filter((mensagem) => mensagem.papel !== 'system')
              .map((mensagem) => `${mensagem.papel}:\n${mensagem.texto}`)
              .join('\n\n'),
            esquemaJson: pedido.esquema ?? undefined,
            nomeDoEsquema: 'memoria_lyra',
            json: true,
            maximoDeTokens: pedido.maximoDeTokens,
          }
        );
        if (gerado.cortado) continue;
        const dados = z
          .record(z.string(), z.unknown())
          .safeParse(extrairJson(gerado.texto));
        if (dados.success)
          return NextResponse.json(
            { resultado: dados.data },
            {
              headers: { 'Cache-Control': 'no-store' },
            }
          );
      } catch {
        // O próximo provedor autorizado recebe o mesmo pedido. Nunca há texto
        // de substituição fingindo uma extração estruturada bem-sucedida.
      }
    }
    throw new HttpError(
      'Nenhum modelo autorizado conseguiu extrair a memória. Confira um provedor com saída JSON nas configurações de IA.',
      503
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível processar a memória.');
  }
}

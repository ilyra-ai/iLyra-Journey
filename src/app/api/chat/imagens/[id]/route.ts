import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  gerarImagemDoTurno,
  lerImagemDoTurno,
  metadadosDaImagem,
} from '@/lib/chat/imagens';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};
type Contexto = { params: Promise<{ id: string }> };
export async function GET(request: Request, contexto: Contexto) {
  try {
    const session = await requireServerSession();
    const id = z.uuid().parse((await contexto.params).id);
    const linha = await lerImagemDoTurno(session.user.id, id);
    if (new URL(request.url).searchParams.get('arquivo') === '1') {
      if (linha.status !== 'pronta' || !linha.image_data)
        throw new HttpError('A imagem ainda não está pronta.', 409);
      return new Response(new Uint8Array(linha.image_data), {
        headers: {
          ...headers,
          'Content-Type': 'image/webp',
          'Content-Disposition': `inline; filename="lyra-${id}.webp"`,
        },
      });
    }
    return NextResponse.json({ imagem: metadadosDaImagem(linha) }, { headers });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível ler a imagem.');
  }
}
export async function POST(request: Request, contexto: Contexto) {
  try {
    const session = await requireServerSession();
    const id = z.uuid().parse((await contexto.params).id);
    const { privacyMode } = await lerJson(
      request,
      z.object({ privacyMode: z.boolean() })
    );
    return NextResponse.json(
      { imagem: await gerarImagemDoTurno(session, id, privacyMode) },
      { headers }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível gerar a imagem.');
  }
}

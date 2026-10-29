import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { envioSchema } from '@/lib/offline/esquema';
import { ConflitoOffline, sincronizarOperacao } from '@/lib/offline/servidor';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const s = await requireServerSession(),
      p = await lerJson(request, envioSchema);
    return NextResponse.json(
      await sincronizarOperacao(s, p.permissao, p.operacao),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    if (e instanceof ConflitoOffline)
      return NextResponse.json(
        { error: e.message, codigo: 'conflito', atual: e.atual },
        { status: 409, headers: { 'Cache-Control': 'private, no-store' } }
      );
    return respostaDeErro(
      e,
      'Não foi possível confirmar o envio. O rascunho permanece no dispositivo.'
    );
  }
}

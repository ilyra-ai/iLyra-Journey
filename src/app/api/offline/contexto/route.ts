import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { prepararContextoOffline } from '@/lib/offline/servidor';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const selecao = {
      registro: url.searchParams.get('registro') !== '0',
      reflexao: url.searchParams.get('reflexao') !== '0',
    };
    return NextResponse.json(
      await prepararContextoOffline(
        await requireServerSession(),
        new Date(),
        selecao
      ),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(
      e,
      'Não foi possível preparar seus registros offline.'
    );
  }
}

import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { inicioSchema } from '@/lib/foco/esquema';
import { lerCentralDeFoco, iniciarFoco } from '@/lib/foco/servico';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(r: Request) {
  try {
    return NextResponse.json(
      await lerCentralDeFoco(
        await requireServerSession(),
        new URL(r.url).searchParams.get('antes')
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar suas sessões.');
  }
}
export async function POST(r: Request) {
  try {
    return NextResponse.json(
      await iniciarFoco(
        await requireServerSession(),
        await lerJson(r, inicioSchema)
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível iniciar a sessão.');
  }
}

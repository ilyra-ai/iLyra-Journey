import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { inicioSchema } from '@/lib/meditacoes/esquema';
import {
  iniciarMeditacao,
  lerCentralDeMeditacoes,
} from '@/lib/meditacoes/servico';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  try {
    return NextResponse.json(
      await lerCentralDeMeditacoes(await requireServerSession()),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar suas práticas.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await requireServerSession();
    return NextResponse.json(
      await iniciarMeditacao(s, await lerJson(request, inicioSchema)),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível iniciar a prática.');
  }
}

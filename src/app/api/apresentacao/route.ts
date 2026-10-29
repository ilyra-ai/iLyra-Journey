import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { respostaDeErro, lerJson } from '@/lib/http/api';
import { pedidoSchema } from '@/lib/apresentacao/esquema';
import {
  lerApresentacao,
  alterarApresentacao,
} from '@/lib/apresentacao/servico';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  try {
    return NextResponse.json(
      await lerApresentacao(await requireServerSession()),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar sua apresentação.');
  }
}
export async function PUT(r: Request) {
  try {
    const s = await requireServerSession(),
      p = await lerJson(r, pedidoSchema);
    return NextResponse.json(await alterarApresentacao(s, p), { headers });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar seu progresso na ajuda.');
  }
}

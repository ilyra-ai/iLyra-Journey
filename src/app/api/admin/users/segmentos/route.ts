import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { criarSegmentoSchema } from '@/lib/admin/esquema-filtros';
import {
  listarSegmentos,
  salvarSegmento,
} from '@/lib/admin/segmentos-usuarios';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const s = await requireAdminSession();
    return NextResponse.json(await listarSegmentos(s.user.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar os segmentos.');
  }
}
export async function POST(r: Request) {
  try {
    const s = await requireAdminSession();
    const b = await lerJson(r, criarSegmentoSchema);
    const result = await salvarSegmento(s.user.id, b.id, b.name, b.query);
    return NextResponse.json(result, { status: result.repeated ? 200 : 201 });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o segmento.');
  }
}

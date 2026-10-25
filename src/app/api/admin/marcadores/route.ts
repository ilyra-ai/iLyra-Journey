import { NextResponse } from 'next/server';
import { criarMarcadorSchema } from '@/lib/admin/esquema-marcadores';
import {
  criarMarcador,
  listarMarcadores,
} from '@/lib/admin/marcadores-usuarios';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await listarMarcadores(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível carregar os marcadores.');
  }
}
export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await lerJson(request, criarMarcadorSchema);
    const result = await criarMarcador(
      session.user.id,
      body.id,
      body.name,
      body.color
    );
    return NextResponse.json(result, { status: result.repeated ? 200 : 201 });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível criar o marcador.');
  }
}

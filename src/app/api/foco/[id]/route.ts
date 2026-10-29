import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { acaoSchema, percepcaoSchema } from '@/lib/foco/esquema';
import { agirNoFoco, perceberFoco, excluirFoco } from '@/lib/foco/servico';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
type Contexto = { params: Promise<{ id: string }> };
async function id(c: Contexto) {
  return z.uuid().parse((await c.params).id);
}
export async function POST(r: Request, c: Contexto) {
  try {
    return NextResponse.json(
      await agirNoFoco(
        await requireServerSession(),
        await id(c),
        await lerJson(r, acaoSchema)
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar a sessão.');
  }
}
export async function PUT(r: Request, c: Contexto) {
  try {
    return NextResponse.json(
      await perceberFoco(
        await requireServerSession(),
        await id(c),
        await lerJson(r, percepcaoSchema)
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar sua percepção.');
  }
}
export async function DELETE(r: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      v = await lerJson(
        r,
        z.object({ versao: z.number().int().positive() }).strict()
      );
    await excluirFoco(s, await id(c), v.versao);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível remover a sessão.');
  }
}

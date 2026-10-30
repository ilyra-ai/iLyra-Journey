import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { versaoSchema } from '@/lib/alimentacao/esquema';
import { lerFoto, removerFoto, trocarFoto } from '@/lib/alimentacao/servico';
import {
  fotoDoFormulario,
  jsonDoFormulario,
  lerFormulario,
} from '@/lib/alimentacao/formulario';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function GET(_r: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id),
      f = await lerFoto(s, id);
    return new NextResponse(new Uint8Array(f.dados), {
      headers: {
        'Content-Type': f.tipo,
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível abrir a foto.');
  }
}
export async function PUT(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id),
      f = await lerFormulario(request),
      p = versaoSchema.parse(jsonDoFormulario(f, 'dados')),
      foto = await fotoDoFormulario(f);
    if (!foto) throw new HttpError('Escolha uma foto.', 400);
    return NextResponse.json(await trocarFoto(s, id, p.versao, foto), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar a foto.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    return NextResponse.json(await removerFoto(s, id, p.versao), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível remover a foto.');
  }
}

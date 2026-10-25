import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import {
  editarSegmentoSchema,
  excluirSegmentoSchema,
} from '@/lib/admin/esquema-filtros';
import {
  salvarSegmento,
  excluirSegmento,
} from '@/lib/admin/segmentos-usuarios';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ segmentId: string }> };
export async function PATCH(r: Request, c: Contexto) {
  try {
    const s = await requireAdminSession();
    const id = z.uuid().parse((await c.params).segmentId);
    const b = await lerJson(r, editarSegmentoSchema);
    return NextResponse.json(
      await salvarSegmento(s.user.id, id, b.name, b.query, b.version)
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar o segmento.');
  }
}
export async function DELETE(r: Request, c: Contexto) {
  try {
    const s = await requireAdminSession();
    const id = z.uuid().parse((await c.params).segmentId);
    const b = await lerJson(r, excluirSegmentoSchema);
    return NextResponse.json(await excluirSegmento(s.user.id, id, b.version));
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o segmento.');
  }
}

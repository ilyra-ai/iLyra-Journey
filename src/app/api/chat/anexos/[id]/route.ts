import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { lerAnexo, excluirAnexo } from '@/lib/anexos/servico';
export const runtime = 'nodejs';
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};
type C = { params: Promise<{ id: string }> };
export async function GET(r: Request, c: C) {
  try {
    const a = await lerAnexo(await requireServerSession(), (await c.params).id);
    const baixar = new URL(r.url).searchParams.get('baixar') === '1';
    return new Response(new Uint8Array(a.file_data), {
      headers: {
        ...headers,
        'Content-Type': a.mime_type,
        'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="anexo${a.mime_type === 'text/plain' ? '.txt' : '.png'}"; filename*=UTF-8''${encodeURIComponent(a.file_name).replace(/'/g, '%27')}`,
      },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível abrir o anexo.');
  }
}
export async function DELETE(_r: Request, c: C) {
  try {
    await excluirAnexo(await requireServerSession(), (await c.params).id);
    return NextResponse.json({ excluido: true }, { headers });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o anexo.');
  }
}

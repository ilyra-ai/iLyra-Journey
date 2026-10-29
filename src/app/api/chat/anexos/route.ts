import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  autorizarAnexos,
  gravarAnexo,
  listarAnexos,
} from '@/lib/anexos/servico';
import { MAX_BYTES_ANEXO } from '@/lib/anexos/tipos';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(r: Request) {
  try {
    return NextResponse.json(
      await listarAnexos(
        await requireServerSession(),
        z.uuid().parse(new URL(r.url).searchParams.get('conversa'))
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível consultar os anexos.');
  }
}
export async function POST(r: Request) {
  try {
    const s = await requireServerSession();
    await autorizarAnexos(s);
    const p = new URL(r.url).searchParams;
    const conversa = z.uuid().parse(p.get('conversa')),
      id = z.uuid().parse(p.get('id')),
      nomeCodificado = z.string().max(1440).parse(r.headers.get('x-lyra-nome'));
    let nome: string;
    try {
      nome = decodeURIComponent(nomeCodificado);
    } catch {
      throw new HttpError('Nome de arquivo inválido.', 400);
    }
    z.string().min(1).max(120).parse(nome);
    if (Number(r.headers.get('content-length')) > MAX_BYTES_ANEXO)
      throw new HttpError('O arquivo excede 3 MiB.', 413);
    const leitor = r.body?.getReader();
    if (!leitor) throw new HttpError('Arquivo obrigatório.', 400);
    const partes: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        total += value.length;
        if (total > MAX_BYTES_ANEXO) {
          await leitor.cancel();
          throw new HttpError('O arquivo excede 3 MiB.', 413);
        }
        partes.push(value);
      }
    } finally {
      leitor.releaseLock();
    }
    return NextResponse.json(
      await gravarAnexo(
        s,
        conversa,
        id,
        nome,
        r.headers.get('content-type') ?? '',
        Buffer.concat(partes)
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o anexo.');
  }
}

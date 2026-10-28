import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { selecaoSchema } from '@/lib/relatorio-pessoal/esquema';
import {
  montarRelatorio,
  opcoesDoRelatorio,
} from '@/lib/relatorio-pessoal/servico';
export const runtime = 'nodejs';
export async function GET() {
  try {
    return NextResponse.json(
      await opcoesDoRelatorio(await requireServerSession()),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(
      e,
      'Não foi possível carregar as opções do relatório.'
    );
  }
}
export async function POST(request: Request) {
  try {
    return NextResponse.json(
      await montarRelatorio(
        await requireServerSession(),
        await lerJson(request, selecaoSchema)
      ),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível preparar seu relatório.');
  }
}

import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import {
  alteracaoSchema,
  alterarInterruptorDeAgendamentos,
  lerInterruptorDeAgendamentos,
} from '@/lib/plataforma/interruptores';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await lerInterruptorDeAgendamentos(), {
      headers,
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar a configuração.');
  }
}
export async function PUT(request: Request) {
  try {
    const s = await requireAdminSession();
    return NextResponse.json(
      await alterarInterruptorDeAgendamentos(
        s,
        await lerJson(request, alteracaoSchema)
      ),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível alterar a configuração.');
  }
}

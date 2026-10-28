import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { downloadSchema } from '@/lib/relatorio-pessoal/esquema';
import { montarRelatorio } from '@/lib/relatorio-pessoal/servico';
import { gerarPdfPessoal } from '@/lib/relatorio-pessoal/pdf';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const s = await requireServerSession(),
      p = await lerJson(request, downloadSchema),
      r = await montarRelatorio(s, p.selecao);
    if (r.revisao !== p.revisao)
      throw new HttpError(
        'Os dados ou as permissões mudaram. Gere e confira uma nova prévia antes de baixar.',
        409
      );
    const buffer = await gerarPdfPessoal(r);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lyra-pessoal-${r.selecao.inicio}-${r.selecao.fim}.pdf"`,
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível gerar seu PDF.');
  }
}

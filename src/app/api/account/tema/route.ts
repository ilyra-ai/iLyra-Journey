import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { executeStatement } from '@/lib/mysql/pool';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const esquemaDoTema = z.object({ tema: z.enum(['light', 'dark']) }).strict();

/**
 * Tema preferido da conta (migração 086). Gravado quando a pessoa escolhe o
 * tema na landing e entra pela primeira vez, e quando troca o tema no app;
 * a área logada abre nesse tema em qualquer aparelho. Só altera o próprio
 * perfil da sessão.
 */
export async function PUT(request: Request) {
  try {
    const session = await requireServerSession();
    const { tema } = await lerJson(request, esquemaDoTema);
    await executeStatement(
      'UPDATE profiles SET tema_preferido = ? WHERE id = ?',
      [tema, session.user.id]
    );
    return NextResponse.json({ tema });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível salvar o tema agora.');
  }
}

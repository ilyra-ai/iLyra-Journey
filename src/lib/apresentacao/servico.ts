import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { queryRows, executeStatement, withTransaction } from '@/lib/mysql/pool';
import { contaTemRecurso } from '@/lib/plans/service';
import type { z } from 'zod';
import { pedidoSchema, type Passo, type EstadoApresentacao } from './esquema';
function exigir(s: AppSession) {
  if (!s.user.onboarding_completed)
    throw new HttpError(
      'Conclua o cadastro antes de abrir esta ajuda opcional.',
      403
    );
}
async function passosDisponiveis(s: AppSession): Promise<Passo[]> {
  const [registro, resultado, painel, conversa] = await Promise.all(
    ['daily_checkin', 'ai_scores', 'dashboard_access', 'ai_chat_messages'].map(
      (k) =>
        contaTemRecurso(
          s.user.id,
          k as
            | 'daily_checkin'
            | 'ai_scores'
            | 'dashboard_access'
            | 'ai_chat_messages'
        )
    )
  );
  return [
    ...(registro ? ['registro' as const] : []),
    ...(resultado && painel ? ['resultado' as const] : []),
    ...(conversa ? ['conversa' as const] : []),
    'perfil',
  ];
}
interface Linha {
  status: EstadoApresentacao['estado'];
  step_key: Passo;
  version: number;
}
export async function lerApresentacao(
  s: AppSession
): Promise<EstadoApresentacao> {
  exigir(s);
  const [linhas, passos] = await Promise.all([
    queryRows<Linha>(
      'SELECT status,step_key,version FROM app_intro_progress WHERE user_id=?',
      [s.user.id]
    ),
    passosDisponiveis(s),
  ]);
  const r = linhas[0];
  return {
    estado: r?.status ?? 'novo',
    passo: r && passos.includes(r.step_key) ? r.step_key : passos[0],
    versao: r?.version ?? 0,
    passos,
  };
}
export async function alterarApresentacao(
  s: AppSession,
  p: z.infer<typeof pedidoSchema>
) {
  exigir(s);
  const passos = await passosDisponiveis(s);
  if (!passos.includes(p.passo))
    throw new HttpError(
      'Este passo não está disponível no plano atual. Atualize a ajuda.',
      403
    );
  if (p.acao === 'concluir' && p.passo !== passos.at(-1))
    throw new HttpError(
      'Use o último passo para concluir ou escolha pular a apresentação.',
      400
    );
  await withTransaction(async (c) => {
    await queryRows(
      'SELECT id FROM users WHERE id=? FOR UPDATE',
      [s.user.id],
      c
    );
    const [r] = await queryRows<Linha>(
      'SELECT status,step_key,version FROM app_intro_progress WHERE user_id=?',
      [s.user.id],
      c
    );
    if ((r?.version ?? 0) !== p.versao)
      throw new HttpError(
        'A ajuda mudou em outra aba. Atualize antes de continuar.',
        409
      );
    const estado =
      p.acao === 'dispensar'
        ? 'dispensada'
        : p.acao === 'concluir'
          ? 'concluida'
          : 'em_andamento';
    await executeStatement(
      'INSERT INTO app_intro_progress(user_id,status,step_key,version) VALUES(?,?,?,1) AS novo ON DUPLICATE KEY UPDATE status=novo.status,step_key=novo.step_key,version=app_intro_progress.version+1,updated_at=UTC_TIMESTAMP(3)',
      [s.user.id, estado, p.passo],
      c
    );
  });
  return lerApresentacao(s);
}

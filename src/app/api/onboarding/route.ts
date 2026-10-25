import { exigirDentroDoLimite } from '@/lib/security/rate-limit';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import {
  conclusaoOnboardingSchema,
  idadeDoNascimento,
} from '@/lib/perfil/conclusao-onboarding';
import { cidadePorId } from '@/lib/geo/cidades';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { withTransaction } from '@/lib/mysql/pool';
import { travarAdministracao } from '@/lib/auth/bloqueio';
import { registrarConsentimentos } from '@/lib/lgpd/conta';
import { HttpError } from '@/lib/http-error';
import { lerJson, respostaDeErro } from '@/lib/http/api';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    const b = await lerJson(request, conclusaoOnboardingSchema);
    const nascimento = cidadePorId(b.birth_city_id);
    const moradia = b.residence_city_id
      ? cidadePorId(b.residence_city_id)
      : null;
    if (!nascimento || (b.residence_city_id && !moradia))
      throw new HttpError('Escolha uma cidade válida na lista.', 404);
    await exigirDentroDoLimite(
      { escopo: 'concluir-onboarding', limite: 20, janelaSegundos: 3600 },
      session.user.id
    );
    await withTransaction(async (db) => {
      await travarAdministracao(db);
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT u.blocked_at,p.id FROM users u JOIN profiles p ON p.id=u.id WHERE u.id=? FOR UPDATE',
        [session.user.id]
      );
      if (!rows.length) throw new HttpError('Perfil não encontrado.', 404);
      if (rows[0].blocked_at) throw new HttpError('Conta sem acesso.', 401);
      await registrarConsentimentos({
        userId: session.user.id,
        tipos: ['health_data_processing'],
        userAgent: request.headers.get('user-agent'),
        connection: db,
      });
      const fields = [
        'first_name=?',
        'last_name=?',
        'birth_date=?',
        'age=?',
        'birth_location=?',
        'birth_city_id=?',
        'birth_latitude=?',
        'birth_longitude=?',
        'birth_timezone=?',
        'onboarding_completed=TRUE',
        'updated_at=CURRENT_TIMESTAMP',
      ];
      const values: Array<string | number | null> = [
        b.first_name,
        b.last_name,
        b.birth_date,
        idadeDoNascimento(b.birth_date),
        nascimento.rotulo,
        nascimento.id,
        nascimento.latitude,
        nascimento.longitude,
        nascimento.fuso,
      ];
      if (b.nickname !== undefined) {
        fields.push('nickname=?');
        values.push(b.nickname?.trim() || null);
      }
      if (b.birth_time !== undefined) {
        fields.push('birth_time=?');
        values.push(b.birth_time);
      }
      if (b.gender !== undefined) {
        fields.push('gender=?');
        values.push(b.gender);
      }
      if (b.activity_level !== undefined) {
        fields.push('activity_level=?');
        values.push(b.activity_level);
      }
      if (b.residence_city_id !== undefined) {
        fields.push(
          'residence_location=?',
          'residence_city_id=?',
          'residence_latitude=?',
          'residence_longitude=?',
          'residence_timezone=?'
        );
        values.push(
          moradia?.rotulo ?? null,
          moradia?.id ?? null,
          moradia?.latitude ?? null,
          moradia?.longitude ?? null,
          moradia?.fuso ?? null
        );
      }
      await db.execute(`UPDATE profiles SET ${fields.join(',')} WHERE id=?`, [
        ...values,
        session.user.id,
      ]);
    });
    return NextResponse.json(
      { completed: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível concluir sua configuração.');
  }
}

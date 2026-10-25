import { NextResponse } from 'next/server';
import { queryRows } from '@/lib/mysql/pool';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { listarMarcadores } from '@/lib/admin/marcadores-usuarios';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await requireAdminSession();
    const [roles, plans, markers] = await Promise.all([
      queryRows<{ role: string }>(
        'SELECT DISTINCT role FROM profiles ORDER BY role'
      ),
      queryRows<{ key: string; name: string }>(
        'SELECT plan_key AS `key`,name FROM subscription_plans ORDER BY display_order'
      ),
      listarMarcadores(),
    ]);
    return NextResponse.json(
      { roles: roles.map((r) => r.role), plans, markers: markers.markers },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return respostaDeErro(
      e,
      'Não foi possível carregar as opções dos filtros.'
    );
  }
}

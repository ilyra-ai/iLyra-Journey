import { NextResponse } from 'next/server';

import { provedoresDisponiveis } from '@/lib/auth/social/configuracao';
import { respostaDeErro } from '@/lib/http/api';

export const runtime = 'nodejs';

/**
 * Botões de login social da tela de login (tarefa 235): só os provedores
 * ligados pelo administrador e com as credenciais completas.
 */
export async function GET() {
  try {
    return NextResponse.json(
      { provedores: await provedoresDisponiveis() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao ler o login social.');
  }
}

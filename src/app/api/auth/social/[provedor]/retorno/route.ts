import { cookies } from 'next/headers';

import { setSessionCookie, signSessionToken } from '@/lib/auth/session';
import {
  credenciaisDoProvedor,
  type ProvedorSocial,
} from '@/lib/auth/social/configuracao';
import {
  entrarComIdentidade,
  ErroDoLoginSocial,
} from '@/lib/auth/social/contas';
import {
  COOKIE_DO_ESTADO,
  conferirEstado,
  conferirIdToken,
  nomeDaApple,
  trocarCodigo,
} from '@/lib/auth/social/oauth';
import {
  enderecoDeRetorno,
  origemDoApp,
  provedorDaRota,
  voltarComErro,
  voltarComSessao,
} from '@/lib/auth/social/rotas';
import { registrarErroInterno } from '@/lib/observability/log-seguro';
import { contarEtapaSemBloquear } from '@/lib/funil/registro';
import {
  LIMITE_LOGIN_POR_IP,
  exigirDentroDoLimite,
  ipDoCliente,
} from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/**
 * Retorno do login com Google (GET) ou Apple (POST form_post). Confere o
 * estado assinado, troca o código, confere o id_token pela chave oficial,
 * entra ou cria a conta e emite a mesma sessão do login por senha.
 */
async function concluir(
  request: Request,
  provedorDaUrl: string,
  campos: {
    code: string | null;
    state: string | null;
    error: string | null;
    user: string | null;
  }
) {
  const origem = origemDoApp(request);
  const provedor = provedorDaRota(provedorDaUrl);
  if (!provedor) return voltarComErro(origem, 'indisponivel');
  const armazenados = await cookies();
  const cookie = armazenados.get(COOKIE_DO_ESTADO)?.value;
  // O estado vale uma vez só.
  armazenados.set(COOKIE_DO_ESTADO, '', {
    path: `/api/auth/social/${provedor}`,
    expires: new Date(0),
  });
  if (campos.error) return voltarComErro(origem, 'cancelado');
  try {
    await exigirDentroDoLimite(LIMITE_LOGIN_POR_IP, ipDoCliente(request));
    const estado = await conferirEstado(cookie, provedor, campos.state);
    const credenciais = await credenciaisDoProvedor(provedor);
    if (!credenciais) return voltarComErro(origem, 'indisponivel');
    if (!campos.code) return voltarComErro(origem, 'recusado');
    const idToken = await trocarCodigo(
      credenciais,
      campos.code,
      estado,
      enderecoDeRetorno(provedor, origem)
    );
    const identidade = await conferirIdToken(idToken, {
      provedor,
      clientId: credenciais.clientId,
      nonce: estado.nonce,
    });
    const conta = await entrarComIdentidade(identidade, {
      aceite: estado.aceite,
      nome:
        (provedor === 'apple' && nomeDaApple(campos.user)) || identidade.nome,
      userAgent: request.headers.get('user-agent'),
    });
    const token = await signSessionToken({
      sub: conta.id,
      email: conta.email,
      role: conta.role,
      sessionVersion: conta.session_version,
    });
    await setSessionCookie(token);
    await contarEtapaSemBloquear(
      conta.nova ? 'cadastro_concluido' : 'login_concluido',
      provedor
    );
    return voltarComSessao(origem, estado.retorno);
  } catch (erro) {
    if (erro instanceof ErroDoLoginSocial)
      return voltarComErro(origem, erro.codigo);
    const status = (erro as { statusCode?: number }).statusCode;
    if (status === 400) return voltarComErro(origem, 'expirou');
    if (status === 401 || status === 502 || status === 429)
      return voltarComErro(origem, 'recusado');
    registrarErroInterno(`login-social:${provedor as ProvedorSocial}`, erro);
    return voltarComErro(origem, 'recusado');
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provedor: string }> }
) {
  const consulta = new URL(request.url).searchParams;
  return concluir(request, (await params).provedor, {
    code: consulta.get('code'),
    state: consulta.get('state'),
    error: consulta.get('error'),
    user: null,
  });
}

/** Apple: resposta por form_post (application/x-www-form-urlencoded). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provedor: string }> }
) {
  const formulario = await request.formData().catch(() => null);
  const campo = (nome: string) => {
    const valor = formulario?.get(nome);
    return typeof valor === 'string' ? valor : null;
  };
  return concluir(request, (await params).provedor, {
    code: campo('code'),
    state: campo('state'),
    error: campo('error'),
    user: campo('user'),
  });
}

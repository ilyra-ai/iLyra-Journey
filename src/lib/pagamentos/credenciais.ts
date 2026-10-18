import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { cifrar, decifrar } from '@/lib/security/cifra';

/**
 * Credenciais dos meios de pagamento (tarefa 69), editadas em Admin →
 * Pagamentos: Stripe, Mercado Pago e PayPal. Tabela
 * `payment_provider_credentials` (migração 028). Os segredos ficam cifrados
 * (AES-256-GCM, chave derivada do AUTH_SECRET) e só são decifrados no
 * servidor; a tela recebe apenas os 4 últimos caracteres.
 *
 * A Stripe é o meio de cobrança das assinaturas: as credenciais salvas aqui
 * valem mais que as variáveis STRIPE_* do .env.local, que continuam como
 * alternativa. Mercado Pago e PayPal ficam guardados e verificados contra a
 * API de cada um; o checkout por eles ainda não existe no app.
 */

export const PROVEDORES_DE_PAGAMENTO = [
  'stripe',
  'mercado_pago',
  'paypal',
] as const;
export type ProvedorDePagamento = (typeof PROVEDORES_DE_PAGAMENTO)[number];
export type AmbienteDePagamento = 'test' | 'live';

const FINALIDADE_DO_SEGREDO = 'payment-provider-secret';
const FINALIDADE_DO_WEBHOOK = 'payment-provider-webhook-secret';
const TEMPO_DO_TESTE_MS = 15_000;

/** Nomes e rótulos de cada campo, como cada provedor os chama. */
export const CATALOGO_DE_PAGAMENTO: Record<
  ProvedorDePagamento,
  {
    nome: string;
    rotuloPublico: string;
    rotuloSegredo: string;
    rotuloWebhook: string;
    /** O app já cobra assinaturas por este provedor. */
    checkoutIntegrado: boolean;
    ondeEncontrar: string;
  }
> = {
  stripe: {
    nome: 'Stripe',
    rotuloPublico: 'Chave publicável (pk_...)',
    rotuloSegredo: 'Chave secreta ou restrita (sk_... ou rk_...)',
    rotuloWebhook: 'Segredo de assinatura do webhook (whsec_...)',
    checkoutIntegrado: true,
    ondeEncontrar: 'https://dashboard.stripe.com/apikeys',
  },
  mercado_pago: {
    nome: 'Mercado Pago',
    rotuloPublico: 'Public key',
    rotuloSegredo: 'Access token',
    rotuloWebhook: 'Assinatura secreta das notificações (webhooks)',
    checkoutIntegrado: false,
    ondeEncontrar: 'https://www.mercadopago.com.br/developers/panel/app',
  },
  paypal: {
    nome: 'PayPal',
    rotuloPublico: 'Client ID',
    rotuloSegredo: 'Client secret',
    rotuloWebhook: 'ID do webhook',
    checkoutIntegrado: false,
    ondeEncontrar: 'https://developer.paypal.com/dashboard/applications',
  },
};

interface LinhaDaCredencial {
  provider: ProvedorDePagamento;
  environment: AmbienteDePagamento;
  enabled: number;
  public_key: string | null;
  secret_ciphertext: string | null;
  secret_last4: string | null;
  webhook_secret_ciphertext: string | null;
  webhook_secret_last4: string | null;
  last_check_at: string | Date | null;
  last_check_ok: number | null;
  last_check_message: string | null;
  updated_at: string | Date;
}

/** Credenciais decifradas: só para uso no servidor. */
export interface CredenciaisDoProvedor {
  provedor: ProvedorDePagamento;
  ambiente: AmbienteDePagamento;
  ativo: boolean;
  chavePublica: string | null;
  segredo: string | null;
  segredoDoWebhook: string | null;
}

/** O que a tela de administração recebe: nunca os segredos. */
export interface CredencialPublica {
  provedor: ProvedorDePagamento;
  nome: string;
  rotuloPublico: string;
  rotuloSegredo: string;
  rotuloWebhook: string;
  ondeEncontrar: string;
  checkoutIntegrado: boolean;
  configurado: boolean;
  ambiente: AmbienteDePagamento;
  ativo: boolean;
  chavePublica: string | null;
  temSegredo: boolean;
  finalDoSegredo: string | null;
  /** Há segredo salvo, mas o AUTH_SECRET mudou e ele não pode ser lido. */
  segredoIlegivel: boolean;
  temSegredoDoWebhook: boolean;
  finalDoSegredoDoWebhook: string | null;
  webhookIlegivel: boolean;
  ultimoTeste: { em: string; ok: boolean; mensagem: string } | null;
  atualizadoEm: string | null;
  /** Só Stripe: há chaves STRIPE_* no .env.local usadas na falta das daqui. */
  temAlternativaNoAmbiente: boolean;
}

export interface EntradaDaCredencial {
  ambiente: AmbienteDePagamento;
  ativo: boolean;
  chavePublica: string | null;
  /** `undefined` mantém o segredo salvo; `null` apaga. */
  segredo?: string | null;
  segredoDoWebhook?: string | null;
}

function iso(valor: string | Date) {
  return (valor instanceof Date ? valor : new Date(`${valor}Z`)).toISOString();
}

function finalDe(texto: string) {
  return texto.slice(-4);
}

async function lerLinha(
  provedor: ProvedorDePagamento
): Promise<LinhaDaCredencial | null> {
  const [linha] = await queryRows<LinhaDaCredencial>(
    `SELECT provider, environment, enabled, public_key, secret_ciphertext,
            secret_last4, webhook_secret_ciphertext, webhook_secret_last4,
            last_check_at, last_check_ok, last_check_message, updated_at
       FROM payment_provider_credentials
      WHERE provider = ?`,
    [provedor]
  );
  return linha ?? null;
}

function temStripeNoAmbiente() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function paraPublico(
  provedor: ProvedorDePagamento,
  linha: LinhaDaCredencial | null
): CredencialPublica {
  const catalogo = CATALOGO_DE_PAGAMENTO[provedor];
  const segredoIlegivel = Boolean(
    linha?.secret_ciphertext &&
    decifrar(linha.secret_ciphertext, FINALIDADE_DO_SEGREDO) === null
  );
  const webhookIlegivel = Boolean(
    linha?.webhook_secret_ciphertext &&
    decifrar(linha.webhook_secret_ciphertext, FINALIDADE_DO_WEBHOOK) === null
  );
  return {
    provedor,
    nome: catalogo.nome,
    rotuloPublico: catalogo.rotuloPublico,
    rotuloSegredo: catalogo.rotuloSegredo,
    rotuloWebhook: catalogo.rotuloWebhook,
    ondeEncontrar: catalogo.ondeEncontrar,
    checkoutIntegrado: catalogo.checkoutIntegrado,
    configurado: Boolean(linha?.secret_ciphertext) && !segredoIlegivel,
    ambiente: linha?.environment ?? 'test',
    ativo: linha ? linha.enabled === 1 : false,
    chavePublica: linha?.public_key ?? null,
    temSegredo: Boolean(linha?.secret_ciphertext),
    finalDoSegredo: linha?.secret_last4 ?? null,
    segredoIlegivel,
    temSegredoDoWebhook: Boolean(linha?.webhook_secret_ciphertext),
    finalDoSegredoDoWebhook: linha?.webhook_secret_last4 ?? null,
    webhookIlegivel,
    ultimoTeste:
      linha?.last_check_at && linha.last_check_ok !== null
        ? {
            em: iso(linha.last_check_at),
            ok: linha.last_check_ok === 1,
            mensagem: linha.last_check_message ?? '',
          }
        : null,
    atualizadoEm: linha ? iso(linha.updated_at) : null,
    temAlternativaNoAmbiente: provedor === 'stripe' && temStripeNoAmbiente(),
  };
}

export async function listarCredenciaisPublicas(): Promise<
  CredencialPublica[]
> {
  const linhas = await queryRows<LinhaDaCredencial>(
    `SELECT provider, environment, enabled, public_key, secret_ciphertext,
            secret_last4, webhook_secret_ciphertext, webhook_secret_last4,
            last_check_at, last_check_ok, last_check_message, updated_at
       FROM payment_provider_credentials`
  );
  const porProvedor = new Map(linhas.map((l) => [l.provider, l]));
  return PROVEDORES_DE_PAGAMENTO.map((provedor) =>
    paraPublico(provedor, porProvedor.get(provedor) ?? null)
  );
}

export async function lerCredenciais(
  provedor: ProvedorDePagamento
): Promise<CredenciaisDoProvedor | null> {
  const linha = await lerLinha(provedor);
  if (!linha) return null;
  return {
    provedor,
    ambiente: linha.environment,
    ativo: linha.enabled === 1,
    chavePublica: linha.public_key,
    segredo: linha.secret_ciphertext
      ? decifrar(linha.secret_ciphertext, FINALIDADE_DO_SEGREDO)
      : null,
    segredoDoWebhook: linha.webhook_secret_ciphertext
      ? decifrar(linha.webhook_secret_ciphertext, FINALIDADE_DO_WEBHOOK)
      : null,
  };
}

/** O ambiente que o próprio formato da chave da Stripe declara. */
export function ambienteDaChaveStripe(
  chave: string
): AmbienteDePagamento | null {
  const encontrado = /^(?:sk|rk|pk)_(test|live)_/.exec(chave);
  if (!encontrado) return null;
  return encontrado[1] === 'live' ? 'live' : 'test';
}

export async function salvarCredenciais(
  provedor: ProvedorDePagamento,
  entrada: EntradaDaCredencial,
  usuarioId: string
): Promise<CredencialPublica> {
  if (provedor === 'stripe') {
    for (const chave of [entrada.segredo, entrada.chavePublica]) {
      if (!chave) continue;
      const ambiente = ambienteDaChaveStripe(chave);
      if (ambiente && ambiente !== entrada.ambiente) {
        throw new HttpError(
          `A chave informada é de ${ambiente === 'live' ? 'produção' : 'teste'}, mas o ambiente escolhido é ${entrada.ambiente === 'live' ? 'produção' : 'teste'}.`,
          400
        );
      }
    }
  }

  const atual = await lerLinha(provedor);
  const segredo =
    entrada.segredo === undefined
      ? {
          cifrado: atual?.secret_ciphertext ?? null,
          final: atual?.secret_last4 ?? null,
        }
      : entrada.segredo === null
        ? { cifrado: null, final: null }
        : {
            cifrado: cifrar(entrada.segredo, FINALIDADE_DO_SEGREDO),
            final: finalDe(entrada.segredo),
          };
  const webhook =
    entrada.segredoDoWebhook === undefined
      ? {
          cifrado: atual?.webhook_secret_ciphertext ?? null,
          final: atual?.webhook_secret_last4 ?? null,
        }
      : entrada.segredoDoWebhook === null
        ? { cifrado: null, final: null }
        : {
            cifrado: cifrar(entrada.segredoDoWebhook, FINALIDADE_DO_WEBHOOK),
            final: finalDe(entrada.segredoDoWebhook),
          };
  // Trocar a chave, o segredo ou o ambiente invalida o teste anterior.
  const mudouCredencial =
    entrada.segredo !== undefined ||
    entrada.chavePublica !== (atual?.public_key ?? null) ||
    entrada.ambiente !== atual?.environment;

  await executeStatement(
    `INSERT INTO payment_provider_credentials (
       provider, environment, enabled, public_key, secret_ciphertext,
       secret_last4, webhook_secret_ciphertext, webhook_secret_last4,
       last_check_at, last_check_ok, last_check_message, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       environment = VALUES(environment),
       enabled = VALUES(enabled),
       public_key = VALUES(public_key),
       secret_ciphertext = VALUES(secret_ciphertext),
       secret_last4 = VALUES(secret_last4),
       webhook_secret_ciphertext = VALUES(webhook_secret_ciphertext),
       webhook_secret_last4 = VALUES(webhook_secret_last4),
       last_check_at = VALUES(last_check_at),
       last_check_ok = VALUES(last_check_ok),
       last_check_message = VALUES(last_check_message),
       updated_by = VALUES(updated_by)`,
    [
      provedor,
      entrada.ambiente,
      entrada.ativo,
      entrada.chavePublica,
      segredo.cifrado,
      segredo.final,
      webhook.cifrado,
      webhook.final,
      mudouCredencial ? null : (atual?.last_check_at ?? null),
      mudouCredencial ? null : (atual?.last_check_ok ?? null),
      mudouCredencial ? null : (atual?.last_check_message ?? null),
      usuarioId,
    ]
  );
  return paraPublico(provedor, await lerLinha(provedor));
}

export async function removerCredenciais(provedor: ProvedorDePagamento) {
  await executeStatement(
    'DELETE FROM payment_provider_credentials WHERE provider = ?',
    [provedor]
  );
}

export interface ResultadoDoTeste {
  ok: boolean;
  mensagem: string;
}

async function chamar(
  url: string,
  init: RequestInit
): Promise<{ status: number; corpo: Record<string, unknown> | null }> {
  const resposta = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TEMPO_DO_TESTE_MS),
    cache: 'no-store',
  });
  const corpo = (await resposta.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { status: resposta.status, corpo };
}

function texto(valor: unknown) {
  return typeof valor === 'string' && valor.length > 0 ? valor : null;
}

/** Chama a API do provedor com as credenciais informadas, sem gravar nada. */
export async function verificarNoProvedor(
  credenciais: Pick<
    CredenciaisDoProvedor,
    'provedor' | 'ambiente' | 'chavePublica' | 'segredo'
  >
): Promise<ResultadoDoTeste> {
  const { provedor, ambiente, chavePublica, segredo } = credenciais;
  if (!segredo) {
    return {
      ok: false,
      mensagem: `Informe ${CATALOGO_DE_PAGAMENTO[provedor].rotuloSegredo.toLowerCase()} antes de testar.`,
    };
  }
  try {
    if (provedor === 'stripe') {
      const { status, corpo } = await chamar(
        'https://api.stripe.com/v1/account',
        {
          headers: { Authorization: `Bearer ${segredo}` },
        }
      );
      if (status === 200 && corpo) {
        const modo =
          ambienteDaChaveStripe(segredo) === 'live' ? 'produção' : 'teste';
        return {
          ok: true,
          mensagem: `Conta ${texto(corpo.id) ?? ''} (${texto(corpo.country) ?? '—'}, moeda ${(texto(corpo.default_currency) ?? '—').toUpperCase()}) em modo de ${modo}.`,
        };
      }
      const erro = (corpo?.error ?? null) as Record<string, unknown> | null;
      return {
        ok: false,
        mensagem:
          status === 401
            ? 'A Stripe recusou a chave (inválida ou revogada).'
            : status === 403
              ? 'A chave é restrita e não tem permissão para ler a conta.'
              : `A Stripe respondeu ${status}: ${texto(erro?.message) ?? 'erro desconhecido'}.`,
      };
    }

    if (provedor === 'mercado_pago') {
      const { status, corpo } = await chamar(
        'https://api.mercadopago.com/users/me',
        { headers: { Authorization: `Bearer ${segredo}` } }
      );
      if (status === 200 && corpo) {
        return {
          ok: true,
          mensagem: `Conta ${texto(corpo.nickname) ?? String(corpo.id ?? '')} (${texto(corpo.site_id) ?? '—'}).`,
        };
      }
      return {
        ok: false,
        mensagem:
          status === 401 || status === 403
            ? 'O Mercado Pago recusou o access token (inválido, expirado ou sem permissão).'
            : `O Mercado Pago respondeu ${status}: ${texto(corpo?.message) ?? 'erro desconhecido'}.`,
      };
    }

    if (!chavePublica) {
      return { ok: false, mensagem: 'Informe o Client ID antes de testar.' };
    }
    const base =
      ambiente === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
    const { status, corpo } = await chamar(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${chavePublica}:${segredo}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (status === 200 && corpo && texto(corpo.access_token)) {
      return {
        ok: true,
        mensagem: `Aplicativo ${texto(corpo.app_id) ?? ''} autenticado no ambiente ${ambiente === 'live' ? 'de produção' : 'sandbox'}.`,
      };
    }
    return {
      ok: false,
      mensagem:
        status === 401
          ? `O PayPal recusou o Client ID e o Client secret no ambiente ${ambiente === 'live' ? 'de produção' : 'sandbox'}.`
          : `O PayPal respondeu ${status}: ${texto(corpo?.error_description) ?? 'erro desconhecido'}.`,
    };
  } catch (erro) {
    const tempo =
      erro instanceof Error &&
      (erro.name === 'TimeoutError' || erro.name === 'AbortError');
    return {
      ok: false,
      mensagem: tempo
        ? `O ${CATALOGO_DE_PAGAMENTO[provedor].nome} não respondeu em ${TEMPO_DO_TESTE_MS / 1000} s.`
        : `Não foi possível falar com o ${CATALOGO_DE_PAGAMENTO[provedor].nome}: ${erro instanceof Error ? erro.message : 'falha de rede'}.`,
    };
  }
}

/** "Testar conexão" com as credenciais salvas; grava o resultado. */
export async function testarCredenciaisSalvas(
  provedor: ProvedorDePagamento
): Promise<{ resultado: ResultadoDoTeste; credencial: CredencialPublica }> {
  const credenciais = await lerCredenciais(provedor);
  if (!credenciais) {
    throw new HttpError(
      `Salve as credenciais do ${CATALOGO_DE_PAGAMENTO[provedor].nome} antes de testar.`,
      400
    );
  }
  const resultado = await verificarNoProvedor(credenciais);
  await executeStatement(
    `UPDATE payment_provider_credentials
        SET last_check_at = UTC_TIMESTAMP(), last_check_ok = ?, last_check_message = ?
      WHERE provider = ?`,
    [resultado.ok, resultado.mensagem.slice(0, 500), provedor]
  );
  return {
    resultado,
    credencial: paraPublico(provedor, await lerLinha(provedor)),
  };
}

/**
 * Chaves da Stripe em uso: as do painel (ativas e legíveis) valem mais que
 * as do .env.local.
 */
export async function credenciaisDoStripe(): Promise<{
  chaveSecreta: string | null;
  segredoDoWebhook: string | null;
  origem: 'painel' | 'ambiente';
}> {
  const salvas = await lerCredenciais('stripe');
  if (salvas?.ativo && salvas.segredo) {
    return {
      chaveSecreta: salvas.segredo,
      segredoDoWebhook:
        salvas.segredoDoWebhook ??
        (process.env.STRIPE_WEBHOOK_SECRET?.trim() || null),
      origem: 'painel',
    };
  }
  return {
    chaveSecreta: process.env.STRIPE_SECRET_KEY?.trim() || null,
    segredoDoWebhook: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    origem: 'ambiente',
  };
}

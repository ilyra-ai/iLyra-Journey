import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { cifrar, decifrar } from '@/lib/security/cifra';

import {
  ambienteDaChaveStripe,
  concordancia,
  type PrecosInformados,
} from './formatos';
import {
  chamarProvedor,
  estourouOPrazo,
  TEMPO_DA_CHAMADA_MS,
  textoDe,
} from './http';
import {
  conferirPrecosNaStripe,
  listarPrecosDaStripe,
  type PrecoDoPlanoNaStripe,
  salvarPrecosDaStripe,
} from './precos-stripe';

/**
 * Credenciais dos meios de pagamento (tarefas 69 e 71), editadas em Admin →
 * Pagamentos: Stripe, Mercado Pago e PayPal.
 *
 * Cada provedor tem dois conjuntos de chaves, um de teste e um de produção
 * (`payment_provider_credentials`, uma linha por provedor e ambiente), e uma
 * configuração (`payment_provider_settings`) com o ambiente em uso e se o
 * provedor está ativo. Os segredos ficam cifrados (AES-256-GCM, chave
 * derivada do AUTH_SECRET) e só são decifrados no servidor; a tela recebe
 * apenas os 4 últimos caracteres.
 *
 * A Stripe é o meio de cobrança das assinaturas: as chaves do ambiente em uso
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
export const AMBIENTES_DE_PAGAMENTO = ['test', 'live'] as const;
export type AmbienteDePagamento = (typeof AMBIENTES_DE_PAGAMENTO)[number];

const FINALIDADE_DO_SEGREDO = 'payment-provider-secret';
const FINALIDADE_DO_WEBHOOK = 'payment-provider-webhook-secret';

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

export function nomeDoAmbiente(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
) {
  if (ambiente === 'live') return 'produção';
  return provedor === 'paypal' ? 'sandbox' : 'teste';
}

interface LinhaDaCredencial {
  provider: ProvedorDePagamento;
  environment: AmbienteDePagamento;
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

interface LinhaDaConfiguracao {
  provider: ProvedorDePagamento;
  active_environment: AmbienteDePagamento;
  enabled: number;
  updated_at: string | Date;
}

/** Credenciais decifradas de um ambiente: só para uso no servidor. */
export interface CredenciaisDoProvedor {
  provedor: ProvedorDePagamento;
  ambiente: AmbienteDePagamento;
  chavePublica: string | null;
  segredo: string | null;
  segredoDoWebhook: string | null;
}

/** Um conjunto de chaves (teste ou produção) como a tela o recebe. */
export interface ConjuntoPublico {
  ambiente: AmbienteDePagamento;
  /** Há segredo salvo e legível. */
  configurado: boolean;
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
  /** O que falta para este conjunto poder ficar em uso (vazio: pode). */
  pendencias: string[];
  /** Só Stripe: produto e preços de cada plano pago neste ambiente. */
  precos: PrecoDoPlanoNaStripe[];
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
  /** Ambiente cujas chaves o app usa. */
  ambienteEmUso: AmbienteDePagamento;
  ativo: boolean;
  /** Ativo e com as chaves do ambiente em uso salvas e legíveis. */
  emUso: boolean;
  ambientes: Record<AmbienteDePagamento, ConjuntoPublico>;
  configuracaoAtualizadaEm: string | null;
  /** Só Stripe: há STRIPE_SECRET_KEY no .env.local usada na falta das daqui. */
  temAlternativaNoAmbiente: boolean;
  /** Ambiente da chave do .env.local (pelo prefixo sk_test_/sk_live_). */
  ambienteDaAlternativa: AmbienteDePagamento | null;
}

export interface EntradaDaCredencial {
  chavePublica: string | null;
  /** `undefined` mantém o segredo salvo; `null` apaga. */
  segredo?: string | null;
  segredoDoWebhook?: string | null;
  /** Só Stripe: produto e preços dos planos neste ambiente. */
  precos?: PrecosInformados[];
}

export interface EntradaDaConfiguracao {
  ambienteEmUso: AmbienteDePagamento;
  ativo: boolean;
}

function iso(valor: string | Date) {
  return (valor instanceof Date ? valor : new Date(`${valor}Z`)).toISOString();
}

function finalDe(texto: string) {
  return texto.slice(-4);
}

const COLUNAS_DA_CREDENCIAL = `provider, environment, public_key, secret_ciphertext,
  secret_last4, webhook_secret_ciphertext, webhook_secret_last4,
  last_check_at, last_check_ok, last_check_message, updated_at`;

async function lerLinha(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
): Promise<LinhaDaCredencial | null> {
  const [linha] = await queryRows<LinhaDaCredencial>(
    `SELECT ${COLUNAS_DA_CREDENCIAL}
       FROM payment_provider_credentials
      WHERE provider = ? AND environment = ?`,
    [provedor, ambiente]
  );
  return linha ?? null;
}

async function lerConfiguracao(
  provedor: ProvedorDePagamento
): Promise<LinhaDaConfiguracao | null> {
  const [linha] = await queryRows<LinhaDaConfiguracao>(
    `SELECT provider, active_environment, enabled, updated_at
       FROM payment_provider_settings
      WHERE provider = ?`,
    [provedor]
  );
  return linha ?? null;
}

function chaveStripeDoAmbiente() {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

function decifrarSegredo(linha: LinhaDaCredencial | null) {
  return linha?.secret_ciphertext
    ? decifrar(linha.secret_ciphertext, FINALIDADE_DO_SEGREDO)
    : null;
}

function decifrarWebhook(linha: LinhaDaCredencial | null) {
  return linha?.webhook_secret_ciphertext
    ? decifrar(linha.webhook_secret_ciphertext, FINALIDADE_DO_WEBHOOK)
    : null;
}

/**
 * O que impede um conjunto de ficar em uso. Produção exige um "Testar
 * conexão" aprovado depois da última troca de chave: é dinheiro de verdade.
 */
function pendenciasDoConjunto(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento,
  linha: LinhaDaCredencial | null
): string[] {
  const catalogo = CATALOGO_DE_PAGAMENTO[provedor];
  const pendencias: string[] = [];
  if (!linha?.secret_ciphertext) {
    pendencias.push(`Salve o campo "${catalogo.rotuloSegredo}".`);
  } else if (decifrarSegredo(linha) === null) {
    pendencias.push(
      `Preencha de novo o campo "${catalogo.rotuloSegredo}" (o valor salvo não pode mais ser lido).`
    );
  }
  if (provedor === 'stripe') {
    if (!linha?.webhook_secret_ciphertext) {
      pendencias.push(
        'Salve o segredo do webhook (sem ele os pagamentos não liberam os planos).'
      );
    } else if (decifrarWebhook(linha) === null) {
      pendencias.push('Informe de novo o segredo do webhook.');
    }
  }
  if (provedor === 'paypal' && !linha?.public_key) {
    pendencias.push('Salve o Client ID.');
  }
  if (
    ambiente === 'live' &&
    pendencias.length === 0 &&
    linha?.last_check_ok !== 1
  ) {
    pendencias.push(
      linha?.last_check_ok === 0
        ? 'O último "Testar conexão" falhou: corrija as chaves e teste de novo.'
        : 'Use "Testar conexão" e confirme que o provedor aceitou as chaves.'
    );
  }
  return pendencias;
}

async function conjuntoPublico(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento,
  linha: LinhaDaCredencial | null
): Promise<ConjuntoPublico> {
  const segredoIlegivel = Boolean(
    linha?.secret_ciphertext && decifrarSegredo(linha) === null
  );
  const webhookIlegivel = Boolean(
    linha?.webhook_secret_ciphertext && decifrarWebhook(linha) === null
  );
  return {
    ambiente,
    configurado: Boolean(linha?.secret_ciphertext) && !segredoIlegivel,
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
    pendencias: pendenciasDoConjunto(provedor, ambiente, linha),
    precos: provedor === 'stripe' ? await listarPrecosDaStripe(ambiente) : [],
  };
}

async function montarPublico(
  provedor: ProvedorDePagamento
): Promise<CredencialPublica> {
  const catalogo = CATALOGO_DE_PAGAMENTO[provedor];
  const [configuracao, teste, producao] = await Promise.all([
    lerConfiguracao(provedor),
    lerLinha(provedor, 'test'),
    lerLinha(provedor, 'live'),
  ]);
  const ambientes = {
    test: await conjuntoPublico(provedor, 'test', teste),
    live: await conjuntoPublico(provedor, 'live', producao),
  };
  const ambienteEmUso = configuracao?.active_environment ?? 'test';
  const ativo = configuracao ? configuracao.enabled === 1 : false;
  const chaveDoEnv = provedor === 'stripe' ? chaveStripeDoAmbiente() : null;
  return {
    provedor,
    nome: catalogo.nome,
    rotuloPublico: catalogo.rotuloPublico,
    rotuloSegredo: catalogo.rotuloSegredo,
    rotuloWebhook: catalogo.rotuloWebhook,
    ondeEncontrar: catalogo.ondeEncontrar,
    checkoutIntegrado: catalogo.checkoutIntegrado,
    ambienteEmUso,
    ativo,
    emUso: ativo && ambientes[ambienteEmUso].configurado,
    ambientes,
    configuracaoAtualizadaEm: configuracao
      ? iso(configuracao.updated_at)
      : null,
    temAlternativaNoAmbiente: Boolean(chaveDoEnv),
    ambienteDaAlternativa: chaveDoEnv
      ? (ambienteDaChaveStripe(chaveDoEnv) ?? 'test')
      : null,
  };
}

export async function listarCredenciaisPublicas(): Promise<
  CredencialPublica[]
> {
  return Promise.all(PROVEDORES_DE_PAGAMENTO.map(montarPublico));
}

export async function credencialPublica(provedor: ProvedorDePagamento) {
  return montarPublico(provedor);
}

export async function lerCredenciais(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
): Promise<CredenciaisDoProvedor | null> {
  const linha = await lerLinha(provedor, ambiente);
  if (!linha) return null;
  return {
    provedor,
    ambiente,
    chavePublica: linha.public_key,
    segredo: decifrarSegredo(linha),
    segredoDoWebhook: decifrarWebhook(linha),
  };
}

/**
 * Grava o conjunto de chaves de um ambiente (e, na Stripe, os preços dos
 * planos nesse ambiente). Não muda o ambiente em uso: isso é
 * `salvarConfiguracao`. Na primeira gravação do provedor, ele nasce ativo no
 * ambiente de teste.
 */
export async function salvarCredenciais(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento,
  entrada: EntradaDaCredencial,
  usuarioId: string
): Promise<CredencialPublica> {
  if (provedor === 'stripe') {
    for (const chave of [entrada.segredo, entrada.chavePublica]) {
      if (!chave) continue;
      const declarado = ambienteDaChaveStripe(chave);
      if (declarado && declarado !== ambiente) {
        throw new HttpError(
          `A chave informada é de ${declarado === 'live' ? 'produção' : 'teste'}, mas foi enviada nas chaves de ${ambiente === 'live' ? 'produção' : 'teste'}.`,
          400
        );
      }
    }
  } else if (entrada.precos && entrada.precos.length > 0) {
    throw new HttpError(
      'Os preços dos planos só existem para a Stripe, que cobra as assinaturas.',
      400
    );
  }

  const atual = await lerLinha(provedor, ambiente);
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
  // Trocar a chave pública, o segredo ou os preços invalida o teste anterior
  // (em produção, isso volta a exigir um teste aprovado).
  const mudouCredencial =
    entrada.segredo !== undefined ||
    entrada.chavePublica !== (atual?.public_key ?? null) ||
    (entrada.precos?.length ?? 0) > 0;

  if (provedor === 'stripe' && entrada.precos) {
    await salvarPrecosDaStripe(ambiente, entrada.precos, usuarioId);
  }

  await executeStatement(
    `INSERT INTO payment_provider_credentials (
       provider, environment, public_key, secret_ciphertext, secret_last4,
       webhook_secret_ciphertext, webhook_secret_last4, last_check_at,
       last_check_ok, last_check_message, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE
       public_key = novo.public_key,
       secret_ciphertext = novo.secret_ciphertext,
       secret_last4 = novo.secret_last4,
       webhook_secret_ciphertext = novo.webhook_secret_ciphertext,
       webhook_secret_last4 = novo.webhook_secret_last4,
       last_check_at = novo.last_check_at,
       last_check_ok = novo.last_check_ok,
       last_check_message = novo.last_check_message,
       updated_by = novo.updated_by`,
    [
      provedor,
      ambiente,
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
  await executeStatement(
    `INSERT IGNORE INTO payment_provider_settings
       (provider, active_environment, enabled, updated_by)
     VALUES (?, 'test', 1, ?)`,
    [provedor, usuarioId]
  );
  return montarPublico(provedor);
}

/**
 * Escolhe o ambiente em uso e liga ou desliga o provedor. Ligar exige que o
 * conjunto do ambiente escolhido esteja pronto (ver `pendenciasDoConjunto`).
 */
export async function salvarConfiguracao(
  provedor: ProvedorDePagamento,
  entrada: EntradaDaConfiguracao,
  usuarioId: string
): Promise<CredencialPublica> {
  if (entrada.ativo) {
    const pendencias = pendenciasDoConjunto(
      provedor,
      entrada.ambienteEmUso,
      await lerLinha(provedor, entrada.ambienteEmUso)
    );
    if (pendencias.length > 0) {
      throw new HttpError(
        `As chaves de ${nomeDoAmbiente(provedor, entrada.ambienteEmUso)} ${concordancia(provedor).do} ${CATALOGO_DE_PAGAMENTO[provedor].nome} ainda não podem ser usadas: ${pendencias.join(' ')}`,
        409
      );
    }
  }
  await executeStatement(
    `INSERT INTO payment_provider_settings
       (provider, active_environment, enabled, updated_by)
     VALUES (?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE
       active_environment = novo.active_environment,
       enabled = novo.enabled,
       updated_by = novo.updated_by`,
    [provedor, entrada.ambienteEmUso, entrada.ativo, usuarioId]
  );
  return montarPublico(provedor);
}

/**
 * Apaga o conjunto de chaves de um ambiente (na Stripe, também os preços dos
 * planos nesse ambiente). O conjunto em uso por um provedor ativo não pode
 * ser apagado: antes, troque o ambiente ou desative o provedor.
 */
export async function removerCredenciais(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
): Promise<CredencialPublica> {
  const configuracao = await lerConfiguracao(provedor);
  if (
    configuracao?.enabled === 1 &&
    configuracao.active_environment === ambiente
  ) {
    throw new HttpError(
      `As chaves de ${nomeDoAmbiente(provedor, ambiente)} estão em uso. Troque o ambiente em uso ou desative ${concordancia(provedor).o} ${CATALOGO_DE_PAGAMENTO[provedor].nome} antes de removê-las.`,
      409
    );
  }
  await executeStatement(
    'DELETE FROM payment_provider_credentials WHERE provider = ? AND environment = ?',
    [provedor, ambiente]
  );
  if (provedor === 'stripe') {
    await executeStatement(
      'DELETE FROM stripe_plan_prices WHERE environment = ?',
      [ambiente]
    );
    await executeStatement(
      'DELETE FROM stripe_contribution_prices WHERE environment = ?',
      [ambiente]
    );
  }
  return montarPublico(provedor);
}

export interface ResultadoDoTeste {
  ok: boolean;
  mensagem: string;
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
      mensagem: `Preencha o campo "${CATALOGO_DE_PAGAMENTO[provedor].rotuloSegredo}" antes de testar.`,
    };
  }
  try {
    if (provedor === 'stripe') {
      const { status, corpo } = await chamarProvedor(
        'https://api.stripe.com/v1/account',
        { headers: { Authorization: `Bearer ${segredo}` } }
      );
      if (status === 200 && corpo) {
        const conta = `Conta ${textoDe(corpo.id) ?? ''} (${textoDe(corpo.country) ?? '—'}, moeda ${(textoDe(corpo.default_currency) ?? '—').toUpperCase()}) em modo de ${ambiente === 'live' ? 'produção' : 'teste'}.`;
        const precos = await conferirPrecosNaStripe(segredo, ambiente);
        if (precos.problemas.length > 0) {
          return {
            ok: false,
            mensagem: `${conta} Preços dos planos: ${precos.problemas.join(' ')}`,
          };
        }
        return {
          ok: true,
          mensagem:
            precos.conferidos > 0
              ? `${conta} ${precos.conferidos} ${precos.conferidos === 1 ? 'preço de plano conferido' : 'preços de planos conferidos'} (valor, moeda e ciclo iguais ao catálogo).`
              : `${conta} Nenhum preço de plano cadastrado neste ambiente: o checkout fica indisponível até cadastrá-los.`,
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
              : `A Stripe respondeu ${status}: ${textoDe(erro?.message) ?? 'erro desconhecido'}.`,
      };
    }

    if (provedor === 'mercado_pago') {
      const { status, corpo } = await chamarProvedor(
        'https://api.mercadopago.com/users/me',
        { headers: { Authorization: `Bearer ${segredo}` } }
      );
      if (status === 200 && corpo) {
        return {
          ok: true,
          mensagem: `Conta ${textoDe(corpo.nickname) ?? String(corpo.id ?? '')} (${textoDe(corpo.site_id) ?? '—'}).`,
        };
      }
      return {
        ok: false,
        mensagem:
          status === 401 || status === 403
            ? 'O Mercado Pago recusou o access token (inválido, expirado ou sem permissão).'
            : `O Mercado Pago respondeu ${status}: ${textoDe(corpo?.message) ?? 'erro desconhecido'}.`,
      };
    }

    if (!chavePublica) {
      return { ok: false, mensagem: 'Informe o Client ID antes de testar.' };
    }
    const base =
      ambiente === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
    const { status, corpo } = await chamarProvedor(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${chavePublica}:${segredo}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (status === 200 && corpo && textoDe(corpo.access_token)) {
      return {
        ok: true,
        mensagem: `Aplicativo ${textoDe(corpo.app_id) ?? ''} autenticado no ambiente ${ambiente === 'live' ? 'de produção' : 'sandbox'}.`,
      };
    }
    return {
      ok: false,
      mensagem:
        status === 401
          ? `O PayPal recusou o Client ID e o Client secret no ambiente ${ambiente === 'live' ? 'de produção' : 'sandbox'}.`
          : `O PayPal respondeu ${status}: ${textoDe(corpo?.error_description) ?? 'erro desconhecido'}.`,
    };
  } catch (erro) {
    return {
      ok: false,
      mensagem: estourouOPrazo(erro)
        ? `${concordancia(provedor).o.toUpperCase()} ${CATALOGO_DE_PAGAMENTO[provedor].nome} não respondeu em ${TEMPO_DA_CHAMADA_MS / 1000} s.`
        : `Não foi possível falar com ${concordancia(provedor).o} ${CATALOGO_DE_PAGAMENTO[provedor].nome}: ${erro instanceof Error ? erro.message : 'falha de rede'}.`,
    };
  }
}

/** "Testar conexão" com as chaves salvas de um ambiente; grava o resultado. */
export async function testarCredenciaisSalvas(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento
): Promise<{ resultado: ResultadoDoTeste; credencial: CredencialPublica }> {
  const credenciais = await lerCredenciais(provedor, ambiente);
  if (!credenciais) {
    throw new HttpError(
      `Salve as chaves de ${nomeDoAmbiente(provedor, ambiente)} ${concordancia(provedor).do} ${CATALOGO_DE_PAGAMENTO[provedor].nome} antes de testar.`,
      400
    );
  }
  const resultado = await verificarNoProvedor(credenciais);
  await executeStatement(
    `UPDATE payment_provider_credentials
        SET last_check_at = UTC_TIMESTAMP(), last_check_ok = ?, last_check_message = ?
      WHERE provider = ? AND environment = ?`,
    [resultado.ok, resultado.mensagem.slice(0, 500), provedor, ambiente]
  );
  return { resultado, credencial: await montarPublico(provedor) };
}

/**
 * Chaves da Stripe em uso. Com a Stripe ativa no painel e as chaves do
 * ambiente em uso legíveis, valem elas (o segredo do webhook também vem do
 * mesmo conjunto, nunca de outro ambiente). Sem isso, valem as STRIPE_* do
 * .env.local, e o ambiente é o que o prefixo da chave declara.
 */
export async function credenciaisDoStripe(): Promise<{
  chaveSecreta: string | null;
  segredoDoWebhook: string | null;
  origem: 'painel' | 'ambiente';
  ambiente: AmbienteDePagamento;
}> {
  const configuracao = await lerConfiguracao('stripe');
  if (configuracao?.enabled === 1) {
    const salvas = await lerCredenciais(
      'stripe',
      configuracao.active_environment
    );
    if (salvas?.segredo) {
      return {
        chaveSecreta: salvas.segredo,
        segredoDoWebhook: salvas.segredoDoWebhook,
        origem: 'painel',
        ambiente: configuracao.active_environment,
      };
    }
  }
  const chave = chaveStripeDoAmbiente();
  return {
    chaveSecreta: chave,
    segredoDoWebhook: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    origem: 'ambiente',
    ambiente: (chave ? ambienteDaChaveStripe(chave) : null) ?? 'test',
  };
}

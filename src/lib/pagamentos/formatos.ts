/**
 * Formato de cada credencial como o provedor a emite. Sem dependências do
 * servidor: a tela de Admin → Pagamentos confere antes de enviar e a rota
 * confere de novo. Confere só o formato; a validade real vem do "Testar
 * conexão", contra a API do provedor.
 */

export type ProvedorComFormato = 'stripe' | 'mercado_pago' | 'paypal';

interface Formato {
  regex: RegExp;
  mensagem: string;
}

export const FORMATOS_DE_PAGAMENTO: Record<
  ProvedorComFormato,
  { publico: Formato; segredo: Formato; webhook: Formato }
> = {
  stripe: {
    publico: {
      regex: /^pk_(test|live)_[A-Za-z0-9]{10,}$/,
      mensagem: 'A chave publicável da Stripe começa com pk_test_ ou pk_live_.',
    },
    segredo: {
      regex: /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/,
      mensagem:
        'A chave secreta da Stripe começa com sk_test_, sk_live_, rk_test_ ou rk_live_.',
    },
    webhook: {
      regex: /^whsec_[A-Za-z0-9+/=]{10,}$/,
      mensagem: 'O segredo do webhook da Stripe começa com whsec_.',
    },
  },
  mercado_pago: {
    publico: {
      regex: /^(TEST|APP_USR)-[A-Za-z0-9-]{10,}$/,
      mensagem: 'A public key do Mercado Pago começa com TEST- ou APP_USR-.',
    },
    segredo: {
      regex: /^(TEST|APP_USR)-[A-Za-z0-9-]{20,}$/,
      mensagem: 'O access token do Mercado Pago começa com TEST- ou APP_USR-.',
    },
    webhook: {
      regex: /^[A-Za-z0-9]{16,128}$/,
      mensagem:
        'A assinatura secreta das notificações do Mercado Pago tem só letras e números.',
    },
  },
  paypal: {
    publico: {
      regex: /^[A-Za-z0-9_-]{20,128}$/,
      mensagem: 'O Client ID do PayPal tem só letras, números, _ e -.',
    },
    segredo: {
      regex: /^[A-Za-z0-9_-]{20,128}$/,
      mensagem: 'O Client secret do PayPal tem só letras, números, _ e -.',
    },
    webhook: {
      regex: /^[A-Z0-9]{10,40}$/,
      mensagem: 'O ID do webhook do PayPal tem só letras maiúsculas e números.',
    },
  },
};

export type AmbienteComFormato = 'test' | 'live';

/**
 * Concordância com o nome do provedor nas mensagens: "a Stripe" (a empresa
 * usa o feminino em português), "o Mercado Pago", "o PayPal".
 */
export function concordancia(provedor: ProvedorComFormato) {
  return provedor === 'stripe'
    ? { o: 'a', do: 'da', pelo: 'pela', desativado: 'desativada' }
    : { o: 'o', do: 'do', pelo: 'pelo', desativado: 'desativado' };
}

/** O ambiente que o próprio formato da chave da Stripe declara. */
export function ambienteDaChaveStripe(
  chave: string
): AmbienteComFormato | null {
  const encontrado = /^(?:sk|rk|pk)_(test|live)_/.exec(chave.trim());
  if (!encontrado) return null;
  return encontrado[1] === 'live' ? 'live' : 'test';
}

function nomeDoAmbiente(ambiente: AmbienteComFormato) {
  return ambiente === 'live' ? 'produção' : 'teste';
}

/**
 * Mensagens dos campos preenchidos fora do formato (vazio não é erro). Com o
 * `ambiente` do conjunto, a Stripe também recusa chave do outro ambiente
 * (o prefixo sk_test_/sk_live_ diz de qual conta ela é).
 */
export function errosDeFormato(
  provedor: ProvedorComFormato,
  campos: {
    chavePublica?: string | null;
    segredo?: string | null;
    segredoDoWebhook?: string | null;
  },
  ambiente?: AmbienteComFormato
): string[] {
  const formato = FORMATOS_DE_PAGAMENTO[provedor];
  const erros: string[] = [];
  const conferir = (valor: string | null | undefined, regra: Formato) => {
    const limpo = valor?.trim();
    if (limpo && !regra.regex.test(limpo)) erros.push(regra.mensagem);
  };
  conferir(campos.chavePublica, formato.publico);
  conferir(campos.segredo, formato.segredo);
  conferir(campos.segredoDoWebhook, formato.webhook);
  if (provedor === 'stripe' && ambiente) {
    for (const chave of [campos.segredo, campos.chavePublica]) {
      const declarado = chave ? ambienteDaChaveStripe(chave) : null;
      if (declarado && declarado !== ambiente) {
        erros.push(
          `A chave ${chave?.trim().slice(0, 8)}… é de ${nomeDoAmbiente(declarado)}, mas está nas chaves de ${nomeDoAmbiente(ambiente)}.`
        );
      }
    }
  }
  return erros;
}

export const FORMATO_DO_PRODUTO_STRIPE = /^prod_[A-Za-z0-9]{6,}$/;
export const FORMATO_DO_PRECO_STRIPE = /^price_[A-Za-z0-9]{6,}$/;

/** Produto e preços de um plano na Stripe, como digitados na tela. */
export interface PrecosInformados {
  plano: string;
  produto?: string | null;
  mensal?: string | null;
  anual?: string | null;
  /** Preço mensal recorrente de cada valor de colaboração (tarefa 226). */
  opcoes?: Array<{ opcao: string; mensal?: string | null }>;
}

/**
 * Formato dos ids de produto (prod_) e de preço (price_) e preço repetido
 * entre planos ou ciclos (o webhook descobre o plano pelo preço pago).
 */
export function errosDosPrecosDaStripe(
  precos: PrecosInformados[],
  nomeDoPlano: (plano: string) => string = (plano) => plano,
  nomeDaOpcao: (plano: string, opcao: string) => string = (_plano, opcao) =>
    opcao
): string[] {
  const erros: string[] = [];
  const vistos = new Map<string, string>();
  for (const preco of precos) {
    const nome = nomeDoPlano(preco.plano);
    const produto = preco.produto?.trim();
    if (produto && !FORMATO_DO_PRODUTO_STRIPE.test(produto)) {
      erros.push(`${nome}: o produto da Stripe começa com prod_.`);
    }
    for (const [ciclo, valor] of [
      ['mensal', preco.mensal],
      ['anual', preco.anual],
      ...(preco.opcoes ?? []).map(
        (opcao) =>
          [nomeDaOpcao(preco.plano, opcao.opcao), opcao.mensal] as const
      ),
    ] as const) {
      const limpo = valor?.trim();
      if (!limpo) continue;
      if (!FORMATO_DO_PRECO_STRIPE.test(limpo)) {
        erros.push(`${nome} (${ciclo}): o preço da Stripe começa com price_.`);
        continue;
      }
      const anterior = vistos.get(limpo);
      if (anterior) {
        erros.push(
          `${nome} (${ciclo}): o mesmo preço já está em ${anterior}; cada plano, ciclo e valor precisa do seu.`
        );
      } else {
        vistos.set(limpo, `${nome} (${ciclo})`);
      }
    }
  }
  return erros;
}

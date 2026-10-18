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

/** Mensagens dos campos preenchidos fora do formato (vazio não é erro). */
export function errosDeFormato(
  provedor: ProvedorComFormato,
  campos: {
    chavePublica?: string | null;
    segredo?: string | null;
    segredoDoWebhook?: string | null;
  }
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
  return erros;
}

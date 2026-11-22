import { z } from 'zod';

/**
 * Etapas do funil da descoberta (tarefa 170). Lista fechada: só estes nomes
 * e estes detalhes chegam ao banco, sempre como contagem anônima por dia.
 * Nenhuma etapa leva data de nascimento, nome, e-mail, conversa ou
 * qualquer identificador de pessoa ou aparelho.
 *
 * `cliente` são as etapas que o navegador pode informar pela rota pública;
 * as demais só o servidor conta, no ponto em que a etapa de fato aconteceu
 * (por exemplo, o login concluído é contado depois da sessão criada).
 * Pagamentos confirmados, assinaturas, cancelamentos e retenção não são
 * etapas: o painel lê esses números das tabelas de cobrança e de uso.
 */

const METODOS_DE_LOGIN = ['email', 'google', 'apple'] as const;
export type MetodoDeLogin = (typeof METODOS_DE_LOGIN)[number];

/** Chave comercial de uma opção de contribuição (tarefa 160). */
const CHAVE_DE_CONTRIBUICAO = /^colaboracao_\d{1,6}$/;

/** Mapas pagos da landing (os cartões que abrem o convite da tarefa 161). */
const MAPAS_PAGOS = [
  'landing-feature-1',
  'landing-feature-2',
  'landing-feature-3',
] as const;

interface DefinicaoDaEtapa {
  rotulo: string;
  /** Quem pode contar: o navegador (rota pública) ou só o servidor. */
  cliente: boolean;
  detalheValido: (detalhe: string) => boolean;
}

const sem = (detalhe: string) => detalhe === '';
const entre =
  (valores: readonly string[]) =>
  (detalhe: string): boolean =>
    valores.includes(detalhe);

export const ETAPAS_DO_FUNIL = {
  visita_landing: {
    rotulo: 'Visitas à página inicial',
    cliente: true,
    detalheValido: sem,
  },
  iniciou_descoberta: {
    rotulo: 'Abriram o Experimente Grátis',
    cliente: true,
    detalheValido: entre(['inicio', 'mapa', 'link']),
  },
  nascimento_validado: {
    rotulo: 'Data de nascimento aceita',
    cliente: false,
    detalheValido: sem,
  },
  leitura_entregue: {
    rotulo: 'Leituras gratuitas entregues',
    cliente: false,
    detalheValido: entre(['signo', 'incerto']),
  },
  cartao_compartilhado: {
    rotulo: 'Cartões compartilhados ou baixados',
    cliente: true,
    detalheValido: entre(['compartilhar', 'baixar']),
  },
  conteudo_premium_clicado: {
    rotulo: 'Cliques em mapas da assinatura',
    cliente: true,
    detalheValido: entre(MAPAS_PAGOS),
  },
  modal_visto: {
    rotulo: 'Convites da assinatura exibidos',
    cliente: true,
    detalheValido: sem,
  },
  modal_fechado: {
    rotulo: 'Convites fechados sem escolher',
    cliente: true,
    detalheValido: sem,
  },
  contribuicao_escolhida: {
    rotulo: 'Contribuições escolhidas no convite',
    cliente: true,
    detalheValido: (d) => CHAVE_DE_CONTRIBUICAO.test(d),
  },
  login_iniciado: {
    rotulo: 'Logins iniciados',
    cliente: true,
    // O navegador só informa o e-mail; Google e Apple o servidor conta ao
    // redirecionar para o provedor.
    detalheValido: entre(METODOS_DE_LOGIN),
  },
  login_concluido: {
    rotulo: 'Logins concluídos',
    cliente: false,
    detalheValido: entre(METODOS_DE_LOGIN),
  },
  cadastro_concluido: {
    rotulo: 'Cadastros concluídos',
    cliente: false,
    detalheValido: entre(METODOS_DE_LOGIN),
  },
  checkout_iniciado: {
    rotulo: 'Pagamentos iniciados',
    cliente: false,
    detalheValido: (d) => d === 'plano' || CHAVE_DE_CONTRIBUICAO.test(d),
  },
} as const satisfies Record<string, DefinicaoDaEtapa>;

export type EtapaDoFunil = keyof typeof ETAPAS_DO_FUNIL;

export const NOMES_DAS_ETAPAS = Object.keys(ETAPAS_DO_FUNIL) as EtapaDoFunil[];

export function etapaValida(etapa: string, detalhe: string) {
  const definicao = (
    ETAPAS_DO_FUNIL as Record<string, DefinicaoDaEtapa | undefined>
  )[etapa];
  return Boolean(definicao?.detalheValido(detalhe));
}

/** O que a rota pública aceita: só etapas do navegador, com detalhe válido. */
export const esquemaDaEtapaDoCliente = z
  .object({
    etapa: z.string().max(48),
    detalhe: z.string().max(48).default(''),
  })
  .strict()
  .refine(
    ({ etapa, detalhe }) =>
      etapaValida(etapa, detalhe) &&
      (ETAPAS_DO_FUNIL as Record<string, DefinicaoDaEtapa>)[etapa].cliente &&
      // E-mail é o único login que o navegador informa.
      (etapa !== 'login_iniciado' || detalhe === 'email'),
    { message: 'Etapa desconhecida.' }
  );

/** Robôs conhecidos não entram no funil. */
const ROBO =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|curl|wget|python-requests|httpclient/i;

export function pareceRobo(userAgent: string | null) {
  return !userAgent || ROBO.test(userAgent);
}

/** Dia civil em Brasília (AAAA-MM-DD), o mesmo do resto do app. */
export function diaDoFunil(agora: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

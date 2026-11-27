import { z } from 'zod';

import { SIGNOS } from '@/lib/astrology/sideral';
import {
  calcularMapaTropicalPorLocal,
  calcularSolPorData,
  type PlanetaTropical,
} from '@/lib/astrology/tropical';
import { hojeNoBrasil } from '@/lib/descoberta/visitante';
import { HttpError } from '@/lib/http-error';

/**
 * Conexões da Alma (tarefa 166): comparação simbólica entre dois mapas
 * ocidentais (zodíaco tropical), feita pelo Motor da Lyra, sem modelo de IA.
 *
 * - Só com as duas datas: compara os signos do Sol (elemento, ritmo e a
 *   relação entre os signos), com a incerteza de quem nasceu num dia de troca
 *   de signo.
 * - Com data, hora e cidade das duas pessoas: compara as posições reais de
 *   Sol, Lua, Mercúrio, Vênus e Marte e os aspectos entre os dois mapas.
 *
 * Nada é gravado: as entradas vivem só na requisição. Não há porcentagem de
 * compatibilidade, veredito de "alma gêmea" nem leitura dos sentimentos da
 * outra pessoa.
 */

export const IDADE_MINIMA_DAS_CONEXOES = 18;

type Signo = (typeof SIGNOS)[number];

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const esquemaDoNascimento = z
  .object({
    data: z.string().regex(DATA, 'Informe a data no formato AAAA-MM-DD.'),
    hora: z
      .string()
      .regex(HORA, 'Informe a hora no formato HH:mm.')
      .nullish()
      .transform((v) => v || null),
    cidadeId: z.number().int().positive().nullish(),
    ocorrencia: z.enum(['anterior', 'posterior']).optional(),
  })
  .strict();

export const esquemaDaConexao = z
  .object({
    outra: esquemaDoNascimento
      .extend({
        /** Como chamar a outra pessoa na leitura; o nome completo não é pedido. */
        apelido: z
          .string()
          .trim()
          .max(40, 'Use até 40 caracteres para o apelido.')
          .optional(),
      })
      .strict(),
    /** Ajuste dos dados do titular só para esta leitura (o perfil não muda). */
    titular: esquemaDoNascimento.optional(),
    consentimento: z.literal(true, {
      error:
        'Confirme que a outra pessoa compartilhou esses dados com você para esta leitura.',
    }),
  })
  .strict();

export type PedidoDeConexao = z.infer<typeof esquemaDaConexao>;

export interface LocalDeNascimento {
  rotulo: string;
  latitude: number;
  longitude: number;
  fuso: string;
}

export interface NascimentoInformado {
  rotulo: string;
  data: string;
  hora: string | null;
  local: LocalDeNascimento | null;
  ocorrencia?: 'anterior' | 'posterior';
}

const PLANETAS_DA_SINASTRIA = [
  'sol',
  'lua',
  'mercurio',
  'venus',
  'marte',
] as const satisfies readonly PlanetaTropical[];
type PlanetaDaSinastria = (typeof PLANETAS_DA_SINASTRIA)[number];

const NOME_DO_PLANETA: Record<PlanetaDaSinastria, string> = {
  sol: 'Sol',
  lua: 'Lua',
  mercurio: 'Mercúrio',
  venus: 'Vênus',
  marte: 'Marte',
};

const TEMA_DO_PLANETA: Record<PlanetaDaSinastria, string> = {
  sol: 'o jeito de ser e de se expressar',
  lua: 'as necessidades emocionais e o que dá segurança',
  mercurio: 'o jeito de pensar e de conversar',
  venus: 'o jeito de gostar, de valorizar e de receber afeto',
  marte: 'a iniciativa, o desejo e o modo de lidar com conflitos',
};

const ELEMENTOS = ['fogo', 'terra', 'ar', 'água'] as const;
type Elemento = (typeof ELEMENTOS)[number];
const RITMOS = ['cardinal', 'fixo', 'mutável'] as const;

const ELEMENTO_EM_PALAVRAS: Record<Elemento, string> = {
  fogo: 'entusiasmo e ação',
  terra: 'praticidade e constância',
  ar: 'ideias e conversa',
  água: 'sensibilidade e vínculo',
};

const RITMO_EM_PALAVRAS: Record<(typeof RITMOS)[number], string> = {
  cardinal: 'gosta de começar e de tomar a frente',
  fixo: 'gosta de sustentar e de aprofundar',
  mutável: 'gosta de adaptar e de experimentar',
};

/** "Você" só com maiúscula no início da frase. */
const noMeio = (rotulo: string) => (rotulo === 'Você' ? 'você' : rotulo);

const elementoDe = (indice: number) => ELEMENTOS[indice % 4];
const ritmoDe = (indice: number) => RITMOS[indice % 3];
const indiceDo = (signo: Signo) => SIGNOS.indexOf(signo);

/** Elementos que costumam se completar (fogo com ar, terra com água). */
function elementosComplementares(a: Elemento, b: Elemento) {
  const par = new Set([a, b]);
  return (
    (par.has('fogo') && par.has('ar')) || (par.has('terra') && par.has('água'))
  );
}

interface RelacaoEntreSignos {
  nome: string;
  afinidade: string | null;
  diferenca: string | null;
  tensao: string | null;
}

/** A distância em signos entre os dois Sóis (0 a 6) e o que ela sugere. */
function relacaoEntreSignos(distancia: number): RelacaoEntreSignos {
  switch (distancia) {
    case 0:
      return {
        nome: 'mesmo signo',
        afinidade:
          'Os dois Sóis estão no mesmo signo: é comum reconhecer no outro um jeito parecido de se expressar.',
        diferenca: null,
        tensao:
          'Quando os dois têm o mesmo ponto forte, também podem repetir o mesmo ponto cego; vale notar quem cede quando os dois querem a mesma coisa.',
      };
    case 1:
      return {
        nome: 'signos vizinhos',
        afinidade: null,
        diferenca:
          'Os Sóis estão em signos vizinhos, que têm elemento e ritmo diferentes: o que é natural para um pode precisar de tradução para o outro.',
        tensao: null,
      };
    case 2:
      return {
        nome: 'sextil (dois signos de distância)',
        afinidade:
          'Os Sóis formam um sextil: há abertura para trocar ideias e se estimular, que cresce quando os dois tomam a iniciativa.',
        diferenca: null,
        tensao: null,
      };
    case 3:
      return {
        nome: 'quadratura (três signos de distância)',
        afinidade: null,
        diferenca: null,
        tensao:
          'Os Sóis formam uma quadratura: prioridades e ritmos podem se chocar. Isso pede conversa e acordos, não é sinal de fracasso.',
      };
    case 4:
      return {
        nome: 'trígono (quatro signos de distância)',
        afinidade:
          'Os Sóis formam um trígono, no mesmo elemento: costuma haver facilidade e fluidez, que vale não tomar como garantida.',
        diferenca: null,
        tensao: null,
      };
    case 5:
      return {
        nome: 'quincúncio (cinco signos de distância)',
        afinidade: null,
        diferenca:
          'Os Sóis estão a cinco signos de distância: os dois enxergam a vida por ângulos bem diferentes, e o ajuste costuma vir de pequenos combinados.',
        tensao: null,
      };
    default:
      return {
        nome: 'oposição (signos opostos)',
        afinidade:
          'Os Sóis estão em signos opostos, que se espelham: cada um mostra ao outro o lado que expressa menos.',
        diferenca: null,
        tensao:
          'A oposição também pode virar cabo de guerra; o equilíbrio vem de reconhecer o valor do jeito do outro.',
      };
  }
}

interface LeituraSolar {
  condicao: string | null;
  afinidades: string[];
  diferencas: string[];
  tensoes: string[];
}

function lerSois(
  a: { rotulo: string; signo: Signo },
  b: { rotulo: string; signo: Signo },
  condicao: string | null
): LeituraSolar {
  const ia = indiceDo(a.signo);
  const ib = indiceDo(b.signo);
  const bruta = Math.abs(ia - ib);
  const distancia = Math.min(bruta, 12 - bruta);
  const relacao = relacaoEntreSignos(distancia);
  const ea = elementoDe(ia);
  const eb = elementoDe(ib);
  const ra = ritmoDe(ia);
  const rb = ritmoDe(ib);
  const afinidades: string[] = [];
  const diferencas: string[] = [];
  const tensoes: string[] = [];
  if (relacao.afinidade) afinidades.push(relacao.afinidade);
  if (relacao.diferenca) diferencas.push(relacao.diferenca);
  if (relacao.tensao) tensoes.push(relacao.tensao);

  if (ea === eb)
    afinidades.push(
      `Os dois Sóis são de ${ea}: a linguagem de ${ELEMENTO_EM_PALAVRAS[ea]} tende a ser comum aos dois.`
    );
  else if (elementosComplementares(ea, eb))
    afinidades.push(
      `${a.rotulo} tem o Sol em ${ea} (${ELEMENTO_EM_PALAVRAS[ea]}) e ${noMeio(b.rotulo)} em ${eb} (${ELEMENTO_EM_PALAVRAS[eb]}): elementos que costumam se completar.`
    );
  else
    diferencas.push(
      `${a.rotulo} tem o Sol em ${ea} (${ELEMENTO_EM_PALAVRAS[ea]}) e ${noMeio(b.rotulo)} em ${eb} (${ELEMENTO_EM_PALAVRAS[eb]}): vale conversar sobre o que cada um precisa para se sentir à vontade.`
    );

  if (ra === rb)
    tensoes.push(
      `Os dois Sóis têm ritmo ${ra}: os dois ${RITMO_EM_PALAVRAS[ra]}, o que une, mas pode disputar espaço.`
    );
  else
    diferencas.push(
      `No ritmo, ${noMeio(a.rotulo)} ${RITMO_EM_PALAVRAS[ra]}, e ${noMeio(b.rotulo)} ${RITMO_EM_PALAVRAS[rb]}.`
    );

  return { condicao, afinidades, diferencas, tensoes };
}

type MapaCompleto = ReturnType<typeof calcularMapaTropicalPorLocal>;

const ASPECTOS_DA_SINASTRIA = [
  { nome: 'conjunção', angulo: 0, orbe: 5, tipo: 'intenso' },
  { nome: 'sextil', angulo: 60, orbe: 3, tipo: 'harmonico' },
  { nome: 'quadratura', angulo: 90, orbe: 5, tipo: 'tenso' },
  { nome: 'trígono', angulo: 120, orbe: 5, tipo: 'harmonico' },
  { nome: 'oposição', angulo: 180, orbe: 5, tipo: 'tenso' },
] as const;

const SENTIDO_DO_ASPECTO: Record<
  (typeof ASPECTOS_DA_SINASTRIA)[number]['nome'],
  string
> = {
  conjunção:
    'os temas se misturam e ganham força; o encontro pode ser intenso e pede espaço para cada um',
  sextil: 'há uma oportunidade de troca, que cresce com a iniciativa dos dois',
  quadratura: 'há atrito, que pede conversa e ajustes; não é sinal de fracasso',
  trígono:
    'há fluidez natural; vale cuidar para que a facilidade não vire descuido',
  oposição:
    'um espelha o outro; o equilíbrio vem de reconhecer o valor do jeito do outro',
};

export interface AspectoEntreMapas {
  deTitular: PlanetaDaSinastria;
  daOutra: PlanetaDaSinastria;
  aspecto: (typeof ASPECTOS_DA_SINASTRIA)[number]['nome'];
  tipo: (typeof ASPECTOS_DA_SINASTRIA)[number]['tipo'];
  /** Distância até o aspecto exato, em graus. */
  orbe: number;
  texto: string;
}

/** Aspectos entre os planetas pessoais dos dois mapas, do mais exato ao mais largo. */
export function aspectosEntreMapas(
  a: { rotulo: string; mapa: MapaCompleto },
  b: { rotulo: string; mapa: MapaCompleto },
  limite = 8
): AspectoEntreMapas[] {
  const longitude = (mapa: MapaCompleto, planeta: PlanetaDaSinastria) =>
    mapa.planetas.find((p) => p.planeta === planeta)!.posicao.longitude;
  const lista: AspectoEntreMapas[] = [];
  for (const pa of PLANETAS_DA_SINASTRIA) {
    for (const pb of PLANETAS_DA_SINASTRIA) {
      const distancia = Math.abs(
        ((longitude(a.mapa, pa) - longitude(b.mapa, pb) + 540) % 360) - 180
      );
      for (const aspecto of ASPECTOS_DA_SINASTRIA) {
        const orbe = Math.abs(distancia - aspecto.angulo);
        if (orbe > aspecto.orbe) continue;
        lista.push({
          deTitular: pa,
          daOutra: pb,
          aspecto: aspecto.nome,
          tipo: aspecto.tipo,
          orbe: Math.round(orbe * 10) / 10,
          texto: `${NOME_DO_PLANETA[pa]} de ${noMeio(a.rotulo)} em ${aspecto.nome} com ${NOME_DO_PLANETA[pb]} de ${noMeio(b.rotulo)} (orbe de ${(Math.round(orbe * 10) / 10).toLocaleString('pt-BR')}°): ${TEMA_DO_PLANETA[pa]} de um encontra ${TEMA_DO_PLANETA[pb]} do outro; ${SENTIDO_DO_ASPECTO[aspecto.nome]}.`,
        });
      }
    }
  }
  return lista.sort((x, y) => x.orbe - y.orbe).slice(0, limite);
}

const PERGUNTAS_BASE = [
  'O que cada um de vocês precisa para se sentir ouvido numa conversa difícil?',
  'Como cada um mostra carinho, e como prefere receber?',
  'Que acordo pequeno facilitaria a rotina de vocês nesta semana?',
];

const PERGUNTA_POR_TIPO: Record<string, string> = {
  tenso:
    'Quando vocês discordam, o que ajuda cada um a voltar para a conversa sem precisar vencer?',
  harmonico: 'O que já flui bem entre vocês e merece ser cuidado de propósito?',
  intenso: 'Onde a proximidade é boa e onde cada um precisa de espaço próprio?',
};

const SOBRE = [
  'A astrologia é uma linguagem simbólica: esta leitura compara posições do céu no nascimento de vocês e sugere temas para conversar. Ela não prova destino, não mede amor e não sabe o que a outra pessoa sente.',
  'Não existe porcentagem de compatibilidade aqui, nem veredito de "alma gêmea". Relações se constroem com escolhas, cuidado e consentimento das duas pessoas, e nenhuma leitura diz se alguém deve ficar ou ir embora.',
];

export interface PessoaNaConexao {
  rotulo: string;
  nivel: 'completo' | 'solar';
  sol: { signo: Signo | null; possiveis: Signo[] };
  /** Só no mapa completo. */
  posicoes: {
    planeta: PlanetaDaSinastria;
    nome: string;
    signo: Signo;
    grau: number;
  }[];
  ascendente: Signo | null;
  precisao: string;
}

export interface ConexaoDaAlma {
  versao: 1;
  metodo: 'ocidental-tropical/sinastria';
  nivel: 'completo' | 'solar';
  pessoas: [PessoaNaConexao, PessoaNaConexao];
  comparado: string[];
  naoComparado: string[];
  leituras: LeituraSolar[];
  aspectos: AspectoEntreMapas[];
  perguntas: string[];
  avisos: string[];
  sobre: string[];
}

/** Idade completa em anos no dia civil de hoje no Brasil. */
export function idadeEmAnos(data: string, agora = new Date()) {
  const hoje = hojeNoBrasil(agora);
  const [ano, mes, dia] = data.split('-').map(Number);
  let idade = hoje.getUTCFullYear() - ano;
  const mesHoje = hoje.getUTCMonth() + 1;
  if (mesHoje < mes || (mesHoje === mes && hoje.getUTCDate() < dia)) idade--;
  return idade;
}

function calcularPessoa(pessoa: NascimentoInformado, agora: Date) {
  try {
    if (pessoa.hora && pessoa.local) {
      const mapa = calcularMapaTropicalPorLocal(
        {
          data: pessoa.data,
          hora: pessoa.hora,
          ocorrencia: pessoa.ocorrencia,
          local: {
            nome: pessoa.local.rotulo,
            fuso: pessoa.local.fuso,
            latitude: pessoa.local.latitude,
            longitude: pessoa.local.longitude,
          },
        },
        agora
      );
      return { tipo: 'completo' as const, mapa };
    }
    return {
      tipo: 'solar' as const,
      sol: calcularSolPorData(pessoa.data, agora),
    };
  } catch (erro) {
    if (erro instanceof RangeError)
      throw new HttpError(`${pessoa.rotulo}: ${erro.message}`, 422);
    throw erro;
  }
}

/** Monta a leitura das Conexões da Alma a partir dos dois nascimentos. */
export function montarConexao(
  titular: NascimentoInformado,
  outra: NascimentoInformado,
  agora = new Date()
): ConexaoDaAlma {
  for (const pessoa of [titular, outra]) {
    if (idadeEmAnos(pessoa.data, agora) < IDADE_MINIMA_DAS_CONEXOES)
      throw new HttpError(
        `As Conexões da Alma são para pessoas a partir de ${IDADE_MINIMA_DAS_CONEXOES} anos. Confira a data de nascimento de ${pessoa.rotulo === 'Você' ? 'você' : pessoa.rotulo}.`,
        422
      );
  }

  const calculos = [
    calcularPessoa(titular, agora),
    calcularPessoa(outra, agora),
  ];
  const avisos: string[] = [];
  const pessoas = calculos.map((calculo, i): PessoaNaConexao => {
    const informado = i === 0 ? titular : outra;
    if (calculo.tipo === 'completo') {
      const posicoes = PLANETAS_DA_SINASTRIA.map((planeta) => {
        const p = calculo.mapa.planetas.find((x) => x.planeta === planeta)!;
        return {
          planeta,
          nome: NOME_DO_PLANETA[planeta],
          signo: p.posicao.signo,
          grau: Math.floor(p.posicao.grauNoSigno),
        };
      });
      return {
        rotulo: informado.rotulo,
        nivel: 'completo',
        sol: { signo: posicoes[0].signo, possiveis: [posicoes[0].signo] },
        posicoes,
        ascendente: calculo.mapa.ascendente?.signo ?? null,
        precisao: 'Data, hora e cidade informadas: posições calculadas.',
      };
    }
    const { sol } = calculo.sol;
    if (informado.hora && !informado.local)
      avisos.push(
        `${informado.rotulo}: sem a cidade, a hora não basta para o mapa completo (o fuso depende do lugar). Foi usado só o Sol.`
      );
    if (sol.signosPossiveis.length > 1)
      avisos.push(
        `${informado.rotulo} nasceu num dia de troca de signo: o Sol pode estar em ${sol.signosPossiveis.join(' ou ')}. Com a hora e a cidade, a leitura confirma qual.`
      );
    return {
      rotulo: informado.rotulo,
      nivel: 'solar',
      sol: { signo: sol.signo, possiveis: [...sol.signosPossiveis] },
      posicoes: [],
      ascendente: null,
      precisao:
        'Só a data: o signo do Sol vale para o dia; Lua, Vênus, Marte e ascendente precisam de hora e cidade.',
    };
  }) as [PessoaNaConexao, PessoaNaConexao];

  const nivel =
    calculos[0].tipo === 'completo' && calculos[1].tipo === 'completo'
      ? 'completo'
      : 'solar';
  if (
    nivel === 'solar' &&
    (calculos[0].tipo === 'completo') !== (calculos[1].tipo === 'completo')
  )
    avisos.push(
      'Só uma das pessoas tem data, hora e cidade: a comparação fica no nível dos signos do Sol, o que as duas têm em comum.'
    );

  const [a, b] = pessoas;
  const leituras: LeituraSolar[] = [];
  const incertos = a.sol.possiveis.length > 1 || b.sol.possiveis.length > 1;
  for (const sa of a.sol.possiveis)
    for (const sb of b.sol.possiveis)
      leituras.push(
        lerSois(
          { rotulo: a.rotulo, signo: sa },
          { rotulo: b.rotulo, signo: sb },
          incertos
            ? `Se o Sol de ${noMeio(a.rotulo)} estiver em ${sa} e o de ${noMeio(b.rotulo)} em ${sb}`
            : null
        )
      );

  const aspectos =
    nivel === 'completo' &&
    calculos[0].tipo === 'completo' &&
    calculos[1].tipo === 'completo'
      ? aspectosEntreMapas(
          { rotulo: a.rotulo, mapa: calculos[0].mapa },
          { rotulo: b.rotulo, mapa: calculos[1].mapa }
        )
      : [];

  const tipos = new Set(aspectos.map((x) => x.tipo));
  if (!aspectos.length)
    for (const l of leituras) {
      if (l.afinidades.length) tipos.add('harmonico');
      if (l.tensoes.length) tipos.add('tenso');
    }
  const perguntas = [
    ...PERGUNTAS_BASE,
    ...['tenso', 'harmonico', 'intenso']
      .filter((t) => tipos.has(t as never))
      .map((t) => PERGUNTA_POR_TIPO[t]),
  ];

  return {
    versao: 1,
    metodo: 'ocidental-tropical/sinastria',
    nivel,
    pessoas,
    comparado:
      nivel === 'completo'
        ? [
            'Signos do Sol: elemento, ritmo e a relação entre os dois signos.',
            'Aspectos entre Sol, Lua, Mercúrio, Vênus e Marte de um mapa e do outro, com orbes de até 5° (3° no sextil).',
          ]
        : ['Signos do Sol: elemento, ritmo e a relação entre os dois signos.'],
    naoComparado: [
      ...(nivel === 'solar'
        ? [
            'Lua, Mercúrio, Vênus, Marte e ascendente: precisam de data, hora e cidade das duas pessoas.',
          ]
        : []),
      'Casas, planetas lentos (Júpiter a Plutão) e mapa composto: não fazem parte desta leitura.',
      'Mapa védico (sideral): é outro sistema e não foi misturado a esta comparação ocidental.',
    ],
    leituras,
    aspectos,
    perguntas,
    avisos,
    sobre: SOBRE,
  };
}

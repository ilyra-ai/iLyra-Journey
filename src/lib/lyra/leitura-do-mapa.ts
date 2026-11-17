import { NAKSHATRA_INFO, NATUREZA } from '@/lib/coach/conhecimento';
import type { MapaNatal, PlanetaNoMapa } from '@/lib/astrology/mapa-natal';
import {
  type Graha,
  NAKSHATRAS,
  NOME_DO_GRAHA,
  REGENTE_DO_SIGNO,
  SIGNOS,
} from '@/lib/astrology/sideral';

import {
  CASAS_INFO,
  type Dosha,
  dignidadeDoGraha,
  type Elemento,
  GRAHAS_INFO,
  NAKSHATRAS_EXTRA,
  NOME_DO_ELEMENTO,
  NOME_DO_GANA,
  SENTIDO_DA_DIGNIDADE,
  SIGNOS_INFO,
  TEMA_DO_DASHA,
} from './conhecimento/jyotish';
import {
  CHAKRA_DO_GRAHA,
  RODA_DE_CURA,
  SA_MINIMO,
  TIPOS_DE_MAPA,
} from './conhecimento/mapas';
import { CUIDADO_DO_DOSHA } from './conhecimento/upavedas';

/**
 * Leitura do mapa natal pelo motor da Lyra, sem modelo de IA (tarefa 55).
 * Três partes separadas, uma por tipo de mapa:
 * - védico: tudo calculado (Lagna, Lua, grahas nas casas, dignidades, dasha,
 *   tendência de dosha);
 * - Lyra DM Samādhi: só as pontes que o método define de forma fixa
 *   (elemento dominante → Roda de Cura, metais, chakras dos planetas, Mūla);
 *   o restante é declarado simbólico ou indisponível;
 * - Quantum: o que depende do estado do momento (energia, pressão, tempo) e
 *   o que está indisponível (Desenho Humano).
 * As frases são montadas por regras a partir das tabelas curadas; a mesma
 * entrada gera sempre a mesma leitura.
 */

export interface LeituraDeGraha {
  graha: Graha;
  nome: string;
  signo: string;
  casa: number | null;
  dignidade: 'exaltado' | 'debilitado' | 'proprio' | null;
  retrogrado: boolean;
  texto: string;
}

export interface LeituraDaLyra {
  /**
   * Aviso sobre a hora de nascimento: estimada pela pessoa ou desconhecida.
   * `null` quando a hora foi informada.
   */
  avisoDaHora: string | null;
  tipos: Array<{ tipo: string; nome: string; definicao: string }>;
  vedico: {
    lagna: string;
    lua: string;
    sol: string;
    planetas: LeituraDeGraha[];
    dasha: string | null;
    dosha: { predominante: Dosha; texto: string };
  };
  samadhi: {
    terrestre: string;
    sutil: string;
    celestial: string;
    sintese: string;
    indisponivel: string[];
  };
  quantum: {
    texto: string;
    indisponivel: string[];
  };
  /** De 3 a 5 percepções principais (regra do método Samādhi). */
  percepcoes: string[];
}

const ORDEM_DOS_ELEMENTOS: Elemento[] = ['fogo', 'terra', 'ar', 'agua'];

function minusculaInicial(texto: string) {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function leituraDoGraha(planeta: PlanetaNoMapa): LeituraDeGraha {
  const info = GRAHAS_INFO[planeta.graha];
  const dignidade = dignidadeDoGraha(
    planeta.graha,
    planeta.signo,
    REGENTE_DO_SIGNO[planeta.signo]
  );
  const casa = planeta.casa ? CASAS_INFO[planeta.casa - 1] : null;
  const partes = [
    `${planeta.nome} em ${planeta.nomeDoSigno}${planeta.casa ? `, casa ${planeta.casa}` : ''}: ${info.significa}`,
    casa
      ? `se expressam pelos temas da casa ${planeta.casa}, ${casa.temas}.`
      : 'com o tom do signo, de ' + SIGNOS_INFO[planeta.signo].qualidades + '.',
  ];
  if (dignidade) partes.push(`Está ${SENTIDO_DA_DIGNIDADE[dignidade]}.`);
  if (
    planeta.retrogrado &&
    planeta.graha !== 'rahu' &&
    planeta.graha !== 'ketu'
  ) {
    partes.push(
      'Retrógrado: a energia trabalha para dentro, com revisão e amadurecimento.'
    );
  }
  partes.push(`Floresce quando você consegue ${info.florescer}.`);
  return {
    graha: planeta.graha,
    nome: planeta.nome,
    signo: planeta.nomeDoSigno,
    casa: planeta.casa,
    dignidade,
    retrogrado: planeta.retrogrado,
    texto: partes.join(' '),
  };
}

function ou(nomes: readonly string[]) {
  return nomes.length <= 1
    ? (nomes[0] ?? '')
    : `${nomes.slice(0, -1).join(', ')} ou ${nomes.at(-1)}`;
}

/** Com a hora desconhecida, o que da Lua natal não dá para afirmar. */
function incertezaDaLua(mapa: MapaNatal) {
  return {
    signo: (mapa.possibilidades?.signosDaLua.length ?? 1) > 1,
    nakshatra: (mapa.possibilidades?.nakshatrasDaLua.length ?? 1) > 1,
  };
}

function avisoDaHora(mapa: MapaNatal): string | null {
  if (mapa.precisaoDaHora === 'estimada') {
    return 'A hora de nascimento deste mapa foi estimada por você, pelo horário que escolheu como o mais parecido com você. O Ascendente, as casas e o período de vida são aproximados. Se você encontrar a hora na sua certidão de nascimento, informe-a no perfil.';
  }
  if (mapa.precisaoDaHora === 'desconhecida') {
    return 'Sem a hora de nascimento, o Ascendente e as casas não são calculados, a posição da Lua é aproximada e o período de vida não pode ser determinado com datas. No perfil você pode informar a hora ou escolher o horário que mais se parece com você.';
  }
  return null;
}

function textoDoLagna(mapa: MapaNatal): string {
  if (!mapa.lagna && mapa.limiteDoLagna === 'latitude-polar') {
    return 'Ascendente (Lagna) e casas indisponíveis: você nasceu além do Círculo Polar, onde parte do zodíaco não nasce no horizonte em certas horas e o cálculo do Ascendente deixa de valer. A Lua, os planetas e os períodos de vida continuam calculados.';
  }
  if (!mapa.lagna) {
    return 'Ascendente (Lagna) indisponível: sem a hora de nascimento ele não é calculado. Informe a hora no perfil, ou escolha o horário que mais se parece com você, para a leitura completa das casas.';
  }
  const signo = SIGNOS_INFO[mapa.lagna.signo];
  const regente = mapa.planetas.find((p) => p.graha === mapa.lagna?.regente);
  const casaDoRegente = regente?.casa ? CASAS_INFO[regente.casa - 1] : null;
  if (mapa.precisaoDaHora === 'estimada') {
    // O nakshatra do Ascendente muda em menos de uma hora: com a hora
    // estimada só o signo é afirmado.
    return [
      `Ascendente (Lagna) em ${mapa.lagna.nomeDoSigno} (${mapa.lagna.rashi}), pela hora que você escolheu: você chega ao mundo com ${signo.qualidades}.`,
      `O regente, ${mapa.lagna.nomeDoRegente}${regente?.casa ? `, está na casa ${regente.casa}` : ''}${casaDoRegente ? `: a sua energia vital se dirige aos temas dessa casa (${casaDoRegente.temas})` : ''}.`,
      'É uma estimativa: com a hora da certidão de nascimento o Ascendente pode ser outro.',
    ].join(' ');
  }
  return [
    `Ascendente (Lagna) em ${mapa.lagna.nomeDoSigno} (${mapa.lagna.rashi}), no nakshatra ${mapa.lagna.nomeDoNakshatra}: você chega ao mundo com ${signo.qualidades}.`,
    `O regente, ${mapa.lagna.nomeDoRegente}${regente?.casa ? `, está na casa ${regente.casa}` : ''}${casaDoRegente ? `: a sua energia vital se dirige aos temas dessa casa (${casaDoRegente.temas})` : ''}.`,
  ].join(' ');
}

function textoDaLua(mapa: MapaNatal): string {
  const lua = mapa.lua;
  const incerta = incertezaDaLua(mapa);
  if (mapa.possibilidades && (incerta.signo || incerta.nakshatra)) {
    const signos = mapa.possibilidades.signosDaLua;
    const nakshatras = mapa.possibilidades.nakshatrasDaLua.map(
      (indice) => NAKSHATRAS[indice]
    );
    return [
      incerta.signo
        ? `Sem a hora de nascimento, a sua Lua pode estar em ${ou(signos.map((indice) => SIGNOS[indice]))}: no dia em que você nasceu ela mudou de signo.`
        : `Lua em ${lua.nomeDoSigno}: a sua mente e as suas emoções pedem ${SIGNOS_INFO[lua.signo].qualidades}.`,
      incerta.nakshatra
        ? `O nakshatra da Lua fica entre ${ou(nakshatras)}; a hora de nascimento define qual.`
        : `O nakshatra da Lua é ${nakshatras[0]}.`,
      'Informe a hora no perfil, ou escolha o horário que mais se parece com você, para confirmar.',
    ].join(' ');
  }
  const extra = NAKSHATRAS_EXTRA[lua.nakshatra];
  const info = NAKSHATRA_INFO[lua.nakshatra];
  if (mapa.precisaoDaHora === 'desconhecida') {
    // Signo e nakshatra valem para o dia inteiro; o pada depende da hora.
    return [
      `Lua em ${lua.nomeDoSigno}, no nakshatra ${lua.nomeDoNakshatra}: a sua mente e as suas emoções pedem ${SIGNOS_INFO[lua.signo].qualidades}.`,
      `${lua.nomeDoNakshatra} tem como símbolo ${extra.simbolo} e fala de ${extra.tema}. Divindade: ${info.divindade}. Temperamento ${NOME_DO_GANA[extra.gana]}; natureza ${minusculaInicial(NATUREZA[info.natureza].nome)}.`,
    ].join(' ');
  }
  return [
    `Lua em ${lua.nomeDoSigno}, no nakshatra ${lua.nomeDoNakshatra} (pada ${lua.pada}): a sua mente e as suas emoções pedem ${SIGNOS_INFO[lua.signo].qualidades}.`,
    `${lua.nomeDoNakshatra} tem como símbolo ${extra.simbolo} e fala de ${extra.tema}. Divindade: ${info.divindade}. Temperamento ${NOME_DO_GANA[extra.gana]}; natureza ${minusculaInicial(NATUREZA[info.natureza].nome)}.`,
  ].join(' ');
}

function textoDoSol(mapa: MapaNatal): string {
  const sol = mapa.planetas.find((p) => p.graha === 'sol') as PlanetaNoMapa;
  const casa = sol.casa ? CASAS_INFO[sol.casa - 1] : null;
  return `Sol em ${sol.nomeDoSigno}${sol.casa ? `, casa ${sol.casa}` : ''}: o seu propósito brilha por meio de ${SIGNOS_INFO[sol.signo].qualidades}${casa ? `, especialmente nos temas dessa casa (${casa.temas})` : ''}.`;
}

function textoDoDasha(mapa: MapaNatal): string | null {
  if (mapa.precisaoDaHora === 'desconhecida') {
    const possiveis = mapa.possibilidades?.mahadashas ?? [];
    if (possiveis.length === 0) return null;
    if (possiveis.length === 1) {
      const graha = possiveis[0];
      return `Sem a hora de nascimento, o subperíodo e as datas não podem ser calculados. Em qualquer hora daquele dia, porém, o período maior (Mahadasha) que você vive hoje é o de ${NOME_DO_GRAHA[graha]}: ${TEMA_DO_DASHA[graha]}.`;
    }
    return `Sem a hora de nascimento, o seu período de vida (dasha) não pode ser determinado: conforme a hora em que você nasceu, hoje você estaria no período de ${ou(possiveis.map((graha) => `${NOME_DO_GRAHA[graha]} (${minusculaInicial(TEMA_DO_DASHA[graha])})`))}. Informe a hora no perfil, ou escolha o horário que mais se parece com você.`;
  }
  if (!mapa.dasha) return null;
  if (mapa.precisaoDaHora === 'estimada') {
    return `Pela hora que você escolheu, você vive o período maior (Mahadasha) de ${mapa.dasha.mahadasha.nome}: ${TEMA_DO_DASHA[mapa.dasha.mahadasha.graha]}. Dentro dele, o subperíodo (Antardasha) de ${mapa.dasha.antardasha.nome} acrescenta uma ${minusculaInicial(TEMA_DO_DASHA[mapa.dasha.antardasha.graha])}. Como a hora é estimada, as datas de início e de fim desses períodos são aproximadas e não são mostradas.`;
  }
  const { mahadasha, antardasha } = mapa.dasha;
  const formatar = (d: Date) =>
    d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return `Você vive o período maior (Mahadasha) de ${mahadasha.nome}, de ${formatar(mahadasha.inicio)} a ${formatar(mahadasha.fim)}: ${TEMA_DO_DASHA[mahadasha.graha]}. Dentro dele, o subperíodo (Antardasha) de ${antardasha.nome}, até ${formatar(antardasha.fim)}, acrescenta uma ${minusculaInicial(TEMA_DO_DASHA[antardasha.graha])}.`;
}

/**
 * Tendência de dosha pelo mapa: doshas dos signos do Lagna e da Lua e do
 * regente do Lagna (BPHS caps. 3 e 4). Signos de ar (mistos) somam um
 * ponto a cada dosha.
 */
function doshaDoMapa(mapa: MapaNatal): { predominante: Dosha; texto: string } {
  const pontos: Record<Dosha, number> = { vata: 0, pitta: 0, kapha: 0 };
  const somarSigno = (signo: number) => {
    const dosha = SIGNOS_INFO[signo].dosha;
    if (dosha === 'misto') {
      pontos.vata += 1;
      pontos.pitta += 1;
      pontos.kapha += 1;
    } else {
      pontos[dosha] += 2;
    }
  };
  if (mapa.lagna) somarSigno(mapa.lagna.signo);
  somarSigno(mapa.lua.signo);
  const regente = mapa.lagna?.regente ?? 'lua';
  for (const dosha of GRAHAS_INFO[regente].doshas) pontos[dosha] += 1;

  const ordem: Dosha[] = ['vata', 'pitta', 'kapha'];
  const predominante = ordem.reduce((melhor, d) =>
    pontos[d] > pontos[melhor] ? d : melhor
  );
  const nome = { vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha' }[predominante];
  return {
    predominante,
    texto: `${
      mapa.lagna
        ? 'Pelo mapa (signos do Lagna e da Lua e o regente do Lagna, como no Brihat Parashara Hora Shastra)'
        : `Pelo signo da Lua (sem a hora de nascimento não há Lagna${incertezaDaLua(mapa).signo ? ', e a Lua usada é a do meio-dia daquele dia, que pode não ser a sua' : ''})`
    }, a tendência de constituição puxa para ${nome}. Para equilibrar: ${CUIDADO_DO_DOSHA[predominante]}. É uma tendência astrológica; a sua constituição real se avalia com um profissional de Ayurveda.`,
  };
}

function contagemDeElementos(mapa: MapaNatal) {
  const contagem: Record<Elemento, number> = {
    fogo: 0,
    terra: 0,
    ar: 0,
    agua: 0,
  };
  for (const planeta of mapa.planetas) {
    contagem[SIGNOS_INFO[planeta.signo].elemento] += 1;
  }
  if (mapa.lagna) contagem[SIGNOS_INFO[mapa.lagna.signo].elemento] += 1;
  const maximo = Math.max(...Object.values(contagem));
  const dominantes = ORDEM_DOS_ELEMENTOS.filter((e) => contagem[e] === maximo);
  return { contagem, dominantes };
}

/** Afinidade estelar só onde o método Samādhi a define de forma fixa. */
function afinidadeEstelar(mapa: MapaNatal): string | null {
  const MULA = 18;
  // A ponte com Mūla só vale quando o nakshatra é certo: Lua sem dúvida no
  // dia e Ascendente de hora informada.
  const luaEmMula =
    mapa.lua.nakshatra === MULA && !incertezaDaLua(mapa).nakshatra;
  const lagnaEmMula =
    mapa.precisaoDaHora === 'informada' && mapa.lagna?.nakshatra === MULA;
  if (luaEmMula || lagnaEmMula) {
    return 'Com a Lua ou o Ascendente em Mūla, o nakshatra do centro da galáxia, o método Samādhi fala de "missão de reconexão com a Fonte Galáctica" e do amparo de "consciências muito antigas do núcleo galáctico".';
  }
  const sol = mapa.planetas.find((p) => p.graha === 'sol') as PlanetaNoMapa;
  const exemplos: Record<number, string> = {
    4: 'Sírius, o arquétipo do mestre espiritual e do amor devocional',
    5: 'Arcturus, o arquétipo do curador (Virgem regido por Mercúrio, na coerência fractal do método)',
    8: 'Arcturus ou Andrômeda, o mestre-curador e o visionário',
    10: 'Andrômeda ou Pegasus, a visão à frente do tempo',
  };
  const signos = [mapa.lagna?.signo, sol.signo].filter(
    (s): s is number => typeof s === 'number'
  );
  for (const signo of signos) {
    if (exemplos[signo]) {
      return `Com ${signo === sol.signo ? 'o Sol' : 'o Ascendente'} em ${SIGNOS[signo]}, os exemplos do método ligam você a ${exemplos[signo]}.`;
    }
  }
  return null;
}

export function lerMapaComoLyra(mapa: MapaNatal): LeituraDaLyra {
  const planetas = mapa.planetas.map(leituraDoGraha);
  const dasha = textoDoDasha(mapa);
  const dosha = doshaDoMapa(mapa);
  const { contagem, dominantes } = contagemDeElementos(mapa);
  const elemento = dominantes[0];
  const roda = RODA_DE_CURA[elemento];

  // Plano Sutil: chakras dos planetas fortes (exaltados, no próprio signo ou
  // em casas angulares) e dos que pedem cuidado (debilitados).
  const fortes = planetas.filter(
    (p) =>
      CHAKRA_DO_GRAHA[p.graha] &&
      (p.dignidade === 'exaltado' ||
        p.dignidade === 'proprio' ||
        (p.dignidade !== 'debilitado' &&
          p.casa !== null &&
          [1, 4, 7, 10].includes(p.casa)))
  );
  const cuidado = planetas.filter(
    (p) => CHAKRA_DO_GRAHA[p.graha] && p.dignidade === 'debilitado'
  );
  const regenteDoLagna = mapa.lagna?.regente ?? null;
  const metal = regenteDoLagna ? GRAHAS_INFO[regenteDoLagna].metal : null;

  // Empate entre elementos: todas as direções dominantes entram na leitura.
  const raizes = dominantes
    .map((e) => {
      const r = RODA_DE_CURA[e];
      return `${r.direcao} (${NOME_DO_ELEMENTO[e].split(' ')[0].toLowerCase()}, totem ${r.totem}, processo de ${r.processo}: ${r.sentido})`;
    })
    .join(' e no ');
  const terrestre = `${dominantes.length > 1 ? 'Elementos dominantes' : 'Elemento dominante'} no seu mapa: ${dominantes.map((e) => NOME_DO_ELEMENTO[e]).join(' e ')} (contando os nove grahas e o Ascendente: ${ORDEM_DOS_ELEMENTOS.map((e) => `${NOME_DO_ELEMENTO[e].split(' ')[0]} ${contagem[e]}`).join(', ')}). Na Roda de Cura, as suas raízes estão no ${raizes}.`;

  const sutil = [
    fortes.length > 0
      ? `Centros de energia mais ativos pelo mapa: ${fortes
          .slice(0, 3)
          .map(
            (p) => `${CHAKRA_DO_GRAHA[p.graha]} (por ${NOME_DO_GRAHA[p.graha]})`
          )
          .join('; ')}.`
      : 'Nenhum planeta clássico está exaltado, no próprio signo ou em casa angular: a energia se distribui sem um centro dominante.',
    cuidado.length > 0
      ? `Pedem cuidado amoroso: ${cuidado
          .map(
            (p) =>
              `${CHAKRA_DO_GRAHA[p.graha]} (${NOME_DO_GRAHA[p.graha]} em debilitação)`
          )
          .join('; ')}.`
      : '',
    metal && regenteDoLagna
      ? `O metal do regente do seu Ascendente (${NOME_DO_GRAHA[regenteDoLagna]}) é o ${metal}, símbolo alquímico da sua força de base.`
      : '',
    'A correspondência entre planetas e chakras é a da tradição tântrica, que o método Samādhi cita para Vênus (cardíaco) e Mercúrio (laríngeo).',
  ]
    .filter(Boolean)
    .join(' ');

  const estelar = afinidadeEstelar(mapa);
  const celestial =
    estelar ??
    'Afinidade estelar indisponível pelo cálculo: no método Samādhi, o Mapa Estelar é lido por percepção (a constelação ou civilização que "chama" a sua atenção), e a Lyra não a inventa.';

  const sol = mapa.planetas.find((p) => p.graha === 'sol') as PlanetaNoMapa;
  const luaIncerta = incertezaDaLua(mapa);
  const mesmoSigno = mapa.lagna?.signo === mapa.lua.signo;
  const sintese = [
    `Você tem raízes de ${dominantes.map((e) => NOME_DO_ELEMENTO[e].split(' ')[0].toLowerCase()).join(' e ')} (${dominantes.map((e) => `${RODA_DE_CURA[e].direcao}, ${RODA_DE_CURA[e].totem}`).join('; ')}).`,
    mesmoSigno
      ? `Ascendente e Lua em ${mapa.lua.nomeDoSigno} reforçam o mesmo tom: ${SIGNOS_INFO[mapa.lua.signo].qualidades}, no jeito de agir e no de sentir.`
      : `${mapa.lagna ? `Chega ao mundo com ${SIGNOS_INFO[mapa.lagna.signo].qualidades}` : `Brilha com ${SIGNOS_INFO[sol.signo].qualidades}`}${luaIncerta.signo ? '' : ` e sente a vida com ${SIGNOS_INFO[mapa.lua.signo].qualidades} (Lua em ${mapa.lua.nomeDoSigno})`}.`,
    mapa.dasha
      ? `Agora você atravessa a ${TEMA_DO_DASHA[mapa.dasha.mahadasha.graha]}, regida por ${mapa.dasha.mahadasha.nome}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const destaques = planetas.filter((p) => p.dignidade !== null).slice(0, 2);
  const percepcoes = [
    mapa.lagna
      ? `Seu Ascendente em ${mapa.lagna.nomeDoSigno} mostra ${SIGNOS_INFO[mapa.lagna.signo].qualidades}.`
      : luaIncerta.signo
        ? `Seu Sol em ${sol.nomeDoSigno} é a referência segura do seu mapa: ${SIGNOS_INFO[sol.signo].qualidades}.`
        : `Sua Lua em ${mapa.lua.nomeDoSigno} é o seu centro: ${SIGNOS_INFO[mapa.lua.signo].qualidades}.`,
    luaIncerta.nakshatra
      ? `Sua Lua fica entre ${ou((mapa.possibilidades?.nakshatrasDaLua ?? []).map((indice) => NAKSHATRAS[indice]))}: a hora de nascimento define qual.`
      : `Sua Lua em ${mapa.lua.nomeDoNakshatra} fala de ${NAKSHATRAS_EXTRA[mapa.lua.nakshatra].tema}.`,
    ...destaques.map(
      (p) =>
        `${p.nome} ${p.dignidade === 'exaltado' ? 'em exaltação' : p.dignidade === 'proprio' ? 'no próprio signo' : 'em debilitação'}: ${GRAHAS_INFO[p.graha].significa} ${p.dignidade === 'debilitado' ? 'são um campo de aprendizado consciente' : 'são um ponto forte seu'}.`
    ),
    mapa.dasha
      ? `Período atual de ${mapa.dasha.mahadasha.nome}: ${TEMA_DO_DASHA[mapa.dasha.mahadasha.graha]}.`
      : null,
    `Raízes de ${NOME_DO_ELEMENTO[elemento].split(' ')[0].toLowerCase()}: ${roda.sentido}.`,
  ].filter((p): p is string => Boolean(p));

  const indisponivelSamadhi = [
    'totem pessoal, guias e arquétipos que "aparecem" na leitura (percepção da pessoa)',
    'estágio alquímico atual (lido pelas imagens e cores que você reconhece agora)',
    'Mapa dos Antepassados (depende da história da sua família)',
  ];
  if (!estelar) indisponivelSamadhi.push('afinidade estelar');

  return {
    avisoDaHora: avisoDaHora(mapa),
    tipos: Object.values(TIPOS_DE_MAPA).map((t) => ({
      tipo: t.tipo,
      nome: t.nome,
      definicao: t.definicao,
    })),
    vedico: {
      lagna: textoDoLagna(mapa),
      lua: textoDaLua(mapa),
      sol: textoDoSol(mapa),
      planetas,
      dasha,
      dosha,
    },
    samadhi: {
      terrestre,
      sutil,
      celestial,
      sintese,
      indisponivel: indisponivelSamadhi,
    },
    quantum: {
      texto: `O Mapa Quantum é lido no momento: informe a sua energia (0 a 10), a pressão externa (0 a 10), o tempo disponível e o objetivo do ciclo, e a Lyra calcula o Score de Ação de cada ação candidata. Só vale executar com ${SA_MINIMO} ou mais; abaixo disso, diminua o escopo. A regra de ouro: a sensação honesta do corpo vale mais que a ambição da mente.`,
      indisponivel: [
        'mapa de Desenho Humano (autoridade, tipo, perfil e canais): a Lyra ainda não calcula o HD',
        'Mapa Arkático: pessoal e simbólico, sem regra de cálculo nos documentos',
      ],
    },
    percepcoes: percepcoes.slice(0, 5),
  };
}

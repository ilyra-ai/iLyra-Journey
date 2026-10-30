/**
 * Biblioteca de práticas guiadas (tarefa 132). Roteiros próprios do Lyra
 * MetaCare, escritos para o app em pt-BR; a narração é feita no dispositivo,
 * pela voz local em português, sem arquivo de áudio de terceiros nem envio de
 * texto a serviço externo. Cada passo começa em um instante fixo da prática:
 * a duração total não depende da velocidade da voz.
 *
 * As práticas são de bem-estar e relaxamento, não tratamento de saúde.
 */
export const FINALIDADES = {
  relaxar: 'Relaxar e desacelerar',
  dormir: 'Preparar o sono',
  foco: 'Recuperar o foco',
  emocoes: 'Acolher emoções',
  manha: 'Começar o dia',
} as const;
export type Finalidade = keyof typeof FINALIDADES;

export const FAIXAS_DE_DURACAO = {
  curta: { nome: 'Até 5 min', minimo: 1, maximo: 5 },
  media: { nome: '6 a 10 min', minimo: 6, maximo: 10 },
  longa: { nome: 'Mais de 10 min', minimo: 11, maximo: 60 },
} as const;
export type FaixaDeDuracao = keyof typeof FAIXAS_DE_DURACAO;

export interface PassoDaPratica {
  /** Segundos desde o início da prática em que o passo começa. */
  inicio: number;
  texto: string;
}
export interface Pratica {
  id: string;
  /** Muda quando o roteiro muda; sessões guardam a versão praticada. */
  versao: number;
  titulo: string;
  finalidade: Finalidade;
  minutos: number;
  descricao: string;
  passos: readonly PassoDaPratica[];
}

const CUIDADO =
  'Se em algum momento sentir desconforto, volte à respiração natural, abra os olhos ou interrompa a prática.';

export const PRATICAS: readonly Pratica[] = [
  {
    id: 'pausa-de-tres-minutos',
    versao: 1,
    titulo: 'Pausa de três minutos',
    finalidade: 'relaxar',
    minutos: 3,
    descricao:
      'Um intervalo curto para notar como você está, respirar com calma e voltar ao dia com mais presença.',
    passos: [
      {
        inicio: 0,
        texto: `Vamos fazer uma pausa de três minutos. Sente-se ou fique de pé de um jeito confortável. ${CUIDADO}`,
      },
      {
        inicio: 20,
        texto:
          'Perceba como você está agora. Quais pensamentos passam pela sua mente? Apenas note, sem precisar mudar nada.',
      },
      {
        inicio: 50,
        texto:
          'Perceba também as sensações do corpo: o contato dos pés com o chão, o peso do corpo, as mãos.',
      },
      {
        inicio: 80,
        texto:
          'Agora leve a atenção para a respiração. Sinta o ar entrar e sair, no seu ritmo natural.',
      },
      {
        inicio: 110,
        texto:
          'Se a mente se distrair, tudo bem. Gentilmente, volte a perceber a próxima respiração.',
      },
      {
        inicio: 140,
        texto:
          'Amplie a atenção para o corpo inteiro respirando, do topo da cabeça até os pés.',
      },
      {
        inicio: 165,
        texto:
          'Quando estiver pronta ou pronto, abra os olhos e leve um pouco desta calma para o que vem a seguir.',
      },
    ],
  },
  {
    id: 'intencao-da-manha',
    versao: 1,
    titulo: 'Intenção para o dia',
    finalidade: 'manha',
    minutos: 3,
    descricao:
      'Alguns minutos para despertar o corpo com a respiração e escolher uma intenção simples para o dia.',
    passos: [
      {
        inicio: 0,
        texto: `Bom dia. Encontre uma posição confortável e, se quiser, feche os olhos. ${CUIDADO}`,
      },
      {
        inicio: 20,
        texto:
          'Respire fundo pelo nariz, enchendo o peito devagar, e solte o ar pela boca, sem pressa. Repita mais duas vezes.',
      },
      {
        inicio: 55,
        texto:
          'Agora deixe a respiração voltar ao natural. Perceba o corpo acordando: os ombros, as mãos, o rosto.',
      },
      {
        inicio: 85,
        texto:
          'Pergunte a si mesma ou a si mesmo: como eu gostaria de viver o dia de hoje? Calma, paciência, coragem, gentileza?',
      },
      {
        inicio: 115,
        texto:
          'Escolha uma palavra para ser sua intenção. Repita essa palavra em silêncio a cada expiração.',
      },
      {
        inicio: 150,
        texto:
          'Quando quiser, abra os olhos. Leve sua intenção com você e volte a ela sempre que lembrar.',
      },
    ],
  },
  {
    id: 'respirar-e-desacelerar',
    versao: 1,
    titulo: 'Respirar e desacelerar',
    finalidade: 'relaxar',
    minutos: 5,
    descricao:
      'Respirações lentas e uma atenção suave ao corpo para reduzir o ritmo depois de um momento corrido.',
    passos: [
      {
        inicio: 0,
        texto: `Vamos desacelerar por cinco minutos. Ajuste a postura para ficar confortável e solte os ombros. ${CUIDADO}`,
      },
      {
        inicio: 25,
        texto:
          'Inspire pelo nariz contando até quatro. Solte o ar devagar contando até seis. Faça isso no seu ritmo, sem forçar.',
      },
      {
        inicio: 70,
        texto:
          'Continue assim: entrada um pouco mais curta, saída um pouco mais longa. A saída lenta convida o corpo a descansar.',
      },
      {
        inicio: 120,
        texto:
          'Perceba a mandíbula. Se estiver apertada, deixe os dentes se afastarem um pouco e a língua repousar.',
      },
      {
        inicio: 160,
        texto:
          'Perceba a testa e o espaço entre as sobrancelhas. Deixe que se suavizem a cada expiração.',
      },
      {
        inicio: 200,
        texto:
          'Agora deixe a respiração voltar ao ritmo natural. Apenas observe, sem controlar.',
      },
      {
        inicio: 245,
        texto:
          'Note se algo mudou desde o início. Não há resposta certa: apenas perceba.',
      },
      {
        inicio: 275,
        texto:
          'Para terminar, mexa devagar os dedos das mãos e dos pés, e abra os olhos quando quiser.',
      },
    ],
  },
  {
    id: 'ancora-da-respiracao',
    versao: 1,
    titulo: 'Âncora da respiração',
    finalidade: 'foco',
    minutos: 5,
    descricao:
      'Use a respiração como ponto de apoio para treinar a atenção e voltar ao que importa, sem cobrança.',
    passos: [
      {
        inicio: 0,
        texto: `Esta prática ajuda a treinar a atenção. Sente-se com a coluna confortável e as mãos apoiadas. ${CUIDADO}`,
      },
      {
        inicio: 20,
        texto:
          'Escolha um ponto onde você sente bem a respiração: as narinas, o peito ou a barriga. Esse será seu ponto de apoio.',
      },
      {
        inicio: 55,
        texto:
          'Conte as respirações em silêncio: inspira e expira, um. Inspira e expira, dois. Até dez, e recomece do um.',
      },
      {
        inicio: 100,
        texto:
          'Se perder a conta, não tem problema. Perceber que se distraiu já é parte do treino. Recomece do um.',
      },
      {
        inicio: 150,
        texto:
          'Continue contando. A cada volta, perceba um pouco mais de detalhe: a temperatura do ar, o movimento do corpo.',
      },
      {
        inicio: 200,
        texto:
          'Agora solte a contagem e apenas acompanhe a respiração por alguns instantes.',
      },
      {
        inicio: 240,
        texto:
          'Antes de voltar, escolha a próxima tarefa que vai fazer. Uma só, com toda a sua atenção.',
      },
      {
        inicio: 275,
        texto: 'Abra os olhos e comece por ela. Bom trabalho.',
      },
    ],
  },
  {
    id: 'acolher-o-que-sente',
    versao: 1,
    titulo: 'Acolher o que sente',
    finalidade: 'emocoes',
    minutos: 5,
    descricao:
      'Um espaço gentil para reconhecer uma emoção, perceber onde ela aparece no corpo e cuidar de si.',
    passos: [
      {
        inicio: 0,
        texto: `Vamos reservar alguns minutos para acolher o que você está sentindo. Fique em uma posição confortável. ${CUIDADO} Se a emoção ficar intensa demais, procure apoio de alguém de confiança.`,
      },
      {
        inicio: 30,
        texto:
          'Respire algumas vezes com calma. Depois, pergunte a si: o que estou sentindo agora?',
      },
      {
        inicio: 65,
        texto:
          'Tente dar um nome a esse sentimento: cansaço, preocupação, tristeza, irritação, alegria. Um nome simples basta.',
      },
      {
        inicio: 105,
        texto:
          'Perceba onde ele aparece no corpo. Talvez no peito, na garganta, no estômago ou nos ombros.',
      },
      {
        inicio: 145,
        texto:
          'Leve a respiração até essa região, como se o ar abrisse um pouco mais de espaço ali.',
      },
      {
        inicio: 185,
        texto:
          'Se quiser, coloque uma das mãos sobre o peito e diga em silêncio: está tudo bem sentir isso. Eu posso cuidar de mim.',
      },
      {
        inicio: 230,
        texto:
          'Pense em um gesto pequeno de cuidado que pode fazer depois: um copo de água, uma conversa, um momento de descanso.',
      },
      {
        inicio: 270,
        texto:
          'Respire mais uma vez com calma e, quando quiser, abra os olhos.',
      },
    ],
  },
  {
    id: 'escaneamento-corporal',
    versao: 1,
    titulo: 'Escaneamento corporal',
    finalidade: 'relaxar',
    minutos: 10,
    descricao:
      'Percorra o corpo com a atenção, dos pés à cabeça, notando e soltando tensões aos poucos.',
    passos: [
      {
        inicio: 0,
        texto: `Vamos percorrer o corpo com a atenção. Deite-se ou sente-se de forma confortável e feche os olhos, se quiser. ${CUIDADO}`,
      },
      {
        inicio: 30,
        texto:
          'Respire algumas vezes devagar. Sinta o corpo sendo sustentado pela cama, pelo chão ou pela cadeira.',
      },
      {
        inicio: 70,
        texto:
          'Leve a atenção para os pés. Perceba os dedos, as solas, os calcanhares. Não precisa mexer: apenas sinta.',
      },
      {
        inicio: 120,
        texto:
          'Suba para os tornozelos, as pernas e os joelhos. Se notar tensão, imagine que ela se solta ao expirar.',
      },
      {
        inicio: 170,
        texto:
          'Perceba as coxas, o quadril e a região da lombar. Deixe que fiquem pesados e apoiados.',
      },
      {
        inicio: 225,
        texto:
          'Leve a atenção para a barriga. Sinta-a subir e descer com a respiração.',
      },
      {
        inicio: 275,
        texto:
          'Perceba o peito, as costas e os ombros. Deixe os ombros descerem um pouco, longe das orelhas.',
      },
      {
        inicio: 330,
        texto:
          'Siga pelos braços, cotovelos, punhos e mãos, até a ponta de cada dedo.',
      },
      {
        inicio: 385,
        texto:
          'Perceba o pescoço, a nuca e o rosto: mandíbula, bochechas, olhos e testa. Suavize cada parte.',
      },
      {
        inicio: 445,
        texto:
          'Agora sinta o corpo inteiro de uma vez, respirando como um todo, do topo da cabeça até os pés.',
      },
      {
        inicio: 510,
        texto:
          'Fique alguns instantes apenas descansando nessa percepção, sem precisar fazer nada.',
      },
      {
        inicio: 565,
        texto:
          'Para terminar, aprofunde a respiração, mexa as mãos e os pés e abra os olhos quando quiser.',
      },
    ],
  },
  {
    id: 'preparar-o-sono',
    versao: 1,
    titulo: 'Preparar o sono',
    finalidade: 'dormir',
    minutos: 10,
    descricao:
      'Uma transição tranquila para a noite: respiração lenta, corpo pesado e pensamentos colocados de lado.',
    passos: [
      {
        inicio: 0,
        texto: `Esta prática acompanha a preparação para dormir. Deite-se, ajuste o travesseiro e deixe a luz baixa, se puder. ${CUIDADO}`,
      },
      {
        inicio: 35,
        texto:
          'Respire devagar. Inspire contando até quatro e solte o ar contando até seis, algumas vezes.',
      },
      {
        inicio: 85,
        texto:
          'Deixe a respiração voltar ao natural. Perceba o peso do corpo afundando um pouco mais na cama.',
      },
      {
        inicio: 135,
        texto:
          'Se vierem pensamentos sobre o dia, imagine que você os coloca em uma caixa ao lado da cama. Eles podem esperar até amanhã.',
      },
      {
        inicio: 195,
        texto:
          'Solte o rosto, a mandíbula e os ombros. A cada expiração, o corpo fica um pouco mais pesado.',
      },
      {
        inicio: 255,
        texto:
          'Solte também os braços, as mãos, as pernas e os pés. Não há nada que você precise fazer agora.',
      },
      {
        inicio: 320,
        texto:
          'Lembre de um momento simples e agradável do dia, por menor que seja. Fique com ele por alguns instantes.',
      },
      {
        inicio: 390,
        texto:
          'Volte a perceber a respiração, lenta e tranquila, como ondas indo e vindo.',
      },
      {
        inicio: 460,
        texto:
          'Se o sono chegar, permita. Se não chegar, tudo bem: o descanso também faz bem.',
      },
      {
        inicio: 540,
        texto:
          'A prática termina em instantes. Você pode continuar descansando no silêncio. Boa noite.',
      },
    ],
  },
  {
    id: 'relaxamento-progressivo',
    versao: 1,
    titulo: 'Relaxamento muscular progressivo',
    finalidade: 'dormir',
    minutos: 15,
    descricao:
      'Contraia e solte grupos musculares aos poucos para perceber a diferença entre tensão e descanso.',
    passos: [
      {
        inicio: 0,
        texto: `Nesta prática, você vai contrair levemente alguns músculos e depois soltá-los. Use pouca força e pule qualquer parte que tenha dor ou lesão. ${CUIDADO}`,
      },
      {
        inicio: 40,
        texto:
          'Deite-se ou sente-se com apoio. Respire devagar algumas vezes antes de começar.',
      },
      {
        inicio: 80,
        texto:
          'Comece pelas mãos: feche-as com leveza por alguns segundos. Agora solte e perceba a diferença.',
      },
      {
        inicio: 140,
        texto:
          'Dobre os cotovelos e contraia levemente os braços. Segure um instante e solte, deixando os braços pesados.',
      },
      {
        inicio: 200,
        texto:
          'Eleve um pouco os ombros em direção às orelhas. Segure e solte, deixando-os descer.',
      },
      {
        inicio: 260,
        texto:
          'Franza levemente a testa e aperte os olhos. Segure e solte, sentindo o rosto se suavizar.',
      },
      {
        inicio: 320,
        texto:
          'Encoste suavemente os dentes, sem apertar com força. Solte a mandíbula e deixe a boca levemente aberta.',
      },
      {
        inicio: 380,
        texto:
          'Contraia de leve a barriga, como se fosse se proteger. Segure e solte, deixando a respiração fluir.',
      },
      {
        inicio: 440,
        texto:
          'Contraia levemente as coxas e os glúteos. Segure um instante e solte.',
      },
      {
        inicio: 500,
        texto:
          'Puxe a ponta dos pés em direção ao corpo, sentindo as panturrilhas. Segure e solte.',
      },
      {
        inicio: 560,
        texto:
          'Agora curve os dedos dos pés para baixo, com leveza. Segure e solte.',
      },
      {
        inicio: 620,
        texto:
          'Perceba o corpo inteiro mais pesado e solto. Se alguma parte ainda estiver tensa, respire em direção a ela.',
      },
      {
        inicio: 700,
        texto:
          'Fique alguns minutos descansando, apenas sentindo a respiração e o apoio do corpo.',
      },
      {
        inicio: 800,
        texto:
          'Você pode continuar assim até o fim da prática, ou adormecer, se for hora de dormir.',
      },
      {
        inicio: 870,
        texto:
          'A prática está terminando. Se for continuar o dia, mexa as mãos e os pés devagar antes de se levantar.',
      },
    ],
  },
];

export function praticaPorId(id: string) {
  return PRATICAS.find((p) => p.id === id) ?? null;
}
export function faixaDaPratica(p: Pratica): FaixaDeDuracao {
  return (Object.keys(FAIXAS_DE_DURACAO) as FaixaDeDuracao[]).find(
    (f) =>
      p.minutos >= FAIXAS_DE_DURACAO[f].minimo &&
      p.minutos <= FAIXAS_DE_DURACAO[f].maximo
  )!;
}
/** Índice do passo em curso para o tempo decorrido (em segundos). */
export function passoNoTempo(p: Pratica, segundos: number) {
  let atual = 0;
  for (let i = 0; i < p.passos.length; i++)
    if (p.passos[i].inicio <= segundos) atual = i;
  return atual;
}

import type { Verbete } from './tipos';

/**
 * Yoga, práticas e tradição (tarefa 197): temas que as pessoas perguntam no
 * dia a dia e que a base ainda não cobria. Fontes: Yoga Sutras de Patanjali,
 * Hatha Yoga Pradipika, Sat-Chakra-Nirupana, Bhagavad Gita, Upanishads,
 * Puranas, Agamas, Brihat Parashara Hora Shastra e Brihat Samhita.
 *
 * Situação da curadoria: redigidos em 16/11/2026 a partir das fontes citadas
 * em cada verbete e ainda pendentes da conferência do titular do projeto,
 * como os demais verbetes da base. São orientações de bem-estar e de
 * autoconhecimento: não substituem avaliação profissional de saúde.
 */
export const YOGA_E_TRADICAO: readonly Verbete[] = [
  {
    id: 'ashtanga-yoga',
    area: 'yoga',
    titulo: 'Os oito passos do Yoga (Ashtanga)',
    resumo:
      'Patanjali organiza o Yoga em oito passos, da conduta com os outros até a absorção meditativa; a postura é só um deles.',
    pontos: [
      'Yama: cinco atitudes com os outros (não violência, verdade, não roubar, moderação e desapego).',
      'Niyama: cinco cuidados consigo (limpeza, contentamento, disciplina, estudo de si e entrega).',
      'Asana (postura) e Pranayama (respiração) preparam o corpo e a energia.',
      'Pratyahara: recolher os sentidos, tirando a atenção do que distrai.',
      'Dharana (concentração), Dhyana (meditação) e Samadhi (absorção) formam o caminho interior.',
    ],
    pratica:
      'Escolha um yama para observar por uma semana, por exemplo a verdade nas pequenas falas, antes de pensar em posturas difíceis.',
    palavrasChave: [
      'ashtanga',
      'oito passos',
      'oito membros',
      'yama',
      'niyama',
      'pratyahara',
      'patanjali',
      'yoga sutras',
    ],
    fonte: 'Yoga Sutras de Patanjali, II.29 a III.3',
  },
  {
    id: 'pranayama',
    area: 'yoga',
    titulo: 'Pranayama: a respiração consciente',
    resumo:
      'Pranayama é o cuidado com a respiração: alongar e acalmar a inspiração, a expiração e as pausas para aquietar a mente.',
    pontos: [
      'Patanjali o define como a regulação da inspiração e da expiração, depois que a postura está firme.',
      'A Hatha Yoga Pradipika ensina que, quando a respiração se agita, a mente se agita; quando ela se aquieta, a mente se aquieta.',
      'Nadi Shodhana, a respiração alternada pelas narinas, é a prática clássica de limpeza e de calma.',
      'Expirar mais devagar do que inspirar é a forma mais simples de acalmar.',
      'Retenções longas e respirações fortes pedem um professor; a tradição avisa que devem ser aprendidas aos poucos.',
    ],
    pratica:
      'Sente-se com a coluna ereta e, por três minutos, inspire contando quatro e expire contando seis, sem forçar. Com falta de ar, tontura ou ansiedade forte, pare; diante de sintomas que persistem, procure um profissional de saúde.',
    palavrasChave: [
      'pranayama',
      'respiracao',
      'respirar',
      'nadi shodhana',
      'respiracao alternada',
      'kumbhaka',
    ],
    fonte:
      'Yoga Sutras de Patanjali, II.49 a II.53, e Hatha Yoga Pradipika, cap. 2',
  },
  {
    id: 'asana',
    area: 'yoga',
    titulo: 'Asana: a postura',
    resumo:
      'Asana é a postura do Yoga: para Patanjali, uma posição firme e confortável; a Hatha Yoga a desenvolve para dar saúde e leveza ao corpo.',
    pontos: [
      'A definição clássica tem duas palavras: firme (sthira) e confortável (sukha).',
      'A postura se aperfeiçoa soltando o esforço, não aumentando a força.',
      'A Hatha Yoga Pradipika descreve as posturas como o primeiro passo, que traz estabilidade, saúde e leveza.',
      'O objetivo original é conseguir sentar-se em quietude para respirar e meditar.',
    ],
    pratica:
      'Faça poucas posturas, com conforto e respiração livre, sem buscar dor. Para dor nas costas ou qualquer lesão, a escolha das posturas deve ser feita com um profissional de saúde e um professor qualificado; a Lyra não indica posturas para tratar dores.',
    palavrasChave: [
      'asana',
      'asanas',
      'postura',
      'posturas',
      'hatha yoga',
      'alongamento',
    ],
    fonte:
      'Yoga Sutras de Patanjali, II.46 a II.48, e Hatha Yoga Pradipika, cap. 1',
  },
  {
    id: 'dhyana',
    area: 'yoga',
    titulo: 'Dhyana: como meditar',
    resumo:
      'Meditar, no Yoga, é manter a atenção num único ponto até ela fluir sem interrupção; começa pela concentração e se aprende com constância e moderação.',
    pontos: [
      'Dharana é fixar a atenção num ponto; Dhyana é quando essa atenção flui contínua.',
      'A Bhagavad Gita orienta: um lugar limpo e calmo, assento firme, coluna, pescoço e cabeça alinhados.',
      'A mente que se distrai é trazida de volta com gentileza, quantas vezes for preciso.',
      'O Yoga é para quem é moderado no comer, no dormir, no trabalho e no descanso.',
      'O que firma a prática é a repetição por muito tempo, sem interrupção e com dedicação.',
    ],
    pratica:
      'Para começar: cinco minutos por dia, no mesmo horário, sentado e observando a respiração. Quando perceber que se distraiu, apenas volte; isso já é a prática.',
    palavrasChave: [
      'dhyana',
      'meditacao',
      'meditar',
      'dharana',
      'concentracao',
    ],
    fonte:
      'Yoga Sutras de Patanjali, I.12 a I.14 e III.1 a III.2, e Bhagavad Gita, cap. 6',
  },
  {
    id: 'chakras',
    area: 'yoga',
    titulo: 'Os chakras',
    resumo:
      'Chakras ("rodas") são centros sutis de energia ao longo da coluna; a tradição descreve seis, do períneo ao ponto entre as sobrancelhas, e o lótus de mil pétalas no alto da cabeça.',
    pontos: [
      'Muladhara, na base da coluna: elemento terra, quatro pétalas, som LAM; segurança e chão.',
      'Svadhisthana, abaixo do umbigo: água, seis pétalas, som VAM; prazer e criatividade.',
      'Manipura, no umbigo: fogo, dez pétalas, som RAM; vontade e ação.',
      'Anahata, no coração: ar, doze pétalas, som YAM; amor e compaixão.',
      'Vishuddha, na garganta: espaço, dezesseis pétalas, som HAM; expressão e verdade.',
      'Ajna, entre as sobrancelhas: duas pétalas, som OM; intuição e clareza.',
      'Sahasrara, no alto da cabeça: o lótus de mil pétalas, a consciência plena.',
    ],
    pratica:
      'Leve a atenção, um minuto por vez, da base da coluna ao alto da cabeça, só observando as sensações. Os chakras são um mapa simbólico da tradição do Yoga, não um diagnóstico do corpo.',
    palavrasChave: [
      'chakra',
      'chakras',
      'muladhara',
      'svadhisthana',
      'manipura',
      'anahata',
      'vishuddha',
      'ajna',
      'sahasrara',
      'centros de energia',
    ],
    fonte: 'Sat-Chakra-Nirupana, de Purnananda, e Hatha Yoga Pradipika',
  },
  {
    id: 'kundalini',
    area: 'yoga',
    titulo: 'Kundalini',
    resumo:
      'Kundalini é a energia que a tradição descreve como adormecida na base da coluna, enrolada como uma serpente; despertá-la é fazê-la subir pelo canal central até o alto da cabeça.',
    pontos: [
      'Três canais principais: Ida (lunar, à esquerda), Pingala (solar, à direita) e Sushumna (central).',
      'Ao subir pela Sushumna, a energia atravessa os chakras, um a um.',
      'A Hatha Yoga Pradipika a chama de sustentação de todas as práticas do Yoga.',
      'Os textos pedem preparação, um professor e paciência: não é uma técnica para apressar.',
    ],
    pratica:
      'Cuide da base: rotina regular, respiração calma e meditação simples. Experiências intensas, medo ou insônia depois de práticas fortes pedem pausa e o apoio de um profissional de saúde.',
    palavrasChave: [
      'kundalini',
      'ida',
      'pingala',
      'sushumna',
      'nadis',
      'energia da coluna',
      'serpente',
    ],
    fonte: 'Hatha Yoga Pradipika, cap. 3, e Sat-Chakra-Nirupana',
  },
  {
    id: 'samsara',
    area: 'vedanta',
    titulo: 'Samsara: reencarnação e renascimento',
    resumo:
      'Samsara é o ciclo de nascer, morrer e renascer; para a tradição, o eu essencial (Atman) não morre e passa de um corpo a outro, levado pelas ações e pelos desejos.',
    pontos: [
      'A Bhagavad Gita compara: como alguém troca roupas gastas por novas, o Ser deixa corpos gastos e toma outros.',
      'O Brihadaranyaka Upanishad ensina que a pessoa se torna aquilo que faz e que deseja.',
      'O que segue adiante são as impressões das ações (karma), não a personalidade inteira.',
      'A meta não é renascer melhor, mas a libertação do ciclo (moksha), pelo conhecimento de quem se é.',
    ],
    pratica:
      'Use a ideia como convite à responsabilidade: cada ação de hoje é uma semente. A Lyra não diz quem você foi em outras vidas; isso não se calcula.',
    palavrasChave: [
      'samsara',
      'reencarnacao',
      'renascimento',
      'vidas passadas',
      'outras vidas',
      'moksha',
      'vida apos a morte',
    ],
    fonte: 'Bhagavad Gita, II.13 e II.22, e Brihadaranyaka Upanishad, IV.4',
  },
  {
    id: 'svapna',
    area: 'vedanta',
    titulo: 'Os sonhos na tradição védica',
    resumo:
      'Para os Upanishads, o sonho (svapna) é um dos estados da consciência: nele a mente cria um mundo com as impressões que guardou da vigília.',
    pontos: [
      'O Mandukya Upanishad chama o estado de sonho de Taijasa, "o luminoso", voltado para dentro.',
      'O Brihadaranyaka Upanishad descreve que, no sonho, a pessoa cria os próprios carros, estradas e alegrias.',
      'O sonho é usado como exemplo: o que parece sólido enquanto dura depende de quem o percebe.',
      'A consciência que testemunha o sonho é a mesma que testemunha a vigília.',
    ],
    pratica:
      'Ao acordar, anote o sonho em poucas linhas e observe os sentimentos que ele deixou. A Lyra não interpreta sonhos nem os trata como previsão.',
    palavrasChave: [
      'svapna',
      'sonho',
      'sonhos',
      'sonhar',
      'pesadelo',
      'taijasa',
    ],
    fonte: 'Mandukya Upanishad, 4, e Brihadaranyaka Upanishad, IV.3',
  },
  {
    id: 'mantra-japa',
    area: 'yoga',
    titulo: 'Mantra e japa',
    resumo:
      'Mantra é um som ou uma frase sagrada que se repete para firmar a mente; japa é essa repetição, em voz alta, em sussurro ou em silêncio.',
    pontos: [
      'OM é o som que o Mandukya Upanishad apresenta como o todo: passado, presente e futuro.',
      'O Gayatri, do Rig Veda, é a prece à luz do Sol para iluminar o entendimento.',
      'A Bhagavad Gita coloca o japa como a mais elevada das oferendas.',
      'O costume é repetir 108 vezes, com um colar de contas (mala).',
      'O efeito tradicional do mantra é aquietar e orientar a mente, não garantir resultados externos.',
    ],
    pratica:
      'Escolha um mantra curto, como OM, e repita por cinco minutos ao acordar. A Lyra não promete prosperidade, cura ou qualquer resultado por recitar um mantra.',
    palavrasChave: [
      'mantra',
      'mantras',
      'japa',
      'recitar',
      'om',
      'gayatri',
      'mala',
      '108',
    ],
    fonte: 'Mandukya Upanishad, 1, Rig Veda, III.62.10, e Bhagavad Gita, X.25',
  },
  {
    id: 'ekadashi',
    area: 'tradicao',
    titulo: 'Ekadashi: o jejum do décimo primeiro dia',
    resumo:
      'Ekadashi é o décimo primeiro dia lunar (tithi) de cada quinzena, crescente e minguante; a tradição o dedica a Vishnu, com jejum, simplicidade e oração.',
    pontos: [
      'Acontece duas vezes por mês lunar, uma em cada quinzena.',
      'A observância vai do jejum completo a uma alimentação leve, sem grãos, conforme a pessoa.',
      'Os Puranas o apresentam como dia de recolhimento, estudo e devoção.',
      'O jejum é encerrado no dia seguinte, depois do nascer do sol.',
      'A Lyra calcula o tithi do seu dia em "Meu dia".',
    ],
    pratica:
      'Se quiser observar, comece por uma versão leve: refeições simples e mais silêncio. Gestantes, crianças, idosos e quem tem diabetes ou outra condição de saúde devem conversar com um profissional antes de jejuar.',
    palavrasChave: [
      'ekadashi',
      'jejum',
      'jejuar',
      'decimo primeiro dia',
      'vrata',
    ],
    fonte: 'Padma Purana e tradição dos Dharma Shastras',
  },
  {
    id: 'devatas',
    area: 'tradicao',
    titulo: 'As divindades hindus',
    resumo:
      'A tradição hindu fala de muitas divindades como faces de uma só realidade: "a verdade é uma, os sábios a chamam por muitos nomes".',
    pontos: [
      'Trimurti: Brahma (a criação), Vishnu (a preservação) e Shiva (a transformação).',
      'Devi, a Mãe, aparece como Sarasvati (saber), Lakshmi (prosperidade) e Parvati ou Durga (força).',
      'Ganesha remove obstáculos e é lembrado no início de qualquer empreendimento.',
      'Vishnu vem ao mundo em avatares, como Rama e Krishna.',
      'Nos Vedas, Agni, Indra, Surya e Soma são forças da natureza e da consciência.',
    ],
    pratica:
      'Veja cada divindade como uma qualidade a cultivar: o saber de Sarasvati, a coragem de Durga, o recomeço de Ganesha.',
    palavrasChave: [
      'deuses',
      'deus',
      'divindades',
      'devatas',
      'trimurti',
      'brahma',
      'vishnu',
      'shiva',
      'ganesha',
      'lakshmi',
      'sarasvati',
      'durga',
      'krishna',
      'hinduismo',
    ],
    fonte: 'Rig Veda, I.164.46, e Puranas',
  },
  {
    id: 'tantra',
    area: 'tradicao',
    titulo: 'Tantra',
    resumo:
      'Tantra é um conjunto de tradições e de textos que ensinam práticas com mantra, símbolo, ritual e energia; trata o corpo e o mundo como caminhos de realização, e não como obstáculos.',
    pontos: [
      'Os textos são chamados Tantras ou Agamas e existem nas linhas de Shiva, de Vishnu e da Deusa (Shakti).',
      'Instrumentos centrais: mantra (som), yantra (diagrama) e a visualização da energia nos chakras.',
      'Shiva é a consciência e Shakti a energia: a prática busca reconhecer a união dos dois.',
      'A transmissão por um mestre é tratada como condição, não como detalhe.',
      'Reduzir o Tantra a sexualidade é uma leitura moderna e parcial da tradição.',
    ],
    pratica:
      'Experimente o princípio em algo simples: fazer uma tarefa do dia com atenção total, como se fosse uma oferenda.',
    palavrasChave: [
      'tantra',
      'tantras',
      'tantrico',
      'agamas',
      'yantra',
      'shakti',
    ],
    fonte: 'Agamas e Tantras, entre eles o Kularnava Tantra',
  },
  {
    id: 'puja',
    area: 'tradicao',
    titulo: 'Puja: a oferenda',
    resumo:
      'Puja é o rito de reverência em que se recebe a divindade como a um hóspede querido, oferecendo água, flores, incenso, luz e alimento.',
    pontos: [
      'A forma completa tem dezesseis oferendas (shodashopachara); a simples tem cinco.',
      'As cinco oferendas correspondem aos elementos: perfume (terra), flores (espaço), incenso (ar), lamparina (fogo) e alimento (água).',
      'O rito costuma terminar com a luz erguida diante da imagem (arati) e a partilha do alimento oferecido (prasada).',
      'Os textos dão mais valor à intenção e à limpeza do que à quantidade de itens.',
    ],
    pratica:
      'Em casa, um canto limpo, uma vela ou lamparina, uma flor e um minuto de gratidão já formam uma puja simples. Com chama acesa, não deixe o local sem atenção.',
    palavrasChave: [
      'puja',
      'oferenda',
      'oferendas',
      'arati',
      'prasada',
      'altar',
      'culto',
    ],
    fonte: 'Agamas e Grihya Sutras',
  },
  {
    id: 'graha-vakri',
    area: 'jyotish',
    titulo: 'Planetas retrógrados (vakri)',
    resumo:
      'Um planeta está retrógrado (vakri) quando, visto da Terra, parece andar para trás no céu; no Jyotish isso muda o modo como ele age, sem ser um mau sinal por si só.',
    pontos: [
      'O movimento é aparente: resulta das velocidades diferentes da Terra e do planeta.',
      'O Sol e a Lua nunca ficam retrógrados; Rahu e Ketu, os nodos, andam sempre para trás.',
      'Mercúrio fica retrógrado cerca de três vezes por ano, por aproximadamente três semanas.',
      'No Brihat Parashara Hora Shastra, o planeta retrógrado ganha força de movimento (cheshta bala).',
      'A leitura tradicional é de energia voltada para dentro: rever, refazer e amadurecer.',
      'A Lyra calcula e mostra, no seu mapa, quais planetas estavam retrógrados no nascimento.',
    ],
    pratica:
      'Num período de Mercúrio retrógrado, releia antes de enviar e confirme combinados. É um convite à revisão, não um motivo para adiar a vida.',
    palavrasChave: [
      'retrogrado',
      'retrogrados',
      'retrogrado mercurio',
      'mercurio retrogrado',
      'vakri',
      'retrogradacao',
    ],
    fonte: 'Surya Siddhanta e Brihat Parashara Hora Shastra (Shadbala)',
  },
  {
    id: 'compatibilidade',
    area: 'jyotish',
    titulo: 'Compatibilidade de casal no Jyotish (Ashtakuta)',
    resumo:
      'A tradição védica compara os mapas de um casal pelas Luas de nascimento, em oito critérios que somam 36 pontos (Ashtakuta); é o equivalente védico da sinastria.',
    pontos: [
      'Os oito critérios e seus pontos: Varna (1), Vashya (2), Tara (3), Yoni (4), Graha Maitri (5), Gana (6), Bhakuta (7) e Nadi (8).',
      'Cada um olha um aspecto: temperamento, atração, saúde, afinidade mental, natureza e bem-estar da união.',
      'A base da comparação é o nakshatra e o signo da Lua de cada pessoa.',
      'Os textos tratam a pontuação como um começo de conversa: o mapa inteiro e a vontade dos dois contam mais.',
      'A Lyra ainda não calcula a compatibilidade entre dois mapas: esse cálculo está indisponível.',
    ],
    pratica:
      'Enquanto o cálculo não existe na Lyra, compare o que cada um precisa para se sentir seguro, pela Lua do próprio mapa, e conversem sobre isso.',
    palavrasChave: [
      'compatibilidade',
      'sinastria',
      'casal',
      'ashtakuta',
      'ashtakoota',
      'guna milan',
      'relacionamento',
    ],
    fonte: 'Muhurta Chintamani e tradição do Brihat Parashara Hora Shastra',
  },
  {
    id: 'navaratna',
    area: 'jyotish',
    titulo: 'Pedras e gemas dos planetas (Navaratna)',
    resumo:
      'O Jyotish associa nove gemas aos nove grahas (Navaratna); a tradição as usa como símbolo e reforço da qualidade de um planeta.',
    pontos: [
      'Sol: rubi. Lua: pérola. Marte: coral vermelho.',
      'Mercúrio: esmeralda. Júpiter: safira amarela. Vênus: diamante.',
      'Saturno: safira azul. Rahu: granada hessonita. Ketu: olho de gato.',
      'A escolha tradicional parte do mapa inteiro, não só do signo, e pede um astrólogo experiente.',
      'A Lyra mostra a gema ligada a cada planeta, mas não prescreve pedras nem promete efeitos.',
    ],
    pratica:
      'Use a gema do regente do seu Ascendente como lembrete da qualidade que você quer cultivar. Pedras e cristais não tratam doenças nem substituem cuidados de saúde.',
    palavrasChave: [
      'navaratna',
      'gema',
      'gemas',
      'pedra',
      'pedras',
      'cristal',
      'cristais',
      'rubi',
      'esmeralda',
      'safira',
    ],
    fonte: 'Brihat Samhita, de Varahamihira, e Garuda Purana',
  },
];

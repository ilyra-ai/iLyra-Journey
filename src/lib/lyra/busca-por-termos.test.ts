import { describe, expect, it } from 'vitest';

import { generateLocalAssistantReply } from '@/lib/ai/chat-engine';
import { getAstrologicalContext } from '@/lib/astrology/engine';
import { calcularMapaNatal } from '@/lib/astrology/mapa-natal';

import avaliacao from './avaliacao/perguntas.json';
import {
  criarBuscaPorTermos,
  NOTA_MINIMA_DE_REFERENCIA,
  notaMinimaPara,
  radicaisDoTexto,
} from './busca-por-termos';
import type { Verbete } from './conhecimento/tipos';
import {
  BASE_DE_CONHECIMENTO,
  buscarVerbete,
  encontrarVerbete,
  responderComoLyra,
  responderPelaBase,
} from './responder';

const busca = criarBuscaPorTermos(BASE_DE_CONHECIMENTO);
const agora = new Date('2026-11-16T12:00:00Z');
const astrologia = getAstrologicalContext(agora);

function conversar(pergunta: string) {
  return generateLocalAssistantReply(pergunta, {
    profile: { first_name: 'Ana', goals: ['sono profundo'] },
    latestMetric: {
      steps: 5200,
      sleep_duration_minutes: 380,
      hrv_ms: 35,
      readiness_score: 61,
      blood_glucose_mgdl: 118,
    },
    astrology: astrologia,
  });
}

describe('Radicais das palavras', () => {
  it('ignora palavras vazias, acentos e plural, e corta no radical', () => {
    expect(radicaisDoTexto('Quais são os rituais?')).toEqual(['ritua']);
    expect(radicaisDoTexto('alimentação')).toEqual(
      radicaisDoTexto('alimentar')
    );
    expect(radicaisDoTexto('camadas')).toEqual(radicaisDoTexto('camada'));
    // "quantos" é palavra de pergunta e não se confunde com "Quantum".
    expect(radicaisDoTexto('quantos passos dei ontem')).toEqual([
      'passo',
      'dei',
    ]);
    expect(radicaisDoTexto('   ')).toEqual([]);
  });
});

describe('Busca por termos', () => {
  it('encontra o verbete de perguntas do dia a dia sem a palavra-chave exata', () => {
    for (const [pergunta, id] of [
      ['quais são os diálogos antigos sobre a natureza do ser', 'upanishads'],
      ['é errado buscar prosperidade e prazer?', 'purusharthas'],
      ['como me adaptar ao clima de cada época do ano', 'ayurveda-estacoes'],
      ['qual a origem dos termos usados nos hinos', 'nirukta'],
    ] as const) {
      expect(buscarVerbete(pergunta)).toBeNull();
      expect(busca.buscar(pergunta)?.verbete.id).toBe(id);
      expect(encontrarVerbete(pergunta)?.id).toBe(id);
    }
  });

  it('recusa o que está fora do assunto em vez de devolver o menos distante', () => {
    for (const pergunta of [
      'qual o preço do bitcoin hoje',
      'me ajuda a programar em python',
      'como trocar um pneu furado',
      'receita de bolo de cenoura',
      '',
    ]) {
      expect(busca.buscar(pergunta)).toBeNull();
      expect(responderPelaBase(pergunta)).toBeNull();
    }
  });

  it('a nota mínima separa a recusa do melhor candidato', () => {
    const fraco = busca.melhor('qual a previsão do tempo para amanhã');
    expect(fraco).not.toBeNull();
    expect(fraco!.nota).toBeLessThan(busca.notaMinima);
    expect(busca.buscar('qual a previsão do tempo para amanhã')).toBeNull();
    const forte = busca.buscar(
      'o que é o estado de absorção total na meditação'
    );
    expect(forte!.nota).toBeGreaterThanOrEqual(busca.notaMinima);
    expect(forte!.termos.length).toBeGreaterThan(0);
  });

  it('a nota mínima acompanha o tamanho da base e vale a de referência com 30', () => {
    expect(notaMinimaPara(30)).toBeCloseTo(NOTA_MINIMA_DE_REFERENCIA, 10);
    expect(notaMinimaPara(BASE_DE_CONHECIMENTO.length)).toBe(busca.notaMinima);
    expect(notaMinimaPara(60)).toBeGreaterThan(notaMinimaPara(46));
    expect(notaMinimaPara(46)).toBeGreaterThan(notaMinimaPara(30));
    expect(notaMinimaPara(0)).toBe(NOTA_MINIMA_DE_REFERENCIA);
  });

  it('é determinística e funciona com uma base vazia ou de um verbete', () => {
    const pergunta = 'qual é a realidade última por trás de tudo';
    expect(busca.melhor(pergunta)).toEqual(busca.melhor(pergunta));
    expect(criarBuscaPorTermos([]).buscar(pergunta)).toBeNull();
    const unico: Verbete = BASE_DE_CONHECIMENTO[0];
    expect(criarBuscaPorTermos([unico]).melhor(unico.titulo)?.verbete.id).toBe(
      unico.id
    );
  });

  it('"o que significa" faz a pergunta e não leva à etimologia', () => {
    for (const pergunta of [
      'O que significa Rahu em Escorpião?',
      'O que significa a Lua em Touro?',
    ]) {
      expect(encontrarVerbete(pergunta)?.id).not.toBe('nirukta');
    }
    // "significado da palavra" continua sendo tema do Nirukta.
    expect(encontrarVerbete('Qual o significado da palavra yoga?')?.id).toBe(
      'nirukta'
    );
  });

  it('a palavra-chave exata continua tendo prioridade', () => {
    const pergunta = 'o que é vedanta';
    expect(buscarVerbete(pergunta)?.id).toBe('vedanta');
    expect(encontrarVerbete(pergunta)?.id).toBe('vedanta');
  });
});

describe('Régua de avaliação com a busca por termos', () => {
  const { itens } = avaliacao;
  const comVerbete = itens.filter((item) => item.tipo === 'com-verbete');
  const semResposta = itens.filter((item) => item.tipo !== 'com-verbete');

  it('acha mais que o dobro das perguntas sem perder a recusa', () => {
    const achou = comVerbete.filter((item) =>
      item.aceitos.includes(encontrarVerbete(item.pergunta)?.id ?? '')
    ).length;
    const recusou = semResposta.filter(
      (item) => encontrarVerbete(item.pergunta) === null
    ).length;
    // Régua v2, medida em 16/11/2026: 57 de 76 achados e 33 de 35
    // recusados (só palavras-chave: 31 de 76 e 34 de 35).
    expect(achou).toBeGreaterThanOrEqual(57);
    expect(recusou).toBeGreaterThanOrEqual(33);
  });

  it('fora do assunto, só o limite conhecido recebe verbete', () => {
    const foraDoAssunto = itens.filter(
      (item) => item.tipo === 'fora-do-assunto'
    );
    expect(foraDoAssunto).toHaveLength(25);
    // Limite conhecido da busca por termos, registrado na tarefa 197:
    // "terra" e "lua" levam ao verbete de planetas retrógrados. Qualquer
    // outro acerto falso faz este teste falhar.
    expect(
      foraDoAssunto
        .filter((item) => encontrarVerbete(item.pergunta) !== null)
        .map((item) => item.pergunta)
    ).toEqual(['qual a distância da terra à lua']);
  });

  it('responde 14 das 15 perguntas escritas antes dos verbetes novos', () => {
    const escritasAntes = itens.filter(
      (item) => 'origem' in item && item.origem === 'escrita-antes-do-verbete'
    );
    const achou = escritasAntes.filter((item) =>
      item.aceitos.includes(encontrarVerbete(item.pergunta)?.id ?? '')
    ).length;
    expect(achou).toBeGreaterThanOrEqual(14);
  });
});

describe('Chat do motor com a busca por termos', () => {
  it('responde pela base o que antes caía na resposta genérica', () => {
    const resposta = conversar('é errado buscar prosperidade e prazer?');
    expect(resposta).toContain('Purusharthas');
    expect(resposta).not.toContain('podemos explorar');
  });

  it('pergunta fora do assunto continua na resposta genérica', () => {
    expect(conversar('como trocar um pneu furado')).toContain(
      'podemos explorar'
    );
  });

  it('perguntas sobre os dados da própria pessoa não viram verbete', () => {
    expect(conversar('quantos passos dei ontem')).toContain('5200');
    const sono = conversar('como foi meu sono');
    expect(sono).toContain('6h 20m');
    for (const verbete of BASE_DE_CONHECIMENTO) {
      expect(sono).not.toContain(`Fonte: ${verbete.fonte}.`);
    }
  });

  it('a leitura dos mapas não muda: Ascendente, casa, dasha, Samādhi e Quantum', () => {
    const mapa = calcularMapaNatal(
      {
        data: '1990-12-01',
        hora: '10:30',
        latitude: -23.5475,
        longitude: -46.6361,
        fuso: 'America/Sao_Paulo',
      },
      agora
    );
    const perguntar = (pergunta: string) =>
      responderComoLyra(pergunta, { mapa, agora });
    expect(perguntar('qual é o meu ascendente')?.assunto).toBe('lagna');
    expect(perguntar('o que tenho na casa 10')?.assunto).toBe('casa-10');
    expect(perguntar('qual o meu dasha')?.assunto).toBe('dasha');
    expect(perguntar('qual a minha roda de cura')?.assunto).toBe('samadhi');
    expect(perguntar('como é o meu mapa natal')?.assunto).toBe('mapa');
    expect(perguntar('explica o score de ação')?.assunto).toMatch(/quantum/);
    expect(perguntar('quais os tipos de mapa')?.assunto).toBe('tipos-de-mapa');
    // O passo da base dentro da leitura segue só por palavra-chave exata.
    expect(perguntar('é errado buscar prosperidade e prazer?')).toBeNull();
  });
});

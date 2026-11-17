import { afterEach, describe, expect, it } from 'vitest';

import type { EloDaCadeia } from '@/lib/ai/cadeia-de-modelos';
import { calcularMapaNatal } from '@/lib/astrology/mapa-natal';

import type { Verbete } from './conhecimento/tipos';
import {
  BASE_DE_CONHECIMENTO,
  baseAtual,
  buscarVerbete,
  definirVerbetesGerados,
  encontrarVerbete,
  responderComoLyra,
  temAssuntoNaBase,
  textoDoVerbete,
} from './responder';
import {
  conferirVerbeteGerado,
  escreverVerbeteNaCadeia,
  hashDoVerbete,
  idDoTitulo,
  INSTRUCOES_DA_GERACAO,
  perguntaPedeVerbete,
  verbeteDaBase,
  type VerbeteEscrito,
} from './verbetes-gerados';

const PRANAS: VerbeteEscrito = {
  area: 'yoga',
  titulo: 'Os cinco Pranas (Vayus)',
  resumo:
    'A tradição do Yoga descreve a energia vital dividida em cinco movimentos, os Vayus, cada um com uma função no corpo e na mente.',
  pontos: [
    'Prana Vayu, no peito, rege a inspiração e o que entra.',
    'Apana Vayu, no baixo ventre, rege a eliminação e o que sai.',
    'Samana Vayu, no umbigo, rege a digestão e a assimilação.',
    'Udana Vayu, na garganta, rege a fala e o crescimento.',
    'Vyana Vayu, no corpo todo, rege a circulação.',
  ],
  pratica:
    'Observe a respiração por alguns minutos, notando a entrada e a saída do ar, sem forçar.',
  palavrasChave: ['Vayus', 'cinco pranas', 'apana', 'samana', 'udana'],
  fonte: 'Prashna Upanishad, cap. 3',
};

const resposta = (dados: unknown) => JSON.stringify(dados);
const conferir = (bruto: string, proibidos: string[] = []) =>
  conferirVerbeteGerado(bruto, { proibidos, base: BASE_DE_CONHECIMENTO });

describe('Conferência do verbete escrito pelo modelo', () => {
  it('aceita um verbete do domínio e normaliza as palavras-chave', () => {
    const conferida = conferir(resposta({ dominio: true, verbete: PRANAS }));
    expect(conferida).toMatchObject({ ok: true, dominio: true });
    if (!conferida.ok || !conferida.dominio) throw new Error('recusado');
    expect(conferida.verbete.palavrasChave).toEqual([
      'vayus',
      'cinco pranas',
      'apana',
      'samana',
      'udana',
    ]);
  });

  it('aceita a resposta de tema fora do domínio sem verbete', () => {
    expect(conferir(resposta({ dominio: false }))).toEqual({
      ok: true,
      dominio: false,
    });
  });

  it('aceita o JSON dentro de um bloco de código', () => {
    const bruto = '```json\n' + resposta({ dominio: false }) + '\n```';
    expect(conferir(bruto)).toEqual({ ok: true, dominio: false });
  });

  it('recusa formato errado, campo extra, área fora da lista e texto curto', () => {
    expect(conferir('não é json').ok).toBe(false);
    expect(conferir(resposta({ dominio: true })).ok).toBe(false);
    expect(
      conferir(resposta({ dominio: true, verbete: { ...PRANAS, extra: 1 } })).ok
    ).toBe(false);
    expect(
      conferir(
        resposta({ dominio: true, verbete: { ...PRANAS, area: 'mapa' } })
      ).ok
    ).toBe(false);
    expect(
      conferir(
        resposta({ dominio: true, verbete: { ...PRANAS, resumo: 'curto' } })
      ).ok
    ).toBe(false);
    expect(
      conferir(
        resposta({
          dominio: true,
          verbete: { ...PRANAS, pontos: ['só um ponto aqui'] },
        })
      ).ok
    ).toBe(false);
  });

  it('recusa tema fora do domínio que o modelo declarou como do domínio', () => {
    // Resposta real do gemma3:1b local em 17/11/2026 para "como trocar um pneu".
    const pneu = {
      area: 'yoga',
      titulo: 'Trocar um pneu',
      resumo:
        'O processo de trocar um pneu envolve a remoção do pneu defeituoso e a instalação do pneu novo, garantindo a segurança e a estabilidade do veículo.',
      pontos: [
        'Localize o pneu defeituoso e o kit de ferramentas.',
        'Remova o pneu do veículo.',
      ],
      pratica: 'Ajustar o pneu, verificar a pressão, e verificar a pressão.',
      palavrasChave: ['pneu', 'trocar', 'ferramentas'],
      fonte: 'Guia de Manutenção do Veículo - Manual do Proprietário',
    };
    expect(conferir(resposta({ dominio: true, verbete: pneu }))).toEqual({
      ok: false,
      motivo: 'fonte tradicional não reconhecida',
    });
    expect(
      conferir(
        resposta({
          dominio: true,
          verbete: { ...PRANAS, fonte: 'Blog de bem-estar, 2024' },
        })
      ).ok
    ).toBe(false);
    // Obras reconhecidas, inclusive no plural e com capítulo.
    for (const fonte of [
      'Bhagavad Gita, cap. 12',
      'Narada Bhakti Sutras',
      'Prashna Upanishad, cap. 3',
    ]) {
      expect(
        conferir(resposta({ dominio: true, verbete: { ...PRANAS, fonte } })).ok
      ).toBe(true);
    }
  });

  it('recusa voz de outro assistente e previsão de morte', () => {
    const outro = {
      ...PRANAS,
      pratica: 'Eu sou o ChatGPT e explico: observe a respiração com calma.',
    };
    expect(conferir(resposta({ dominio: true, verbete: outro }))).toMatchObject(
      {
        ok: false,
        motivo: expect.stringMatching(/outro assistente/),
      }
    );
    const morte = {
      ...PRANAS,
      pratica: 'Pelos Vayus dá para saber: você vai morrer cedo se não cuidar.',
    };
    expect(conferir(resposta({ dominio: true, verbete: morte })).ok).toBe(
      false
    );
  });

  it('recusa dado pessoal: e-mail, telefone, data, endereço da web e nome de quem perguntou', () => {
    const com = (pratica: string) =>
      resposta({ dominio: true, verbete: { ...PRANAS, pratica } });
    for (const pratica of [
      'Escreva para ana.souza@exemplo.com.br e observe a respiração.',
      'Ligue para (11) 98765-4321 e observe a respiração com calma.',
      'Comece em 12/03/1990 e observe a respiração com calma todo dia.',
      'Veja em https://exemplo.com e observe a respiração com calma.',
    ]) {
      expect(conferir(com(pratica)).ok).toBe(false);
    }
    expect(
      conferir(
        com('Mariana, observe a respiração por alguns minutos, sem forçar.'),
        ['Mariana']
      )
    ).toMatchObject({
      ok: false,
      motivo: 'verbete com dado de quem perguntou',
    });
    // Nome curto demais não é usado como filtro, para não recusar palavras comuns.
    expect(
      conferir(com('Observe a respiração por alguns minutos, sem forçar.'), [
        'Al',
      ]).ok
    ).toBe(true);
  });

  it('recusa verbete que já existe ou repete um assunto coberto', () => {
    const repetido = { ...PRANAS, titulo: 'Vedanta' };
    expect(
      conferir(resposta({ dominio: true, verbete: repetido }))
    ).toMatchObject({
      ok: false,
      motivo: 'verbete já existe na base',
    });
    const mesmoAssunto = {
      ...PRANAS,
      titulo: 'Respiração consciente e Nadi Shodhana',
      resumo:
        'Pranayama é o cuidado com a respiração: alongar e acalmar a inspiração, a expiração e as pausas para aquietar a mente.',
    };
    expect(
      conferir(resposta({ dominio: true, verbete: mesmoAssunto }))
    ).toMatchObject({ ok: false, motivo: expect.stringMatching(/pranayama/) });
  });
});

describe('Pedido ao modelo', () => {
  it('as instruções fixam o domínio, a fonte real e a ausência de dados pessoais', () => {
    expect(INSTRUCOES_DA_GERACAO).toMatch(/nunca mencione quem perguntou/);
    expect(INSTRUCOES_DA_GERACAO).toMatch(/"dominio": false/);
    expect(INSTRUCOES_DA_GERACAO).toMatch(/fonte real/);
  });

  it('só pede verbete para tema do domínio sem verbete na base', () => {
    const base = { encontrar: encontrarVerbete, temAssunto: temAssuntoNaBase };
    // Termos do vocabulário da base, sem verbete próprio.
    expect(perguntaPedeVerbete('o que são os cinco vayus', base)).toBe(true);
    expect(perguntaPedeVerbete('o que é bhakti yoga', base)).toBe(true);
    // Limite declarado: tema sem nenhum termo em comum com a base não chama
    // o modelo, mesmo sendo do domínio.
    expect(perguntaPedeVerbete('o que diz o ramayana', base)).toBe(false);
    // Já tem verbete.
    expect(perguntaPedeVerbete('o que é vedanta', base)).toBe(false);
    // Sobre a própria pessoa.
    expect(perguntaPedeVerbete('como foi meu sono', base)).toBe(false);
    expect(perguntaPedeVerbete('estou cansado hoje', base)).toBe(false);
    // Saudação, conversa solta e tema sem relação com a base.
    expect(perguntaPedeVerbete('Olá!', base)).toBe(false);
    expect(perguntaPedeVerbete('outra pergunta', base)).toBe(false);
    expect(perguntaPedeVerbete('receita de bolo de cenoura', base)).toBe(false);
    // O pré-filtro só economiza chamadas: verbos comuns da base ("trocar")
    // ainda deixam passar temas como pneu, e a recusa fica com a conferência
    // da fonte tradicional (ver o caso do pneu acima).
    expect(perguntaPedeVerbete('como trocar um pneu', base)).toBe(true);
    expect(perguntaPedeVerbete('', base)).toBe(false);
    expect(perguntaPedeVerbete('o que é?', base)).toBe(false);
  });

  it('identificador e hash são estáveis', () => {
    expect(idDoTitulo('Os cinco Pranas (Vayus)')).toBe('os-cinco-pranas-vayus');
    expect(hashDoVerbete(PRANAS)).toBe(hashDoVerbete({ ...PRANAS }));
    expect(hashDoVerbete(PRANAS)).not.toBe(
      hashDoVerbete({ ...PRANAS, resumo: `${PRANAS.resumo} Outra frase.` })
    );
  });
});

function servidor(roteiro: Record<string, string | number>) {
  const modelos: string[] = [];
  const buscar = (async (_url: string | URL | Request, init?: RequestInit) => {
    const corpo = JSON.parse(String(init?.body)) as { model: string };
    modelos.push(corpo.model);
    const passo = roteiro[corpo.model];
    if (typeof passo === 'number') {
      return new Response('{"error":{"message":"falha"}}', { status: passo });
    }
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: { role: 'assistant', content: passo },
            finish_reason: 'stop',
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;
  return { buscar, modelos };
}

function elo(modelo: string): EloDaCadeia {
  return {
    tipo: 'modelo',
    conexao: {
      tipo: 'openai_compativel',
      baseUrl: 'http://localhost:11434/v1',
      modelo,
      chave: null,
      tempoMaximoSegundos: 30,
      temperatura: 0.2,
    },
    autor: { provedor: 'Ollama', modelo, local: true },
  };
}

describe('Escrita do verbete pela ordem de modelos', () => {
  it('um modelo que erra o formato passa a vez ao seguinte', async () => {
    const { buscar, modelos } = servidor({
      ruim: 'texto livre',
      bom: resposta({ dominio: true, verbete: PRANAS }),
    });
    const resultado = await escreverVerbeteNaCadeia({
      cadeia: [elo('ruim'), elo('bom'), { tipo: 'lyra' }],
      pergunta: 'o que são os cinco vayus',
      proibidos: [],
      base: BASE_DE_CONHECIMENTO,
      buscar,
    });
    expect(modelos).toEqual(['ruim', 'bom']);
    expect(resultado).toMatchObject({
      tipo: 'verbete',
      autor: { modelo: 'bom' },
      verbete: { titulo: PRANAS.titulo },
    });
  });

  it('tema fora do domínio não gera verbete', async () => {
    const { buscar } = servidor({ bom: resposta({ dominio: false }) });
    const resultado = await escreverVerbeteNaCadeia({
      cadeia: [elo('bom'), { tipo: 'lyra' }],
      pergunta: 'como trocar um pneu',
      proibidos: [],
      base: BASE_DE_CONHECIMENTO,
      buscar,
    });
    expect(resultado.tipo).toBe('fora-do-dominio');
  });

  it('sem modelo que responda, nada é escrito', async () => {
    const { buscar } = servidor({ caido: 503 });
    expect(
      (
        await escreverVerbeteNaCadeia({
          cadeia: [elo('caido'), { tipo: 'lyra' }],
          pergunta: 'o que são os cinco vayus',
          proibidos: [],
          base: BASE_DE_CONHECIMENTO,
          buscar,
        })
      ).tipo
    ).toBe('sem-modelo');
    expect(
      (
        await escreverVerbeteNaCadeia({
          cadeia: [{ tipo: 'lyra' }],
          pergunta: 'o que são os cinco vayus',
          proibidos: [],
          base: BASE_DE_CONHECIMENTO,
        })
      ).tipo
    ).toBe('sem-modelo');
  });
});

describe('Motor com verbetes escritos automaticamente', () => {
  const pendente: Verbete = verbeteDaBase(
    { ...PRANAS, palavrasChave: ['vayus', 'cinco pranas'] },
    { provedor: 'Ollama', modelo: 'modelo-local' },
    new Date('2026-11-16T12:00:00Z')
  );
  const gerado: Verbete = {
    ...pendente,
    gerado: { ...pendente.gerado!, aprovadoEm: '2026-11-17T12:00:00.000Z' },
  };
  afterEach(() => definirVerbetesGerados([]));

  it('nasce pendente e, pendente, não chega ao motor', () => {
    expect(pendente.gerado?.aprovadoEm).toBeNull();
    definirVerbetesGerados([pendente]);
    expect(baseAtual()).toHaveLength(BASE_DE_CONHECIMENTO.length);
    expect(encontrarVerbete('o que são os cinco vayus')).toBeNull();
  });

  it('encontra o gerado e o marca como escrito automaticamente', () => {
    expect(encontrarVerbete('o que são os cinco vayus')).toBeNull();
    definirVerbetesGerados([gerado]);
    expect(baseAtual()).toHaveLength(BASE_DE_CONHECIMENTO.length + 1);
    expect(encontrarVerbete('o que são os cinco vayus')?.id).toBe(gerado.id);
    expect(textoDoVerbete(gerado)).toMatch(
      /escrito automaticamente pela Lyra com modelo-local \(Ollama\) e aprovado pela administração/
    );
    expect(textoDoVerbete(BASE_DE_CONHECIMENTO[0])).not.toMatch(
      /automaticamente/
    );
  });

  it('o curado prevalece e um gerado não substitui um curado', () => {
    const disputa: Verbete = { ...gerado, palavrasChave: ['vedanta'] };
    const mesmoId: Verbete = { ...gerado, id: 'vedanta' };
    const semMarca: Verbete = { ...gerado, id: 'sem-marca', gerado: undefined };
    const naoAprovado: Verbete = { ...pendente, id: 'nao-aprovado' };
    definirVerbetesGerados([disputa, mesmoId, semMarca, naoAprovado]);
    expect(baseAtual()).toHaveLength(BASE_DE_CONHECIMENTO.length + 1);
    expect(encontrarVerbete('o que é vedanta')?.id).toBe('vedanta');
    expect(encontrarVerbete('o que é vedanta')?.gerado).toBeUndefined();
  });

  it('a leitura dos mapas e a palavra-chave curada não usam os gerados', () => {
    definirVerbetesGerados([gerado]);
    expect(buscarVerbete('o que são os cinco vayus')).toBeNull();
    const agora = new Date('2026-11-16T12:00:00Z');
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
    expect(
      responderComoLyra('qual é o meu ascendente', { mapa, agora })?.assunto
    ).toBe('lagna');
    expect(
      responderComoLyra('o que são os cinco vayus', { mapa, agora })
    ).toBeNull();
  });
});

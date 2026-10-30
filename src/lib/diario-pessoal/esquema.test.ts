import { describe, expect, it } from 'vitest';
import {
  type AnaliseDoModelo,
  conferirAnalise,
  conferirFidelidade,
  esquemaJsonDaAnalise,
  novoRelatoSchema,
  palavras,
} from './esquema';

const ditado =
  'hoje acordei cedo fui caminhar no parque com a minha irma e depois trabalhei muito a tarde fiquei cansada mas feliz';

function analise(extra: Partial<AnaliseDoModelo> = {}): AnaliseDoModelo {
  return {
    textoOrganizado:
      'Hoje acordei cedo, fui caminhar no parque com a minha irmã e depois trabalhei muito. À tarde fiquei cansada, mas feliz.',
    acontecimentos: ['Caminhada cedo no parque com a irmã', 'Muito trabalho'],
    percepcoes: ['Cansaço à tarde', 'Felicidade'],
    caracteristicasDoDia:
      'Pelo seu relato, foi um dia ativo: a caminhada cedo e o trabalho deixaram você cansada, mas feliz.',
    relacaoComOMapa:
      'O céu de hoje favorecia começos e encontros, e isso conversa com a caminhada que você fez logo cedo.',
    padroes: [],
    ...extra,
  };
}

describe('fidelidade do texto organizado (tarefa 135)', () => {
  it('aceita só ortografia, acentos, pontuação e maiúsculas', () => {
    expect(palavras('À tarde, IRMÃ!')).toEqual(['a', 'tarde', 'irma']);
    expect(conferirFidelidade(ditado, analise().textoOrganizado)).toBeNull();
  });

  it('recusa o eco da instrução que um modelo local real devolveu', () => {
    // Saída observada do Qwen2.5-1.5B local ao pedir só a pontuação.
    expect(
      conferirFidelidade(
        'hoje acordei cedo fui caminhar no parque e depois trabalhei muito',
        'Corrija a pontuação, sem mudar palavras:\n\nHoje acordei cedo. Fui caminhar no parque e depois trabalhei muito.'
      )
    ).toMatch(/tamanho|acrescentou/);
  });

  it('recusa resumo, fato inventado e frase cortada', () => {
    expect(
      conferirFidelidade(ditado, 'Caminhei no parque e trabalhei.')
    ).toMatch(/tamanho|retirou/);
    expect(
      conferirFidelidade(
        ditado,
        analise().textoOrganizado.replace('irmã', 'irmã Ana e o cachorro Bob')
      )
    ).toMatch(/acrescentou|tamanho/);
    // Troca de sentido não é correção de grafia.
    expect(
      conferirFidelidade(
        ditado,
        analise().textoOrganizado.replace('mas feliz', 'e triste')
      )
    ).toMatch(/trocou/);
    expect(
      conferirFidelidade('fui ao mercado', 'Fui ao hospital ontem com dor.')
    ).not.toBeNull();
  });

  it('aceita correções de grafia comuns da fala transcrita', () => {
    expect(
      conferirFidelidade(
        'agente foi no meu trabaio e depois fomos pra casa da vó',
        'A gente foi no meu trabalho e depois fomos pra casa da vó.'
      )
    ).toBeNull();
    expect(
      conferirFidelidade(
        'eu tava muito ansiozo com a reuniao',
        'Eu tava muito ansioso com a reunião.'
      )
    ).toBeNull();
  });
});

describe('análise do dia', () => {
  it('aceita a análise fiel e relacionada ao mapa enviado', () => {
    expect(conferirAnalise(analise(), ditado, true, false)).toBeNull();
  });

  it('exige relação com o mapa só quando o mapa foi enviado', () => {
    expect(conferirAnalise(analise(), ditado, false, false)).toMatch(
      /citou um mapa/
    );
    expect(
      conferirAnalise(analise({ relacaoComOMapa: null }), ditado, true, false)
    ).toMatch(/não relacionou/);
    expect(
      conferirAnalise(analise({ relacaoComOMapa: null }), ditado, false, false)
    ).toBeNull();
  });

  it('recusa a saída real do modelo local que inventou padrões e ignorou o relato', () => {
    // Saída observada do Qwen2.5-1.5B local na QA de 2026-10-30 (sem
    // relatos anteriores): "padrões" eram fatos do céu e a leitura do dia
    // não citava nada do relato.
    const real: AnaliseDoModelo = {
      textoOrganizado:
        'Hoje acordei cedo, fui caminhar no parque com minha irmã e depois trabalhei muito a tarde. Fiquei cansada mas feliz.',
      padroes: [
        'Dia da semana: Sexta-feira, dia de Vênus',
        'Fase da Lua: 5º dia da Lua minguante',
        'Lua em Gêmeos',
      ],
      percepcoes: [],
      acontecimentos: ['Acordar cedo', 'Caminhar no parque', 'Trabalhar'],
      relacaoComOMapa:
        'A Lua de hoje, em Gêmeos, favorece encerrar hábitos ruins, organizar, cortar excessos e trabalho profundo.',
      caracteristicasDoDia:
        'Foi um dia de prudência, com uma Lua passando pelo ponto mais sensível do mapa. O signo que nascia no horizonte na hora do seu nascimento é Touro.',
    };
    expect(conferirFidelidade(ditado, real.textoOrganizado)).toBeNull();
    expect(conferirAnalise(real, ditado, true, false)).toBe(
      'a análise apontou padrões sem relatos anteriores'
    );
    expect(conferirAnalise({ ...real, padroes: [] }, ditado, true, false)).toBe(
      'a leitura do dia não fala do que a pessoa contou'
    );
  });

  it('exige base no relato para cada acontecimento', () => {
    expect(
      conferirAnalise(
        analise({ acontecimentos: ['Jantar com amigos no centro'] }),
        ditado,
        true,
        false
      )
    ).toBe('a análise listou acontecimentos que não estão no relato');
    expect(
      conferirAnalise(
        analise({ padroes: ['Caminha cedo há dias'] }),
        ditado,
        true,
        true
      )
    ).toBeNull();
  });

  it('recusa linguagem clínica em qualquer parte da interpretação', () => {
    for (const termo of [
      'Isso pode indicar um transtorno de ansiedade.',
      'O cansaço sugere um diagnóstico de esgotamento.',
      'Talvez valha um medicamento para dormir.',
    ])
      expect(
        conferirAnalise(analise({ percepcoes: [termo] }), ditado, true, false)
      ).toBe('a análise usou linguagem clínica');
  });

  it('pede ao modelo null quando não há céu do dia', () => {
    const sem = esquemaJsonDaAnalise(false) as {
      properties: Record<string, unknown>;
    };
    expect(sem.properties.relacaoComOMapa).toEqual({ type: 'null' });
  });
});

describe('novo relato', () => {
  const base = {
    id: '6f9a1c62-6a8e-4c1e-9a55-2f1a0e0b7d10',
    data: '2026-10-30',
    texto: 'Dia bom.',
  };
  it('liga a origem da voz ao modo falado', () => {
    expect(
      novoRelatoSchema.safeParse({ ...base, modo: 'voz', motor: 'aparelho' })
        .success
    ).toBe(true);
    expect(
      novoRelatoSchema.safeParse({ ...base, modo: 'texto', motor: null })
        .success
    ).toBe(true);
    expect(
      novoRelatoSchema.safeParse({ ...base, modo: 'voz', motor: null }).success
    ).toBe(false);
    expect(
      novoRelatoSchema.safeParse({
        ...base,
        modo: 'texto',
        motor: 'navegador',
      }).success
    ).toBe(false);
  });
  it('recusa relato vazio, longo demais ou campos extras', () => {
    const r = novoRelatoSchema.safeParse({
      ...base,
      texto: '   ',
      modo: 'texto',
      motor: null,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('Conte como foi o seu dia.');
    expect(
      novoRelatoSchema.safeParse({
        ...base,
        texto: 'a'.repeat(6001),
        modo: 'texto',
        motor: null,
      }).success
    ).toBe(false);
    expect(
      novoRelatoSchema.safeParse({
        ...base,
        modo: 'texto',
        motor: null,
        extra: 1,
      }).success
    ).toBe(false);
  });
});

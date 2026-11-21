import { describe, expect, it } from 'vitest';

import { SIGNOS } from '@/lib/astrology/sideral';
import { SIGNOS_OCIDENTAIS } from '@/lib/lyra/conhecimento/signos-ocidentais';

import { leituraGratuita, signoDoSolNoInstante } from './leitura-gratuita';
import { responderAoVisitante, SEM_VERBETE } from './microconversa';

// 21/11/2026 às 15:00 UTC: o Sol tropical está em Escorpião (entra em
// Sagitário por volta de 22/11).
const AGORA = new Date('2026-11-21T15:00:00.000Z');

describe('Leitura gratuita com a voz do Motor Lyra (tarefa 158)', () => {
  it('cada signo tem símbolo, elemento, modalidade, regente, forças, atenção e pergunta', () => {
    expect(Object.keys(SIGNOS_OCIDENTAIS)).toEqual([...SIGNOS]);
    for (const signo of SIGNOS) {
      const s = SIGNOS_OCIDENTAIS[signo];
      expect(s.simbolo).toMatch(/^[♈-♓]$/u);
      expect(s.forcas).toHaveLength(2);
      expect(s.atencao).toHaveLength(2);
      expect(s.pergunta.endsWith('?')).toBe(true);
    }
    // Tradição: Áries é fogo cardinal regido por Marte.
    expect(SIGNOS_OCIDENTAIS.Áries).toMatchObject({
      elemento: 'fogo',
      modalidade: 'cardinal',
      regente: 'Marte',
    });
  });

  it('o Sol de hoje é calculado no servidor', () => {
    expect(signoDoSolNoInstante(AGORA)).toBe('Escorpião');
    expect(signoDoSolNoInstante(new Date('2026-03-21T12:00:00Z'))).toBe(
      'Áries'
    );
  });

  it('a reflexão do dia segue as regras de mesmo signo, oposição, afinidade e diferença', () => {
    expect(leituraGratuita('Escorpião', AGORA).reflexaoDoDia.texto).toContain(
      'o mesmo signo do seu Sol'
    );
    expect(leituraGratuita('Touro', AGORA).reflexaoDoDia.texto).toContain(
      'signo oposto ao seu'
    );
    // Escorpião (água) e Capricórnio (terra): afins.
    expect(leituraGratuita('Capricórnio', AGORA).reflexaoDoDia.texto).toContain(
      'elemento afim à terra'
    );
    // Escorpião (água) e Peixes (água): o mesmo elemento.
    expect(leituraGratuita('Peixes', AGORA).reflexaoDoDia.texto).toContain(
      'o mesmo elemento do seu Sol'
    );
    // Escorpião (água) e Leão (fogo): diferentes, sem oposição.
    expect(leituraGratuita('Leão', AGORA).reflexaoDoDia.texto).toContain(
      'diferente do fogo'
    );
    const leitura = leituraGratuita('Leão', AGORA);
    expect(leitura.reflexaoDoDia).toMatchObject({
      data: '2026-11-21',
      solHoje: 'Escorpião',
    });
    expect(leitura.reflexaoDoDia.texto).not.toMatch(
      /você vai|com certeza|garant/i
    );
  });

  it('com o signo incerto, não escolhe um signo nem inventa forças', () => {
    const leitura = leituraGratuita(null, AGORA);
    expect(leitura).toMatchObject({
      signo: null,
      simbolo: null,
      natureza: null,
      forcas: [],
      atencao: [],
      pergunta: null,
    });
    expect(leitura.reflexaoDoDia.texto).toContain(
      'quando ele estiver confirmado'
    );
  });

  it('declara a origem de cada trecho', () => {
    const { origens, natureza } = leituraGratuita('Câncer', AGORA);
    expect(origens.map((o) => o.trecho)).toEqual([
      'Signo solar',
      'Natureza, forças, pontos de atenção e pergunta',
      'Reflexão do dia',
    ]);
    expect(origens[1].origem).toContain('Ptolomeu');
    expect(origens[2].origem).toContain('2026-11-21');
    expect(natureza).toContain('Câncer é um signo de água');
  });
});

describe('Microconversa do Experimente Grátis (tarefa 158)', () => {
  it('responde pela base curada e diz de onde veio a resposta', () => {
    const resposta = responderAoVisitante('o que é vedanta');
    expect(resposta.texto).toContain('Vedanta');
    expect(resposta.origem).toContain('base curada');
    expect(resposta.origem).toContain('sem modelo de IA');
  });

  it('sem verbete, diz o limite da versão gratuita sem inventar', () => {
    const resposta = responderAoVisitante('qual a capital da Mongólia');
    expect(resposta.texto).toBe(SEM_VERBETE);
    expect(resposta.origem).toContain('Limite declarado');
  });
});

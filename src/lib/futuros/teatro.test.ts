import { describe, expect, it } from 'vitest';

import {
  esquemaDoTeatro,
  montarTeatro,
  temaSensivel,
  type PremissasDoTeatro,
} from './teatro';

const AGORA = new Date('2026-11-23T15:00:00Z');

const PREMISSAS: PremissasDoTeatro = {
  duvida: 'Mudar de cidade no próximo ano?',
  horizonte: '1a',
  caminhos: [
    {
      titulo: 'Mudar para o litoral',
      passo: 'Visitar três bairros em janeiro',
    },
    { titulo: 'Ficar onde estou', passo: 'Reformar o apartamento' },
    { titulo: 'Testar por três meses', passo: 'Alugar por temporada' },
  ],
};

const DASHA = {
  mahadasha: {
    graha: 'saturno' as const,
    nome: 'Saturno (Shani)',
    inicio: new Date('2020-01-01T00:00:00Z'),
    fim: new Date('2039-01-01T00:00:00Z'),
  },
  antardasha: {
    graha: 'mercurio' as const,
    nome: 'Mercúrio (Budha)',
    inicio: new Date('2025-06-01T00:00:00Z'),
    fim: new Date('2027-03-01T00:00:00Z'),
  },
  proximaAntardasha: {
    graha: 'ketu' as const,
    nome: 'Ketu',
    inicio: new Date('2027-03-01T00:00:00Z'),
    fim: new Date('2028-04-01T00:00:00Z'),
  },
};

describe('Teatro dos Futuros Revisáveis (tarefa 189)', () => {
  it('três ramos, um por caminho, com o rótulo NÃO É PREVISÃO', () => {
    const teatro = montarTeatro(PREMISSAS, { dasha: DASHA }, AGORA);
    expect(teatro.aviso).toBe('NÃO É PREVISÃO');
    expect(teatro.ramos.map((r) => r.titulo)).toEqual([
      'Mudar para o litoral',
      'Ficar onde estou',
      'Testar por três meses',
    ]);
    expect(teatro.ramos[0].historia[0]).toContain(
      'Visitar três bairros em janeiro'
    );
  });

  it('separa fato calculado de símbolo, e só cita a virada dentro do horizonte', () => {
    // Três meses a partir de novembro de 2026 terminam antes de março de 2027.
    const tresMeses = montarTeatro(
      { ...PREMISSAS, horizonte: '3m' },
      { dasha: DASHA },
      AGORA
    );
    expect(tresMeses.fatos[0].texto).toContain('Mahadasha de Saturno');
    expect(tresMeses.fatos.some((f) => f.texto.includes('Ketu'))).toBe(false);
    expect(tresMeses.simbolos[0].texto).toContain('construção paciente');
    const umAno = montarTeatro(
      { ...PREMISSAS, horizonte: '1a' },
      { dasha: DASHA },
      AGORA
    );
    expect(umAno.fatos.some((f) => f.texto.includes('Ketu'))).toBe(true);
    expect(umAno.ramos[0].historia.join(' ')).toContain('Ketu');
  });

  it('mudar uma premissa muda a história', () => {
    const antes = montarTeatro(PREMISSAS, { dasha: DASHA }, AGORA);
    const depois = montarTeatro(
      {
        ...PREMISSAS,
        caminhos: [
          {
            titulo: 'Mudar para a serra',
            passo: 'Visitar três bairros em janeiro',
          },
          PREMISSAS.caminhos[1],
          PREMISSAS.caminhos[2],
        ],
      },
      { dasha: DASHA },
      AGORA
    );
    expect(depois.ramos[0].historia).not.toEqual(antes.ramos[0].historia);
    expect(depois.ramos[1]).toEqual(antes.ramos[1]);
  });

  it('sem hora de nascimento, diz que o período não é determinável', () => {
    const teatro = montarTeatro(PREMISSAS, { dasha: null }, AGORA);
    expect(teatro.fatos[0].texto).toMatch(/não é determinável/);
    expect(teatro.simbolos).toEqual([]);
    expect(teatro.ramos).toHaveLength(3);
  });

  it('temas de risco e de saúde não viram cenário', () => {
    expect(temaSensivel(PREMISSAS)).toBeNull();
    expect(
      temaSensivel({ ...PREMISSAS, duvida: 'Parar de tomar o remédio?' })
    ).toBe('saude');
    expect(
      temaSensivel({ ...PREMISSAS, duvida: 'Não quero mais viver assim' })
    ).toBe('risco');
  });

  it('exige três caminhos e recusa campos extras', () => {
    expect(esquemaDoTeatro.safeParse(PREMISSAS).success).toBe(true);
    expect(
      esquemaDoTeatro.safeParse({
        ...PREMISSAS,
        caminhos: PREMISSAS.caminhos.slice(0, 2),
      }).success
    ).toBe(false);
    expect(
      esquemaDoTeatro.safeParse({
        ...PREMISSAS,
        dataDeNascimento: '1990-01-01',
      }).success
    ).toBe(false);
  });
});

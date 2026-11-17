import { describe, expect, it } from 'vitest';

import { idadeEm, montarPlanoDePrevencao, type Recomendacao } from './plano';

/** Catálogo igual ao da migration 072, para o motor ser testado sem banco. */
const CATALOGO: Recomendacao[] = [
  {
    id: 'mamografia',
    nome: 'Mamografia',
    procura: 'câncer de mama em fase inicial',
    publico: 'mamas',
    idadeMinima: 50,
    idadeMaxima: 74,
    intervaloMeses: 24,
    tipo: 'rotina',
    orientacao: 'A cada dois anos dos 50 aos 74 anos.',
    historicoRelevante: ['cancer-mama', 'cancer-ovario'],
    fonteNome: 'INCA',
    fonteUrl: 'https://www.gov.br/inca',
    conferido: true,
    revisadoEm: '2026-11-17T12:00:00.000Z',
    ordem: 10,
  },
  {
    id: 'dna-hpv',
    nome: 'Teste de DNA-HPV',
    procura: 'lesões no colo do útero',
    publico: 'colo-do-utero',
    idadeMinima: 25,
    idadeMaxima: 64,
    intervaloMeses: 60,
    tipo: 'rotina',
    orientacao: 'A cada cinco anos.',
    historicoRelevante: ['cancer-colo-utero'],
    fonteNome: 'INCA',
    fonteUrl: 'https://www.gov.br/inca',
    conferido: true,
    revisadoEm: '2026-11-17T12:00:00.000Z',
    ordem: 20,
  },
  {
    id: 'glicemia',
    nome: 'Glicemia',
    procura: 'diabetes tipo 2',
    publico: 'todos',
    idadeMinima: 35,
    idadeMaxima: null,
    intervaloMeses: 36,
    tipo: 'rotina',
    orientacao: 'A partir dos 35 anos.',
    historicoRelevante: ['diabetes'],
    fonteNome: 'SBD',
    fonteUrl: 'https://diretriz.diabetes.org.br',
    conferido: true,
    revisadoEm: '2026-11-17T12:00:00.000Z',
    ordem: 40,
  },
  {
    id: 'pressao-arterial',
    nome: 'Pressão arterial',
    procura: 'pressão alta',
    publico: 'todos',
    idadeMinima: 18,
    idadeMaxima: null,
    intervaloMeses: 12,
    tipo: 'rotina',
    orientacao: 'Uma vez por ano.',
    historicoRelevante: ['hipertensao', 'infarto-precoce'],
    fonteNome: 'SBC',
    fonteUrl: 'https://abccardiol.org/',
    conferido: false,
    revisadoEm: '2026-11-17T12:00:00.000Z',
    ordem: 50,
  },
  {
    id: 'perfil-lipidico',
    nome: 'Colesterol',
    procura: 'gorduras no sangue',
    publico: 'todos',
    idadeMinima: 20,
    idadeMaxima: null,
    intervaloMeses: null,
    tipo: 'rotina',
    orientacao: 'Frequência definida pelo médico.',
    historicoRelevante: ['infarto-precoce'],
    fonteNome: 'SBC',
    fonteUrl: 'https://abccardiol.org/',
    conferido: false,
    revisadoEm: '2026-11-17T12:00:00.000Z',
    ordem: 60,
  },
  {
    id: 'psa',
    nome: 'PSA',
    procura: 'alterações na próstata',
    publico: 'prostata',
    idadeMinima: 50,
    idadeMaxima: null,
    intervaloMeses: null,
    tipo: 'conversa',
    orientacao: 'Decisão compartilhada.',
    historicoRelevante: ['cancer-prostata'],
    fonteNome: 'INCA',
    fonteUrl: 'https://www.gov.br/inca',
    conferido: true,
    revisadoEm: '2026-11-17T12:00:00.000Z',
    ordem: 70,
  },
];

const HOJE = '2026-11-17';
const plano = (
  entrada: Partial<Parameters<typeof montarPlanoDePrevencao>[0]>
) =>
  montarPlanoDePrevencao({
    nascimento: '1974-05-10',
    genero: 'female',
    catalogo: CATALOGO,
    exames: {},
    historico: [],
    vinculos: [],
    hoje: HOJE,
    ...entrada,
  });
const ids = (p: ReturnType<typeof plano>) => p.itens.map((i) => i.id);

describe('Idade', () => {
  it('conta a idade completa, inclusive em ano bissexto', () => {
    expect(idadeEm('1974-05-10', '2026-11-17')).toBe(52);
    expect(idadeEm('1974-11-18', '2026-11-17')).toBe(51);
    expect(idadeEm('2000-02-29', '2026-02-28')).toBe(25);
    expect(idadeEm('2000-02-29', '2026-03-01')).toBe(26);
  });
});

describe('Exames indicados pela idade e pelo corpo', () => {
  it('mulher de 52 anos: mamografia, DNA-HPV, glicemia, pressão e colesterol; sem PSA', () => {
    const p = plano({});
    expect(p.idade).toBe(52);
    expect(ids(p)).toEqual([
      'mamografia',
      'dna-hpv',
      'glicemia',
      'pressao-arterial',
      'perfil-lipidico',
    ]);
    expect(p.itens.every((i) => i.situacao === 'pendente')).toBe(true);
    expect(p.itens.every((i) => i.paraQuem === null)).toBe(true);
    expect(p.total).toBe(5);
    expect(p.emDia).toBe(0);
  });

  it('homem de 55 anos: PSA só como conversa, sem exames de mamas e colo', () => {
    const p = plano({ nascimento: '1971-01-01', genero: 'male' });
    expect(ids(p)).toEqual([
      'glicemia',
      'pressao-arterial',
      'perfil-lipidico',
      'psa',
    ]);
    const psa = p.itens.find((i) => i.id === 'psa')!;
    expect(psa.situacao).toBe('conversar');
    expect(psa.motivo).toMatch(/Não é exame de rotina/);
    // Conversas não entram na contagem de exames de rotina.
    expect(p.total).toBe(3);
  });

  it('sem gênero informado, mostra exames que dependem do corpo dizendo para quem valem', () => {
    const p = plano({ nascimento: '1971-01-01', genero: null });
    expect(ids(p)).toContain('mamografia');
    expect(ids(p)).toContain('psa');
    expect(p.itens.find((i) => i.id === 'mamografia')!.paraQuem).toBe(
      'Para quem tem mamas.'
    );
  });

  it('respeita as faixas: aos 30 anos não há mamografia nem glicemia; aos 76 não há mamografia', () => {
    expect(ids(plano({ nascimento: '1996-01-01' }))).toEqual([
      'dna-hpv',
      'pressao-arterial',
      'perfil-lipidico',
    ]);
    expect(ids(plano({ nascimento: '1950-01-01' }))).not.toContain(
      'mamografia'
    );
  });

  it('sem data de nascimento não indica exames e diz o que falta', () => {
    const p = plano({ nascimento: null });
    expect(p.itens).toEqual([]);
    expect(p.faltando).toEqual(['idade']);
  });
});

describe('Datas dos exames', () => {
  it('em dia, vencido e no limite exato do intervalo', () => {
    const p = plano({
      exames: {
        mamografia: '2025-03-01',
        'dna-hpv': '2020-01-15',
        glicemia: '2023-11-17',
      },
    });
    const item = (id: string) => p.itens.find((i) => i.id === id)!;
    expect(item('mamografia')).toMatchObject({
      situacao: 'em-dia',
      ultimoEm: '2025-03-01',
      proximoEm: '2027-03-01',
    });
    expect(item('dna-hpv')).toMatchObject({
      situacao: 'vencido',
      proximoEm: '2025-01-15',
    });
    // Três anos completos hoje: vence hoje.
    expect(item('glicemia')).toMatchObject({
      situacao: 'vencido',
      proximoEm: '2026-11-17',
    });
    expect(p.emDia).toBe(1);
  });

  it('intervalo definido pelo médico fica em dia quando há registro', () => {
    const p = plano({ exames: { 'perfil-lipidico': '2019-01-01' } });
    expect(p.itens.find((i) => i.id === 'perfil-lipidico')).toMatchObject({
      situacao: 'em-dia',
      proximoEm: null,
    });
  });

  it('soma de meses respeita o fim do mês', () => {
    const p = plano({ exames: { 'pressao-arterial': '2025-12-31' } });
    expect(p.itens.find((i) => i.id === 'pressao-arterial')!.proximoEm).toBe(
      '2026-12-31'
    );
    const fevereiro = plano({ exames: { mamografia: '2024-02-29' } });
    expect(fevereiro.itens.find((i) => i.id === 'mamografia')!.proximoEm).toBe(
      '2026-02-28'
    );
  });
});

describe('Histórico da família', () => {
  it('reforça o exame na faixa e cita o parente', () => {
    const p = plano({
      historico: [{ parente: 'mae', condicao: 'cancer-mama' }],
    });
    const mamografia = p.itens.find((i) => i.id === 'mamografia')!;
    expect(mamografia.historicoNaFamilia).toEqual(['Mãe: câncer de mama']);
    expect(mamografia.motivo).toMatch(/histórico na família reforça/);
  });

  it('antes da faixa, sugere conversar com o médico sobre começar antes', () => {
    const p = plano({
      nascimento: '1986-01-01',
      historico: [{ parente: 'mae', condicao: 'cancer-mama' }],
    });
    expect(p.itens.find((i) => i.id === 'mamografia')).toMatchObject({
      situacao: 'conversar',
      motivo: expect.stringMatching(/começar antes dos 50 anos/),
    });
  });

  it('sem histórico, antes da faixa, o exame não aparece', () => {
    expect(ids(plano({ nascimento: '1986-01-01' }))).not.toContain(
      'mamografia'
    );
  });
});

describe('Vínculos que pesam', () => {
  it('liga o estresse do vínculo aos exames de pressão, glicose e colesterol', () => {
    const p = plano({
      vinculos: [
        { vinculoId: 'pai', pesa: 'sim' },
        { vinculoId: 'mae', pesa: 'nao' },
        { vinculoId: 'irmaos-mais-novos', pesa: 'as-vezes' },
      ],
    });
    expect(p.estresse).toMatchObject({
      vinculos: ['Pai', 'Irmãos mais novos'],
      exames: ['glicemia', 'pressao-arterial', 'perfil-lipidico'],
    });
    expect(p.estresse!.texto).toMatch(/estresse prolongado/);
    expect(p.estresse!.texto).not.toMatch(/c[âa]ncer/i);
  });

  it('sem vínculo que pesa, não há bloco de estresse; vínculo desconhecido é ignorado', () => {
    expect(
      plano({ vinculos: [{ vinculoId: 'primos', pesa: 'sim' }] }).estresse
    ).toBeNull();
  });
});

describe('Honestidade do plano', () => {
  it('não diagnostica e lembra que sintomas pedem avaliação', () => {
    const p = plano({});
    expect(p.aviso).toMatch(/Não substituem a consulta/);
    expect(p.aviso).toMatch(/sintomas/);
    const textos = p.itens.map((i) => i.motivo).join(' ');
    expect(textos).not.toMatch(/você tem|seu mapa|astrolog/i);
  });

  it('marca recomendações ainda não conferidas na fonte', () => {
    const p = plano({});
    expect(p.itens.find((i) => i.id === 'pressao-arterial')!.conferido).toBe(
      false
    );
    expect(p.itens.find((i) => i.id === 'mamografia')!.conferido).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  estadoDoPeriodo,
  retornoDoPeriodo,
  politicaNoInstante,
  intervalosNeutros,
  contarDiasNeutros,
  datasNeutras,
} from './calendario';
import { calcularSequencia } from '@/lib/kpi/streak-repository';
import { periodoSchema, type PeriodoDeDescanso } from './esquema';
const p = (): PeriodoDeDescanso => ({
  id: randomUUID(),
  inicio: '2026-10-20',
  fim: '2026-10-22',
  fuso: 'UTC',
  ativadaEm: '2026-10-20T12:00:00Z',
  encerradaEm: null,
  dataEncerramento: null,
  canceladaEm: null,
  retornoDias: 3,
  atividade: 'checkin',
  retornoEncerradoEm: null,
  dataFimRetorno: null,
  criadaEm: '2026-10-20T12:00:00Z',
  versao: 1,
});
describe('calendário real, retorno e dias neutros do descanso', () => {
  it('separa agendamento, pausa, retorno e fim programado sem fabricar ação manual', () => {
    const a = p();
    expect(estadoDoPeriodo(a, new Date('2026-10-19T12:00Z'))).toBe('agendada');
    expect(estadoDoPeriodo(a, new Date('2026-10-22T23:59Z'))).toBe('ativa');
    expect(estadoDoPeriodo(a, new Date('2026-10-23T00:00Z'))).toBe('retorno');
    expect(estadoDoPeriodo(a, new Date('2026-10-26T00:00Z'))).toBe('encerrada');
    expect(a.encerradaEm).toBeNull();
    expect(retornoDoPeriodo(a)).toEqual({
      inicio: '2026-10-23',
      fim: '2026-10-25',
    });
  });
  it('encerra manualmente no instante real e começa retorno no mesmo dia, sem duplicá-lo', () => {
    const a = {
      ...p(),
      encerradaEm: '2026-10-21T15:00:00Z',
      dataEncerramento: '2026-10-21',
    };
    expect(
      politicaNoInstante([a], new Date('2026-10-21T14:59:59Z'))?.estado
    ).toBe('ativa');
    expect(politicaNoInstante([a], new Date('2026-10-21T15:00Z'))?.estado).toBe(
      'retorno'
    );
    expect(contarDiasNeutros(intervalosNeutros(a, '2026-10-28'))).toBe(4);
  });
  it('cancela somente o calendário, sem criar dia neutro', () => {
    const a = { ...p(), canceladaEm: '2026-10-19T13:00:00Z' };
    expect(estadoDoPeriodo(a, new Date('2026-10-21T12:00Z'))).toBe('cancelada');
    expect(intervalosNeutros(a, '2026-10-28')).toEqual([]);
  });
  it('mantém pausa aberta até encerramento explícito, sem inventar retorno', () => {
    const a = { ...p(), fim: null };
    expect(estadoDoPeriodo(a, new Date('2027-12-20T12:00Z'))).toBe('ativa');
    expect(retornoDoPeriodo(a)).toEqual({ inicio: null, fim: null });
    expect(contarDiasNeutros(intervalosNeutros(a, '2026-10-22'))).toBe(3);
  });
  it('respeita fuso preservado e hora repetida do horário de verão', () => {
    const a = {
      ...p(),
      inicio: '2026-11-01',
      fim: '2026-11-01',
      fuso: 'America/New_York',
      criadaEm: '2026-10-28T12:00:00Z',
      ativadaEm: null,
      retornoDias: 0 as const,
    };
    for (const hora of ['2026-11-01T05:30Z', '2026-11-01T06:30Z'])
      expect(estadoDoPeriodo(a, new Date(hora))).toBe('ativa');
    expect(estadoDoPeriodo(a, new Date('2026-11-02T04:59Z'))).toBe('ativa');
    expect(estadoDoPeriodo(a, new Date('2026-11-02T05:00Z'))).toBe('encerrada');
  });
  it('não retroage avisos anteriores à ativação, mas identifica o dia civil inteiro', () => {
    const a = p();
    expect(politicaNoInstante([a], new Date('2026-10-20T11:59Z'))).toBeNull();
    expect(datasNeutras([a], '2026-10-20', '2026-10-20')).toEqual(
      new Set(['2026-10-20'])
    );
  });
  it('antecipa fim do retorno pelo relógio real e preserva o dia tocado', () => {
    const a = {
      ...p(),
      retornoEncerradoEm: '2026-10-24T12:00:00Z',
      dataFimRetorno: '2026-10-24',
    };
    expect(estadoDoPeriodo(a, new Date('2026-10-24T11:59Z'))).toBe('retorno');
    expect(estadoDoPeriodo(a, new Date('2026-10-24T12:00Z'))).toBe('encerrada');
    expect(contarDiasNeutros(intervalosNeutros(a, '2026-10-28'))).toBe(5);
  });
  it('une sobreposições e limita a expansão à janela pedida', () => {
    expect(
      contarDiasNeutros([
        ['2026-10-20', '2026-10-22'],
        ['2026-10-22', '2026-10-25'],
      ])
    ).toBe(6);
    expect([...datasNeutras([p()], '2026-10-24', '2026-10-28')]).toEqual([
      '2026-10-24',
      '2026-10-25',
    ]);
  });
});
describe('continuidade com dias neutros, sem dias cumpridos fictícios', () => {
  it('preserva continuidade pelos dias anteriores e posteriores, contando só registros reais', () => {
    const dias = new Set([
        '2026-10-18',
        '2026-10-19',
        '2026-10-20',
        '2026-10-23',
      ]),
      neutros = new Set(['2026-10-20', '2026-10-21', '2026-10-22']);
    expect(calcularSequencia(dias, '2026-10-23', neutros)).toEqual({
      atual: 3,
      maisLonga: 3,
      ultimo: '2026-10-23',
    });
    expect(calcularSequencia(dias, '2026-10-22', neutros)).toEqual({
      atual: 2,
      maisLonga: 2,
      ultimo: '2026-10-19',
    });
  });
  it('não cria sequência quando só existem dias pausados e aplica a falta real após retorno', () => {
    const neutros = new Set(['2026-10-20', '2026-10-21', '2026-10-22']);
    expect(
      calcularSequencia(new Set(['2026-10-20']), '2026-10-22', neutros).atual
    ).toBe(0);
    expect(
      calcularSequencia(new Set(['2026-10-19']), '2026-10-24', neutros).atual
    ).toBe(0);
  });
});
describe('contratos de programação do descanso', () => {
  const dados = () => ({
    inicio: '2026-10-20',
    fim: null,
    retornoDias: 0,
    atividade: null,
    metas: [],
  });
  it('aceita pausa aberta e recusa calendário, ordem, excesso e atividade incoerente', () => {
    expect(periodoSchema.safeParse(dados()).success).toBe(true);
    for (const v of [
      { inicio: '2026-02-30' },
      { fim: '2026-10-19' },
      { fim: '2028-10-20' },
      { atividade: 'checkin' },
      { retornoDias: 2 },
    ])
      expect(periodoSchema.safeParse({ ...dados(), ...v }).success).toBe(false);
  });
  it('recusa campos alheios à pausa comercial e metas repetidas', () => {
    expect(
      periodoSchema.safeParse({ ...dados(), cancelarAssinatura: true }).success
    ).toBe(false);
    const id = randomUUID();
    expect(
      periodoSchema.safeParse({ ...dados(), metas: [id, id] }).success
    ).toBe(false);
  });
});

describe('horários antigos não são recuperados depois de uma etapa restritiva', () => {
  it('descarta horários atravessados e mantém somente horários válidos da etapa atual', async () => {
    const { avisoAtravessouPausa } = await import('./calendario');
    const a = p();
    expect(
      avisoAtravessouPausa(
        [a],
        new Date('2026-10-19T08:00Z'),
        new Date('2026-10-23T09:00Z'),
        'checkin'
      )
    ).toBe(true);
    expect(
      avisoAtravessouPausa(
        [a],
        new Date('2026-10-23T08:00Z'),
        new Date('2026-10-23T09:00Z'),
        'checkin'
      )
    ).toBe(false);
    expect(
      avisoAtravessouPausa(
        [a],
        new Date('2026-10-23T08:00Z'),
        new Date('2026-10-23T09:00Z'),
        'respiracao'
      )
    ).toBe(true);
    expect(
      avisoAtravessouPausa(
        [a],
        new Date('2026-10-23T08:00Z'),
        new Date('2026-10-26T09:00Z'),
        'checkin'
      )
    ).toBe(true);
    expect(
      avisoAtravessouPausa(
        [a],
        new Date('2026-10-19T08:00Z'),
        new Date('2026-10-19T09:00Z'),
        'checkin'
      )
    ).toBe(false);
  });
});

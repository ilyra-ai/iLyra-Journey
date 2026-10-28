import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { analisarPares, mediana, somarDias, valorValido } from './analise';
import {
  diaSchema,
  periodoSchema,
  comparacaoSchema,
  marcadorSchema,
  type ParDeObservacao,
  type PedidoDaComparacao,
} from './esquema';
const pedido = (dias = 14): PedidoDaComparacao => ({
  inicio: '2026-10-01',
  fim: somarDias('2026-10-01', dias - 1),
  marcadorId: randomUUID(),
  metrica: 'sono',
  deslocamento: 1,
});
function pares(n = 14): ParDeObservacao[] {
  return Array.from({ length: n }, (_, i) => ({
    data: somarDias('2026-10-01', i),
    dataMetrica: somarDias('2026-10-01', i + 1),
    confirmado: true,
    presenca: i % 2 === 0,
    valor: i % 2 === 0 ? 360 : 480,
    metricaId: randomUUID(),
    atualizadaEm: null,
    outrosMarcadores: 0,
    ausencia: null,
  }));
}
describe('comparações descritivas sem inferir acontecimentos ou medições', () => {
  it('calcula medianas pares e ímpares sem modificar a série original', () => {
    const a = [10, 1, 9, 2];
    expect(mediana(a)).toBe(5.5);
    expect(a).toEqual([10, 1, 9, 2]);
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([])).toBeNull();
  });
  it('expõe a diferença exata somente após cumprir todos os critérios', () => {
    const p = pedido(),
      r = analisarPares(
        p,
        'Café tarde',
        pares(),
        new Date('2026-10-28T12:00Z')
      );
    expect(r.qualidade).toEqual({
      dias: 14,
      paresValidos: 14,
      com: 7,
      sem: 7,
      cobertura: 1,
      apta: true,
      motivos: [],
    });
    expect(r.resumo).toMatchObject({
      medianaCom: 360,
      medianaSem: 480,
      diferenca: -120,
      contraditorio: false,
    });
    expect(r.pares[0].dataMetrica).toBe('2026-10-02');
  });
  it('mantém o dia sem revisão como desconhecido e não como ausência', () => {
    const a = pares().map((p) => ({ ...p, confirmado: false, presenca: null })),
      r = analisarPares(pedido(), 'Viagem', a);
    expect(r.qualidade.paresValidos).toBe(0);
    expect(r.qualidade.sem).toBe(0);
    expect(r.resumo).toBeNull();
    expect(r.pares[0].valor).toBe(360);
  });
  it('não converte lacunas em zero nem fornece resumo com amostra curta', () => {
    const a = pares();
    a[0].valor = null;
    const r = analisarPares(pedido(), 'Rotina', a);
    expect(r.resumo).toBeNull();
    expect(r.qualidade.paresValidos).toBe(13);
    expect(r.qualidade.com).toBe(6);
  });
  it('exige tamanho nos dois grupos mesmo com muitos registros', () => {
    const a = pares(20).map((p, i) => ({ ...p, presenca: i < 17 })),
      r = analisarPares(pedido(20), 'Viagem', a);
    expect(r.resumo).toBeNull();
    expect(r.qualidade.motivos.join(' ')).toContain('17 com e 3 sem');
  });
  it('recusa cobertura baixa sem descartar silenciosamente os dias faltantes', () => {
    const a = pares(30).map((p, i) => (i < 18 ? p : { ...p, valor: null })),
      r = analisarPares(pedido(30), 'Café tarde', a);
    expect(r.qualidade.cobertura).toBe(0.6);
    expect(r.resumo).toBeNull();
    expect(r.pares).toHaveLength(30);
  });
  it('mostra contradição temporal mesmo quando as medianas gerais coincidem', () => {
    const a = pares(16).map((p, i) => ({
      ...p,
      valor: p.presenca ? (i < 8 ? 360 : 600) : 480,
      outrosMarcadores: p.presenca ? 1 : 0,
    }));
    const r = analisarPares(pedido(16), 'Café tarde', a);
    expect(r.resumo).toEqual({
      medianaCom: 480,
      medianaSem: 480,
      diferenca: 0,
      contraditorio: true,
      outrosMarcadoresEm: 8,
    });
  });
  it('aceita zero de sono como valor e recusa valores inválidos sem fabricar energia', () => {
    expect(valorValido('sono', 0)).toBe(0);
    expect(valorValido('energia', 0)).toBeNull();
    for (const v of [
      null,
      undefined,
      '',
      false,
      true,
      NaN,
      Infinity,
      -1,
      1441,
      1.5,
    ])
      expect(valorValido('sono', v)).toBeNull();
    expect(valorValido('energia', '5')).toBe(5);
    expect(valorValido('energia', 6)).toBeNull();
  });
  it('soma datas civis sem depender de horário de verão ou duração do dia', () => {
    expect(somarDias('2026-03-08', 1)).toBe('2026-03-09');
    expect(somarDias('2026-11-01', 1)).toBe('2026-11-02');
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
  });
});
describe('contratos do diário pessoal', () => {
  it('exige confirmação explícita e não aceita titular, marcador repetido ou nota longa', () => {
    const base = {
      data: '2026-10-28',
      marcadores: [],
      nota: '',
      confirmado: true,
      versao: 0,
    };
    expect(diaSchema.safeParse(base).success).toBe(true);
    const id = randomUUID();
    for (const patch of [
      { confirmado: false },
      { userId: id },
      { marcadores: [id, id] },
      { nota: 'a'.repeat(1001) },
      { data: '2026-02-30' },
      { versao: -1 },
    ])
      expect(diaSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
  it('valida ordem e limite de 366 dias em todos os pedidos de comparação', () => {
    expect(
      periodoSchema.safeParse({ inicio: '2026-01-01', fim: '2026-12-31' })
        .success
    ).toBe(true);
    for (const p of [
      { inicio: '2026-10-28', fim: '2026-10-01' },
      { inicio: '2025-01-01', fim: '2026-01-02' },
    ]) {
      expect(periodoSchema.safeParse(p).success).toBe(false);
      expect(comparacaoSchema.safeParse({ ...pedido(), ...p }).success).toBe(
        false
      );
    }
  });
  it('aceita nomes pessoais normalizados e limita métrica e deslocamento reais', () => {
    expect(marcadorSchema.parse({ nome: '  cafe\u0301 tarde  ' }).nome).toBe(
      'café tarde'
    );
    expect(
      comparacaoSchema.safeParse({ ...pedido(), metrica: 'astrologia' }).success
    ).toBe(false);
    expect(
      comparacaoSchema.safeParse({ ...pedido(), deslocamento: 2 }).success
    ).toBe(false);
    expect(
      comparacaoSchema.safeParse({ ...pedido(), userId: randomUUID() }).success
    ).toBe(false);
  });
});

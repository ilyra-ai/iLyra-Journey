import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { compararPeriodos, revisaoLocal } from './revisao';
import {
  experienciaSchema,
  notaSchema,
  type Experiencia,
  type LinhaDaRevisao,
  type NotaDaExperiencia,
} from './esquema';
const proposta = () => ({
  pedidoId: randomUUID(),
  titulo: 'Meu descanso',
  objetivo: 'Observar como me sinto',
  mudanca: 'Separar uma leitura tranquila',
  inicio: '2026-10-20',
  dias: 7,
  inicioReferencia: '2026-10-13',
  fimReferencia: '2026-10-19',
  alinhamentoSono: 1,
  metaId: null,
  habitoId: null,
});
function linhas(): LinhaDaRevisao[] {
  return Array.from({ length: 8 }, (_, i) => ({
    data: `2026-10-${String(i < 5 ? 13 + i : 15 + i).padStart(2, '0')}`,
    dataSono: `2026-10-${String(i < 5 ? 14 + i : 16 + i).padStart(2, '0')}`,
    fase: i < 5 ? 'referencia' : 'observacao',
    pausado: false,
    foraDoHistorico: false,
    sonoId: randomUUID(),
    energiaId: randomUUID(),
    sono: i < 5 ? 420 : 480,
    energia: i < 5 ? 2 : 4,
    nota: null,
  }));
}
const e: Experiencia = {
  id: randomUUID(),
  titulo: 'Meu descanso',
  objetivo: 'Observar como me sinto',
  mudanca: 'Uma leitura tranquila',
  inicioReferencia: '2026-10-13',
  fimReferencia: '2026-10-19',
  inicio: '2026-10-20',
  fim: '2026-10-26',
  fuso: 'UTC',
  alinhamentoSono: 1,
  metaId: null,
  habitoId: null,
  estado: 'em_curso',
  versao: 1,
  registradaEm: '2026-10-20T12:00:00Z',
  retrospectiva: false,
  encerradaEm: null,
  dataEncerramento: null,
  relatos: 0,
};
describe('revisão local de experiências pessoais', () => {
  it('compara medianas reais com amostras suficientes, sem efeito causal', () => {
    const cs = compararPeriodos(linhas());
    expect(cs[0]).toMatchObject({
      apta: true,
      nReferencia: 5,
      nObservacao: 3,
      medianaReferencia: 420,
      medianaObservacao: 480,
      diferenca: 60,
    });
    expect(cs[1]).toMatchObject({
      medianaReferencia: 2,
      medianaObservacao: 4,
      diferenca: 2,
    });
  });
  it('não apresenta medianas de um grupo isolado quando falta referência', () => {
    const ls = linhas().slice(1),
      r = compararPeriodos(ls);
    expect(r[0]).toMatchObject({
      apta: false,
      nReferencia: 4,
      nObservacao: 3,
      medianaReferencia: null,
      medianaObservacao: null,
      diferenca: null,
    });
  });
  it('exclui pausas e mantém lacunas sem convertê-las em zero', () => {
    const ls = linhas();
    ls[5].pausado = true;
    ls[6].sono = null;
    const r = compararPeriodos(ls);
    expect(r[0]).toMatchObject({
      nObservacao: 1,
      apta: false,
      diferenca: null,
    });
    expect(r[1].nObservacao).toBe(2);
  });
  it('não usa métricas fora da janela do plano mesmo se houver valor em memória', () => {
    const ls = linhas();
    ls[0].foraDoHistorico = true;
    expect(compararPeriodos(ls)[0].nReferencia).toBe(4);
  });
  it('preserva zero de sono e a mediana de registros presentes', () => {
    const ls = linhas().map((l) => ({ ...l, sono: 0 }));
    expect(compararPeriodos(ls)[0]).toMatchObject({
      medianaReferencia: 0,
      medianaObservacao: 0,
      diferenca: 0,
    });
  });
  it('não interpreta ausência de acompanhamento como mudança não seguida', () => {
    const ls = linhas(),
      n: NotaDaExperiencia = {
        idRelato: randomUUID(),
        data: ls[5].data,
        seguiu: null,
        percepcao: 4,
        nota: 'Percebi outras mudanças na rotina.',
        versao: 1,
      };
    ls[5].nota = n;
    const textos = revisaoLocal(e, ls, [n], compararPeriodos(ls), 2).join(' ');
    expect(textos).toContain(
      '1 de 3 dias observados têm relato; 2 permanecem sem acompanhamento informado'
    );
    expect(textos).toContain('0 não seguida');
    expect(textos).toContain('2 outra(s) experiência(s)');
    expect(textos).toContain('Não houve chamada a um modelo externo');
    expect(textos).toContain('não permite concluir causalidade');
  });
});
describe('contratos de proposta e relato', () => {
  it('aceita uma proposta completa e recusa períodos sobrepostos ou referência longa', () => {
    expect(experienciaSchema.safeParse(proposta()).success).toBe(true);
    for (const p of [
      { fimReferencia: '2026-10-20' },
      { inicioReferencia: '2026-09-01' },
      { dias: 2 },
      { dias: 61 },
      { alinhamentoSono: 2 },
      { inicio: '2026-02-30' },
      { userId: randomUUID() },
    ])
      expect(experienciaSchema.safeParse({ ...proposta(), ...p }).success).toBe(
        false
      );
  });
  it('exige proposta, intenção única e duração inteira', () => {
    for (const p of [
      { pedidoId: 'invalido' },
      { objetivo: ' ' },
      { mudanca: '' },
      { dias: 3.5 },
      { titulo: 'a'.repeat(101) },
    ])
      expect(experienciaSchema.safeParse({ ...proposta(), ...p }).success).toBe(
        false
      );
  });
  it('exige algum relato, sem fabricar seguimento ou percepção quando ausentes', () => {
    const n = {
      idRelato: randomUUID(),
      data: '2026-10-20',
      seguiu: null,
      percepcao: null,
      nota: '',
      versao: 0,
    };
    expect(notaSchema.safeParse(n).success).toBe(false);
    expect(notaSchema.parse({ ...n, nota: 'Um dia diferente.' })).toMatchObject(
      { seguiu: null, percepcao: null }
    );
    expect(notaSchema.safeParse({ ...n, seguiu: 'nao' }).success).toBe(true);
  });
  it('valida escala, calendário, identidade e versão do relato', () => {
    const n = {
      idRelato: randomUUID(),
      data: '2026-10-20',
      seguiu: 'parcial',
      percepcao: 3,
      nota: '',
      versao: 0,
    };
    for (const p of [
      { percepcao: 0 },
      { percepcao: 6 },
      { percepcao: 2.5 },
      { data: '2026-02-30' },
      { idRelato: 'invalido' },
      { versao: -1 },
      { userId: randomUUID() },
      { nota: 'a'.repeat(1001) },
    ])
      expect(notaSchema.safeParse({ ...n, ...p }).success).toBe(false);
  });
});

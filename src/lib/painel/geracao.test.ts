import { describe, expect, it } from 'vitest';
import { CATALOGO_DAS_EXPLICACOES, descreverMetrica } from './catalogo';
import {
  assinaturaDasDescricoes,
  descricoesSchema,
  entradasDasDescricoes,
  lerDescricoes,
} from './geracao';
const resposta = (): { descricoes: Record<string, string> } => ({
  descricoes: Object.fromEntries(
    CATALOGO_DAS_EXPLICACOES.map((m) => [m.id, m.descricao])
  ),
});
describe('descrições sem medições geradas', () => {
  it('exige os 53 campos e recusa propriedades adicionais', () => {
    expect(descricoesSchema.safeParse(resposta()).success).toBe(true);
    const incompleta = resposta();
    delete incompleta.descricoes.steps;
    expect(descricoesSchema.safeParse(incompleta).success).toBe(false);
    expect(
      descricoesSchema.safeParse({ ...resposta(), steps: 3000 }).success
    ).toBe(false);
    expect(lerDescricoes(JSON.stringify(resposta())).descricoes).toEqual(
      resposta().descricoes
    );
  });
  it.each([
    'Sua Lua favorece o descanso de hoje.',
    'Seu registro indica 8000 passos.',
    'Seu valor é saudável para você.',
    'Seu nakshatra exige mais energia.',
    'Aumente seu consumo de água hoje.',
  ])('recusa texto indevido: %s', (texto) => {
    const r = resposta();
    r.descricoes.steps = texto;
    expect(descricoesSchema.safeParse(r).success).toBe(false);
  });
  it('rejeita frases repetidas e preserva ausência, zero e a fonte original', () => {
    const r = resposta();
    r.descricoes.steps = r.descricoes.hrv_ms;
    expect(descricoesSchema.safeParse(r).success).toBe(false);
    expect(
      descreverMetrica(
        'steps',
        { steps: null },
        { steps: 'Texto gerado que não pode mascarar ausência.' }
      )
    ).toContain('Sem registro');
    expect(
      descreverMetrica(
        'steps',
        { steps: 0 },
        { steps: 'Zero é um registro informado, com origem preservada.' }
      )
    ).not.toContain('Sem registro');
    const entrada = entradasDasDescricoes({
      steps: 0,
      hrv_ms: null,
      user_id: 'titular',
      email: 'privado@teste.local',
      password_hash: 'secreto',
    });
    expect(entrada.find((m) => m.id === 'steps')?.valores).toEqual({
      steps: 0,
    });
    expect(JSON.stringify(entrada)).not.toContain('titular');
    expect(JSON.stringify(entrada)).not.toContain('secreto');
  });
  it('invalida a assinatura quando os dados, a política ou o modelo mudam', () => {
    expect(assinaturaDasDescricoes({ steps: 0, politica: 'local' })).not.toBe(
      assinaturaDasDescricoes({ steps: null, politica: 'local' })
    );
    expect(assinaturaDasDescricoes({ steps: 0, politica: 'local' })).not.toBe(
      assinaturaDasDescricoes({ steps: 0, politica: 'nuvem' })
    );
  });
});

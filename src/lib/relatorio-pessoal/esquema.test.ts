import { describe, it, expect } from 'vitest';
import { selecaoSchema, valorDoRelatorio, unidadeDoCampo } from './esquema';
import { textoComCobertura } from './pdf';
const p = () => ({
  inicio: '2026-10-20',
  fim: '2026-10-28',
  metricas: ['sono'],
  reflexoes: false,
  acontecimentos: false,
  notas: false,
});
describe('seleção explícita e representação do relatório pessoal', () => {
  it('exige conteúdo sem incluir categorias por padrão', () => {
    expect(selecaoSchema.safeParse(p()).success).toBe(true);
    expect(selecaoSchema.safeParse({ ...p(), metricas: [] }).success).toBe(
      false
    );
    expect(
      selecaoSchema.safeParse({ ...p(), metricas: [], reflexoes: true }).success
    ).toBe(true);
  });
  it('recusa calendário impossível, inversão e mais de 90 dias', () => {
    for (const v of [
      { fim: '2026-02-30' },
      { inicio: '2026-10-29' },
      { inicio: '2026-01-01' },
    ])
      expect(selecaoSchema.safeParse({ ...p(), ...v }).success).toBe(false);
    expect(
      selecaoSchema.safeParse({ ...p(), inicio: '2026-07-31' }).success
    ).toBe(true);
  });
  it('recusa métrica arbitrária, repetição e dados de outra conta no contrato', () => {
    for (const v of [
      { metricas: ['senha'] },
      { metricas: ['sono', 'sono'] },
      { userId: 'qualquer' },
    ])
      expect(selecaoSchema.safeParse({ ...p(), ...v }).success).toBe(false);
  });
  it('preserva zeros válidos e trata ausência e faixas inválidas', () => {
    expect(valorDoRelatorio('sono', 0)).toBe(0);
    for (const v of [null, undefined, '', -1, 1500, Infinity, 'texto'])
      expect(valorDoRelatorio('sono', v)).toBeNull();
    expect(valorDoRelatorio('energia', 0)).toBeNull();
    expect(valorDoRelatorio('agua', '2.5')).toBe(2.5);
  });
  it('expõe unidades do domínio sem transformar escores pessoais em medições', () => {
    expect(unidadeDoCampo('sono')).toBe('min');
    expect(unidadeDoCampo('energia')).toBe('1–5');
    expect(unidadeDoCampo('passos')).toBe('passos');
  });
  it('representa glifos sem cobertura por seu código sem omitir caracteres', () => {
    const fonte = { hasGlyphForCodePoint: (c: number) => c < 256 };
    expect(textoComCobertura('Ação 🌙 漢\n', fonte)).toBe(
      'Ação [U+1F319] [U+6F22]\n'
    );
    expect(textoComCobertura('ac\u0327a\u0303o', fonte)).toBe('ação');
  });
});

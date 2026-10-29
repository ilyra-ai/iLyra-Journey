import { describe, it, expect } from 'vitest';
import { prepararTextoFalado, trechosParaLeitura } from './texto';
describe('texto para leitura em voz alta sem alterar números', () => {
  it('preserva valores, ausência e separadores e expande unidades apenas no contexto numérico', () => {
    expect(
      prepararTextoFalado(
        '0 bpm; 72 bpm; 98 mg/dL; 120 mmHg; 250 mL; 35,5 °C; 1.234,56 kg; 50%; sem valor informado.'
      )
    ).toBe(
      '0 batimentos por minuto; 72 batimentos por minuto; 98 miligramas por decilitro; 120 milímetros de mercúrio; 250 mililitros; 35,5 graus Celsius; 1.234,56 quilogramas; 50 por cento; sem valor informado.'
    );
    expect(
      prepararTextoFalado('O código ms é texto. 10–20 km. -5 °C. 2026-10-29.')
    ).toBe(
      'O código ms é texto. 10 a 20 quilômetros. -5 graus Celsius. 2026-10-29.'
    );
  });
  it('divide respostas extensas por frases e palavras sem cortar valores ou Unicode', () => {
    const t = prepararTextoFalado(
      'Registre sua percepção com calma. Hoje foram 1.234,56 mL de água e 0 bpm informados. '.repeat(
        80
      )
    );
    const partes = trechosParaLeitura(t);
    expect(partes.length).toBeGreaterThan(80);
    expect(partes.every((p) => p.length <= 240)).toBe(true);
    expect(partes.join(' ')).toBe(t.replace(/\s+/g, ' '));
    expect(partes.filter((p) => p.includes('1.234,56'))).toHaveLength(80);
  });
  it('não perde palavras em frase extensa sem pontuação e rejeita extremos sem cortar silenciosamente', () => {
    const texto = 'percepção '.repeat(200).trim();
    expect(trechosParaLeitura(texto).join(' ')).toBe(texto);
    expect(() => trechosParaLeitura('a'.repeat(501))).toThrow(/sem espaços/);
    expect(() => trechosParaLeitura('a '.repeat(30001))).toThrow(
      /longa demais/
    );
    expect(trechosParaLeitura('')).toEqual([]);
  });
});

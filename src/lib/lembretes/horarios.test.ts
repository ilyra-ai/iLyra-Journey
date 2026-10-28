import { describe, expect, it } from 'vitest';
import {
  horarioDoLembrete,
  estaEmSilencio,
  ocorrenciaDeHoje,
} from './horarios';
import {
  lembreteSchema,
  preferenciasSchema,
  type PreferenciasDeLembretes,
} from './esquema';

const p: PreferenciasDeLembretes = {
  fuso: 'America/Sao_Paulo',
  silencioAtivo: true,
  inicioSilencio: '22:00',
  fimSilencio: '07:00',
  versao: 1,
};
const l = {
  titulo: 'Minha pausa',
  atividade: 'respiracao' as const,
  hora: '09:00',
  dias: [1, 2, 3, 4, 5],
  ativo: true,
};

describe('recorrência e descanso dos lembretes', () => {
  it.each([
    ['2026-10-28', '09:00', 'America/Sao_Paulo', '2026-10-28T12:00:00.000Z'],
    ['2026-03-08', '02:30', 'America/New_York', '2026-03-08T07:30:00.000Z'],
    ['2026-11-01', '01:30', 'America/New_York', '2026-11-01T05:30:00.000Z'],
    ['2026-04-05', '01:45', 'Australia/Lord_Howe', '2026-04-04T14:45:00.000Z'],
  ])('converte %s %s em %s com a regra IANA', (data, hora, fuso, esperado) => {
    expect(horarioDoLembrete(data, hora, fuso).toISOString()).toBe(esperado);
  });
  it('respeita limites do silêncio atravessando meia-noite', () => {
    expect(estaEmSilencio(new Date('2026-10-29T01:00Z'), p)).toBe(true);
    expect(estaEmSilencio(new Date('2026-10-29T09:59Z'), p)).toBe(true);
    expect(estaEmSilencio(new Date('2026-10-29T10:00Z'), p)).toBe(false);
    expect(estaEmSilencio(new Date('2026-10-28T18:00Z'), p)).toBe(false);
  });
  it('permite silêncio no mesmo dia e desativado', () => {
    const dia = { ...p, inicioSilencio: '12:00', fimSilencio: '14:00' };
    expect(estaEmSilencio(new Date('2026-10-28T15:00Z'), dia)).toBe(true);
    expect(estaEmSilencio(new Date('2026-10-28T17:00Z'), dia)).toBe(false);
    expect(
      estaEmSilencio(new Date('2026-10-29T01:00Z'), {
        ...p,
        silencioAtivo: false,
      })
    ).toBe(false);
  });
  it('retoma somente o dia local e os dias escolhidos, sem avisos retroativos à criação', () => {
    const agora = new Date('2026-10-28T12:05Z');
    expect(
      ocorrenciaDeHoje(l, p, agora, new Date('2026-10-27T00:00Z'))
    ).toMatchObject({
      data: '2026-10-28',
      instante: new Date('2026-10-28T12:00Z'),
    });
    expect(
      ocorrenciaDeHoje(l, p, agora, new Date('2026-10-28T12:01Z'))
    ).toBeNull();
    expect(
      ocorrenciaDeHoje({ ...l, dias: [0] }, p, agora, new Date(0))
    ).toBeNull();
    expect(
      ocorrenciaDeHoje({ ...l, ativo: false }, p, agora, new Date(0))
    ).toBeNull();
    expect(
      ocorrenciaDeHoje(l, p, new Date('2026-10-28T11:59Z'), new Date(0))
    ).toBeNull();
  });
  it('recusa horários, fusos, dias duplicados e silêncio de dia inteiro', () => {
    for (const alteracao of [
      { hora: '24:00' },
      { hora: '9:00' },
      { dias: [] },
      { dias: [1, 1] },
      { dias: [7] },
      { user_id: 'outro' },
    ])
      expect(lembreteSchema.safeParse({ ...l, ...alteracao }).success).toBe(
        false
      );
    expect(
      preferenciasSchema.safeParse({ ...p, fuso: 'Cidade/Inexistente' }).success
    ).toBe(false);
    expect(
      preferenciasSchema.safeParse({ ...p, fimSilencio: p.inicioSilencio })
        .success
    ).toBe(false);
    expect(
      lembreteSchema.parse({ ...l, titulo: ' Pausa ', dias: [5, 1] })
    ).toMatchObject({ titulo: 'Pausa', dias: [1, 5] });
  });
});

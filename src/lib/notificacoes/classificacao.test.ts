import { describe, it, expect } from 'vitest';
import { convitePodeSerPausado } from './classificacao';
describe('classificação conservadora dos convites pausáveis', () => {
  it('reconhece convites do dia, lembretes e sugestões identificadas do coach', () => {
    expect(convitePodeSerPausado('coach_dia', 'dia:2026-10-28')).toBe(true);
    expect(convitePodeSerPausado('lembrete_pessoal', 'lembrete:registro')).toBe(
      true
    );
    expect(
      convitePodeSerPausado('coach_alerta', 'alerta:2026-10-28:contexto')
    ).toBe(true);
  });
  it('preserva alertas do sensor e categorias ou chaves desconhecidas', () => {
    for (const [tipo, chave] of [
      ['coach_alerta', 'fc-alta:2026-10-28'],
      ['coach_alerta', 'outra-origem'],
      ['consulta', 'consulta:registro'],
      ['assinatura', 'aviso:registro'],
    ])
      expect(convitePodeSerPausado(tipo, chave)).toBe(false);
  });
});

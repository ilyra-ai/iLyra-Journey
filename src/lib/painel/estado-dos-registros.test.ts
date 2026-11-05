import { describe, expect, it } from 'vitest';
import { estadoDosRegistros } from './estado-dos-registros';

describe('estado de leitura não equivale a avaliação de saúde', () => {
  it('não anuncia conclusão enquanto a consulta inicial está em andamento', () => {
    expect(
      estadoDosRegistros({ carregando: true, erro: null, registrado: false })
        .rotulo
    ).toBe('Atualizando registros');
  });
  it('não apresenta erro de leitura como ausência de registros', () => {
    const estado = estadoDosRegistros({
      carregando: false,
      erro: 'Falha de leitura',
      registrado: false,
    });
    expect(estado.variante).toBe('warning');
    expect(estado.descricao).toBe('Falha de leitura');
  });
  it.each([false, true])(
    'nunca indica saúde positiva por uma sincronização concluída (registro: %s)',
    (registrado) => {
      const estado = estadoDosRegistros({
        carregando: false,
        erro: null,
        registrado,
      });
      expect(estado.variante).toBe('secondary');
      expect(estado.rotulo).toBe(
        registrado ? 'Registros de hoje disponíveis' : 'Sem registros hoje'
      );
    }
  );
});

import { describe, expect, it } from 'vitest';

import { nomeDeTratamento, pedidoDeTratamento } from './tratamento';

describe('tratamento afetivo e escolha explícita do titular', () => {
  it('usa xuxu por padrão em qualquer perfil', () => {
    expect(nomeDeTratamento(null, 'Ana')).toBe('xuxu');
    expect(nomeDeTratamento(null, null)).toBe('xuxu');
    expect(
      nomeDeTratamento({ modo: 'apelido', nome: null }, 'Ana', 'Aninha')
    ).toBe('Aninha');
    expect(
      nomeDeTratamento({ modo: 'perfil', nome: null }, 'Ana', 'Aninha')
    ).toBe('Ana');
    expect(nomeDeTratamento({ modo: 'perfil', nome: null }, 'Ana')).toBe('Ana');
    expect(nomeDeTratamento({ modo: 'perfil', nome: null }, null)).toBe('você');
  });
  it.each([
    'Não me chame de xuxu.',
    'Pare de me chamar assim.',
    'Pode parar de me chamar de xuxuzinho?',
  ])('respeita recusa em %s', (texto) => {
    expect(pedidoDeTratamento(texto)).toEqual({ modo: 'apelido', nome: null });
  });
  it.each(['Me chame pelo meu nome.', 'Lyra, por favor me chame pelo nome.'])(
    'preserva pedido explícito pelo nome em %s',
    (texto) => {
      expect(pedidoDeTratamento(texto)).toEqual({ modo: 'perfil', nome: null });
    }
  );
  it.each([
    ['Me chame de Ana.', 'Ana'],
    ['Pode me chamar de João Pedro, por favor.', 'João Pedro'],
    ['Prefiro que me chame de Bia', 'Bia'],
    ['Não me chame de xuxu, me chame de Ana.', 'Ana'],
    ['Não me chame de xuxu e me chame de Ana.', 'Ana'],
    ['Quero que me chame de xuxuzinho.', 'xuxuzinho'],
  ])('preserva a forma solicitada em %s', (texto, nome) => {
    expect(pedidoDeTratamento(texto)).toEqual({ modo: 'personalizado', nome });
  });
  it('permite voltar ao carinho padrão por pedido explícito', () => {
    expect(pedidoDeTratamento('Pode voltar a me chamar de xuxu.')).toEqual({
      modo: 'carinhoso',
      nome: null,
    });
  });
  it.each([
    'Meu amigo disse: me chame de Ana.',
    'O que significa "me chame de Ana"?',
    'Me chame de <script>',
    `Me chame de ${'a'.repeat(81)}`,
    'Como está meu sono?',
  ])('não converte relato ou conteúdo inválido em preferência: %s', (texto) => {
    expect(pedidoDeTratamento(texto)).toBeNull();
  });
});

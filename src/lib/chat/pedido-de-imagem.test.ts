import { calcularMapaNatal } from '@/lib/astrology/mapa-natal';
import { expect, it } from 'vitest';
import {
  pedidoDeImagemParaConversa,
  solicitouCriacaoDeImagem,
} from './pedido-de-imagem';
it('separa pedido explícito de imagem e pergunta explicativa', () => {
  for (const pedido of [
    'Crie uma imagem de uma flor',
    'Pode gerar uma ilustração do céu?',
    '++- Quero uma imagem do mar',
  ])
    expect(solicitouCriacaoDeImagem(pedido)).toBe(true);
  for (const pedido of [
    'Como funciona a geração de imagens?',
    'Não crie uma imagem',
    'Como vai ser meu dia?',
  ])
    expect(solicitouCriacaoDeImagem(pedido)).toBe(false);
  expect(pedidoDeImagemParaConversa('leia meu mapa', null)).toBe(null);
});

it('prepara a imagem do mapa com posições calculadas, sem nascimento ou dados de saúde', () => {
  const mapa = calcularMapaNatal({
    data: '1988-03-21',
    hora: '07:15',
    latitude: -23.55,
    longitude: -46.63,
    fuso: 'America/Sao_Paulo',
  });
  const pedido = pedidoDeImagemParaConversa('Leia meu mapa natal', mapa);
  expect(pedido?.tipo).toBe('mapa');
  const dados = JSON.parse(pedido!.prompt.split('\n').at(-1)!);
  expect(dados.planetas).toHaveLength(mapa.planetas.length);
  expect(dados.planetas[0].signo).toBe(mapa.planetas[0].signo);
  expect(pedido!.prompt).not.toContain('1988-03-21');
  expect(pedido!.prompt).not.toContain('America/Sao_Paulo');
  expect(
    pedidoDeImagemParaConversa('Não leia meu mapa natal', mapa)
  ).toBeNull();
});

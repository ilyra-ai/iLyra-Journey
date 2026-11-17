import { describe, expect, it } from 'vitest';

import { BASE_DE_CONHECIMENTO, buscarVerbete } from '../responder';
import avaliacao from './perguntas.json';

/**
 * Conjunto de avaliação do entendimento do motor: perguntas em linguagem do
 * dia a dia, rotuladas com os verbetes aceitos, com temas da Lyra que ainda
 * não têm verbete e com perguntas fora do assunto. Serve de régua para
 * comparar a busca por palavras-chave com modelos de significado.
 */
const { itens } = avaliacao;
const comVerbete = itens.filter((item) => item.tipo === 'com-verbete');
const semResposta = itens.filter((item) => item.tipo !== 'com-verbete');

describe('Conjunto de avaliação do entendimento', () => {
  it('é íntegro: perguntas únicas, tipos conhecidos e verbetes existentes', () => {
    const ids = new Set(BASE_DE_CONHECIMENTO.map((verbete) => verbete.id));
    expect(itens).toHaveLength(111);
    expect(new Set(itens.map((item) => item.pergunta)).size).toBe(111);
    for (const item of itens) {
      expect(['com-verbete', 'sem-verbete', 'fora-do-assunto']).toContain(
        item.tipo
      );
      expect(item.aceitos.length > 0).toBe(item.tipo === 'com-verbete');
    }
    // As perguntas escritas antes dos verbetes que as respondem ficam
    // marcadas: medem a base nova sem o viés de quem escreveu o verbete.
    const escritasAntes = itens.filter(
      (item) => 'origem' in item && item.origem === 'escrita-antes-do-verbete'
    );
    expect(escritasAntes).toHaveLength(15);
    for (const item of escritasAntes) {
      expect(item.tipo).toBe('com-verbete');
      for (const id of item.aceitos) expect(ids.has(id)).toBe(true);
    }
    // Todo verbete da base é alvo de pelo menos uma pergunta.
    const alvos = new Set(comVerbete.flatMap((item) => item.aceitos));
    expect([...ids].filter((id) => !alvos.has(id))).toEqual([]);
  });

  it('registra a linha de base das palavras-chave, que não pode piorar', () => {
    const achou = comVerbete.filter((item) =>
      item.aceitos.includes(buscarVerbete(item.pergunta)?.id ?? '')
    ).length;
    const recusou = semResposta.filter(
      (item) => buscarVerbete(item.pergunta) === null
    ).length;
    // Régua v2, medida em 16/11/2026: 31 de 76 achados e 34 de 35 recusados
    // só com palavras-chave.
    expect(achou).toBeGreaterThanOrEqual(31);
    expect(recusou).toBeGreaterThanOrEqual(34);
  });
});

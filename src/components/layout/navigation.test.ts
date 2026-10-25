import { describe, expect, it } from 'vitest';

import type { AppPageConfig } from '@/lib/site-page-config/schema';
import { getDefaultPageConfig } from '@/lib/site-page-config/defaults';

import { getPageMeta, getVisibleNavigation, rotuloDaLyra } from './navigation';

const INICIO_DA_NAVEGACAO = [
  '/chat',
  '/',
  '/dia',
  '/semana',
  '/respiracao',
  '/plan',
];

function semAsPaginas(hrefs: string[]): AppPageConfig {
  const config: AppPageConfig = getDefaultPageConfig('app');
  return {
    ...config,
    sidebar: {
      ...config.sidebar,
      items: config.sidebar.items.filter((item) => !hrefs.includes(item.href)),
    },
  };
}

describe('navegação com configuração salva', () => {
  it('atualiza nomes antigos da Lyra sem alterar destino, atalho ou permissões', () => {
    const config = getDefaultPageConfig('app');
    const chat = config.sidebar.items.find((item) => item.href === '/chat')!;
    chat.label = 'Chat IA';
    const item = getVisibleNavigation(false, config).find(
      (destino) => destino.href === '/chat'
    );
    expect(item).toMatchObject({
      label: 'Lyra AI',
      href: '/chat',
      shortcut: 'G C',
    });
    expect(getPageMeta('/chat', config).title).toBe('Lyra AI');
    expect(rotuloDaLyra(' Chat AI ')).toBe('Lyra AI');
    expect(
      getVisibleNavigation(false, config, (href) => href !== '/chat')
    ).not.toContainEqual(item);
    chat.visible = false;
    expect(
      getVisibleNavigation(true, config).some(
        (destino) => destino.href === '/chat'
      )
    ).toBe(false);
  });

  it('mantém o nome personalizado do construtor e o padrão novo', () => {
    const config = getDefaultPageConfig('app');
    const chat = config.sidebar.items.find((item) => item.href === '/chat')!;
    expect(chat.label).toBe('Lyra AI');
    expect(config.header.assistantLabel).toBe('Lyra AI');
    chat.label = 'Minha companhia';
    expect(getPageMeta('/chat', config).title).toBe('Minha companhia');
    expect(rotuloDaLyra('Minha companhia')).toBe('Minha companhia');
  });

  it('a configuração padrão começa por Lyra AI, Painel, Meu dia e Sua semana', () => {
    const config: AppPageConfig = getDefaultPageConfig('app');
    expect(config.sidebar.items.map((i) => i.href).slice(0, 6)).toEqual(
      INICIO_DA_NAVEGACAO
    );
  });

  it('página nova fora da configuração entra depois da sua antecessora', () => {
    const hrefs = getVisibleNavigation(false, semAsPaginas(['/dia'])).map(
      (i) => i.href
    );
    expect(hrefs.slice(0, 6)).toEqual(INICIO_DA_NAVEGACAO);
    expect(hrefs.filter((h) => h === '/dia')).toHaveLength(1);
    expect(hrefs.some((h) => h.startsWith('/admin'))).toBe(false);
  });

  it('configuração salva antes da tarefa 44 ganha Sua semana e Respiração depois do Meu dia', () => {
    const itens = getVisibleNavigation(
      false,
      semAsPaginas(['/semana', '/respiracao'])
    );
    expect(itens.map((i) => i.href).slice(0, 6)).toEqual(INICIO_DA_NAVEGACAO);
    expect(itens.find((i) => i.href === '/semana')?.label).toBe('Sua semana');
    expect(itens.find((i) => i.href === '/respiracao')?.label).toBe(
      'Respiração'
    );
  });
  it('fixa Lyra AI antes do Painel em configurações antigas sem reordenar os demais', () => {
    const config = getDefaultPageConfig('app');
    const chat = config.sidebar.items.find((item) => item.href === '/chat')!;
    config.sidebar.items = [
      ...config.sidebar.items.filter((item) => item.href !== '/chat').reverse(),
      chat,
    ];
    const outros = config.sidebar.items
      .filter((item) => item.href !== '/chat')
      .map((item) => item.href);
    const itens = getVisibleNavigation(true, config);
    expect(itens[0]).toMatchObject({ href: '/chat', section: 'Principal' });
    // Rotas novas ausentes do registro antigo continuam sendo inseridas.
    expect(
      itens
        .slice(1)
        .map((item) => item.href)
        .filter((href) => outros.includes(href))
    ).toEqual(outros);
    expect(getVisibleNavigation(false)[0].href).toBe('/chat');
  });
});

it('configurações antigas não reintroduzem o editor removido no menu ou na busca', () => {
  const config = getDefaultPageConfig('app');
  config.sidebar.items.push({
    href: '/admin/puck',
    label: 'Editor antigo',
    description: 'Configuração histórica',
    visible: true,
  });
  const itens = getVisibleNavigation(true, config);
  expect(itens.some((item) => item.href === '/admin/puck')).toBe(false);
  expect(itens.some((item) => item.href === '/admin/content')).toBe(true);
  expect(itens.some((item) => item.href === '/admin/page-builder')).toBe(true);
});

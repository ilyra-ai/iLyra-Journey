import { describe, expect, it } from 'vitest';
import { getDefaultPageConfig } from '@/lib/site-page-config/defaults';
import { rotaLiberadaNoPlano } from '@/lib/plans/rotas';
import { getVisibleNavigation } from './navigation';
import {
  destinoLateralAtivo,
  organizarNavegacaoLateral,
  type SecaoLateral,
} from './sidebar-structure';

const destinos = (secoes: SecaoLateral[]) =>
  secoes
    .flatMap((secao) => [
      ...secao.itens,
      ...secao.submenus.flatMap((submenu) => submenu.itens),
    ])
    .map((item) => item.href);

describe('categorias reais da navegação lateral', () => {
  it.each([false, true])(
    'preserva todos os destinos filtrados sem duplicação (admin: %s)',
    (admin) => {
      const config = getDefaultPageConfig('app');
      const itens = getVisibleNavigation(admin, config);
      const secoes = organizarNavegacaoLateral(itens, config);
      expect(destinos(secoes).toSorted()).toEqual(
        itens.map((item) => item.href).toSorted()
      );
      expect(new Set(destinos(secoes)).size).toBe(itens.length);
      expect(secoes.some((secao) => secao.id === 'administracao')).toBe(admin);
      if (admin) expect(secoes[1].id).toBe('administracao');
      expect(secoes[0].itens.map((item) => item.href)).toEqual([
        '/chat',
        '/',
        '/inovacoes',
        '/dia',
      ]);
    }
  );

  it('não recria rotas ocultas no construtor nem categorias vazias', () => {
    const config = getDefaultPageConfig('app');
    for (const item of config.sidebar.items)
      item.visible = item.href === '/profile';
    // Usa somente os itens presentes para também conferir categorias sem acesso.
    const itens = getVisibleNavigation(false, config).filter(
      (item) => item.href === '/profile'
    );
    const secoes = organizarNavegacaoLateral(itens, config);
    expect(secoes.map((secao) => secao.id)).toEqual(['conta']);
    expect(destinos(secoes)).toEqual(['/profile']);
    expect(secoes[0].submenus).toEqual([]);
  });

  it('preserva o filtro real de planos, inclusive durante carregamento', () => {
    const config = getDefaultPageConfig('app');
    const itens = getVisibleNavigation(false, config, (href) =>
      rotaLiberadaNoPlano(href, null, false)
    );
    const secoes = organizarNavegacaoLateral(itens, config);
    expect(destinos(secoes).toSorted()).toEqual(
      itens.map((item) => item.href).toSorted()
    );
    expect(destinos(secoes)).not.toContain('/chat');
    expect(destinos(secoes)).not.toContain('/appointments');
    // Sem disponibilidade global confirmada, práticas e descanso ficam ocultos.
    expect(
      secoes
        .find((secao) => secao.id === 'jornada')
        ?.submenus.map((submenu) => submenu.id)
    ).toBeUndefined();
    expect(
      destinos(secoes).filter((href) => ['/foco', '/descanso'].includes(href))
    ).toEqual([]);
    expect(destinos(secoes)).toContain('/profile');
  });

  it('mantém rótulos personalizados e a ordem dentro da categoria', () => {
    const config = getDefaultPageConfig('app');
    config.sidebar.sectionLabels.personal = 'Minha caminhada';
    config.sidebar.items.reverse();
    const itens = getVisibleNavigation(false, config);
    const jornada = organizarNavegacaoLateral(itens, config).find(
      (secao) => secao.id === 'jornada'
    )!;
    expect(jornada.titulo).toBe('Minha caminhada');
    const planejamento = jornada.submenus.find(
      (submenu) => submenu.id === 'planejamento'
    )!;
    const conjunto = new Set(planejamento.itens.map((item) => item.href));
    expect(planejamento.itens).toEqual(
      itens.filter((item) => conjunto.has(item.href))
    );
  });

  it('mantém destinos personalizados na área correspondente, sem inventar páginas', () => {
    const itens = getVisibleNavigation(true);
    const base = itens[0];
    const secoes = organizarNavegacaoLateral([
      ...itens,
      { ...base, href: '/admin/recurso-personalizado', adminOnly: true },
    ]);
    expect(
      secoes
        .find((secao) => secao.id === 'administracao')
        ?.itens.some((item) => item.href === '/admin/recurso-personalizado')
    ).toBe(true);
    expect(destinos(secoes)).toHaveLength(itens.length + 1);
  });

  it('identifica subpáginas sem confundir prefixos nem marcar a raiz', () => {
    expect(destinoLateralAtivo('/admin/users/123', '/admin/users')).toBe(true);
    expect(destinoLateralAtivo('/planos', '/plan')).toBe(false);
    expect(destinoLateralAtivo('/dia', '/')).toBe(false);
    expect(destinoLateralAtivo('/', '/')).toBe(true);
  });
});

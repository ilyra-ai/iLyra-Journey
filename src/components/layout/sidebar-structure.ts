import {
  BarChart3,
  CalendarRange,
  ClipboardList,
  History,
  UsersRound,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppPageConfig } from '@/lib/site-page-config/schema';
import type { NavigationItem } from './navigation';

type DefinicaoDeSubmenu = {
  id: string;
  titulo: string;
  icone: LucideIcon;
  destinos: string[];
};

export type SubmenuLateral = Omit<DefinicaoDeSubmenu, 'destinos'> & {
  itens: NavigationItem[];
};

export type SecaoLateral = {
  id: string;
  titulo: string;
  itens: NavigationItem[];
  submenus: SubmenuLateral[];
};

type DefinicaoDeSecao = {
  id: string;
  titulo: string;
  chave?: keyof AppPageConfig['sidebar']['sectionLabels'];
  rotuloAnterior?: string;
  destinos: string[];
  submenus: DefinicaoDeSubmenu[];
};

// Taxonomia de navegação: os dados e as permissões continuam vindo do catálogo
// e do plano. Esta estrutura só organiza os destinos já filtrados.
const SECOES: DefinicaoDeSecao[] = [
  {
    id: 'dia-a-dia',
    titulo: 'Dia a dia',
    chave: 'principal',
    rotuloAnterior: 'Principal',
    destinos: ['/chat', '/', '/inovacoes', '/dia'],
    submenus: [],
  },
  {
    id: 'jornada',
    titulo: 'Minha jornada',
    chave: 'personal',
    rotuloAnterior: 'Pessoal',
    destinos: [],
    submenus: [
      {
        id: 'planejamento',
        titulo: 'Planejamento e hábitos',
        icone: CalendarRange,
        destinos: ['/semana', '/plan', '/goals', '/rotinas', '/lembretes'],
      },
      {
        id: 'bem-estar',
        titulo: 'Práticas de bem-estar',
        icone: Wind,
        destinos: ['/respiracao', '/meditacoes', '/foco', '/descanso'],
      },
      {
        id: 'evolucao',
        titulo: 'Registros e evolução',
        icone: History,
        destinos: [
          '/alimentacao',
          '/acompanhamentos',
          '/acontecimentos',
          '/experiencias',
          '/linha-do-tempo',
          '/relatorio-pessoal',
        ],
      },
    ],
  },
  {
    id: 'saude',
    titulo: 'Saúde e conexões',
    chave: 'guidedFlow',
    rotuloAnterior: 'Fluxo guiado',
    destinos: ['/monitoring', '/connect', '/appointments'],
    submenus: [],
  },
  {
    id: 'conta',
    titulo: 'Minha conta',
    destinos: ['/profile', '/planos', '/offline'],
    submenus: [],
  },
  {
    id: 'administracao',
    titulo: 'Administração',
    chave: 'admin',
    rotuloAnterior: 'Administração',
    destinos: ['/admin/dashboard'],
    submenus: [
      {
        id: 'pessoas-planos',
        titulo: 'Pessoas e planos',
        icone: UsersRound,
        destinos: ['/admin/users', '/admin/plans'],
      },
      {
        id: 'conteudo-ia',
        titulo: 'Conteúdo e IA',
        icone: ClipboardList,
        destinos: [
          '/admin/content',
          '/admin/lyra-verbetes',
          '/admin/exames-medicos',
          '/admin/ai-config',
        ],
      },
      {
        id: 'dados-relatorios',
        titulo: 'Dados e relatórios',
        icone: BarChart3,
        destinos: ['/admin/data-health', '/admin/reports'],
      },
    ],
  },
];

/** Preserva a ordem personalizada do construtor dentro de cada categoria. */
export function organizarNavegacaoLateral(
  itens: NavigationItem[],
  config?: AppPageConfig
): SecaoLateral[] {
  const usados = new Set<string>();
  const selecionar = (destinos: string[]) =>
    itens.filter((item) => {
      if (!destinos.includes(item.href) || usados.has(item.href)) return false;
      usados.add(item.href);
      return true;
    });
  const secoes = SECOES.map((secao): SecaoLateral => {
    const personalizado =
      secao.chave && config?.sidebar.sectionLabels[secao.chave];
    return {
      id: secao.id,
      titulo:
        personalizado && personalizado !== secao.rotuloAnterior
          ? personalizado
          : secao.titulo,
      itens: selecionar(secao.destinos),
      submenus: secao.submenus
        .map(({ destinos, ...submenu }) => ({
          ...submenu,
          itens: selecionar(destinos),
        }))
        .filter((submenu) => submenu.itens.length > 0),
    };
  });

  // Destinos personalizados não somem por ainda não pertencerem à taxonomia.
  for (const item of itens) {
    if (usados.has(item.href)) continue;
    usados.add(item.href);
    const id = item.adminOnly ? 'administracao' : 'dia-a-dia';
    secoes.find((secao) => secao.id === id)!.itens.push(item);
  }
  const visiveis = secoes.filter(
    (secao) => secao.itens.length > 0 || secao.submenus.length > 0
  );
  // Quem administra encontra o trabalho operacional logo após os atalhos,
  // sem precisar atravessar toda a jornada pessoal em cada acesso.
  const administracao = visiveis.find((secao) => secao.id === 'administracao');
  return administracao
    ? [
        ...visiveis.filter((secao) => secao.id === 'dia-a-dia'),
        administracao,
        ...visiveis.filter(
          (secao) => !['dia-a-dia', 'administracao'].includes(secao.id)
        ),
      ]
    : visiveis;
}

/** A raiz não deve marcar todas as outras páginas como ativas. */
export function destinoLateralAtivo(caminho: string, destino: string): boolean {
  return (
    caminho === destino ||
    (destino !== '/' && caminho.startsWith(`${destino}/`))
  );
}

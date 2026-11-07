# Sistema visual "Lyra Clean"

> **Atualização aprovada em 07-11-2026 (152/153):** na área autenticada, o fundo passa a preto/grafite com iluminação dourada escurecida, contínua entre página e cabeçalho, conforme `../lyra-fundo-aprovado-2026-11-07.png`. Os cards do painel são transparentes e mantêm contornos discretos. A landing conserva seu fundo anterior. A barra é compacta, com Planos em modal, alternância claro/escuro persistente e menus suspensos. O perfil tem superfície amarela com texto escuro e identificação colorida por plano. Esta orientação substitui a igualdade anterior do fundo com a landing e as referências antigas de tema claro para essas superfícies. A revisão visual de desktop/tablet/mobile/zoom será realizada pelo usuário, por sua instrução; não está apresentada como homologada pelo agente.

> **Painel celestial:** três destaques reais, Védico inicial com três perspectivas, linha temporal de sete dias no fuso do perfil, leitura do signo solar sideral Lahiri e conversa real. Imagens são ilustrações, não posições astronômicas desenhadas do titular. Preservar respiro nas quatro bordas e conteúdo dentro dos cards. Em celular ou janela estreita, usar rolagem vertical; não bloquear zoom nem ocultar controles para forçar cabimento. As fontes aprovadas continuam Clicker Script, Imprima e Varela. O rebranding iLyra da tarefa 173 é futuro e não foi aplicado nesta etapa.

> **Navegação autorizada em 2026-11-06 (152):** o cabeçalho autenticado, a busca, o menu de perfil e o painel móvel usam a marca e os tokens celestiais, com links principais no topo do desktop. A engrenagem junto ao perfil abre a Administração por categorias. Por solicitação expressa, `/admin/content` fica fora da navegação, com página e funções preservadas. O fundo do AppShell adota o mesmo tema da landing. A sidebar lateral permanece disponível na prévia do construtor. Permissões e funções existentes são preservadas. O painel será redesenhado na 153, reaproveitando os motores e dados existentes.

> **Ampliação autorizada em 2026-11-06:** o carregamento real (tarefa 150) e o login/cadastro (tarefa 151) adotam a identidade celestial aprovada da landing, com fontes locais e tokens isolados em `src/components/public/CelestialIdentity.module.css`. A integração ao `AuthGate` preserva a proteção das rotas e apresenta o estado de espera real. O login usa `LoginExperience.css`, marca e ilustrações locais, preservando autenticação, consentimento, sessão e configuração pública do construtor. Janelas baixas permitem rolagem vertical sem ocultar controles. As demais telas internas continuam com as regras abaixo até seu redesenho autorizado.

> **Escopo vigente em 2026-11-06:** a landing pública passa a seguir a identidade celestial escura e amarela aprovada pelo usuário, implementada na tarefa 149 com estilos isolados em `src/components/landing/LandingCelestial.module.css`. A referência completa do futuro app está na tarefa 147. As regras abaixo continuam sendo a base das telas internas ainda não redesenhadas; não aplicar a exceção da landing a essas telas sem nova autorização. O favicon foi atualizado para o símbolo amarelo por solicitação expressa. As fontes locais, os tokens da landing e a origem das ilustrações estão documentados em `src/assets/celestial/ORIGEM.md`.

Visual aprovado pelo usuário em 2026-10-09 (tarefa 27) e aplicado em todo o
app: mais simples, moderno e premium, sem perder nenhuma função. Substitui o
visual anterior ("Cosmic Light", com vidro fosco, orbes e gradientes).

## Princípios

- Superfície calma: fundo neutro, cartões brancos com borda fina, uma cor de
  ação (teal do logo) e uma cor de destaque (coral do logo) reservada ao que é
  astral ou de IA.
- Uma ação principal clara por tela.
- Nada decorativo que não informe: sem orbes, gradientes, vidro, sombras
  coloridas, caixa alta espaçada ou animações contínuas.
- Acessibilidade como requisito: todo texto passa de 4,5:1 e todo contorno de
  controle passa de 3:1 (ver [`acessibilidade.md`](./acessibilidade.md)).

## Tokens (`src/app/globals.css`)

Desde a tarefa 47 a paleta deriva do **logo oficial** (o "L" em teal
abraçando o coração coral): teal para ação, coral para astral e IA, e neutros
levemente puxados para o azul-petróleo do teal. Valores do tema claro:

| Uso                           | Classe Tailwind                                                   | Valor                             |
| ----------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| Fundo da página               | `bg-background`                                                   | `#F6F8F9`                         |
| Superfície (cartão, header)   | `bg-card` + `border-border`                                       | `#FFFFFF` / `#E1E8EA`             |
| Texto / secundário            | `text-foreground` / `text-muted-foreground`                       | `#121C21` / `#57646B`             |
| Ação principal e item ativo   | `bg-primary`, `hover:bg-primary-hover`                            | `#087678` / `#055F61`             |
| Tom suave do teal             | `bg-sidebar-accent` + `text-sidebar-accent-foreground`            | `#E6F5F5`                         |
| Astral e IA (coral)           | `text-cosmic`, `bg-cosmic-light`, `text-cosmic-strong`            | `#BE3B13` / `#FFF1EB` / `#913012` |
| Erro (carmim frio)            | `text-destructive`, `bg-destructive-light`                        | `#B6163C`                         |
| Estados (texto + fundo claro) | `success`, `warning`, `info`, `destructive`, `golden` + `*-light` | 4,5:1 ou mais                     |
| Contorno de controle          | `border-control` / `bg-control`                                   | `#7B888E` (3,3:1 sobre `muted`)   |
| Cores puras do logo           | `bg-brand-teal`, `bg-brand-coral` (só decorativo, nunca texto)    | `#087878` / `#F8764F`             |

`accent` também é coral (`#BE3B13`) e é usado só para ações de IA (por
exemplo, o botão "Ações rápidas"). O coral original do logo (`#F8764F`) fica
abaixo de 3:1 sobre branco, por isso o texto usa a versão mais escura e o
original fica restrito a `--brand-coral`. O erro foi deslocado para um carmim
frio (matiz 346) justamente para não se confundir com o coral de destaque.

## Marca e ícones

- Componente único [`MarcaLyra`](../src/components/marca/MarcaLyra.tsx): logo
  oficial (`src/assets/marca/lyra-logo.png`, fundo convertido em
  transparência) usado na sidebar, menu do celular, landing (cabeçalho e
  rodapé), login, tela de carregamento e erro global. É decorativo (`alt=""`)
  quando o nome "lyra" aparece ao lado.
- O logo foi desenhado sobre branco; no tema escuro os brilhos sumiriam, então
  a marca fica num ladrilho branco arredondado (mesmo recurso do favicon).
- Ícones gerados a partir do mesmo arquivo: `src/app/favicon.ico` (16, 32,
  48 e 64 px), `src/app/icon.png` (192 px), `src/app/apple-icon.png` (180 px,
  fundo branco) e, para o manifesto (`src/app/manifest.ts`),
  `public/icones/lyra-192.png`, `lyra-512.png` e `lyra-maskable-512.png`
  (marca dentro da área segura de 80%).
- Fonte única: o logo oficial original fica em
  [`docs/marca/lyra-logo-oficial.png`](./marca/lyra-logo-oficial.png) e todos
  os arquivos acima são gerados por
  [`scripts/gerar-icones-da-marca.py`](../scripts/gerar-icones-da-marca.py)
  (Pillow + NumPy; instruções no próprio script). Rodar o script de novo
  reproduz os mesmos arquivos byte a byte.

## Forma e tipografia

- Raios (escala completa desde a tarefa 59): caixa de seleção 6 px
  (`rounded-xs`), controles 10 px (`rounded`), blocos internos 12 px
  (`rounded-md`), cartões 16 px (`rounded-xl`), seções 20 px (`rounded-2xl`),
  chips e avatares `rounded-full`. `rounded-3xl` e `rounded-4xl` ficam no teto
  de 20 px. Nada de valores soltos como `rounded-[10px]`.
- Sombras: cartões sem sombra (a borda separa); popovers, menus e modais com
  `shadow-lg`. A cor e a força vêm de `--sombra-cor` e `--sombra-forca`, que
  mudam no tema escuro (o Tailwind 4 copia o valor da sombra para a classe,
  então redefinir `--shadow-*` no `.dark` não tinha efeito).
- Véu de modais e sobreposições: `bg-overlay/55`, escuro nos dois temas.
- Contorno de campo (`--input`) e de controle (`--control`) com 3:1 ou mais
  sobre cartão, fundo, muted, secondary e popover nos dois temas
  (`src/app/tema.test.ts`).
- Títulos em Space Grotesk semibold (`font-display`), texto em Inter.
  Rótulos pequenos em `text-sm font-medium text-muted-foreground`, sem caixa
  alta. Métricas em `font-display` (não `font-mono`).
- Escala de texto do tema além da do Tailwind: `text-micro` (11 px),
  `text-caption` (13 px) e `text-body` (15 px). O `cn()` conhece essas escalas
  (`src/lib/utils.ts`) para não apagar a cor do texto ao juntar classes.
- Movimento: `--duracao-rapida` (150 ms), `--duracao-media` (220 ms),
  `--duracao-lenta` (320 ms) e as curvas `ease-saida` e `ease-entrada`; tudo
  desligado com `prefers-reduced-motion`.
- Foco: anel de 2 px na cor `--ring` em todo elemento focável, inclusive
  regiões roláveis; o link "Pular para o conteúdo principal" aparece no
  primeiro Tab.

## Estrutura das telas

- `AppShell` (`src/components/layout/AppShell.tsx`): sidebar de 248 px
  (largura configurável no construtor de UI), cabeçalho de 64 px com o `<h1>`
  da página, busca Ctrl K, notificações, Lyra AI e menu do usuário; conteúdo
  com largura máxima de 1280 px.
- `PageIntro`: abertura padrão da página (rótulo, título `<h2>`, descrição e
  ações), com as escalas de tipografia do construtor.
- `AccessDenied`: tela única de acesso negado das áreas administrativas.

## Identidade da navegação Lyra AI (2026-10-21)

- O acesso `/chat` usa **Lyra AI** e a marca oficial na sidebar, no menu
  móvel, no atalho do cabeçalho e na busca de páginas. A imagem é decorativa
  quando acompanhada do nome, evitando anúncio duplicado por leitor de tela.
- Configurações antigas com os rótulos padrão “Chat IA” ou “Chat AI” recebem
  o nome atual na apresentação. Nomes personalizados do construtor, destino,
  atalhos, visibilidade e permissões são preservados, sem regravar o banco.
- Por solicitação do usuário, **Lyra AI e seu histórico são o primeiro bloco**
  da seção Principal, acima de Painel, no desktop e no menu móvel. Essa posição
  também vale para configurações antigas; a ordem relativa dos demais itens
  permanece a mesma. O histórico continua logo abaixo do acesso ao chat.
- Referência consultada: [navegação Fluent 2](https://fluent2.microsoft.design/components/web/react/core/nav/usage/),
  com nomes breves, ícones reconhecíveis, agrupamento e consistência entre
  desktop e celular; componentes e cores seguem o Lyra Clean existente.

## Telas públicas: landing e login

- Desde 2026-10-24, por solicitação do usuário, **Source Sans 3 Regular (400)**
  substitui a Imprima nas telas públicas, incluindo títulos, textos e controles.
  É uma alternativa humanista servida por `next/font/local`, com `display: swap`
  e variável `--font-source-sans`. Inter, Space Grotesk e JetBrains Mono também
  usam arquivos WOFF2 locais, preservando as famílias das telas internas.
  As fontes e licenças estão em `src/assets/fonts`; nenhuma delas depende de
  acesso ao Google durante o build ou no navegador.
- `src/components/public/PublicTheme.css` compartilha os fundos e superfícies
  de cada tema, os tons teal e coral e a tipografia; o login usa borda
  fina, marca e introdução agrupadas, formulário à direita no desktop e
  logo após o título no celular. Não adiciona efeitos decorativos.
- A sequência inicial é **Início → Leituras de Mapas → Jornada → Benefícios
  → Planos → Dúvidas → Sobre**. O padrão antigo é reconhecido e atualizado
  na renderização. Uma ordem personalizada no Construtor continua válida,
  e o menu acompanha a ordem dos blocos visíveis. Sobre precede o acesso
  rápido e o convite final.
- As leituras apresentam os três métodos do motor e informam os limites
  reais: sem cálculo de Desenho Humano nem dedução de conteúdos pessoais
  simbólicos. O bloco é informativo, sem botão de acesso próprio.
- Refinamento de 2026-10-20: textos de leitura da landing em 17 px como
  base, seções com 32–48 px de respiro vertical e cartões mais compactos.
  No login, campos em 17 px, rótulos em 16 px e coluna introdutória de até
  520 px, com textos alinhados à esquerda e tipografia um pouco menor;
  cabeçalho e aviso mantêm todos os textos em menos linhas. Em janelas de
  notebook baixas, intervalos e preenchimentos diminuem sem reduzir fontes
  nem recortar o conteúdo; o documento continua rolável quando necessário.
- Os planos têm preenchimento de 18 px, preço até 36 px e descrição
  completa expansível em “Sobre este plano”. Mapas e indicadores também
  usam preenchimentos menores; seções com 32–48 px (planos com 18 px
  no desktop e 32 px no celular).
  A grade de planos mantém três colunas acima de 900 px e empilha abaixo.
- **Padrão de tema confirmado em 2026-10-20:** claro em todas as páginas,
  incluindo landing e login, no mobile e no desktop. A orientação mais
  recente substitui o pedido anterior de escuro nas telas públicas. A
  alternância permanece disponível e respeita escolhas já salvas; as
  preferências pública e interna continuam independentes.

## Perfil: organização adaptativa (2026-10-20)

- A navegação por âncoras reúne **Dados e rotina**, **Conta e privacidade** e
  **Mapa e evolução**; os destinos têm margem para o cabeçalho fixo e os
  controles mantêm pelo menos 44 px de altura.
- Os cartões formam uma grade contínua com duas colunas de mesma largura
  no desktop amplo. Cada cartão ocupa sua altura real, sem esperar uma
  seção ou coluna mais alta terminar. Ações da Conta precede Care; hábitos,
  e-mail, privacidade, plano, compras, mapa e evolução aproveitam os espaços
  seguintes. No celular, a mesma ordem do documento segue em uma coluna.
- `GradeDeCartoesDoPerfil` usa CSS Grid estável e `ResizeObserver`, medindo
  o conteúdo de altura natural e o espaçamento efetivo. A grade se ajusta
  ao carregamento de dados, fontes, seções condicionais e redimensionamento,
  sem altura percentual nos cartões, cortes de conteúdo ou ordem de foco
  imposta por `tabindex`. Sem o ajuste de medição, continua sendo uma grade
  convencional legível.
- Campos, operações e controles de privacidade independentes do plano
  continuam disponíveis conforme as permissões existentes. O formulário
  permanece inteiro, com sua validação e ação de salvar originais.
- Referências: [layouts adaptativos do SAP Fiori Android v26-4](https://www.sap.com/design-system/fiori-design-android/v26-4/foundations/adaptive-layout/canonical-layouts),
  [layouts canônicos do Material 3](https://m3.material.io/foundations/layout/canonical-examples/overview),
  [Reflow do WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html),
  [ordem de foco](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html),
  [posicionamento automático do Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Auto-placement)
  e [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver).

## Painel pessoal por assunto (2026-10-27)

- **Resumo** abre com sono registrado, passos e disposição calculada, esta
  última somente quando permitida pelo plano. Os botões levam ao grupo de
  registros correspondente. Ausência continua sendo ausência, inclusive
  quando existe registro de outra métrica no mesmo dia.
- **Registros** reúne sono, recuperação, movimento, glicose, alimentação,
  mente e corpo. Cada grupo ocupa a largura disponível, com os cartões
  originais preservados. **Evolução** reúne as séries e o histórico;
  **Orientações**, as leituras e dicas; **Como me sinto**, as avaliações.
- As abas usam ativação manual: setas movem o foco; Enter ou Espaço abre o
  assunto. No celular, os controles se distribuem em linhas, sem esconder
  destinos. Aba e grupo ficam na URL, que contém somente escolhas de
  apresentação. Valores desconhecidos voltam ao resumo e ao grupo Sono.
- Componentes com consultas e cálculos próprios montam ao abrir o assunto.
  Conteúdo carregado sob demanda informa seu carregamento. Atualizações
  dos registros usam estado ocupado e preservam a árvore das avaliações e
  formulários; não substituem a tela inteira por um esqueleto de carregamento.
- As abas disponíveis e os indicadores seguem os recursos efetivos da
  assinatura. A URL não altera permissões. Falhas de leitura têm aviso e
  retentativa, sem apresentar erro como um dia sem registros.

## Explicações do painel (tarefa 115)

O resumo, os grupos de registros e as orientações compartilham o catálogo de
explicações. O aviso de origem distingue modelo conectado, catálogo, modo
privado, atualização, limite e falha. Falha não oculta os valores registrados.
As descrições para leigos não trazem nomes astrológicos técnicos; os
fundamentos permanecem em detalhes recolhidos e identificados.

Ausência de registro não é zero. Sem medição, o campo mantém seu estado vazio
e usa a definição do catálogo. As pontuações interpretativas são apresentadas
como reflexões, sem classificação clínica por um valor isolado. O cartão de
mudanças aguarda histórico antes de anunciar estabilidade.

## Navegação lateral por assunto (2026-11-04, tarefa 140)

- **Dia a dia:** Lyra AI, Painel e Meu dia ficam acessíveis diretamente.
- **Minha jornada:** submenus Planejamento e hábitos, Práticas de bem-estar
  e Registros e evolução. Cada um reúne somente páginas já disponíveis ao titular.
- **Saúde e conexões:** Monitoramento, Dispositivos e Agendamentos, conforme
  direitos do plano e ativação global de Agendamentos.
- **Minha conta:** Perfil, Planos (somente usuários comuns) e Sem internet.
- **Administração:** logo após Dia a dia para quem administra; visão geral direta; submenus Pessoas e planos,
  Conteúdo e IA e Dados e relatórios, exclusivos do administrador.

Desktop, menu móvel e prévia do construtor usam `SidebarNavigation`.
O grupo da página atual abre automaticamente, inclusive em acessos diretos;
Enter e Espaço abrem ou fecham os demais grupos. Links recolhidos ficam fora
da navegação por teclado; a lista é nomeada pelo botão com `aria-controls`
e `aria-expanded`. A navegação continua sendo uma lista de links, sem
`role="menu"`. No celular, escolher uma página fecha o painel.

Rótulos e ordem personalizada do construtor são preservados dentro de cada
categoria. Categorias vazias não aparecem; novos destinos personalizados
continuam acessíveis. Histórico de conversas, busca e atalhos existentes
permanecem disponíveis. Os rótulos aceitam quebra de linha e os controles
têm pelo menos 44 px, com cores semânticas do Lyra Clean.

Referências consultadas em 04/11/2026: [navegação com disclosure do WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/),
[Carbon atualizado em outubro de 2026](https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-left-panel/accessibility)
e [submenus do shadcn](https://ui.shadcn.com/docs/components/radix/sidebar).

## Referências históricas

- Proposta aprovada: sistema visual, login, dashboard e metas, publicados como
  artefato de design em 2026-10-09.
- [`design/README.md`](./design/README.md): arquivos históricos do visual
  anterior.

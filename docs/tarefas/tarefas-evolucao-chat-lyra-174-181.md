# LYRA METACARE · PROGRAMA DE EVOLUÇÃO DAS DUAS EXPERIÊNCIAS DE CHAT

**Documento de tarefas para cadastro no `claude-gestao.md` oficial · 07/11/2026**

> **Natureza:** especificação técnica, não implementação. Este documento NÃO altera o projeto, NÃO modifica o `claude-gestao.md` original, NÃO executa commit/push e NÃO declara funcionalidades entregues. As tarefas abaixo estão todas **⚪ A INICIAR**, sujeitas à confirmação do estado atual da `main` no momento da execução.

## 0. Origem, fronteira e decisões vinculantes

- **Fonte de análise:** ZIP `Lyra-MetaCare-main 2.zip` fornecido pelo usuário, inspecionado no sandbox; arquivos: `CLAUDE.md`, `AGENTS.md`, `claude-gestao.md`, `src/components/dashboard/CelestialChat.tsx`, `src/components/dashboard/CelestialDashboard.tsx`, `src/components/dashboard/CelestialDashboard.module.css`, `src/components/chat/ChatAssistantContent.tsx`, `ChatBubble.tsx`, `ChatInput.tsx`, `RespostaMarkdown.tsx`, `PainelDaConversa.tsx`, `src/lib/chat/partes.ts`, `src/hooks/use-conversa-lyra.ts`, `src/app/chat/page.tsx`, e testes de chat citados neste documento. Não foi possível executar a aplicação neste sandbox; achados de código são evidência estática, não QA de navegador.
- **Identidade visual obrigatória:** preservar a identidade celestial escura com amarelo suave, marca aprovada, tipografia e tokens existentes. Não reutilizar as duas imagens geradas anteriormente nesta conversa: foram reconstruções incorretas e não são referência visual do produto. A identidade e navegação do redesign 147/152 e rebranding futuro 173 devem ser conciliados antes de alterar interfaces.
- **Não duplicar escopo:** tarefas 142 (UX geral), 147 (redesign), 152 (navegação), 153 (dashboard com dados reais), 154 (auditoria), 173 (rebranding) e a tarefa externa já preparada de Generative UI podem interceptar este programa. Antes do cadastro, procurar uma tarefa de Generative UI já incorporada à `main`, comparar critérios e registrar dependências; **não cadastrar implementação duplicada**. A tarefa 176 é a camada de apresentação/contrato deste programa e deve absorver ou referenciar requisitos idênticos de uma eventual tarefa existente, sem desenvolver dois motores paralelos.
- **Sem exclusões funcionais:** não remover capacidades existentes de histórico, busca, favoritos, memória, BYOK, privacidade, treinamento, voz, imagens, anexos, assinaturas, controle de acesso, relatórios e painel. Não reativar funcionalidades pausadas ou desativadas pela tarefa 144. Não inventar dados pessoais, valores de mapas, métricas ou disponibilidade de modelos.
- **Fonte de verdade:** arquivos atuais na `main` no instante da execução, não os trechos congelados deste documento. Primeiro conferir `git status`, SHA, migrações, feature gates e diffs existentes. Se algum comportamento já estiver implementado, provar por teste real e registrar, não recriar.
- **Autorizações:** o pedido atual autoriza apenas **criar o arquivo de tarefas e salvá-lo no Google Drive**, não implementar nem fazer commit/push. Na futura execução, observar autorização vigente e regras do `CLAUDE.md` e `AGENTS.md`; trabalhar somente na `main`, sem branch/worktree/force-push, publicar tarefa por tarefa com registro de SHA, respeitando alterações locais pausadas.

## 1. Formato de incorporação no painel oficial

O `claude-gestao.md` atual possui **173 tarefas** e determina: tarefa única em um único tópico, ordem numérica crescente, até três em ANDAMENTO, estados ⚪/🔵/🟡/🟢/🔴, e atualização do painel após commit e push. Ao cadastrar, inserir as tarefas **174 a 181** no **Tópico 3 · Tarefas a Iniciar**, após a 173 e antes do Tópico 4, mantendo os textos completos e a ordem. Atualizar os indicadores do Tópico 1 sem alterar contagens históricas indevidamente: se os estados da versão lida permanecerem 139 🟢, 8 🟡, 3 🔵, 0 🔴 e 23 ⚪, a inclusão de oito tarefas resultará em **181 totais, 31 a iniciar, 139 concluídas, 8 implementadas e 3 em andamento**; recalcular os percentuais em vez de copiar valores. Se a `main` tiver mudado, recalcular todos os números a partir dos estados reais. Não mover tarefas existentes sem motivo e não publicar este documento como implementação.

### Modelo obrigatório de execução de CADA tarefa

1. **Preflight e autorização:** reler integralmente `CLAUDE.md`, `AGENTS.md`, `claude-gestao.md` e instruções aplicáveis; verificar estado da `main`, `git status --porcelain=v1`, `git log -5 --oneline`, versões Node/pnpm, banco e serviços; não misturar trabalho não relacionado.
2. **Auditoria de existência e impacto:** inventariar rotas, componentes, hooks, tipos, API, permissões, feature gates, testes, CSS, eventos, armazenamento e migrações; mapear dependências e requisitos já atendidos; decidir menor alteração consistente que preserve o contrato atual.
3. **Plano e rastreabilidade:** registrar objetivo, hipótese verificável, arquivos afetados, dados reais, compatibilidade, segurança, estados vazios, UX, testes e rollback. Tratar mudanças de contrato com versionamento e migração retrocompatível.
4. **Implementação completa:** usar dados reais e permissões reais, sem mocks na produção, sem placeholders, sem hardcode de valores pessoais, sem código incompleto, sem atalhos que silenciem erros; manter PT-BR, responsividade e acessibilidade.
5. **Verificações automatizadas:** executar scripts existentes (`pnpm check:lint`, `pnpm check:format`, `pnpm check:types`, `pnpm test`, `pnpm test:integration`, `pnpm build`) quando aplicáveis, mais testes focados. Não afirmar sucesso sem registrar contagens/saídas reais. Testes que exigem MySQL, credenciais ou modelos devem ser executados quando disponíveis, senão registrar bloqueio verificável.
6. **QA no navegador:** desktop 320/360/390/768/1024/1280/1440/1920 px conforme o cenário, zoom 200%, teclado, leitor de tela quando disponível, tema escuro/claro configurado, sessão real, plano autorizado/negado, rede lenta, interrupção de SSE, anexos, favoritos, memória, persistência, retorno da navegação. Capturas **reais** de ambas as experiências, com dados de QA não sensíveis e data/ambiente, nunca mockups apresentados como prints.
7. **Segurança e privacidade:** testar IDOR em conversas/turnos/anexos, XSS/HTML não confiável, autorização por plano, BYOK e logs, limites de payload, revalidação no servidor, CSRF quando aplicável, políticas de retenção e modo privacidade. Nunca registrar chaves, dados médicos ou informações privadas em artefatos de QA.
8. **Conclusão individual:** atualizar a tarefa no painel com evidências e limitações, commit e push na `main` exclusivamente dos arquivos autorizados, confirmar SHA remoto, depois commit/push do registro do painel conforme regra 6. Se gate obrigatório falhar, registrar 🟡/🔴 conforme realidade, não marcar 🟢. Não avançar encobrindo falhas.

## 2. Matriz inicial de achados comprováveis no código

| Evidência estática                                                                                                                                                                 | Consequência a investigar                                                                                         | Tarefa   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `CelestialChat.tsx` apresenta `turno.pergunta`/`turno.resposta` em `<p>`; `ChatAssistantContent.tsx` usa `ChatBubble`, `RespostaMarkdown`, `PainelDaConversa` e `ImagemDaConversa` | Respostas com estrutura, Markdown e mídia podem ter apresentação diferente nas duas superfícies                   | 174, 176 |
| `CelestialChat.tsx` mantém `useConversaLyra(null, undefined, salvar)` e abre `ChatCompleto` com outra instância, sem `conversaId` explícito                                        | Risco de perda da conversa ativa ao abrir anexos ou mudar de superfície; comprovar no QA antes de classificar bug | 175      |
| Botões compactos de sugestões contêm duas perguntas fixas                                                                                                                          | Falta de sugestões adaptadas a contexto real e funções permitidas                                                 | 179      |
| `partes.ts` define apenas `tipo: painel`, `versao: 1`, máximo 4 partes, `dias` até 31                                                                                              | Catálogo limitado de componentes estruturados, mas seguro e versionado                                            | 176      |
| `PainelDaConversa.tsx` usa abas Resumo/Evolução/Dados e Recharts                                                                                                                   | Base reutilizável para visualizações; preservar sem degradar                                                      | 176, 180 |
| `CelestialChat.tsx` abre diálogo separado para anexos                                                                                                                              | Fluxo de anexos pode fragmentar a conversa e exigir troca de interface                                            | 177      |
| Chat compacto possui diálogo ampliado e CSS próprio                                                                                                                                | Necessidade de validar viewport, foco, rolagem, Escape e responsividade                                           | 178      |
| `useConversaLyra` gerencia cancelamento, carregamento e estado dos turnos                                                                                                          | Exige testes de concorrência, troca de conversa, stream e interrupção                                             | 175, 181 |

---

### 174 · Renderização compartilhada e paridade funcional das duas superfícies de conversa · ⚪ A INICIAR

**Prioridade:** P0 · Alta. **Dependências e coordenação:** 175, 176, 177. **Estado:** não implementada por este documento.

**Objetivo:** criar um núcleo de apresentação reutilizável, com responsabilidades claras, para que o chat compacto do dashboard e o chat completo apresentem a mesma resposta de forma coerente, respeitando o espaço disponível e o acesso do usuário.

**Escopo técnico obrigatório:**

1. Mapear as estruturas `TurnoDaConversa`, `Message`, `ParteDoChat`, `ImagemDoTurno`, os campos de streaming, erros, anexos e favoritos; identificar transformações duplicadas e as diferenças de apresentação.
2. Extrair componentes de mensagem e de estado de turno compartilháveis sem forçar o mesmo layout visual: variações explícitas `compacto`, `expandido` e `completo`; manter tipagem estrita e propriedades estáveis.
3. Reutilizar `RespostaMarkdown`/`Streamdown` para Markdown, tabelas GFM, blocos de código, links seguros, citações quando presentes e texto em streaming. Não habilitar HTML arbitrário, iframes ou scripts; não abrir links inseguros.
4. Reutilizar `PainelDaConversa` e `ImagemDaConversa` conforme permissões e dados existentes. Em modo compacto, apresentar resumo/visualização responsiva ou ação acessível para ampliar, nunca truncar dados silenciosamente nem substituir por valores falsos.
5. Preservar ações existentes do chat completo: copiar, regenerar, favoritar, anexos, voz, avaliação, imagem, estados de erro e controle de treinamento quando autorizados. A versão compacta pode expor ações essenciais e encaminhar às demais sem perder contexto.
6. Manter rolagem ancorada, comportamento de texto longo, quebras de palavra, tabelas horizontais roláveis e blocos de código com foco; impedir layout shift excessivo durante stream.
7. Remover renderização duplicada apenas após teste de equivalência; não alterar contrato do servidor desnecessariamente.
8. Documentar API dos componentes, matriz de capacidades por superfície e exemplos reais de mensagens válidas.

**Arquivos-alvo iniciais:** `src/components/dashboard/CelestialChat.tsx`, `src/components/chat/ChatAssistantContent.tsx`, `ChatBubble.tsx`, `RespostaMarkdown.tsx`, `PainelDaConversa.tsx`, `ImagemDaConversa.tsx`, `src/lib/chat/tipos.ts`; novos componentes compartilhados apenas se necessários.

**Testes:** Markdown com listas/tabelas/código, URLs maliciosas, resposta vazia, 20 mil caracteres de histórico (sem burlar limite de envio), stream em blocos, imagem pronta/pendente/erro, painel sem dados, plano negado, cópia fiel, navegação por teclado, snapshots estruturais não frágeis e testes de integração reais.

**Aceite:** mesma mensagem e mesmas partes persistidas apresentam informação equivalente em ambas as superfícies; diferenças são apenas de densidade/layout e permissões. Sem regressão de histórico, voz, anexos, imagem ou acessibilidade.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 175 · Continuidade transacional da conversa entre dashboard, expansão, anexos e página /chat · ⚪ A INICIAR

**Prioridade:** P0 · Alta. **Dependências e coordenação:** 174, 177, 178. **Estado:** não implementada por este documento.

**Objetivo:** garantir que o usuário permaneça na mesma conversa ao navegar entre chat compacto, expandido, modal de anexos e chat completo, sem criar histórico duplicado nem perder rascunho por acidente.

**Escopo técnico obrigatório:**

1. Reproduzir em QA o comportamento atual com uma conversa real; registrar IDs de conversa/turno e mudanças ao abrir o diálogo de anexos, expandir, reduzir, fechar e navegar para `/chat`.
2. Definir um contrato único de identidade de conversa, compatível com `useConversaLyra(conversaInicial, aoAbrir, salvarHistorico, mensagemInicial)` e com `/chat?conversa=...&mensagem=...`. Não criar stores paralelos com cópias divergentes do histórico.
3. Fazer o chat compacto comunicar ao chat completo a conversa ativa e preservar o rascunho enquanto a navegação/diálogo estiver aberto; separar claramente estado persistido de estado efêmero. Para planos sem histórico, manter sessão efêmera sem fingir persistência.
4. Garantir que abrir anexos ou ampliar não dispare nova conversa, nova mensagem, cobrança de token ou duplicação de request. `novaConversa` deve ser ação explícita e reversível quando houver confirmação exigida.
5. Tratar concorrência e corrida de respostas: SSE em andamento, troca de rota, `AbortController`, clique repetido, regeneração, paginação anterior/posterior, retorno do navegador, atualização de página e falha de rede.
6. Validar ownership no backend: usuário A não pode abrir conversa/turno de B via query string; não vazar IDs ou conteúdo entre sessões, inclusive logout/login e duas abas.
7. Garantir comportamento de foco após abrir/fechar diálogo e de rolagem ao recuperar histórico; preservar favoritos e a mensagem selecionada.
8. Especificar fallback explícito quando conversa foi excluída, está indisponível, é de outro usuário ou o plano não permite histórico.

**Arquivos-alvo iniciais:** `CelestialChat.tsx`, `ChatAssistantContent.tsx`, `src/app/chat/page.tsx`, `use-conversa-lyra.ts`, `src/lib/chat/transporte.ts`, APIs `/api/chat/conversas/*` e testes existentes.

**Testes:** matriz de 4 superfícies × conversa nova/existente × histórico habilitado/desabilitado × stream ocioso/ativo; testar duplo clique, back/forward, refresh, duas abas, 401/403/404, exclusão e nova sessão. Conferir persistência real em banco quando aplicável.

**Aceite:** IDs e turnos permanecem estáveis em todas as transições autorizadas; zero duplicação de envio e nenhum vazamento de histórico.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 176 · Generative UI segura, tipada e nativa nas respostas da Lyra · ⚪ A INICIAR

**Prioridade:** P1 · Alta. **Dependências e coordenação:** 174, 175, 180. **Estado:** não implementada por este documento.

**Objetivo:** ampliar o catálogo de respostas estruturadas da Lyra, com renderização interativa real e rastreabilidade dos dados, sem substituir o texto e sem permitir execução arbitrária de código fornecido pelo modelo.

**PREVENÇÃO DE DUPLICIDADE:** existe um documento anterior `tarefa-generative-ui-lyra-metacare.md` já preparado para este usuário. Antes de implementar, localizar sua versão aprovada e qualquer tarefa equivalente incorporada à `main`. Se houver sobreposição, esta tarefa deve ser vinculada/absorvida e não gerar dois catálogos, dois contratos ou duas implementações da mesma funcionalidade. Registrar decisão no painel.

**Escopo técnico obrigatório:**

1. Preservar leitura dos registros antigos de `painel` versão 1 (`partesDoBanco`) e elaborar estratégia versionada de novos discriminantes de `ParteDoChat`, com Zod `.strict()`, limites por tipo, limites de tamanho/quantidade e rejeição de payload desconhecido.
2. Catálogo inicial condicionado a dados disponíveis: resumo com indicadores, cartões informativos, tabela acessível com filtros/ordenação, série temporal, barras, comparativo, cronologia, status/farol e seleção contextual. Não implementar componentes sem fonte real ou sem uso demonstrável.
3. Separar **dados do domínio**, **metadados de proveniência**, **apresentação** e **ações**. Não permitir HTML/JS/CSS/URL arbitrários nem consultas SQL definidas pelo modelo; usar allowlist de ações mapeadas no servidor com autorização e validação por usuário/plano.
4. Definir semântica de números, unidades, período, fuso, nulos, ausência de dados, estimativas, data de geração, atualização e origem. Nenhuma métrica inventada, nenhum percentual derivado de divisão por zero.
5. Definir estados de carregamento, vazio, parcial, erro, indisponível, dados desatualizados e dados confidenciais; suportar fallback textual equivalente e exportação somente quando autorizada.
6. Integrar renderização em `ChatAssistantContent` e `CelestialChat` por meio do núcleo da 174; responsividade e acessibilidade obrigatórias, inclusive controles por teclado e alternativa textual a gráficos.
7. Validar persistência, reabertura, reenvio, paginação e replay de SSE sem recriar partes inconsistentes nem duplicar custos.
8. Cobrir segurança contra XSS, links externos, IDOR, excesso de payload, bypass de feature gates, vazamento de dados e ações de escrita sem confirmação.
9. Usar Recharts e os componentes existentes quando adequados; não introduzir bibliotecas pesadas sem justificativa de bundle, licença, manutenção e acessibilidade.
10. Documentar schemas, contratos de servidor/cliente, limites, compatibilidade com v1, exemplos reais obtidos do app e matriz de permissões.

**Arquivos-alvo iniciais:** `src/lib/chat/partes.ts`, `PainelDaConversa.tsx`, `ChatAssistantContent.tsx`, `CelestialChat.tsx`, `/api/functions/ask-ai-assistant/route.ts`, persistência e testes `/api/chat/paineis.integration.test.ts`.

**Testes:** round-trip Zod/banco/API/UI; 1.000 linhas em tabela com paginação ou virtualização adequada; ausência de dados; injeção de scripts; discriminante inválido; payload grande; revogação de plano; permissão cruzada; dados em PT-BR; keyboard e screen reader; compatibilidade v1.

**Aceite:** catálogo interativo é útil e funcional nas duas superfícies, com origem verificável e sem regressão de dados históricos. Ações que alteram dados só executam via APIs reais e com confirmação/autorização.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 177 · Anexos e compositor unificado no chat compacto e completo · ⚪ A INICIAR

**Prioridade:** P1 · Alta. **Dependências e coordenação:** 174, 175. **Estado:** não implementada por este documento.

**Objetivo:** permitir anexar arquivos diretamente à conversa ativa, sem criar outra sessão visual ou interromper o fluxo.

**Escopo técnico obrigatório:**

1. Inspecionar `ChatInput.tsx`, `AnexosDaConversa.tsx`, `/api/chat/anexos/route.ts`, validação de MIME/tamanho, consentimento, armazenamento, permissões e limites por plano; não duplicar uploaders.
2. Extrair ou reutilizar um compositor responsivo que aceite texto, anexos autorizados, indicadores de upload, envio, cancelamento, erro e limite de caracteres, com variação de densidade compacta/completa.
3. No dashboard, clique no clipe abre seleção contextual na própria conversa (popover/modal acessível conforme viewport) e mantém `conversaId`, rascunho e anexos; não montar outro `ChatAssistantContent` sem identidade compartilhada.
4. Preservar consentimento explícito antes de o modelo ler anexos, incluindo revogação/limpeza, visualização de nome/tamanho/tipo e indicação do que será transmitido; jamais enviar anexos sem autorização.
5. Reusar APIs de upload e leitura reais, sem embutir conteúdo bruto em logs, telemetria ou query strings; respeitar políticas de privacidade e feature gates.
6. Cobrir anexos órfãos, falhas de upload, exclusão, envio interrompido, múltiplos arquivos, nome longo, arquivo duplicado, formato não aceito, arquivo corrompido e recuperação após falha.
7. Preservar Enter/Shift+Enter, IME/composição de texto, textarea autoajustável, foco e estados disabled.

**Arquivos-alvo iniciais:** `CelestialChat.tsx`, `ChatInput.tsx`, `AnexosDaConversa.tsx`, `ChatAssistantContent.tsx`, `use-conversa-lyra.ts`, rotas `/api/chat/anexos/*`.

**Testes:** arquivos permitidos/proibidos, limite exato e limite+1, consentimento ausente/revogado, falha 413/415/500, upload simultâneo, stream em curso, usuário sem plano, exclusão e reabertura do mesmo turno; prova ponta a ponta com armazenamento real.

**Aceite:** enviar pergunta com anexo no compacto e continuar no completo preserva o mesmo turno e suas permissões; nenhum envio silencioso de arquivo.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 178 · Experiência celestial responsiva, expansão, foco e acessibilidade do chat · ⚪ A INICIAR

**Prioridade:** P1 · Média. **Dependências e coordenação:** 174, 175. **Estado:** não implementada por este documento.

**Objetivo:** maximizar a área útil da conversa, respeitando o redesign celestial aprovado e todos os dispositivos, sem sacrificar navegação ou controles.

**Escopo técnico obrigatório:**

1. Levantar CSS efetivo de `CelestialDashboard.module.css`, `CelestialIdentity.module.css`, `AppShell` e `ChatAssistantContent`, tokens e fontes; fotografar baseline real em desktop/mobile antes de editar.
2. Rever os modos compacto, expandido e `/chat`: largura fluida, altura com `dvh` e safe areas, campo fixo visível, rolagem exclusiva das mensagens, teclado virtual, barras de navegação e zoom 200%; evitar medidas rígidas sem necessidade.
3. Validar Radix Dialog: `aria-labelledby`, `aria-describedby`, retorno do foco, trap, Escape, fechamento, scroll lock, clique fora e comportamento de `onPointerDownOutside`/`onEscapeKeyDown`; não impedir fechamento por teclado sem justificativa de UX e alternativa acessível.
4. Corrigir alvos de toque abaixo do mínimo aplicável, botões só com ícone sem rótulo, contraste de amarelo/escuro, foco visível, redução de movimento e anúncios `aria-live` não excessivos.
5. Garantir que tabelas, gráficos, código, anexos e imagens não provoquem scroll horizontal da página nem comprimam o chat. O painel do dashboard deve continuar funcional e não desaparecer.
6. Criar estados elegantes e verdadeiros: vazio, digitando, streaming, conexão interrompida, plano sem acesso, dados indisponíveis, erro de API e recuperação.
7. Preservar as preferências de tema já existentes; não introduzir nova identidade roxa, layout médico ou conteúdo demonstrativo na produção.

**Arquivos-alvo iniciais:** `CelestialChat.tsx`, `CelestialDashboard.module.css`, `CelestialDashboard.tsx`, `ChatAssistantContent.tsx`, `ChatBubble.tsx`, `AppShell` e estilos globais somente se necessário.

**Testes:** capturas reais 320/360/390/768/1024/1280/1440/1920, 320 px com zoom 200%, teclado sem mouse, toque, orientação paisagem, teclado virtual, foco em modal, leitor de tela quando disponível, tema claro/escuro, conteúdo longo e painel com gráfico.

**Aceite:** sem cortes, sobreposição de compositor, foco perdido ou rolagem horizontal indevida; identidade aprovada mantida nas duas superfícies.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 179 · Sugestões de perguntas contextuais com fonte real e respeito à privacidade · ⚪ A INICIAR

**Prioridade:** P2 · Média. **Dependências e coordenação:** 174, 175. **Estado:** não implementada por este documento.

**Objetivo:** substituir a limitação de duas sugestões fixas do chat compacto por recomendações relevantes, sem inventar dados ou comprometer privacidade.

**Escopo técnico obrigatório:**

1. Auditar as `quickReplies` do construtor (`usePublicSitePageConfig('app')`) e as duas perguntas estáticas de `CelestialChat.tsx`; decidir precedência entre configuração publicada, sugestões contextuais e fallback seguro.
2. Gerar sugestões com base em **funcionalidades reais disponíveis**, dados consentidos e estado de carregamento, por exemplo mapa já calculado, leitura de hoje disponível ou histórico existente. Não pressupor dados natais, saúde, assinatura, localização ou leitura.
3. Não enviar perfil ou dados pessoais para serviço externo apenas para produzir chips de sugestão; se for necessário processamento externo, exigir base legal/consentimento e feature gate.
4. Distinguir sugestão que apenas preenche o campo de ação que envia imediatamente; preservar escolha do usuário e evitar consumo involuntário de tokens.
5. Respeitar admin vs usuário, assinatura, modo privacidade, ausência de dados e funções desativadas pela tarefa 144; não sugerir caminho indisponível.
6. Permitir configuração administrativa das sugestões quando o construtor já oferecer essa capacidade, sem criar novo CRUD desnecessário; garantir fallback quando nenhuma sugestão é elegível.
7. Aplicar critérios de linguagem simples, PT-BR, acessibilidade, comprimento de chips e consistência entre compacto/completo.

**Arquivos-alvo iniciais:** `CelestialChat.tsx`, `ChatAssistantContent.tsx`, configuração pública do app, feature gates, hooks de dados e testes.

**Testes:** perfil sem mapa, mapa calculado, plano sem acesso, privacidade ativa, usuário novo, usuário com histórico, configuração publicada vazia, funcionalidade desativada, clique/teclado e ausência de cobrança ao preencher.

**Aceite:** sugestões elegíveis, explicáveis e corretas, com dados reais e sem exibir caminhos inacessíveis.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 180 · Proveniência, acessibilidade e exportação responsável das visualizações · ⚪ A INICIAR

**Prioridade:** P2 · Média. **Dependências e coordenação:** 176. **Estado:** não implementada por este documento.

**Objetivo:** tornar painéis e gráficos compreensíveis, auditáveis e exportáveis quando permitido, sem transformar a apresentação em uma fonte fictícia de verdade.

**Escopo técnico obrigatório:**

1. Mapear cada indicador existente em `PainelDaConversa` e novos tipos da 176 até a origem: API, tabela, transformação, unidade, janela temporal, atualização e regras de ausência.
2. Exibir data/hora de referência, período e origem de modo legível; distinguir dado informado, importado, calculado e estimado somente quando o backend oferecer essa informação verificável.
3. Criar alternativa tabular/textual para cada gráfico e descrever eixos, unidades, valores nulos e mudanças de período; não usar apenas cor para status.
4. Permitir filtro/ordenação com resultados reproduzíveis e estado acessível; nenhum controle visual deve ficar inerte. Persistência de preferências somente quando justificada e consentida.
5. Avaliar exportação CSV/PDF/PNG conforme formatos existentes, disponibilidade real e segurança; implementar apenas caminhos necessários e autorizados, com dados idênticos aos exibidos, proteção contra CSV injection e nomes de arquivo seguros.
6. Garantir que dados não autorizados ou indisponíveis não apareçam em exportações, tooltips, HTML oculto, caches compartilhados ou logs.
7. Medir impacto de performance em conjuntos grandes; lazy load, paginação ou virtualização apenas se a medição justificar.

**Arquivos-alvo iniciais:** `PainelDaConversa.tsx`, `partes.ts`, geradores/exportadores já existentes, API de métricas e testes.

**Testes:** CSV injection, datas e fusos, nulos, arredondamento, fonte desatualizada, leitor de tela, impressão, autorização revogada, exportação com zero linhas, grandes conjuntos, comparação visual/exportado.

**Aceite:** usuário consegue compreender de onde vem cada número disponível e obter representação acessível sem divergência dos dados de origem.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

### 181 · QA forense integral, regressão, segurança, performance e publicação do programa de chat · ⚪ A INICIAR

**Prioridade:** P0 · Gate final. **Dependências e coordenação:** 174–180. **Estado:** não implementada por este documento.

**Objetivo:** validar integralmente as duas experiências após as implementações autorizadas e impedir que melhorias visuais escondam regressões de dados, segurança ou funcionalidades.

**Escopo técnico obrigatório:**

1. Criar matriz de rastreabilidade de todos os requisitos 174–180: código, endpoint, persistência, plano, tela, estado, teste, evidência, responsável e resultado.
2. Executar o baseline e os gates atuais de lint, formatação, tipos, testes unitários, integração e build; separar falhas pré-existentes de regressões novas, sem alterar testes para mascarar bugs.
3. QA ponta a ponta com contas temporárias autorizadas e exclusão posterior: usuário com e sem histórico, planos distintos, admin, modo privacidade, BYOK, mensagens simples/Markdown, painel, imagem, anexos, voz, memória, pesquisa, favoritos, regeneração, avaliação, interrupção e erro.
4. Validar CRUD efetivamente disponível no escopo: criar conversa, ler/listar/pesquisar, atualizar favorito/metadados permitidos, excluir quando suportado; upload/listagem/exclusão de anexos conforme API real. Não inventar operações que o sistema não possui.
5. Conferir autorização em todas as rotas e IDs, sessão expirada, mudança de usuário, IDOR, CSRF conforme arquitetura, HTML/script injetado, limite de texto/anexos, rate limiting, dados sensíveis em logs, modo privacidade e isolamento entre sessões.
6. Avaliar performance com medições reais: latência do primeiro token, fluidez do streaming, tempo de troca de superfície, tempo de carregamento do histórico, LCP/INP/CLS quando aplicável, memória, bundle e renderização de 100+ turnos; registrar ambiente e tamanho da amostra, sem inventar metas alcançadas.
7. Testar desktop/mobile, 200% zoom, teclado, leitores de tela disponíveis, alto contraste, reduced motion, modos de tema e rede degradada; registrar prints **reais** dos dois chats, antes/depois quando possível, e lista de diferenças.
8. Revisar compatibilidade com 142, 144, 147, 152, 153, 173 e a tarefa externa de Generative UI; não publicar alterações pausadas por acidente.
9. Produzir relatório final com resultados de testes, contagens, comandos, SHA, limitações, riscos residuais, rollback, evidências de navegação e aprovação visual pendente do usuário quando for o caso.
10. Respeitar a regra de publicação individual: esta tarefa fecha o programa e seu próprio escopo de QA, **não** autoriza publicar em lote tarefas anteriores nem reescrever SHAs históricos.

**Arquivos-alvo iniciais:** testes unitários e integração existentes, suíte E2E quando presente, scripts de QA e documentação permitida; nenhum código de produção sem bug reproduzido e rastreado.

**Critérios de bloqueio:** falha de autorização, perda de dados, histórico cruzado, envio de anexo sem consentimento, funcionalidade removida, saída de segredo, regressão grave de acessibilidade ou falta de prova de execução. Registrar 🔴/🟡, não declarar 🟢.

**Aceite:** evidências reais verificáveis de ambas as superfícies e gates aplicáveis aprovados; pendências não mascaradas e aprovação visual explicitamente registrada.

**Entregáveis formais obrigatórios:** implementação e testes reais quando autorizados; evidência de antes/depois; checklist de requisitos; riscos e rollback; atualização da tarefa no `claude-gestao.md`; commits e SHAs verificáveis da `main` conforme a instrução mestra. Nenhuma declaração de conclusão sem prova.

---

## 3. Sequência recomendada, sem violar a ordem oficial

- **Primeiro:** 174 (base compartilhada) e 175 (continuidade), com análise conjunta de dependências para evitar retrabalho, mas execução/publicação por tarefa segundo autorização e regras atuais.
- **Depois:** 176 (Generative UI) e 177 (anexos), garantindo que a eventual tarefa de Generative UI já existente não seja duplicada.
- **Em seguida:** 178 (UX responsiva), 179 (sugestões) e 180 (proveniência/exportação).
- **Por último:** 181 (QA integral, segurança, performance e evidências de navegador).

A ordem acima é **planejamento técnico**, não autorização para passar à frente de tarefas anteriores pendentes do `claude-gestao.md` ou retomar tarefas pausadas. Se as tarefas 174–181 forem cadastradas na `main`, respeitar a fila e as decisões do usuário vigentes.

## 4. Checklist de cadastro no `claude-gestao.md`

- [ ] Conferir se a `main` ainda termina na tarefa 173 e se não há novos números.
- [ ] Conferir se alguma tarefa existente já cobre parcial ou integralmente 174–181.
- [ ] Conciliar explicitamente a tarefa externa de Generative UI; evitar duplicação.
- [ ] Inserir cada tarefa uma única vez no Tópico 3, em ordem numérica crescente.
- [ ] Recalcular total, estados e percentuais a partir do arquivo atual.
- [ ] Preservar todas as tarefas históricas, estados, evidências, SHAs e decisões de pausa.
- [ ] Registrar que **somente cadastro** foi autorizado nesta solicitação.
- [ ] Se e quando o usuário autorizar publicação documental, cumprir regras de commit/push da `main` e registrar SHA real.

**Nota de integridade:** não foram gerados dados de benchmark, screenshots reais ou relatórios de testes de execução neste documento. Os cenários de QA são critérios futuros e não resultados.

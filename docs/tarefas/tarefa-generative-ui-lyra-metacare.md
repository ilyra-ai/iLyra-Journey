# TAREFA A CADASTRAR · LYRA METACARE · GENERATIVE UI NATIVA NO CHAT

> **Repositório:** `ilyra-ai/Lyra-MetaCare` · **Branch autorizada:** `main` · **Data da especificação:** 07/11/2026.
>
> **ID:** atribuir o próximo identificador numérico livre **após reler o `claude-gestao.md` mais recente na `main`**, sem colisões, renumeração de tarefas anteriores ou criação de duplicatas. Na leitura realizada para esta especificação, o painel apresentava 173 tarefas, mas esse número é uma fotografia, não reserva do próximo ID.
>
> **Estado inicial:** ⚪ A INICIAR · **Prioridade:** alta · **Tipo:** evolução arquitetural e funcional do chat · **Autorização nesta solicitação:** preparar a tarefa; **não** implementar, modificar o repositório, efetuar commits ou alterar o painel sem instrução posterior.

## 1. Título

**Implementar respostas generativas estruturadas e interativas no chat da Lyra, com dashboards, cards, KPIs, faróis, abas, filtros, buscas, tabelas, gráficos, dossiês completos e persistência real, preservando integralmente as funcionalidades atuais.**

## 2. Objetivo e resultado esperado

Transformar a apresentação de respostas da Lyra em uma experiência de **Generative UI**: a IA poderá solicitar a composição de respostas por **componentes estruturados previamente autorizados e implementados pelo próprio aplicativo**, que serão renderizados nativamente em React. A resposta poderá combinar texto Markdown, blocos ricos, dados auditáveis, painéis visuais, gráficos e controles interativos. **Não** executar JSX/HTML/JavaScript arbitrário fornecido por modelos. **Não** confundir um mockup ou Markdown colorido com funcionalidade real.

A experiência de referência é o painel **FORENSIC OS · SIGNATURE 2** mostrado pelo usuário em imagens de conversa: hero azul-marinho, destaque interno, quatro KPIs em grade 2×2 no celular, faróis de prioridade, explorador com abas cápsulas, pesquisa, filtros e dossiês detalhados. Essa referência define a **capacidade visual e comportamental**, não obriga todas as respostas a terem o mesmo tema nem permite substituir a identidade celestial vigente do Lyra MetaCare. A composição deve adaptar-se à intenção da pergunta e às preferências visuais reais do aplicativo.

O resultado obrigatório é **uma única experiência de chat** que suporte respostas simples e ricas, sem abrir um aplicativo externo, perder o histórico, reduzir a área de leitura ou exigir que o usuário copie código.

## 3. Investigação forense obrigatória ANTES de escrever código

1. Atualizar o estado da `main` e registrar SHA, arquivos alterados, status local e alterações de outros trabalhos. **Não criar branch, worktree, fork nem descartar alterações não relacionadas.**
2. Ler **integralmente** `CLAUDE.md`, `AGENTS.md` e demais rules/workflows realmente existentes, `claude-gestao.md`, README, documentação do chat, instruções de segurança e testes. A inspeção desta especificação foi parcial; o agente executor deverá completar o inventário de TODO o repositório antes de escolher arquitetura.
3. Conferir tarefas existentes que possam se sobrepor, especialmente a modernização de chat previamente registrada como tarefa **113**, as mudanças de chat já publicadas e as tarefas ainda em andamento/pausadas. Se já existir parte da solução, **estender e reutilizar**, sem duplicar.
4. Mapear todas as páginas e componentes que exibem mensagens da Lyra, inclusive histórico, busca, favoritos, voz, mobile, áreas administrativas, modo privacidade e respostas de saúde. Identificar quem chama cada componente, onde são montados e que contratos são compartilhados.
5. Traçar o fluxo completo e real: pergunta → autenticação/entitlements → escolha do modelo → contexto e dados permitidos → rota HTTP → streaming/transporte → validação → persistência MySQL → recuperação do histórico → renderização → interações → reabertura da conversa.
6. Mapear as integrações existentes de OpenAI, Google/Gemini, modelos locais e BYOK, incluindo limites por plano, seleção de modelo, modos de privacidade, anexos, imagens e chamadas de ferramentas. **Não presumir que todo provedor suporte saída estruturada ou streaming do mesmo modo.**
7. Levantar schemas, migrations, limites de payload, versão dos registros, validação Zod, tratamento de falhas, paginação e compatibilidade retroativa.
8. Inventariar testes existentes e identificar os fluxos críticos sem cobertura. Criar matriz com caminho, função, responsabilidade, contratos, consumidores, riscos e plano de alteração.
9. Investigar documentação oficial atual e licenças das bibliotecas existentes antes de adicionar dependências. Preferir componentes já presentes e compatíveis; não adotar SDK interno/proprietário do ChatGPT nem alegar que DIL seja biblioteca pública instalável.
10. Produzir relatório de baseline e decisão arquitetural com referências a caminhos/linhas/SHAs reais. Não iniciar implementação se houver dúvida material não investigada.

### 3.1. Evidências de código efetivamente identificadas nesta especificação

- `src/components/chat/ChatAssistantContent.tsx`: interface principal, hook de conversa, mensagens com `partes`, imagem, estado de fluxo e histórico; importação dinâmica de `PainelDaConversa`.
- `src/components/chat/ChatBubble.tsx`: renderização da resposta por `RespostaMarkdown`, copiar, ler em voz alta, refazer e favoritar; conteúdo de IA atualmente não recebe um contrato genérico de UI nesse componente.
- `src/hooks/use-conversa-lyra.ts`: usa `enviarAoChat`, recebe texto progressivo, conclui com `response`, `imagem` e `partes`; permite cancelamento, regeneração, paginação, favoritos e modo privacidade.
- `src/lib/chat/partes.ts`: `partesDoChatSchema` atualmente restringe partes a um objeto `tipo: 'painel'`, `versao: 1`, título, data, indisponibilidade e até 31 dias de métricas; até quatro partes.
- `src/components/chat/PainelDaConversa.tsx`: componente existente com abas Resumo/Evolução/Dados, Recharts, tabela acessível, diálogo de ampliação, autorização de rotas e aviso de que o painel não se atualiza sozinho.
- `package.json`: Next.js 16.4.3, React 19.3, TypeScript 6, AI SDK 7, Streamdown, React Markdown, Zod 4, Radix UI, Recharts 3, Tailwind 4, Vitest, pnpm. Confirmar versões instaladas na execução, não fazer upgrades desnecessários.

**Importante:** os cinco arquivos de chat acima foram inspecionados via conector; isto **não constitui leitura integral de todo o repositório**. Os nomes de outros módulos, rotas e tabelas devem ser descobertos e confirmados pelo executor.

## 4. Arquitetura obrigatória: conteúdo estruturado, não código executável

1. Criar um **catálogo versionado de blocos** com `discriminatedUnion` Zod e TypeScript, ampliando o contrato existente sem quebrar `painel` v1. Considerar blocos `texto`, `secao`, `hero`, `destaque`, `kpi-grid`, `farol`, `abas`, `filtros`, `busca`, `dossies`, `card`, `tabela`, `grafico`, `linha-do-tempo`, `citacoes`, `alerta`, `acoes` e `estado-vazio`, mas implementar somente os tipos justificados por casos reais, com schema, renderizador e testes correspondentes.
2. Separar **conteúdo**, **apresentação** e **ações**: a IA produz dados validados e identificadores de intenção; o app escolhe componentes, estilos permitidos, ações autorizadas e handlers tipados. Nenhum evento, URL, consulta SQL, expressão JS, componente importado ou classe CSS arbitrária do modelo poderá executar diretamente.
3. Definir identificadores estáveis por bloco, item e ação, `schemaVersion`, ordem, timestamps e procedência. Estabelecer limites de tamanho, profundidade, cardinalidade, URLs e renderização para impedir respostas gigantes, loops e abuso de memória.
4. Criar registro de componentes com **allowlist**; rejeitar tipo desconhecido ou versão incompatível de forma segura, sem quebrar o restante da resposta. Oferecer fallback legível para modelos sem suporte a dados estruturados.
5. Preservar a resposta textual original e os registros históricos. Uma mensagem antiga só com Markdown deve continuar exibindo o mesmo conteúdo após a migração.
6. Modelos com saída estruturada: usar contratos e validação de servidor, com correção/retry controlados quando apropriado. Modelos sem suporte: renderizar Markdown normal ou fazer conversão validada no servidor, sem fingir suporte nativo.
7. Definir protocolo de streaming para texto e blocos: envelopes/eventos identificáveis, conclusão atômica de cada bloco, tratamento de truncamento e cancelamento, prevenção de duplicidade, ordem estável, reconexão quando suportada e recuperação de falhas. **Não renderizar JSON incompleto como se fosse componente válido.**
8. Não expor chaves de provedores, tokens, prompts internos, informações privadas ou dados de saúde nos metadados de interface.
9. Não permitir que uma resposta de IA invoque diretamente mutações do aplicativo. Ações com efeitos reais precisam de endpoint próprio, autorização de servidor, validação, consentimento/confirmacão quando necessário e trilha de auditoria.
10. Garantir isolamento de estado entre mensagens e conversas: filtros, abas e pesquisas não podem modificar outra resposta. Definir claramente o que persiste e o que é apenas estado local da visualização.

## 5. Experiência visual e componentes funcionais

### 5.1. Hero e KPIs

- Implementar hero configurável com fundo de referência `#0B1930`, texto branco, ícone `#76E4F4`, subtítulo `#AFC5E0`, destaque `#202C4B`, bordas arredondadas e composição mobile-first. Aplicar tokens/tema do app quando necessário para harmonizar com o design celestial aprovado.
- Grade de quatro KPIs em 2×2 no mobile, com valores exemplificados visualmente pelas cores `#FFD27B`, `#D1BCFF`, `#FFACB9`, `#76E4F4`; em desktop adaptar conforme espaço disponível.
- KPIs **somente de dados reais**, com unidade, período, origem, data de coleta e estados de indisponibilidade. Nunca gerar números para preencher layout.
- Suportar valores nulos, longos, zero verdadeiro, porcentagens, negativos, números localizados e leitores de tela.

### 5.2. Faróis

- Componente com três círculos, rótulo e justificativa textual, prioridades com cores de referência `#FF6478`, `#FFB84D`, `#59BEFF`, `#4BDCB1`.
- A prioridade deve derivar de regra ou evidência declarada, não apenas da cor. Não transmitir severidade exclusivamente por cor; acrescentar texto acessível.

### 5.3. Explorador de inteligência e dossiês

- Abas cápsulas funcionais, ativa preta com texto branco, inativas claras com borda, com rolagem horizontal controlada ou quebra adequada em telas pequenas.
- Pesquisa em tempo real sobre **campos relevantes do conjunto ativo**; filtros por categoria, prioridade, data, tipo, fonte e verificação quando existirem. Filtros cumulativos, reset, contagem correta, zero resultados e navegação por teclado.
- Cada cartão deve exibir **o dossiê integral** ou expandir/recolher sem perda de informação. Para repositórios: owner/repo, descrição concreta em pt-BR (2–5 frases sustentadas por README), finalidade, problema, funcionamento, público, caso de uso, diferenciais, linguagem, licença, criação/atualização, estrelas/forks se consultados, evidência de commit/release/tendência, limitações, nível de verificação, links diretos e timestamps.
- Para notícias: título, data, categoria, fato, impacto, tipo de evidência (anúncio, alegação, rumor, benchmark, teste independente), fonte primária e link específico.
- Exibir lacunas com honestidade, sem inventar dez itens quando há menos itens verificados.
- URLs validadas; links externos com tratamento seguro. Filtros devem preservar descrições completas dos itens visíveis.
- Botões de ação reais, inclusive copiar dados, abrir fontes, expandir, alterar filtros e limpar pesquisa. Não criar botões decorativos ou sem handler.

### 5.4. Outros blocos

- Tabelas acessíveis com cabeçalhos e scroll horizontal apenas no próprio bloco; paginação/ordenação quando os dados e o contrato justificarem.
- Gráficos Recharts com dados de origem identificada, eixos, legendas, tooltips, valores nulos, representação textual equivalente e responsividade. Não inventar séries.
- Linha do tempo, referências, avisos, listas, cartões comparativos e estados vazios com textos claros.
- Possibilidade de ampliar painéis em diálogo, aproveitando o padrão existente de `PainelDaConversa`, sem perder estado, foco ou contexto.
- Conteúdo misto: texto antes/depois dos blocos, links e citações, sem destruir a ordem narrativa.

## 6. Integração com o chat existente: preservar sem regressões

Preservar e validar, um por um:

- envio, streaming textual, resposta progressiva, interrupção e regeneração;
- conversas novas, histórico, paginação, recuperação de mensagens antigas e persistência MySQL;
- busca de conversas, favoritos, cópia, leitura em voz alta e anexos/imagens;
- BYOK Gemini, seleção de modelo, fallback, provedores e modo privacidade;
- limitações por plano, permissões administrativas e acesso a rotas;
- dados e gráficos de saúde já existentes, incluindo o contrato `painel` v1;
- funcionamento em modo de produção, erros de rede, timeouts e mensagens incompletas;
- controles e configurações do construtor do site quando consumidos pelo chat;
- layout de conversa com espaço de leitura amplo, sem sidebar ou painel adicional que reduza desnecessariamente a largura do chat.

**Ponto de atenção específico:** `ChatAssistantContent` já entrega `partes` em mensagens e `PainelDaConversa` já existe. A solução deve **integrar a renderização genérica nesse caminho**, e não criar um segundo histórico paralelo ou um chat alternativo. Examinar exatamente como `partes` é serializado, validado, persistido e reidratado antes de mudar o schema.

## 7. Segurança, dados de saúde e autorização

- Sanitizar conteúdo e URLs, impedir XSS, injeção de atributos, HTML/JS arbitrário, `javascript:` e ações de rede não autorizadas.
- Validar todo payload estruturado no servidor e, quando necessário, novamente no cliente; não confiar em JSON de modelos.
- Bloquear SSRF, acesso indevido a dados de outros usuários, IDOR, uso de credenciais do usuário por ações sem autorização e manipulação de filtros para revelar registros proibidos.
- Respeitar LGPD e tratamento de dados de saúde; não vazar informações em logs, analytics, Sentry, exportações ou links.
- Nenhum componente poderá contornar planos, permissões ou o modo privacidade.
- Ações destrutivas ou financeiras exigem confirmação explícita e auditoria; ações informativas devem ser inofensivas.
- Implementar limites de taxa, tamanho, complexidade e renderização quando aplicáveis, com mensagens claras em pt-BR.

## 8. Performance, acessibilidade e responsividade

- Mobile-first: testar 320, 360, 390, 430, 543, 768, 848, 1024, 1366, 1536 e 1920 px; incluir alturas reduzidas e zoom de 200%.
- Sem rolagem horizontal da página, conteúdo cortado, tabela fora da área, overlay sobre o input ou botões impossíveis de tocar.
- Semântica ARIA apropriada para tabs, listas, tabelas, status e diálogos; foco visível, teclado, Escape, contraste, preferências de movimento reduzido e texto alternativo.
- Usar lazy loading/code splitting para gráficos e blocos pesados quando comprovadamente benéfico; preservar velocidade de primeira resposta e rolagem em conversas extensas.
- Evitar re-renderizações de toda a conversa ao filtrar um painel. Usar keys estáveis, memoização criteriosa e testes de desempenho medidos.
- Tema claro e escuro compatíveis com a identidade do produto, sem alterar landing, autenticação ou áreas administrativas fora do escopo.

## 9. Plano de execução e entregáveis

**Fase A — Inventário:** matriz de arquitetura atual, dependências, contratos, rotas, banco, testes e risco de regressão; comparação com tarefas existentes; baseline de qualidade.

**Fase B — Contratos:** schemas Zod versionados, tipos TypeScript, validação, compatibilidade `painel` v1, limites, envelopes de streaming e política de ações.

**Fase C — Renderização:** registro de componentes seguros, blocos de texto e visualização, tema, fallback, acessibilidade e estados de erro.

**Fase D — Interatividade:** tabs, filtros, pesquisa, faróis, expansão de dossiês, tabelas e gráficos com dados reais e isolamento de estado.

**Fase E — Backend e persistência:** produção estruturada compatível com modelos, transporte, validação, migrations necessárias, armazenamento, recuperação e regeneração. Não adicionar migration se o contrato atual comportar a evolução sem alterar banco.

**Fase F — Integração:** chat existente, voz, imagens, histórico, favoritos, privacidade, permissões e planos.

**Fase G — QA:** testes automatizados, navegador real, banco real, produção, auditoria de segurança e regressão.

**Fase H — Publicação:** documentação, matriz de evidências, atualização do `claude-gestao.md`, commit da tarefa na `main`, push confirmado, seguido do commit próprio do painel conforme regra 6. Não criar branches/worktrees e não incluir alterações locais de tarefas pausadas.

## 10. Cenários obrigatórios de QA e critérios de aceite

- **QA-01:** pergunta simples continua sendo Markdown legível, sem dashboard desnecessário.
- **QA-02:** pergunta por análise estruturada produz hero + 4 KPIs + faróis + explorador, com dados reais e proveniência.
- **QA-03:** trocar cada aba altera apenas os registros daquela aba; contagem é correta.
- **QA-04:** pesquisar termo existente e inexistente; filtrar categoria/prioridade; combinar filtros; limpar; restaurar todos os resultados.
- **QA-05:** todos os dossiês permanecem completos, com links específicos e descrições, inclusive após filtrar.
- **QA-06:** reabrir histórico mostra texto e componentes com o mesmo conteúdo e links, sem perder dados ou duplicar blocos.
- **QA-07:** streaming lento, payload parcial, cancelamento, timeout, desconexão, regeneração e erro de schema não travam o chat nem exibem componentes inválidos.
- **QA-08:** mensagens antigas com Markdown e `painel` v1 continuam compatíveis.
- **QA-09:** ações do painel não burlam autorização, planos, consentimento ou modo privacidade.
- **QA-10:** links inseguros, payload malformado, XSS, HTML/JS injetado, campos excedentes e blocos desconhecidos são rejeitados ou degradados com segurança.
- **QA-11:** leitura em voz alta, copiar, favoritos, anexos, imagens, busca, histórico e regeneração continuam operacionais.
- **QA-12:** validar 320–1920 px, zoom 200%, teclado, leitor de tela, movimento reduzido, tema claro/escuro e orientação móvel.
- **QA-13:** testar dados vazios, nulos, zero, longos, milhares de registros (com limites/paginação), tabelas largas, gráficos sem série e links indisponíveis.
- **QA-14:** demonstrar ponta a ponta: UI → API real → modelo autorizado → contrato validado → persistência MySQL → recuperação → interação. Não usar mock como prova de funcionamento real; mocks são aceitáveis apenas em testes unitários de isolamento.
- **QA-15:** executar gates oficiais aplicáveis: `pnpm fix:format`, `pnpm fix:lint`, `pnpm check:lint`, `pnpm check:format`, `pnpm check:types`, `pnpm test`, `pnpm test:integration`, `pnpm build`; registrar códigos de saída e contagens reais. Não declarar testes que não rodaram.
- **QA-16:** validar o navegador em modo de produção com contas reais de QA e níveis de permissão aplicáveis; limpar dados temporários.
- **QA-17:** medir regressão de bundle, primeira resposta, renderização e interações, com metodologia e resultados reais.
- **QA-18:** verificar ausência de regressões nas rotas do usuário e do administrador afetadas pela alteração.

**Aceite integral (🟢) exige:** funcionamento ponta a ponta comprovado, schemas e testes aprovados, experiência visual aprovada quando exigida pelo painel, documentação atualizada, ausência de regressão conhecida não resolvida, commit/push confirmados na `main` e SHAs reais registrados. Implementação sem validação completa permanece 🟡; dependência externa impossível de comprovar deve ser registrada como fronteira com evidência, nunca como sucesso fictício.

## 11. Documentação exigida

Registrar no repositório, em caminhos coerentes com sua organização real: arquitetura de blocos e versões, matriz de compatibilidade por provedor, contratos de eventos/streaming, política de segurança e ações, migrações e rollback quando aplicáveis, exemplos de payload **gerados a partir de testes reais** (não apresentados como dados de produção), manual de novos componentes, inventário de arquivos alterados, resultados de QA e limitações comprovadas.

## 12. Regras de publicação e de gestão

1. **Antes do cadastro**, reler o `claude-gestao.md` vigente e verificar se esta tarefa já existe, total ou parcialmente. Não duplicar a tarefa 113 ou outra equivalente; se for o mesmo escopo, ampliar a tarefa existente com estes critérios.
2. Se for realmente nova, usar próximo ID livre, colocar **uma única vez** no Tópico 3 · Tarefas a Iniciar, na ordem numérica, com dependências, prioridade e estado ⚪. Recalcular contagens e percentuais do Tópico 1 com base nos estados reais.
3. Quando a execução for autorizada, mover para ANDAMENTO sem ultrapassar três tarefas simultâneas; preservar tarefas pausadas e trabalho local independente.
4. Não declarar conclusão parcial como integral. Guardar evidências, SHA e limitações.
5. Seguir o workflow de `CLAUDE.md`, commit e push diretamente na `main` ao final da implementação, sem branches/worktrees; depois registrar o SHA real no painel e publicar a atualização documental em commit próprio, conforme regra 6 do arquivo.
6. Não criar outra aplicação de chat, não substituir a landing, não remover funcionalidades existentes e não migrar indiscriminadamente bibliotecas sem necessidade comprovada.
7. Não afirmar que o app executa a linguagem interna de interfaces do ChatGPT. A implementação é **própria, segura e equivalente em capacidades de interação**, respeitando licenças e APIs públicas disponíveis.

## 13. Definição de pronto

A tarefa somente está concluída quando o usuário puder perguntar normalmente à Lyra e, quando o conteúdo exigir, receber **no próprio chat** uma resposta interativa, com painel visual real, filtros e abas funcionais, dossiês completos e fontes, com persistência, segurança, compatibilidade e qualidade de produção demonstradas. A existência de componentes isolados, screenshots, storybooks, exemplos estáticos ou JSON produzido pelo modelo **não** satisfaz o critério de pronto.

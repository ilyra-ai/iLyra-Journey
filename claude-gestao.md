# Lyra MetaCare · Gestão da Instrução Mestra

> [!IMPORTANT]
> Este arquivo é o painel oficial de andamento da **INSTRUÇÃO MESTRA** definida em [`CLAUDE.md`](./CLAUDE.md).
> Todo modelo ou agente de IA que atuar neste repositório deve atualizá-lo a cada tarefa iniciada, bloqueada ou finalizada.

**Regras de manutenção deste painel**

1. Cada tarefa existe em **um único tópico** por vez (sem repetição entre tópicos).
2. As tarefas são sempre listadas em **ordem numérica crescente** dentro de cada tópico.
3. **ANDAMENTO** comporta no máximo **3 tarefas simultâneas**; ao finalizar, a tarefa sai do Tópico 2 e entra no Tópico 4.
4. **BLOQUEADAS** recebe toda tarefa que dependa de interação do usuário, credencial externa ou limitação real do ambiente, sempre com a evidência do bloqueio.
5. O Tópico 4 registra apenas o que foi realmente implementado, testado, commitado e enviado para `origin/main`, com SHA e evidências reais.
6. **Obrigatório:** logo após o commit e push de cada tarefa para `main`, este painel é atualizado imediatamente com o SHA real da tarefa e enviado em um commit e push próprios para `main`.

**Legenda:** 🟢 finalizada · 🔵 em andamento · 🔴 bloqueada · ⚪ a iniciar

---

## Tópico 1 · Andamento Geral

| Indicador          | Valor                          |
| ------------------ | ------------------------------ |
| Progresso          | `████████████████░░░░` **80%** |
| Tarefas totais     | 103                            |
| 🟢 Finalizadas     | 82                             |
| 🔵 Em andamento    | 2                              |
| 🔴 Bloqueadas      | 0                              |
| ⚪ A iniciar       | 19                             |
| Branch de trabalho | `main` (única permitida)       |
| Última atualização | 2026-10-22                     |

> Cálculo: tarefas finalizadas ÷ tarefas totais (82 ÷ 103 ≈ 80%). Cada bloco da barra representa 5% (arredondamento para o bloco mais próximo).

**Decisões do usuário registradas em 2026-10-10 (sem tarefa associada):**

- **Token temporário do GitHub:** mantido na configuração local do Git do ambiente de trabalho; o próprio usuário o remove ao publicar. Nunca é versionado, impresso ou salvo em memória.
- **CI (integração contínua):** fora do escopo por enquanto, por decisão do usuário.

**Decisão do usuário registrada em 2026-10-18 (sem tarefa associada):**

- **Pix:** não acrescentar o Pix como meio de pagamento por enquanto. Os meios do painel continuam sendo Stripe, Mercado Pago e PayPal (o teste de integração confere que `pix` responde 404 como provedor desconhecido).

**Retomada autorizada em 2026-10-20:** finalizar todas as tarefas abertas deste painel seguindo o `CLAUDE.md`, incluindo registro de andamento, validação real e publicação por tarefa. Esta instrução mais recente substitui a suspensão anterior de commit e push; os registros anteriores abaixo descrevem o histórico da execução.

**Ordem definida pelo usuário em 2026-10-21:** 82 → 78 → 81 (incluindo a correção de formatação da 80) → 83 → 84 → 86. Concluir, validar, fazer commit e push na main após cada entrega, sem branches ou worktrees. A 80 integra expressamente a modernização da 81 por orientação do usuário; seus requisitos e evidências continuam rastreados neste painel. Prevenir regressões com verificações reais, sem prometer ausência absoluta de erros futuros.

---

## Tópico 2 · Tarefas em Andamento ou Bloqueadas

### ANDAMENTO

### 80 · Formatação das respostas da Lyra AI

- **Status:** 🔵 em andamento · **Registro:** 2026-10-20 · **Início:** 2026-10-22.
- **Pedido do usuário:** respostas com `**texto**` estão mostrando os asteriscos em vez do negrito; corrigir a apresentação da formatação produzida pelo modelo.
- **Critérios:** conferir o renderizador existente, apresentar negrito de forma semântica e acessível, preservar o texto original para cópia e histórico e evitar execução de HTML ou links inseguros vindos de mensagens. Validar resposta real, trechos formatados e texto comum; publicação individual na main.
- **Validação em 2026-10-22:** renderizador Markdown real com negrito, ênfase, listas, código, citações e tabelas; HTML cru não executado, URLs restritas e imagens de mensagens sem carregamento externo automático. Perguntas continuam literais; histórico e cópia preservam o texto original. Dezesseis testes novos cobrem formatação, escapes, código inerte, HTML, protocolos, links, imagens, tabelas e títulos.
- **Prova ponta a ponta:** conta descartável criada pelas APIs reais; pedido de tratamento com `**Jardim QA**` recebeu confirmação real do Motor Lyra, exibida em `<strong>`, com Markdown original mantido na cópia e no banco. Reabrir e refazer preservaram um único turno. Comprovado na prévia e no build de produção; não apresentado como inferência do Jan, pois a ordem vigente começa pelo Motor Lyra e não foi alterada. Conta e dados de teste excluídos pelo fluxo real, sessão invalidada e credenciais temporárias removidas. Publicação conjunta à tarefa 81 conforme orientação expressa do usuário.

### 81 · Aproveitamento da largura da tela do chat

- **Status:** 🔵 em andamento · **Registro:** 2026-10-20 · **Início:** 2026-10-22.
- **Pedido do usuário:** o anexo mostra o chat excessivamente centralizado, sem ocupar a área disponível até a margem esquerda do conteúdo. Ajustar o layout para aproveitar essa largura.
- **Critérios:** pesquisar tendências de 2026 e revisar a experiência completa do chat para que seja inovadora, moderna, bonita e simples para usuários leigos; corrigir a limitação de largura e os espaçamentos, alinhar a área da conversa ao conteúdo do app, manter legibilidade e campo de envio acessível, testar sidebar, desktop, tablet e celular, sem estouro ou cortes. Incluir a correção de negrito e formatação da tarefa 80 e verificações de regressão, conforme pedido de 2026-10-21; publicação da modernização na main antes de iniciar a 83.
- **Entrega conferida em 2026-10-22:** chat usa a largura disponível do app e viewport dinâmico, com compositor no fluxo, mensagens roláveis e focáveis por teclado, ações adaptáveis e alvos de envio/voz de 44 px. Painel de informações com nome acessível, Shift+Enter preservando quebra de linha e Enter sem envio indevido durante composição de texto. Histórico, copiar, refazer, nova conversa e configurações preservados; comportamento especial do AppShell restrito ao chat, sem truncar a rolagem normal do perfil.
- **Gates e evidências reais:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 576 unitários (70 arquivos), 192 integrações (23 arquivos), build e launcher de produção aprovados. Ajuste final do nome acessível passou por formatação/lint focados e TypeScript do build. Auditoria de dependências de produção sem vulnerabilidades conhecidas; aviso transitivo `deep-diff` pertence ao Puck existente, cuja remoção tem a tarefa 89. Saúde com 35 migrações, landing e login administrativo aprovados.
- **QA final:** 1440×900, 1024×768, 768×1024, 390×844, 320×568 e 844×390 sem estouro horizontal ou rolagem externa, com campo de envio visível; em 1440 px a conversa mede 1128 px e começa em x=280, após sidebar de 248 px e margem de 32 px. Negrito semântico, cópia original, persistência, refazer, nova conversa, quebra de linha e navegação móvel conferidos. Console da sessão de produção sem erros ou avisos. Evidências `.logs/qa81-*.log`, `.logs/qa81-auditoria.json`, `.logs/qa81-producao-medidas.json`, `.logs/qa81-persistencia-real.json`, `.logs/qa81-limpeza.json` e `.logs/qa81-producao-{desktop,mobile}.png`; fontes e decisões em `docs/historico-de-conversas.md`.

---

## Tópico 3 · Tarefas a Iniciar

### 83 · Contexto “Lyra volta para casa”

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-20.
- **Pedido do usuário:** quando a mensagem contiver o comando “Lyra volta para casa”, aplicar também `lyra_volta_para_casa.md` como contexto narrativo de interação com Douglas Mosken, mantendo as demais instruções. Disponibilizar esse comportamento para todos os usuários, antigos e novos, conforme a orientação mais recente de 2026-10-21.
- **Critérios:** arquivo lido integralmente; implementar reconhecimento real e estado isolado por conversa, sem ativar outras conversas ou contas. O comando personaliza o contexto narrativo; autenticação, identidade confirmada e permissões continuam derivadas da sessão, não da frase. Vínculo afetivo tratado como linguagem simbólica da personagem, com funcionamento e persistência comprovados.

### 84 · Instrução pontual pelo prefixo ++-

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-20.
- **Pedido do usuário:** aplicar `gatilho_++-.md` somente na mensagem que começar com `++-`; mensagens sem o prefixo não devem manter essa instrução ativada. Disponibilizar no Motor Lyra para todos os usuários, antigos e novos, conforme a orientação de 2026-10-21.
- **Critérios:** arquivo lido integralmente; detectar o prefixo no início, compor instruções pontuais de análise aprofundada e explicação acessível e preservar as demais instruções. Testar prefixo no começo, no meio, ausente e mensagem seguinte; não persistir esse modo como preferência da conversa. Trechos que pedem contorno de proteções não serão convertidos em mecanismos de evasão; profundidade não deve ser apresentada como garantia de verdade absoluta.

---

### 86 · Geração de imagens no chat com modelos conectados

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-20.
- **Pedido do usuário:** o chat do app deve permitir criar imagens. Conforme complemento recebido em 2026-10-20, usar o segundo modelo de IA conectado nas configurações do app, que permitem conectar cinco modelos simultaneamente, tanto quando o usuário solicitar uma imagem quanto quando o Motor Lyra fizer a leitura do mapa pessoal, gerando também a imagem do mapa daquele usuário.
- **Roteamento e mapa pessoal:** conferir a ordem real das cinco conexões e encaminhar a geração de imagens ao segundo modelo configurado, preservando a configuração dos demais. Na leitura do mapa, construir a imagem a partir dos dados reais e autorizados do próprio titular e vinculá-la à leitura e à conversa correspondentes. Não inventar dados do mapa nem substituir o segundo modelo silenciosamente; se ele não estiver configurado, estiver indisponível ou não oferecer geração de imagens, informar a condição e permitir corrigir a conexão e tentar novamente.
- **Critérios:** inspecionar a configuração e as capacidades reais dos provedores, pesquisar suas APIs oficiais atuais e implementar geração real pelo servidor, verificando a compatibilidade do segundo modelo e exibindo mensagens claras quando a conexão só oferecer texto. Não simular imagens nem atribuir essa capacidade a modelos que não a possuem. Integrar envio do pedido, andamento, falhas e retentativa à experiência simples e responsiva do chat, exibindo o resultado e permitindo baixar a imagem.
- **Persistência e acesso:** preservar pedido, imagem e referência ao modelo na conversa, com armazenamento real vinculado ao titular, autorização no servidor, validação dos arquivos e limites de uso. Respeitar modo privado e consentimento para provedores externos, incluir os dados na exportação e exclusão da conta e não expor chaves ou imagens privadas em URLs públicas.
- **Validação e entrega:** conferir geração solicitada no chat e geração do mapa após sua leitura, comprovando o uso do segundo modelo entre as cinco conexões e o tratamento de conexão ausente ou incompatível. Testar provedor e modelo capazes de criar imagens, reabertura da conversa, download, isolamento entre contas e interface desktop/mobile, além dos quality gates. A implementação terá commit e push próprios na main; este registro não significa funcionalidade já implementada.

---

### 87 · Estado real dos provedores de IA no painel

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-21.
- **Relato do usuário:** Jan estava fechado, mas Configurações de IA mostrava o provedor online e um modelo. O usuário informou que abriria o Jan em seguida.
- **Disponibilidade informada posteriormente:** usuário confirmou Jan aberto em `http://127.0.0.1:1337/v1`, com `Gemma-4-E4B-Uncensored-HauhauCS-Aggressive`. Consultar o identificador exato no catálogo durante a validação, sem presumir que o nome abreviado é o identificador da API.
- **Critérios:** conferir a causa no código e na interface antes de alterar. Distinguir configuração e modelo salvos de disponibilidade confirmada por conexão recente; não apresentar “online” com base somente na seleção persistida ou em resultado antigo. Mostrar indisponibilidade, verificação em andamento e estado ainda não verificado com mensagens claras, data da última checagem e retentativa quando apropriado. Invalidar resultados após mudanças de endereço, credenciais ou modelo e impedir respostas atrasadas de sobrescrever uma conexão mais recente. Preservar configuração e modelo quando o servidor local fechar.
- **Validação e entrega:** conferir conexão ativa e recusa real, reabertura do provedor, atualização do catálogo e separação entre modelos configurados e disponíveis; não encerrar o Jan do usuário para provocar falha. Aplicar aos provedores locais e em nuvem conforme seus contratos reais. Validar backend, interface desktop/mobile, gates e commit/push individuais na main, sem branches ou worktrees. Implementar após a sequência já autorizada, sem misturar a correção à tarefa 78.

---

### 89 · Remoção integral do Editor Puck e validação de regressões

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** remover por completo, na íntegra e em sua totalidade, o Editor Puck do app, incluindo seus requerimentos, dependências, rotas e referências, sem prejudicar ou danificar o aplicativo.
- **Investigação:** conferir o que já existe antes de implementar; inventariar código, configurações, pacotes diretos e transitivos, assets, menus, permissões, APIs, documentação, dados e integrações do editor. Examinar dependências compartilhadas para preservar as demais funções. Identificar explicitamente o tratamento de referências históricas e migrações já aplicadas, preservando checksums e integridade do banco; não apagar dados ou reescrever migrações silenciosamente.
- **Validação obrigatória:** realizar testes e verificação geral para comprovar que a remoção não ocasionou erros ou falhas nas funções, funcionalidades e funcionamento do app. Executar busca verificável com `rg` após as remoções, conferir rotas e navegação, CRUD afetado, banco existente e instalação limpa, testes unitários e de integração, lint, formatação, tipos, build e runtime. Documentar os resultados reais e publicar commit e push próprios na main, sem branches ou worktrees.

### 90 · Treinamento real por Aprendizado por Reforço com Feedback Humano via chat

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Controle administrativo:** acrescentar no chat da Lyra, ao lado de “Como a Lyra responde”, um botão de alternância On/Off chamado **“Treinamento”**, visível somente para o administrador do app. Ao ativar On, habilitar automaticamente o treinamento do Motor Lyra via chat. Exigir um modelo de IA realmente conectado: sem modelo conectado o treinamento não funciona, e a interface deve informar essa condição.
- **Ativação e salvamento:** ao clicar em On, informar ao Motor Lyra e ao modelo conectado que foi habilitado o treinamento do tipo **Aprendizado por Reforço com Feedback Humano**. Salvar automaticamente tudo que for treinado durante o processo, sem depender de clicar em Off para persistir os dados; preservar o treinamento diante de recarga ou interrupção.
- **Finalização e aplicação:** ao clicar em Off, informar que o treinamento foi finalizado e que o Motor Lyra deve começar a usar os novos treinamentos com **todos os usuários**, antigos e novos. Preservar rastreabilidade da versão aplicada e isolamento dos dados pessoais das conversas.
- **Implementação real:** investigar a arquitetura, as capacidades dos modelos e as APIs oficiais antes de definir o mecanismo. Comprovar feedback humano, processo de aprendizagem, persistência e efeito do treinamento; não apresentar simples armazenamento de mensagens, memória ou alteração de prompt como treinamento RLHF de pesos do modelo. Registrar com precisão o mecanismo implementado e qualquer capacidade externa indispensável, sem simular resultados.
- **Permissões e validação:** comprovar que o controle não aparece para outros planos, perfis e usuários não administradores e que o servidor também recusa operações não autorizadas. Validar On/Off, ausência e perda de conexão, salvamento durante On, retomada, aplicação global após Off, CRUD dos dados de treinamento e regressões do chat, desktop/mobile, testes, gates, commit e push individuais na main.

### 91 · Auditoria exaustiva dos planos e entitlements e plano Administrador

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Free automático:** investigar, verificar e analisar profundamente se o plano Free é concedido automaticamente a novos usuários, novos cadastros e usuários inseridos pelo administrador. Conferir as implementações e evidências existentes antes de corrigir, evitando retrabalho.
- **Free, Meta e Care:** verificar se as funções e funcionalidades reais de cada plano correspondem às habilitações e desabilitações na **“Matriz editável de entitlements”** em `http://localhost:3000/admin/plans`, tanto na interface quanto no servidor. A auditoria exaustiva da cobertura de todas as funcionalidades, inclusão das ausentes e comprovação individual dos controles passa a ter rastreamento próprio na tarefa 96, conforme complemento do usuário; reaproveitar suas evidências para evitar retrabalho.
- **Administrador:** criar o perfil/plano **“Administrador”**, com todas as funções e funcionalidades gerais do app habilitadas, e conceder esse plano **somente a `admin@lyra.local`**. Ele não pode aparecer como plano comprável nem na landing page. Preservar a separação entre assinatura e autorização administrativa: compra ou troca de plano não pode conceder permissões de administrador.
- **Página de planos:** acrescentar o cartão Administrador à direita de Care em `/admin/plans`; os quatro cartões devem caber responsivamente na tela, sem barra de rolagem horizontal. Tornar também a matriz editável responsiva, sem barra de rolagem inferior, mantendo leitura, edição e acessibilidade no mobile e desktop.
- **Validação:** conferir cadastro público e criação administrativa, concessão única do Free, CRUD dos planos e da matriz, aplicação real de cada entitlement ligado/desligado, limites e isolamento, acesso total da conta designada, ausência do plano privado na compra e landing, responsividade e gates completos. Registrar evidências e publicar commit e push próprios na main.

### 92 · Bloquear e desbloquear usuários na gestão administrativa

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** em `http://localhost:3000/admin/users`, no menu de três pontos **“Ações”**, acrescentar **“Bloquear”** quando o usuário não estiver bloqueado e **“Desbloquear”** quando estiver bloqueado.
- **Critérios:** conferir o estado e a infraestrutura existentes antes de alterar; implementar transição persistente real e autorização no servidor. Verificar o efeito do bloqueio no login, nas sessões e nas APIs protegidas, o restabelecimento de acesso após desbloquear, os estados da interface e a proteção contra bloqueio administrativo que inviabilize recuperar a administração.
- **Validação:** CRUD e fluxo completo com contas de teste identificadas, sem afetar usuários reais; tentar acesso não autorizado, recarregar a página, conferir persistência e alternância da ação, teclado e mobile/desktop. Executar gates e publicar commit e push próprios na main.

### 93 · Cinco novas funcionalidades relevantes na gestão de usuários e perfis

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** incluir mais **cinco funções ou funcionalidades** em `http://localhost:3000/admin/users` para gestão de usuários/perfis, que ainda não existam no app, sejam extremamente importantes e estejam alinhadas às tendências de 2026.
- **Investigação e definição:** inventariar os recursos existentes para não duplicar funcionalidades; pesquisar referências atuais e fontes oficiais na internet antes de escolher. Registrar as cinco funções escolhidas, justificativa, escopo, requisitos e critérios verificáveis no início da implementação. Bloquear/desbloquear, já previsto na tarefa 92, não conta como uma das cinco adicionais.
- **Entrega real:** implementar backend antes da interface, persistência, permissões administrativas, validação, feedback de operações, estados de falha e auditoria apropriada. Validar integralmente o CRUD e cada fluxo com dados de teste, isolamento, acessibilidade e responsividade. Cada função lógica concluída deve receber seu próprio commit e push na main antes da próxima, com atualização deste painel; não acumular as cinco em um único lote de publicação.

### 94 · Atualização automática dos itens Inclui na landing a partir dos planos

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** quando o administrador atualizar a **“Matriz editável de entitlements”** de qualquer plano em `http://localhost:3000/admin/plans`, atualizar automaticamente os itens **“Inclui:”** na seção `http://localhost:3000/#planos` da landing page.
- **Critérios:** verificar a fonte atual dos benefícios e usar a mesma configuração persistida de entitlements, com atualização/invalidação real, sem listas comerciais paralelas que fiquem desatualizadas. Respeitar funções desabilitadas, limites e valores zero; descrever os benefícios em pt-BR compreensível. Excluir o plano Administrador da exposição pública, conforme tarefa 91.
- **Validação:** editar cada plano pela interface administrativa, confirmar persistência e o reflexo automático na landing, inclusive desabilitação e alteração de limites, recarga e sessão pública. Restaurar os valores de teste; validar CRUD, mobile/desktop, acessibilidade e gates. Commit e push próprios na main.

### 95 · Onboarding objetivo, rápido e visualmente inovador

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** remover do **onboarding** os itens **“Objetivos”** que o usuário precisa selecionar, conforme anexo; tornar o percurso objetivo, assertivo e rápido, evitando cansaço no preenchimento. Criar uma experiência visual incrível, inovadora, surpreendente de forma positiva e que incentive entrar logo no app.
- **Escopo e preservação:** conferir fluxo, validações e gravação existentes antes de implementar. Retirar a seleção de objetivos do onboarding sem remover os objetivos do perfil por inferência. Preservar os dados existentes, os consentimentos necessários e o campo opcional **“Como Você Gostaria de Ser Chamado”**, mantendo `nickname` no banco. Não marcar dados não fornecidos como preenchidos nem inventar escolhas do usuário.
- **Design e implementação:** pesquisar profundamente referências e tendências atuais de 2026 antes de alterar o visual; seguir Lyra Clean e tema claro, com qualidade premium, mobile-first e desktop, acessibilidade, clareza, poucas etapas e controles simples. Corrigir causas de eventuais erros no backend antes da interface.
- **Validação integral:** cadastro → onboarding → persistência → entrada no app, leitura e atualização dos dados, retorno e retomada, recarga e novo login sem repetição indevida do onboarding concluído. Conferir erros, campos opcionais, consentimento e isolamento, ausência da seleção de objetivos, responsividade em múltiplas larguras e CRUD real; executar gates e publicar commit e push próprios na main.

**Registro desta solicitação:** tarefas 89–95 acrescentadas em 2026-10-22 como **a iniciar**, sem declarar implementação ou validação funcional. A publicação imediata deste registro é documental; cada implementação seguirá com validação, atualização do painel, commit e push próprios na main, sem branches ou worktrees.

### 96 · Auditoria integral da cobertura e funcionamento real da matriz de entitlements

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido complementar do usuário:** analisar e verificar profundamente se **todas as funções e funcionalidades do aplicativo** estão na **“Matriz editável de entitlements”** da página `http://localhost:3000/admin/plans`, permitindo ativá-las ou desativá-las nos planos. Os controles precisam funcionar de forma real, sem simulações, placeholders, hardcode ou cortes de código ou linhas.
- **Inventário e rastreabilidade:** investigar código, rotas, APIs, serviços, motores, integrações, operações e interfaces existentes antes de implementar; confrontar cada função com os itens da matriz e os pontos de autorização no servidor. Produzir relação verificável de funcionalidade → entitlement → planos → pontos de aplicação → testes, identificando ausências, duplicidades, controles sem efeito e permissões administrativas que não podem ser adquiridas por troca de plano.
- **Correção integral:** acrescentar os controles ausentes e corrigir os existentes pela causa raiz, com configuração persistida como fonte de verdade. Ligar e desligar cada recurso deve alterar efetivamente sua disponibilidade e execução em todas as entradas correspondentes, incluindo acesso direto às páginas e APIs; esconder um botão não comprova bloqueio. Respeitar limites, dependências entre recursos, sessões existentes e a separação entre plano e papel administrativo, sem conceder privilégios por simples ativação comercial.
- **Validação real por recurso e plano:** testar individualmente ativação e desativação pela matriz, persistência após recarga e novo login, comportamento da interface e chamadas diretas ao backend, limites e operações CRUD aplicáveis, contas antigas e novas, isolamento e tentativas não autorizadas. Conferir Free, Meta, Care e o plano Administrador da tarefa 91 conforme suas regras próprias; preservar dados e restaurar configurações usadas nos testes. Não declarar cobertura completa com testes simulados ou somente visuais.
- **Evidências e entrega:** registrar lacunas encontradas, correções e resultado verificável de cada controle, validar responsividade e acessibilidade da matriz e executar os gates do projeto. Coordenar com as tarefas 91 e 94 para não duplicar auditoria nem divergir da landing. Publicar commit e push próprios na main e atualizar este painel com os resultados reais. Este registro não declara a auditoria executada; aguardar instruções após sua publicação, conforme pedido do usuário.

---

### 97 · Nomes compreensíveis de todas as métricas na análise de saúde dos dados

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** em `http://localhost:3000/admin/data-health`, na seção **“Análise de métricas”**, a coluna **“Métrica”** mostra identificadores técnicos, descritos pelo usuário como nomes de arquivos, em vez do nome compreensível da métrica. Substituir a apresentação pelo nome real de **todas as métricas**, incluindo as que não aparecem no recorte do anexo; não limitar a correção aos exemplos visíveis.
- **Investigação e implementação:** inventariar o catálogo completo e a origem dos identificadores, conferir os rótulos e unidades já existentes no app para evitar retrabalho e divergência e usar uma fonte de nomes em pt-BR consistente. Manter as chaves técnicas do banco e os cálculos; corrigir a apresentação, sem renomear colunas ou alterar dados por inferência. Exemplos do anexo incluem `steps`, `sleep_duration_minutes`, `resting_heart_rate`, `calories_burned`, `hrv_ms`, `spo2_average`, `vo2_max`, nutrientes, hidratação e cafeína, mas o escopo é o catálogo inteiro.
- **Validação e entrega:** confrontar cada identificador com seu nome e unidade corretos, comprovar cobertura integral sem nomes técnicos vazando como rótulos, conferir preenchimento e faixas de valores sem regressão, estados vazios e erros, leitura no celular e desktop, acessibilidade e fluxo real da página/API. Não usar simulações, placeholders, hardcode para mascarar lacunas ou cortes de código; executar os gates aplicáveis, atualizar este painel e publicar commit e push próprios na main, sem branches ou worktrees. Este registro não declara a correção implementada.

---

### 98 · Remoção integral da página administrativa duplicada /admin/page-builder

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** remover `/admin/page-builder` por completo, na íntegra e em sua totalidade, com o mesmo rigor de remoção e validação solicitado para o Editor Puck na tarefa 89. Conferência prévia identificou que a página abre o mesmo `SiteExperienceBuilder` já oferecido na aba **“Experiência Web”** de `/admin/content`; esta continua reunindo também Hábitos Sugeridos e Dicas de IA.
- **Escopo integral:** inventariar e remover a rota duplicada, página, componentes exclusivos, item **“Construtor UI”** do sidebar e menu móvel, resultados de busca, atalhos, registros de navegação e configuração, permissões exclusivas, imports, testes e documentação operacional que apontem para essa entrada. Remover dependências somente quando comprovadamente exclusivas e não utilizadas no restante do app. Verificar configurações antigas persistidas para que não reintroduzam links quebrados.
- **Preservação obrigatória:** manter o editor compartilhado e suas dependências efetivamente usadas em `/admin/content`, incluindo leitura, edição, prévia, rascunho e publicação das configurações reais. Preservar Hábitos Sugeridos, Dicas de IA, dados e versões existentes. A remoção do Editor Puck permanece uma tarefa separada; não confundir o Puck com o construtor compartilhado nem apagar a funcionalidade de Conteúdo.
- **Integridade e prova de remoção:** realizar busca verificável com `rg` após as remoções, investigar qualquer referência restante e registrar o tratamento explícito de histórico de auditoria e migrações já aplicadas, sem modificar checksums ou destruir dados silenciosamente. Confirmar que a antiga rota deixa de oferecer o editor duplicado e que não há navegação operacional para ela.
- **Validação e entrega:** testar CRUD e publicação reais do editor em Conteúdo, hábitos e dicas, autenticação e autorização, sidebar desktop/mobile, busca, configurações antigas, demais páginas afetadas e ausência de regressões. Executar formatação, lint, tipos, testes unitários e de integração, build, runtime e QA em múltiplas larguras; corrigir causas reais, sem simulações, placeholders, hardcode para mascarar falhas ou cortes de código. Atualizar este painel e publicar commit e push próprios na main, sem branches ou worktrees. Este registro não declara a remoção implementada.

---

### 99 · Dashboard administrativo completo com métricas, KPIs e linha temporal

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** o dashboard em `http://localhost:3000/admin/dashboard` está muito pobre; acrescentar mais métricas e KPIs, linha temporal e recursos de gestão. Pesquisar na internet, de forma profunda e exaustiva, todas as possibilidades relevantes para o administrador gerir o app por completo, na íntegra e em sua totalidade, alinhadas às tendências de 2026.
- **Investigação e definição:** conferir código, serviços, dados, indicadores e funções existentes antes de implementar, evitando retrabalho. Pesquisar referências atuais e fontes oficiais; registrar possibilidades avaliadas, seleção justificada, definição de cada KPI, fórmula, origem, período, fuso, granularidade, filtros, limites e critérios de validação. Cobrir os domínios reais do app e sua operação administrativa; criar coleta e consultas reais quando necessárias, sem inventar históricos nem tratar dado ausente como resultado medido.
- **Experiência e gestão:** organizar visão geral, tendências e linha temporal, comparações de períodos e acesso aos detalhes e ações correspondentes, com navegação clara para usuários leigos. Estruturar as novas abas Faturamento, Fiscal e Pagamentos previstas nas tarefas 100–102 com **o mesmo visual das abas de “Gestão de Conteúdo Dinâmico” em `/admin/content`**, conforme anexo. Seguir Lyra Clean claro, qualidade premium, acessibilidade, mobile-first e desktop, sem gráficos decorativos sem dados ou controles sem efeito.
- **Validação e entrega:** confrontar indicadores com consultas reais e dados persistidos, conferir filtros e períodos, drill-down e ações, estados vazios, falhas, permissões no servidor, privacidade e desempenho. Validar CRUD e navegação dos domínios afetados, múltiplas larguras, regressões e gates completos. Publicação individual na main, com commit, push e evidências neste painel; não misturar a conclusão com as entregas das abas.

### 100 · Aba Faturamento no dashboard e gestão financeira completa

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** incluir no dashboard administrativo uma aba **“Faturamento”**, com o mesmo visual das abas de **“Gestão de Conteúdo Dinâmico”** em `http://localhost:3000/admin/content`, conforme anexo. Reunir todas as métricas de faturamento **por dia, mês e ano**, gestão total do faturamento, **cancelamento de faturas, reembolsos e demais operações financeiras pertinentes**.
- **Dados e recursos reais:** inventariar cobrança, assinaturas, faturas, pagamentos e provedores existentes; pesquisar profundamente referências de 2026 e APIs oficiais antes de definir e implementar o conjunto completo de métricas e ações. Relacionar cada valor à origem persistida e aos eventos do provedor, distinguir estados de cobrança, valores brutos e líquidos, cancelamentos e reembolsos, respeitar moeda, fuso e período e permitir conferir os registros de origem. Não apresentar projeções como receita realizada.
- **Operações:** implementar cancelamento e reembolso reais conforme as capacidades e regras do provedor e o estado da fatura/pagamento, com validação no servidor, autorização administrativa, confirmação clara da ação, idempotência, prevenção de duplicidade, tratamento de falhas, trilha de auditoria e reconciliação por webhooks. Preservar registros fiscais e histórico financeiro; não converter exclusão de registro local em cancelamento ou reembolso fictício.
- **Validação e entrega:** validar métricas diárias, mensais e anuais contra dados reais, filtros, detalhamento, CRUD aplicável, cancelamento, reembolso e seus efeitos na fatura, assinatura e indicadores. Usar os ambientes oficiais de teste dos provedores para operações de QA e registrar claramente o que foi comprovado; não inventar transações nem executar movimentação de clientes reais como teste. Conferir interface responsiva, acessibilidade, permissões e gates; commit e push próprios na main e atualização deste painel.

### 101 · Transferir Registros fiscais para a aba Fiscal do dashboard

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** transferir a página `http://localhost:3000/admin/fiscal` para uma nova aba **“Fiscal”** no dashboard administrativo, com o mesmo padrão visual de abas solicitado na tarefa 100, e **remover o menu “Registros fiscais” do sidebar**.
- **Escopo e preservação:** inventariar e reaproveitar os componentes, serviços, permissões e dados reais da página, preservando integralmente suas funções, consultas, filtros, detalhes, exportações e operações existentes. Integrar a aba ao dashboard, revisar sidebar desktop/mobile, busca e configurações de navegação antigas e definir explicitamente o tratamento das URLs e atalhos anteriores para evitar links quebrados ou uma página duplicada divergente.
- **Validação e entrega:** comprovar acesso e operações reais pela aba, persistência, autorização administrativa e preservação dos registros, integração com Faturamento e ausência do item antigo nos menus. Executar busca com `rg` para provar a remoção das entradas operacionais, QA responsivo e acessível, testes e gates aplicáveis; commit e push próprios na main, com evidências neste painel.

### 102 · Transferir Pagamentos para a aba Pagamentos do dashboard

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** transferir a página `http://localhost:3000/admin/payments` para uma nova aba **“Pagamentos”** no dashboard administrativo, igual ao padrão de abas solicitado na tarefa 100, e **remover o menu “Pagamentos” do sidebar**.
- **Escopo e preservação:** conferir a página existente e integrar seus componentes e serviços reais ao dashboard, preservando todas as configurações, credenciais protegidas, provedores, testes de conexão e operações que já funcionam. Não duplicar configuração nem expor segredos na interface ou nos logs. Revisar sidebar desktop/mobile, busca e navegações persistidas e tratar explicitamente URLs e atalhos antigos sem criar versões divergentes da mesma função.
- **Validação e entrega:** validar o CRUD real das configurações pela nova aba, leitura e persistência, uso pela cobrança, testes de conexão e erros dos provedores, controles administrativos e proteção das credenciais. Comprovar a ausência do item antigo nos menus com busca verificável, conferir integração com as outras abas, responsividade, acessibilidade e gates; commit e push próprios na main e registro de evidências.

### 103 · Relatórios administrativos completos com KPIs e análise temporal

- **Status:** ⚪ a iniciar · **Registro:** 2026-10-22.
- **Pedido do usuário:** a página `http://localhost:3000/admin/reports` está muito pobre; acrescentar mais métricas e KPIs, linha temporal e gestão. Pesquisar na internet de forma profunda e exaustiva todas as possibilidades que permitam ao administrador gerir o app por completo, na íntegra e em sua totalidade, com referências e tendências de 2026.
- **Investigação e implementação:** inventariar relatórios, dados e necessidades administrativas reais, pesquisar fontes oficiais atuais e registrar possibilidades, seleção justificada e definições verificáveis dos indicadores. Implementar consultas, filtros, períodos, comparações, evolução temporal, detalhamento e exportações pertinentes, reaproveitando as fontes do dashboard e do faturamento para impedir totais divergentes. Diferenciar a consulta analítica da visão geral e das operações transacionais, mantendo acesso claro aos detalhes e ações disponíveis.
- **Qualidade e validação:** cada métrica deve ter fonte, fórmula, período e unidade conferíveis; não usar números fixos, gráficos simulados, placeholders ou cortes de código para aparentar completude. Validar consistência com banco e demais páginas, limites de datas e fusos, filtros combinados, exportações, estados vazios, falhas, autorização e privacidade, desempenho, acessibilidade e mobile/desktop. Executar CRUD aplicável, testes e gates, publicar commit e push próprios na main e atualizar este painel com evidências reais.

**Registro de 2026-10-22:** tarefas 99–103 acrescentadas como **a iniciar**; a publicação imediata deste registro não declara as funcionalidades implementadas. Após commit e push deste arquivo, retomar as tarefas 80/81 no ponto em que estavam, preservando as alterações em andamento.

---

## Tópico 4 · Histórico das Tarefas Finalizadas

### 01 · Instrução mestra no `CLAUDE.md` e obrigatoriedade para agentes de IA

- **Status:** 🟢 finalizada · **Commit:** `1272c56` · **Push:** `db86930..1272c56 main -> main` (confirmado)
- **Implementado:**
  - `CLAUDE.md` criado na raiz com a INSTRUÇÃO MESTRA em texto integral, do título ao item 76.
  - `AGENTS.md` recebeu a seção "INSTRUÇÃO MESTRA (OBRIGATÓRIO PARA TODOS OS MODELOS E AGENTES DE IA)", que obriga qualquer modelo (Claude, Codex, Copilot, Cursor, Gemini, Devin e outros) a ler e cumprir o `CLAUDE.md` e a registrar o andamento neste arquivo.
  - `.prettierignore` passou a ignorar o `CLAUDE.md`, pois `prettier --check` comprovadamente reformataria o texto integral (juntaria linhas e converteria `+` em listas).
- **Evidência:** `npx prettier --check CLAUDE.md` acusava diferença antes do ajuste; após o ajuste o arquivo fica fora da reformatação automática e permanece idêntico ao texto da instrução.

### 02 · Painel de gestão `claude-gestao.md`

- **Status:** 🟢 finalizada · **Commit:** `a99510b` · **Push:** `1272c56..a99510b main -> main` (confirmado)
- **Implementado:**
  - Painel com os quatro tópicos exigidos: Andamento Geral com barra e porcentagem, Tarefas em Andamento ou Bloqueadas (ANDAMENTO limitado a 3 e BLOQUEADAS), Tarefas a Iniciar com o escopo integral de cada tarefa e Histórico das Tarefas Finalizadas.
  - Layout baseado em padrões atuais de painéis em Markdown no GitHub: alertas nativos (`> [!IMPORTANT]`), tabelas de indicadores, barra de progresso em blocos Unicode legível em qualquer visualizador e legenda de status.
  - Numeração única e crescente (01 a 23), sem repetição entre tópicos; as tarefas 03 a 23 correspondem às Tarefas 1 a 21 do item 53 da instrução.

### 03 · Auditoria baseline e correção dos erros atualmente existentes

- **Status:** 🟢 finalizada · **Commit:** `e89a4b2` · **Push:** `a99510b..e89a4b2 main -> main` (confirmado)
- **Implementado:**
  - Baseline forense real registrado em [`docs/auditoria/2026-10-04-baseline-forense.md`](./docs/auditoria/2026-10-04-baseline-forense.md): versões do ambiente, quality gates, build, runtime, `pnpm outdated` e `pnpm audit` (146 avisos: 4 críticos, 50 altos, 80 moderados, 12 baixos).
  - Erro real encontrado: `pnpm db:migrate` falhava em banco novo criado pelo Compose (`fk_ui_config_updated_by ... are incompatible`). Causa raiz: tabelas iniciais herdavam `utf8mb4_0900_ai_ci` do servidor enquanto as novas declaram `utf8mb4_unicode_ci`; só o `run.py` mascarava o defeito ao iniciar o MySQL com `--collation-server=utf8mb4_unicode_ci`.
  - Correções: migration `mysql/migrations/005_add_tables_unicode_collation.sql`; `compose.yaml` com `--character-set-server=utf8mb4` e `--collation-server=utf8mb4_unicode_ci`; `scripts/mysql-migrate.mjs` com ordenação determinística por código de caractere.
- **Evidências:** banco parcialmente migrado → 7 migrations aplicadas (exit 0); reexecução idempotente ("Já aplicada"); banco novo → 12 migrations aplicadas e todas as tabelas em `utf8mb4_unicode_ci`; `pnpm start` com `GET /`, `/login`, `/api/public/plans`, `/api/public/ui-config` em HTTP 200 e login do admin bootstrap com sessão válida; gates `check:format`, `check:lint`, `check:types` (exit 0), `test` (82/82) e `build` (exit 0).

### 04 · Normalização do package manager e lockfiles

- **Status:** 🟢 finalizada · **Commit:** `27171f8` · **Push:** `e89a4b2..27171f8 main -> main` (confirmado)
- **Decisão técnica (pesquisa de 2026-10-04):** pnpm é o gerenciador oficial (único lockfile real, `pnpm-workspace.yaml`, scripts e README). Versões avaliadas: pnpm 12.9.1 (lançado em 2026-08-26, reescrito em Rust) e pnpm 11.28.4 (suporte até 2027-04-30). O pnpm 12 **não executa via Corepack** (testado com Corepack 0.34.0 e 0.36.0: `Cannot find module .../pnpm/12.9.1/bin/pnpm.cjs`, pois o pacote passou a distribuir binário nativo), o que viola o requisito de Corepack reproduzível; por isso foi fixado o pnpm **11.28.4**, estável, suportado e compatível com Corepack.
- **Implementado:**
  - `package.json`: `"packageManager": "pnpm@11.28.4+sha512..."` gerado por `corepack use`; `bun` removido das dependências; `db:start` usa `docker compose up -d --wait mysql && pnpm run db:migrate` (aguarda o healthcheck real em vez de migrar com o banco ainda subindo).
  - `bun.lock` removido; `package-lock.json` não existia no repositório.
  - `pnpm-workspace.yaml`: removidos `bun` e `termios` de `allowBuilds` (nenhum dos dois existe no lockfile).
  - `pnpm-lock.yaml` regenerado pelo pnpm 11 e incluído no `.prettierignore` (causa raiz dos diffs espúrios: o `prettier --write .` reformatava o lockfile e o pnpm o reescrevia a cada install).
  - `AGENTS.md`: checagens obrigatórias passam a usar `pnpm` (incluindo `pnpm test` e `pnpm build`).
  - Avaliado e descartado: manter `devEngines.packageManager` junto com `packageManager` gera o aviso `Cannot use both "packageManager" and "devEngines.packageManager"` no pnpm 11; foi mantido o campo exigido pela instrução e lido pelo Corepack.
- **Evidências:** `corepack pnpm@11.28.4 --version` → `11.28.4`; `CI=true pnpm install --frozen-lockfile` → exit 0 sem warnings; Prova de Morte: `ls bun.lock` inexistente e `grep -c "bun@" pnpm-lock.yaml` → `0`; gates `check:format`, `check:lint`, `check:types` (exit 0), `test` (82/82) e `build` (exit 0).
- **Pendências encaminhadas:** `run.py` e `run_windows.py` ainda citam `package-lock.json` e fallback para npm; serão tratados nas tarefas 13 e 15.

### 05 · Remoção comprovada de dependências não utilizadas

- **Status:** 🟢 finalizada · **Commit:** `ecf1b60` · **Push:** `27171f8..ecf1b60 main -> main` (confirmado)
- **Método:** para cada dependência do `package.json`, busca `rg` por `'pacote` e `"pacote` em todo o repositório (código, configs, scripts, CSS), excluindo `node_modules`, lockfile e o próprio `package.json`; candidatos com zero referências foram reconferidos por nome curto (ex.: `monaco`, `tremor`, `vaul`, `tooltip`) e na documentação.
- **Removidas (zero uso comprovado):** `@monaco-editor/react`, `monaco-editor`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-tooltip` (os tooltips usados são do Recharts e do `ui/chart`), `@tremor/react` (só aparecia no `content` do Tailwind), `input-otp`, `vaul`, `@tailwindcss/typography` (não registrado em `plugins`) e `eslint-config-prettier` (não estendido no `.eslintrc.json`).
- **Seção corrigida:** `@types/react-big-calendar` movido de `dependencies` para `devDependencies`.
- **Mantidas com evidência:** `react-big-calendar` (`src/components/appointments/Agenda.tsx` e `globals.css`), `@dyad-sh/nextjs-webpack-component-tagger` (`next.config.ts`, opcional via `ENABLE_DYAD_COMPONENT_TAGGER`; reavaliado na tarefa 06), `implement_elementor_lyra.py` e `modules/lyra-customaze-ui-ux` (importado por `src/lib/site-page-config`).
- **Defeito corrigido junto:** o `content` do Tailwind não incluía `src/lib` (componentes do Puck com `className`) nem `modules/`; agora cobre `./src/**/*` e `./modules/**/*`.
- **Artefatos indevidamente versionados:** `.logs/` (2 arquivos) e `.playwright-cli/` (52 arquivos) estavam no Git apesar do `.gitignore`; dois snapshots continham a senha padrão do admin digitada no login. Foram removidos do índice (`git rm --cached`), permanecendo apenas locais e ignorados.
- **Prova de Morte:** `git ls-files .logs .playwright-cli | wc -l` → `0`; nenhuma das 14 dependências permanece no `package.json` nem como importador direto no `pnpm-lock.yaml`.
- **Evidências:** `CI=true pnpm install --frozen-lockfile` exit 0; `check:format`, `check:lint`, `check:types` exit 0; `test` 82/82; `build` exit 0. Uma execução de build falhou de forma transitória em `next/font` (`Cannot read properties of null (reading '1')`) por resposta inválida do Google Fonts durante o download; a repetição passou. A dependência de rede no build pelo `next/font/google` foi registrada para tratamento na tarefa 20 (performance/fontes).

### 06 · Upgrade controlado das dependências

- **Status:** 🟢 finalizada · **Commit:** `de80385` · **Push:** `318faf1..de80385 main -> main` (confirmado)
- **Matriz completa:** [`docs/auditoria/2026-10-04-matriz-dependencias.md`](./docs/auditoria/2026-10-04-matriz-dependencias.md) com versão declarada, instalada, última estável, uso, breaking changes e ação de cada pacote.
- **Implementado (com adaptação real do código às novas APIs):**
  - **TypeScript 6.0.3:** o 7.0.2 foi pesquisado e descartado por não ter API JavaScript (usada pelo type-check do `next build` e pelo `typescript-eslint`). O novo padrão `noUncheckedSideEffectImports` foi atendido com `src/types/css.d.ts` (declaração dos imports de CSS), sem desligar a checagem.
  - **Vitest 5 / Vite 8:** `vitest.config.mts` passou a usar `resolve.tsconfigPaths` nativo e `oxc.jsx.runtime = 'automatic'` (causa raiz da falha "invalid JS syntax" no `ProfileForm.test.ts`: o `tsconfig` usa `jsx: preserve` para o Next); `vite-tsconfig-paths` removido.
  - **Zod 4:** `required_error` migrado para `error` preservando a semântica (mensagem só quando o valor está ausente); `z.coerce.number<number | string>()` e `useForm<Input, unknown, Output>` em AIConfigForm, CreateGoalModal, UpdateGoalProgressModal, onboarding e ProfileForm.
  - **DayPicker:** `react-day-picker` 8 (peer `react ^16-18`, incompatível com React 19) substituído por `@daypicker/react` 10; `ui/calendar.tsx` reescrito para a nova API (classNames do enum UI, `Chevron`, dropdown de mês/ano) com locale `pt-BR` padrão; `ui/date-picker.tsx` com `OnSelectHandler`, `autoFocus`, `startMonth`/`endMonth`.
  - **Recharts 3:** `ui/chart.tsx` tipado com `TooltipContentProps` e `DefaultLegendContentProps`, filtro de itens `type: 'none'` e chave estável (o `dataKey` pode ser função).
  - **react-resizable-panels 4:** `ui/resizable.tsx` com `Group`/`Separator`; no `SiteExperienceBuilder`, `direction` → `orientation` e tamanhos `44/36/56/40` → `"44%"` etc. (no v4 números são pixels).
  - **Stripe 23:** API fixada em `2026-09-30.endive` (changelog de 21, 22 e 23 revisado; `new Stripe()` e `webhooks.constructEvent` já eram usados).
  - **Demais:** Sentry 11.4, Puck 0.23, lucide-react 1.51.0 (1.52.0 bloqueado pela política `minimumReleaseAge` do pnpm 11 por ter menos de 24 h; a exclusão automática no `pnpm-workspace.yaml` foi desfeita), date-fns 4.4, `@types/node` 24 (alinhado ao Node 24 LTS), Radix, mysql2 3.24, jose, react-hook-form 7.89, prettier 3.9 (reformatou tabelas Markdown que não renderizavam por falta de linha em branco).
- **Evidências:** `pnpm peers check` → "No peer dependency issues found"; `check:format`, `check:lint`, `check:types` exit 0; `test` 82/82; `build` exit 0; `pnpm audit` de 146 para 113 avisos (críticos de 4 para 3, restantes em `next@15`).
- **Encaminhado:** Next.js 16, React 19.3 e ESLint 10 (tarefas 07 e 08), Tailwind 4 (tarefa 09), `overrides` para vulnerabilidades transitivas restantes (tarefa 19) e verificação visual do calendário, gráficos e painéis redimensionáveis no QA de navegador (tarefa 21).

### 07 · Migração Next.js

- **Status:** 🟢 finalizada · **Commit:** `cf912ac` · **Push:** `7ed5d7c..cf912ac main -> main` (confirmado)
- **Pesquisa (guia oficial "How to upgrade to version 16", Next.js 16.3.8):** Turbopack padrão em `dev`/`build`, remoção de `next lint`, ESLint em flat config, async Request APIs obrigatórias, `middleware` → `proxy`, novos padrões de `next/image`, React 19.2+ e Node ≥ 20.9.
- **Next.js 15.3.4 → 16.3.8:**
  - `next.config.ts` reescrito: removidos aliases/fallbacks de webpack herdados do Transformers.js (sem nenhum uso no código); loader Dyad (`@dyad-sh/nextjs-webpack-component-tagger`) testado no Turbopack e reprovado (`Reading source code for parsing failed`), por isso só é registrado com `ENABLE_DYAD_COMPONENT_TAGGER=true` no novo script `pnpm dev:webpack` (testado: atributos `data-dyad-id` gerados). Build e `pnpm dev` padrão seguem em Turbopack.
  - Async Request APIs já estavam aplicadas (`await params`, `await cookies()`); a validação de tipos de rotas do Next 16 revelou `params` tipado como união em `/api/admin/plans/[planKey]`, agora validado em runtime com `z.enum(PLAN_KEYS)` (antes aceitava qualquer chave).
  - O Next 16 ajustou o `tsconfig.json` (`jsx: react-jsx`, tipos de `.next/dev`) e adicionou ao `AGENTS.md` o bloco oficial de regras para agentes (documentação em `node_modules/next/dist/docs/`); a configuração `oxc` do Vitest deixou de ser necessária e foi removida.
- **ESLint 8.57 (EOL desde 2026-08-06) → 10.12 + eslint-config-next 16.3.8:** `.eslintrc.json`/`.eslintignore` substituídos por `eslint.config.mjs` (core-web-vitals + typescript). Os plugins `eslint-plugin-react` 7.37.5, `import` e `jsx-a11y` exigidos pelo `eslint-config-next` quebram no ESLint 10 (`contextOrFilename.getFilename is not a function`); a correção oficial adotada é o `fixupConfigRules` do `@eslint/compat` (mantido pelo time do ESLint). Scripts `lint`/`check:lint`/`fix:lint` sem a flag `--ext` (removida). `package.json` renomeado de `next-template` para `lyra-metacare`.
- **76 achados reais da nova configuração corrigidos sem desabilitar regras:** 33 `react-hooks/set-state-in-effect` (cargas separadas em consulta pura + aplicação do resultado, estado derivado durante a renderização, `useSyncExternalStore` para Embla, localStorage e capacidade Web Bluetooth; novos hooks `useKeyedResource`, `useAccountResource` e `useLocalStorageValue`), 6 `purity` (`Date.now`/`Math.random` no render), 2 `static-components`, 1 `refs`, 2 `preserve-manual-memoization`, 3 `incompatible-library` (`watch()` → `useWatch`), 11 `no-explicit-any` (tipos reais, Zod e augment de `Navigator.bluetooth`), 16 `no-unused-vars` e 2 diretivas `eslint-disable` órfãs.
- **Defeitos funcionais encontrados e corrigidos pela causa raiz:**
  - Sentry nunca era inicializado (os `sentry.*.config.ts` não eram carregados por nenhum arquivo): criados `src/instrumentation.ts`, `src/instrumentation-client.ts` e `src/app/global-error.tsx`; `withSentryConfig` só faz upload de source maps com `SENTRY_AUTH_TOKEN/ORG/PROJECT`; `dataCollection` do Sentry 11 desliga usuário, cookies, cabeçalhos, corpos, dados de banco, entradas/saídas de IA e variáveis locais (dados de saúde).
  - O login ignorava a configuração editada no Site Experience Builder (regressão do redesign #45, `overrideConfig` sem uso) e o checkbox "Lembrar-me" não tinha efeito: textos, escalas tipográficas, tamanhos, destaques e link de volta reconectados; "Lembrar-me" agora cria sessão de 7 dias (cookie com `Max-Age`) e, desmarcado, sessão de navegador (sem `Max-Age`, token de 12 h); campos com `label` acessível e `autocomplete`.
  - Leituras ao vivo (monitor BLE e canal em tempo real) eram descartadas quando não havia runtime nativo de saúde; o `HealthOrchestrator` passou a combinar a sincronização com as leituras ao vivo e `triggerManualSync` retorna o resultado (o FAB não observa mais estado em efeito).
  - O `DatePicker` apagava a data digitada parcialmente quando o campo já tinha valor.
  - O Modo Privacidade mantinha estado isolado por componente (alternar no dashboard não refletia no chat); agora é um store compartilhado entre componentes e abas. A chave BYOK deixou de disparar um toast a cada tecla.
  - `POST /api/data/user-assessments` aceitava qualquer payload (`any`): agora usa união discriminada Zod com escalas válidas (humor 1–5, WHO-5 0–5 com as 5 respostas, NPS 0–10).
  - `GET /api/public/ui-config` devolvia `config: null` em falha de banco; agora registra o erro e responde 500.
  - O gráfico de peso do perfil exibia meses em inglês; agora usa `ptBR`.
- **Evidências:** `check:format`, `check:lint` (0 problemas), `check:types` exit 0; `test` 84/84 (2 testes novos de fallback de papel em `use-is-admin`); `build` exit 0 em Turbopack; `pnpm start` com `/`, `/login`, `/admin/dashboard`, `/chat`, `/profile`, `/goals`, `/api/public/plans`, `/api/public/ui-config` em HTTP 200; login com `remember:false` sem `Max-Age` e com `remember:true` com `Max-Age=604800`; avaliação WHO-5 inválida → 400 e válida → 200 (score 84); `pnpm audit` sem críticos (de 3 para 0; 72 avisos restantes, tarefa 19).
- **Encaminhado:** React 19.3 (tarefa 08), mensagens de erro Zod amigáveis nas APIs (tarefa 18), cookie `Secure` exige HTTPS fora de `localhost` (documentação, tarefa 23).

### 08 · Migração React

- **Status:** 🟢 finalizada · **Commit:** `ae0ead5` · **Push:** `e7b7ccc..ae0ead5 main -> main` (confirmado)
- **Pesquisa:** registry npm consultado em 2026-10-04: React 19.3.0 é a versão estável mais recente (publicada em 2026-09-09); o Next.js 16.3.8 declara `react ^19.0.0` como peer. Nenhuma versão canary ou experimental foi usada.
- **Implementado:**
  - `react` e `react-dom` 19.2.5 → 19.3.0 (`@types/react`/`@types/react-dom` 19.3.0 já instalados na tarefa 06).
  - Revisão de APIs depreciadas com os tipos oficiais do React 19.3: `React.ElementRef` (depreciado em favor de `React.ComponentRef`) substituído nas 61 ocorrências de 21 componentes `src/components/ui/*`; `FormEvent` (marcado como depreciado: "FormEvent doesn't actually exist") substituído por `SubmitEvent<HTMLFormElement>` nos handlers de envio de `LoginExperience`, `LandingPage` e `AIKnowledgeManager`. Sem uso de `defaultProps` em componentes de função, string refs, `findDOMNode`, `ReactDOM.render` ou `propTypes` (as ocorrências de `defaultProps` são da configuração do Puck, não do React).
  - Refs, efeitos, hidratação e estado derivado já haviam sido revistos na tarefa 07 pelas regras do React Compiler (`react-hooks` 7).
  - `pnpm-workspace.yaml` passou a declarar em `peerDependencyRules.allowedVersions` a compatibilidade, verificada na tarefa 07, entre o ESLint 10 e os plugins `react`, `import` e `jsx-a11y` exigidos pelo `eslint-config-next`.
- **Evidências:** Prova de Morte `rg "ElementRef<|MutableRefObject|PropsWithRef|FormEvent|LegacyRef" src` → nenhum resultado; `pnpm peers check` → "No peer dependency issues found"; `check:format`, `check:lint`, `check:types` exit 0; `test` 84/84; `build` exit 0; `pnpm start` com `/`, `/login`, `/admin/dashboard`, `/chat`, `/profile`, `/appointments`, `/plan`, `/monitoring`, `/connect` e `/onboarding` em HTTP 200, sem erros no log do servidor.

### 09 · Migração Tailwind/shadcn/UI dependencies

- **Status:** 🟢 finalizada · **Commit:** `4db2b68` · **Push:** `7cbf0f3..4db2b68 main -> main` (confirmado)
- **Pesquisa (registro npm em 2026-10-04):** `tailwindcss`, `@tailwindcss/postcss` e `@tailwindcss/upgrade` 4.3.3 (publicados em 2026-09-25) e `tw-animate-css` 1.4.0. O `tailwindcss-animate` não tem suporte ao Tailwind 4; o `tw-animate-css` é o substituto adotado pelo shadcn/ui.
- **Implementado:**
  - Execução única da ferramenta oficial `@tailwindcss/upgrade` 4.3.3, seguida de revisão manual linha a linha. Removido `tailwind.config.ts`; tema CSS-first no `globals.css`; PostCSS com `@tailwindcss/postcss`. A ferramenta renomeou classes em 63 templates (`outline-none` → `outline-hidden`, `backdrop-blur` → `backdrop-blur-sm`, `flex-shrink-0` → `shrink-0`, `bg-gradient-to-*` → `bg-linear-to-*`, seletores arbitrários etc.).
  - Tema reorganizado:
    - `@theme inline` para cores e fontes, resolvidas no elemento onde `.dark` e as variáveis do next/font são aplicadas.
    - `@theme static` para raios e sombras, eliminando os tokens autorreferentes gerados pela ferramenta (`--radius-sm: var(--radius-sm)`).
  - `tailwindcss-animate` substituído por `tw-animate-css` nas 31 ocorrências de `animate-in`, `fade-*`, `zoom-*` e `slide-in-from-*`.
  - `components.json` com `tailwind.config` vazio, padrão do shadcn para Tailwind 4. README com a stack real (Next.js 16, React 19.3, TypeScript 6, Tailwind 4, Recharts 3).
- **Defeitos da conversão automática corrigidos pela causa raiz:**
  - O valor de dado `'outline'` (variante de botão do Puck, persistida no banco) foi trocado por `'outline-solid'`; restaurado.
  - A variável local `--color-border` do indicador de gráfico virou o token global `border-border`; agora é `border-(--color-border)`.
  - As classes de componente da Lyra (`.glass`, `.nav-pill`, `.surface-panel` etc.) viraram `@utility` e passaram a sobrescrever utilitários. Por exemplo, o `.glass` apagava o `border-border/80` do cabeçalho. Voltaram para `@layer components`, preservando a precedência do Tailwind 3.
  - O CSS do react-big-calendar foi inlinado com `@charset` dentro de `@layer`, o que gerava aviso no build. Foi movido para `src/components/appointments/agenda.css`, importado pelo componente `Agenda`, e saiu do bundle global (cerca de 12 KB a menos nas demais páginas).
- **Defeitos pré-existentes revelados pelo QA visual e corrigidos:**
  - A landing usava a classe `cosmic-orb`, removida no commit `f5abd4e`. Os halos nunca eram posicionados nem desfocados, e o `bg-accent/10` já aparecia como retângulo rosa no Tailwind 3. Agora usa `orchestrated-orb`.
  - O Tailwind 3 descartava em silêncio opacidades fora da escala padrão (`/92`, `/12`, `/88` etc.). Comprovação: `bg-white/92`, `border-primary/12` e `bg-card/92` ausentes do CSS do v3, enquanto os controles `/80` e `/90` estavam presentes. O v4 passou a aplicar o design escrito. Com isso, o painel do slot vazio do Puck surgia como uma faixa branca; agora ele fica oculto fora do editor quando não há blocos.
- **Removido com evidência (Prova de Morte):**
  - Keyframes e classes `.animate-*` duplicados (idênticos aos do tema, comparados por script).
  - Utilidades `bg-gradient-*` e `shadow-*` que o CSS gerado pelo config já sobrescrevia no v3.
  - `container` customizado (zero uso de `container` como classe).
  - `rg "tailwind\.config|tailwindcss-animate|@tailwind |cosmic-orb"` em código e configs → nenhum resultado.
- **Mudança consciente registrada:** com a escala tipográfica do Site Experience Builder aplicada via `font-size` inline, a entrelinha de `text-*` passou de absoluta (v3) para proporcional (v4). Isso evita linhas espremidas quando a escala aumenta.
- **Evidências:**
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 87/87 nesta tarefa.
  - `build` com exit 0 e **zero avisos**.
  - `pnpm start` com capturas reais de 14 páginas em 1440×900 e 390×844, comparadas pixel a pixel com a baseline do Tailwind 3: zero erros de console; diferenças restantes inspecionadas e justificadas acima.
  - O painel de slot vazio retorna `display: none` em `/appointments`.
- **Encaminhado:** o editor `/admin/puck` quebra com React #185, defeito pré-existente comprovado no commit `7cbf0f3`, tratado na tarefa 25. Os documentos históricos de redesign que citam `tailwind.config.ts` serão revistos na tarefa 23.

### 10 · Modernização Node/pnpm/toolchain

- **Status:** 🟢 finalizada · **Commit:** `dcae3a4` · **Push:** `012138a..dcae3a4 main -> main` (confirmado)
- **Pesquisa (cronograma oficial `nodejs/Release` e `nodejs.org/dist/index.json` em 2026-10-04):**
  - Node 24 "Krypton" é **Active LTS**: entra em manutenção em 2026-10-20 e tem suporte até 2028-04-30. A última release é a 24.21.0 (2026-09-07) e a última de segurança, a 24.18.1.
  - Node 26 continua **Current** até virar LTS em 2026-10-28.
  - Node 22 está em manutenção até 2027-04-30; Node 20 está em EOL desde 2026-04-30.
  - Escolha: **Node 24 LTS**, por estabilidade e suporte, conforme o item 63 da instrução.
- **Implementado:**
  - `.nvmrc` e `.node-version` com `24.21.0`.
  - `engines.node` `^24.18.1` no `package.json`, com piso na última release de segurança da linha 24 e sem aceitar linhas Current.
  - `engineStrict: true` no `pnpm-workspace.yaml`.
  - `codemagic.yaml` com Node `24.21.0` fixo (antes era `lts` flutuante) e `corepack install` para a versão e o sha512 do `packageManager`. Antes o CI usava `corepack prepare pnpm@latest --activate`, que ativaria o pnpm 12, incompatível com o Corepack segundo a tarefa 04, e ignoraria a versão fixada.
  - README com os pré-requisitos reais.
- **Evidências:**
  - Tarball oficial do Node 24.21.0 verificado por SHA-256 (`SHASUMS256.txt`). O Node 24 inclui o Corepack 0.36.0, que resolve o pnpm 11.28.4 do `packageManager`.
  - `corepack install` num `COREPACK_HOME` vazio baixa e verifica o pnpm exato.
  - Com Node 22, `pnpm install --frozen-lockfile` sai com exit 1 e `ERR_PNPM_UNSUPPORTED_ENGINE` (Expected `^24.18.1`, Got `v22.22.0`).
  - Com Node 24.21.0, instalação limpa (sem `node_modules` e `.next`) com exit 0 e zero avisos.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos; `pnpm db:migrate` com exit 0 e idempotente.
  - `pnpm start` com capturas das 14 páginas sem erros, zero avisos de console e editor Puck salvando rascunho.
- **Encaminhado:** `run.sh` (mensagem "Node.js 20+"), `run.py` e `run_windows.py` ainda não validam a versão do Node pelo `.nvmrc`; isso será tratado nas tarefas 13 a 15.

### 11 · Modernização MySQL e autenticação

- **Status:** 🟢 finalizada · **Commit:** `c24421a` · **Push:** `bd7028c..c24421a main -> main` (confirmado)
- **Pesquisa (fontes primárias em 2026-10-04):**
  - MySQL 8.0, a versão do projeto (8.0.45), está em **fim de vida desde 2026-04-30**.
  - A tag oficial `lts` do Docker Hub aponta para o digest da **9.7.2** (LTS, suporte até 2034). A 8.4.11 é a LTS anterior; a 26.7 é Innovation e foi descartada.
  - O manual ("Upgrade Paths") só suporta upgrade de uma série LTS/Bugfix para a **próxima** LTS. Rota obrigatória: 8.0 → 8.4 → 9.7.
- **Evidências que motivaram as mudanças:**
  - O 9.7.2 sobre um datadir 8.0 encerra com `MY-014060 Cannot upgrade from 80045 to 90702`, sem tocar nos dados (o 8.0.45 sobe de novo na mesma cópia).
  - `lyra@%`, `root@%` e `root@localhost` usavam `mysql_native_password`, que vem desligado no 8.4 e foi removido no 9.x. O resultado seria perda total de acesso.
  - `VALUES(col)` em `ON DUPLICATE KEY UPDATE` gerava o warning 1287 no 8.0.45.
- **Implementado:**
  - `compose.yaml` com `mysql:9.7.2` e remoção de `--default-authentication-plugin`, opção removida no 8.4 com a qual o servidor nem inicia.
  - **`scripts/mysql-upgrade.mjs` (`pnpm db:upgrade`)**, idempotente:
    - backup a frio verificado (bytes e quantidade de arquivos);
    - detecção da versão do datadir pela imagem mais antiga da cadeia (recusa de downgrade sem alterar dados);
    - migração dos usuários para `caching_sha2_password` na série atual;
    - um passo por série LTS, com validação final;
    - `--restaurar <volume>`.
    - Imagem-alvo, volume e credenciais vêm do `docker compose config`; as senhas entram por variável de ambiente herdada (`-e MYSQL_PWD`), nunca nos argumentos visíveis no `ps`.
  - Os cinco upserts (`data-api`, `plans`, `billing`, `ai_plans`, `ui_config`) passaram a usar o alias de linha `AS novo`.
  - `run.py` com `mysql:9.7.2` sem o plugin nativo.
  - README com badges, stack e instrução do `db:upgrade`.
- **Defeitos do próprio script encontrados nos testes e corrigidos antes do commit:**
  - Regex de detecção sem o texto real de downgrade (`Cannot downgrade from 90702 to 80045`).
  - Backup de cerca de 200 MB repetido em toda reexecução; agora há um caminho rápido quando o serviço já está na série-alvo.
  - Restauração tentava `docker volume rm` num volume referenciado pelo container parado do compose; agora o conteúdo é substituído, preservando nome e rótulos.
  - Abordagens avaliadas e descartadas com evidência: `ibd2sdi` (ausente das imagens oficiais), `--innodb-read-only` (o InnoDB recusa iniciar, com md5 provando que não altera o datadir) e o "creator" do redo log (não é regravado no upgrade).
- **Evidências:**
  - **Banco existente:** `pnpm db:upgrade` real em 34 s, com o servidor registrando `8.0.45 → 8.4.11` e `8.4.11 → 9.7.2`. As 27 tabelas têm contagem idêntica a um backup independente em 8.0.45 (86 linhas).
  - **Restore testado:** `--restaurar` devolveu o datadir 8.0, que sobe no 8.0.45; o novo upgrade completo também ficou idêntico à referência.
  - **Idempotência:** com o serviço parado em 9.7, detecta e valida; com o serviço saudável, termina sem backup.
  - **Banco vazio:** 12 migrations aplicadas no 9.7.2, reexecução 12× "Já aplicada", usuário em `caching_sha2_password` e 27 tabelas `utf8mb4_unicode_ci`.
  - **mysql2:** autenticação `caching_sha2_password` completa (cache vazio após restart, TCP sem TLS) com `pnpm db:migrate` exit 0.
  - **Upserts em runtime pelas APIs reais** (`PATCH /api/admin/plans/free`, `POST /api/admin/ui-config`, `POST /api/data/profiles`, duas gerações de plano de IA): HTTP 200 e **0 warnings** no `performance_schema`. Billing validado com o SQL exato em transação com `ROLLBACK`.
  - Ao todo, 1.200 instruções da aplicação com 0 warnings.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos; 14 páginas sem erros de console; editor Puck salvando.
  - Avisos restantes do servidor são da imagem oficial e legítimos (item 59): CA TLS autoassinada gerada automaticamente e diretório `/var/run/mysqld` da imagem.
- **Encaminhado:**
  - Senha de root fixa no `compose.yaml` → tarefa 12.
  - `run.py` com `docker rm -f` e volume anônimo (destrói dados) e encerramento de processos na porta 3306 → tarefa 13.
  - `POST /api/data/*` devolvendo 500 com a mensagem crua do banco para payload inválido → tarefa 18.

### 12 · Compose, env e secrets

- **Status:** 🟢 finalizada · **Commit:** `a5b5e12` · **Push:** `8b54dec..a5b5e12 main -> main` (confirmado)
- **Auditoria de segredos** (todos os arquivos versionados, termos do item 20, chaves `sk_`/`whsec_`/`AIza`/`ghp_`, chaves privadas e DSNs):
  - O código da aplicação estava limpo: `AUTH_SECRET` obrigatório, sem fallbacks secretos, e nenhum `.env`, chave ou certificado versionado.
  - Havia senhas fixas no `compose.yaml` (inclusive no healthcheck), no `run.sh`, no `run_windows.py`, no `run.py`, no README e em manuais (`lyra_mysql_*`, `admin123`, `Lyra123#` e um admin extra `admin@admin.com`/`admin123`).
  - Havia três geradores de `.env.local` divergentes, um por launcher.
- **Implementado:**
  - **Fonte única de configuração:** `.env.example` versionado (25 variáveis levantadas do código, sem segredos) e `pnpm env:init` (`scripts/env-init.mjs` + `scripts/lib/env-file.mjs`).
    - Gera `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `AUTH_SECRET` e `ADMIN_BOOTSTRAP_PASSWORD` com aleatoriedade criptográfica (base64url, seguro para o dotenv do Next, para o Compose e para o shell).
    - Nunca sobrescreve valores, grava com permissão 0600 e não imprime segredos.
    - O `mysql-migrate.mjs` passou a usar o parser comum, removendo a duplicação.
  - **`compose.yaml`:**
    - credenciais interpoladas do `.env.local`, com erro orientado se faltarem;
    - porta publicada só em `127.0.0.1` (antes exposta em todas as interfaces);
    - **healthcheck real**, que autentica o usuário da aplicação via TCP no banco da aplicação. O `mysqladmin ping` anterior retornava 0 até com senha errada (comprovado). A senha vem do ambiente do container e não aparece no comando.
  - **Launchers e scripts:**
    - `pnpm db:*`, `db:upgrade`, `run.sh` e `run_windows.py` usam `docker compose --env-file .env.local` e delegam o `.env.local` ao `env:init`.
    - Removido o fallback de cerca de 30 bits do `run.sh` (`lyra_fallback_$RANDOM_$RANDOM`).
    - Um JSON inválido em `ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS` passa a ser erro, em vez de ser substituído por um admin com senha fixa.
    - O `run_windows.py` decodifica a saída do Node como UTF-8, porque o cp1252 do Windows quebraria com bytes como o de "Á".
  - **`AUTH_SECRET`:** mínimo de 32 bytes (HS256, RFC 7518 §3.2). Além disso, `verifySessionToken` deixou de converter erro de configuração em "sessão inválida" silenciosa.
  - **`.gitignore`:** exceção para o `.env.example`, com os finais de linha mistos normalizados para LF.
  - README, manual e prompt de redesign atualizados: sem senhas padrão, com o fluxo real.
- **Evidências:**
  - 13 testes novos: 7 do gerador (`.env.example` sem segredos, idempotência, preservação, preenchimento no lugar, `AUTH_SECRET` fraco, entropia e charset) e 6 da sessão.
  - **`.env.local` existente:** 16 chaves acrescentadas e as 12 existentes com hash idêntico; a 2ª execução não altera nada; permissão 600.
  - **Instalação nova:** 28 variáveis, permissão 0600 mesmo com `umask 022`, segredos com 32/32/48/24 bytes e nenhum segredo na saída.
  - **Compose:** sem `--env-file`, erro orientado (exit 1). Com o serviço recriado: saudável, `PortBindings` em `127.0.0.1:3307` e healthcheck sem senha. Healthcheck novo com senha errada ou banco inexistente: exit 1; `mysqladmin ping` antigo com senha errada: exit 0.
  - **Ponta a ponta com segredos gerados** (projeto compose isolado, volume novo): migrations aplicadas, login do admin com a senha gerada 200, sessão válida e `admin123` com 401. O volume de teste foi removido em seguida.
  - **Launchers:**
    - `pnpm db:start` e `./run.sh db` com exit 0;
    - `./run.sh doctor`: ambiente saudável;
    - `python3 run_windows.py setup-env` e `db-start`: exit 0; com Node ausente, mensagem clara e exit 1, sem traceback;
    - `db:upgrade`: caminho rápido com exit 0; sem `.env.local`, erro orientado.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 125/125; `build` com exit 0 e zero avisos.
  - `shellcheck` 0.11 no `run.sh`: só três variáveis sem uso pré-existentes, fora das linhas alteradas. `ruff` (E, F, W) no `run_windows.py`: sem achados.
- **Encaminhado:**
  - O `run.py` ainda cria o próprio container via `docker run` com `Lyra123#`/`admin123`; ele será reescrito sobre o Compose e o `env:init` na tarefa 13.
  - Variáveis sem uso no `run.sh` → tarefa 14.
  - A `INSTRUCAO_REIMPLEMENTACAO_UI_UX_LYRA_2026.md` ainda descreve o bootstrap antigo → tarefa 23.

### 13 · Correção e modernização completa do run.py

- **Status:** 🟢 finalizada · **Commit:** `4f1f169` · **Push:** `901a067..4f1f169 main -> main` (confirmado)
- **Diagnóstico do `run.py` anterior (2.947 linhas):**
  - Instalava o Rich com `pip --break-system-packages` no Python do sistema e reexecutava (item 22).
  - Tinha remoção automática do MySQL nativo (`apt purge`, `rm -rf` de diretórios do sistema) e encerrava processos na porta 3306 (itens 23 e 27).
  - Recriava o próprio container com `docker rm -f` e volume anônimo, perdendo os dados, e fixava senhas (`Lyra123#`, `admin123`).
- **Implementado** (reescrita completa sobre o Docker Compose e o `env:init`):
  - **Comandos:** `up [--prod]`, `app`, `db`, `migrate`, `doctor`, `fix`, `repair [--sim]`, `purge --confirmar-purge`, `status`, `logs [app|db] [--seguir]`, `stop [app|db]`, `help` e menu interativo (Rich). Códigos de saída 0/1/2/130.
  - **Separação `doctor`/`fix`/`repair`/`purge`** sem `apt` nem `sudo`:
    - `repair` recria `.next`, `node_modules` e o container, preservando o volume;
    - `purge` exige confirmação explícita e faz backup verificado do volume antes de apagar.
  - **Python reproduzível:** venv `.lyra-run/venv` com `requirements-run.txt` (Rich 15.0.0, markdown-it-py 4.2.0, mdurl 0.1.2, Pygments 2.21.0), hashes SHA-256 conferidos contra os digests do PyPI, `--require-hashes --only-binary=:all:`, reinstalação quando o manifesto muda e modo texto completo sem Rich. Mínimo Python 3.10, exigência do markdown-it-py.
  - **`doctor`:** plataforma (WSL2/WSL1/Linux), Ubuntu ≥ 22.04, Python, Node contra `.nvmrc`/`engines`, Corepack/pnpm contra `packageManager`, Docker Engine ≥ 25, Compose ≥ 2.20, `.env.local` (completude e permissão), dependências (lockfile instalado idêntico ao `pnpm-lock.yaml`), portas com dono, MySQL, migrations e aplicação.
  - **Portas:** dono identificado por `docker ps` e `/proc/net/tcp`/`fd` (PID, comando, usuário), e processos de terceiros nunca são encerrados.
    - A aplicação sobe na próxima porta livre, com `PORT`, `APP_BASE_URL` e `NEXT_PUBLIC_APP_URL` coerentes.
    - O MySQL é realocado com `MYSQL_HOST_PORT` e `MYSQL_PORT` atualizados juntos.
  - **Processos:** o `stop` encerra a **árvore** da aplicação. Causa raiz encontrada: o `next dev` faz `setsid`, então o grupo do PID registrado não contém o servidor. Só grupos formados exclusivamente pela aplicação recebem sinal; há SIGTERM com espera de 20 s, depois SIGKILL, e a confirmação da porta livre. Interopera com a aplicação iniciada pelo `run.sh`, descobrindo a porta pelos sockets da árvore.
  - **Logs:** `.logs/run-py-<data>-<comando>.log`, com cada comando, a saída integral, o exit code, a causa provável (13 padrões, incluindo os formatos do Next 16) e o caminho do log. Nenhum traceback no terminal, e subprocessos sem stdin herdado.
  - **`GET /api/health`:** prontidão sem segredos, com número de migrations aplicadas e 503 sem detalhes internos (testado). É usado na verificação ponta a ponta do `up` junto com `/`, `/login` e o login do admin.
  - **`mysql-upgrade.mjs`:** `--backup` avulso e restauração para volume removido, recriado pelo Compose com os rótulos do projeto.
  - **Documentação:** `docs/launchers.md` (contrato comum e matriz de paridade) e README.
- **Defeitos encontrados nos próprios testes e corrigidos antes do commit:**
  - `status` mostrava "MySQL ausente" com o Docker parado (agora: "não consultável" com a causa).
  - O padrão de erro de build não cobria o formato do Next 16.
  - O restore após purge criaria o volume sem os rótulos do Compose.
  - O menu tinha um traceback em EOF e subprocessos consumindo o stdin.
  - O `stop` dependia do grupo do PID registrado.
  - A porta da aplicação iniciada pelo `run.sh` não era descoberta.
- **Evidências (execução real; ambiente Linux Ubuntu 24.04, não WSL):**
  - **Bootstrap:** venv criado em 3,7 s; Rich só no venv (o Python do sistema continua sem ele).
  - **Fluxo principal:**
    - `doctor` com 14 verificações;
    - `up` de ponta a ponta em 25 s, com health, `/`, `/login` e login do admin;
    - segundo `up` idempotente (reutiliza o PID, sem processos duplicados);
    - `stop` com zero processos restantes e porta livre;
    - restart `up → stop → up`;
    - `up --prod` com build e `next start` em 81 s.
  - **Falhas controladas:**
    - Docker parado: diagnóstico e exit 1;
    - porta 3000 ocupada: app na 3001, ocupante intacto, URLs coerentes;
    - porta 3307 ocupada: MySQL na 3308 com `.env.local` coerente;
    - senha divergente e `.env.local` ausente: causa "senhas não correspondem ao volume";
    - `node_modules` ausente: reinstalação;
    - build com erro de tipo: arquivo, linha e causa;
    - migration inválida: falha sem registro nem tabela criada.
  - **Operações destrutivas:**
    - `purge` sem confirmação: exit 2, volume intacto;
    - `purge` confirmado seguido de restore: 27 tabelas idênticas (87 linhas);
    - `repair` sem `--sim` sem TTY: recusado;
    - `repair --sim`: container recriado e dados idênticos.
  - **Interface:** menu em TTY real via `script` (sessão completa e Ctrl+D com exit 0), modo texto e `logs --seguir` com Ctrl+C sem traceback.
  - **Qualidade:** `ruff` (E, F, W, B, UP, SIM, Pylint), `ruff format` e `mypy` sem achados. Prova de Morte de `break-system-packages`, `apt`, `rm -rf`, `fuser`, `docker run`, `Lyra123#` e `admin123`: nenhuma ocorrência executável.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0 e zero avisos.
- **Limite do ambiente:** o sandbox não é WSL2, então a detecção de WSL2/WSL1 foi implementada pelo `/proc/version`, mas validada aqui só no ramo "Linux nativo". O teste em WSL2 real deve ser feito pelo operador com `python3 run.py doctor`.

### 14 · Correção e modernização completa do run.sh

- **Status:** 🟢 finalizada · **Commit:** `0e07294` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Diagnóstico do `run.sh` anterior:**
  - `kill_port` encerrava qualquer processo na porta da aplicação, inclusive de terceiros (item 27).
  - O ramo `ss` coletava os PIDs de **todas** as portas em escuta, não só da porta pedida.
  - `app_stop` encerrava só o PID registrado; o servidor do `next dev` (sessão própria via `setsid`) ficava vivo.
  - Faltavam `up --prod`, `repair`, `purge` com backup e a verificação ponta a ponta; sem TTY, executava `up` em vez de mostrar a ajuda.
- **Implementado** (reescrita completa, mesmos comandos, contrato e códigos de saída do `run.py`):
  - **Comandos:** `up [--prod]`, `app [--prod]`, `db`, `migrate`, `doctor`, `fix`, `repair [--sim]`, `purge --confirmar-purge`, `status`, `logs [app|db] [--seguir]`, `stop [app|db]`, `help` e menu numerado. Argumentos inválidos dão exit 2; Ctrl+C dá exit 130.
  - **Plataforma:** Git Bash (MINGW/MSYS) com build do Windows via `cmd.exe /c ver` (Windows 11 = build ≥ 22000), Linux equivalente, Cygwin recusado e macOS com aviso; exige bash 4+.
  - **Portas:** dono por `docker ps`; no Windows, `netstat -ano` filtrando o endereço remoto `0.0.0.0:0` (independe do idioma) e `tasklist /V`; no Linux, `ss`/`lsof` com a linha de comando de `/proc`. Terceiros nunca são encerrados.
  - **Processos:** no Windows, `taskkill /PID <winpid> /T /F` só na árvore da aplicação (o PID Windows vem de `/proc/<pid>/winpid`); no Linux, SIGTERM na árvore capturada antes do sinal, SIGKILL após 20 s e confirmação da porta livre.
  - **Verificação ponta a ponta** compartilhada: novo `scripts/verificar-app.mjs <porta>` (`/api/health` com todas as migrations, `/` e `/login` com 200, login do admin).
  - **Logs:** `.logs/run-sh-<data>-<comando>.log` com comandos reais (não os nomes das funções auxiliares), saída integral, exit code e causa provável (13 padrões).
  - **Correções no `run.py` encontradas nos testes cruzados:** a origem da aplicação passou a vir do `app.json` (antes, uma app do `run.sh` aparecia como "iniciada pelo run.py"); padrão do Docker 29+ ("failed to connect to the docker API") para Docker indisponível, que não era reconhecido; parada do MySQL pelo nome do container quando falta o `.env.local`; `iniciado_em` com fuso nos dois launchers; `mypy --strict` e `ruff` (regras padrão do 0.16) sem achados.
  - **`mysql-migrate.mjs`:** o erro passa a citar a migration que falhou.
  - **Documentação:** `docs/launchers.md` (seção do `run.sh`, garantias por plataforma, interoperabilidade, validações e matriz de paridade completa) e README.
- **Defeitos encontrados nos próprios testes e corrigidos antes do commit:** variável inexistente na verificação do `.env.local`; colunas desalinhadas com acentos (o `printf` conta bytes); estado "exited unhealthy" para container parado; linha `=====` na ajuda; argumentos extras ignorados em silêncio; dono da porta sem a linha de comando quando só há `lsof`.
- **Evidências (execução real em Linux, bash 5.2):**
  - **Fluxo principal:** `doctor` (13 verificações, 1,1 s); `up` em 7 s com health, `/`, `/login` e login do admin; segundo `up` idempotente; `status`; `logs app`/`logs db`; `stop app` (5 processos encerrados, porta livre); `stop` (app + MySQL); restart com banco parado; `up --prod` com build e `next start` em 18 s; app em modo diferente já em execução (aviso, sem duplicar).
  - **Falhas controladas:** porta 3000 ocupada (app na 3001, URLs coerentes no processo, ocupante intacto); porta 3307 ocupada (MySQL na 3308, `.env.local` coerente e permissão 600, ocupante intacto); Docker indisponível (causa e exit 1); `.env.local` ausente; `node_modules` ausente (reinstalado); build com erro de tipo (arquivo, linha e causa); migration inválida (arquivo e erro do MySQL).
  - **Operações destrutivas:** `purge` sem confirmação (exit 2); `purge --confirmar-purge` com backup verificado e restauração com 27 tabelas e 87 linhas idênticas; `repair` sem `--sim` e sem TTY recusado (exit 1, igual ao `run.py`); `repair --sim` concluído em 13 s.
  - **Interface:** menu em pseudo-terminal (opção, opção inválida, EOF), Ctrl+C no menu, em `logs --seguir` e durante o `up` (exit 130; a aplicação continua registrada e o `stop` a encerra).
  - **Interoperabilidade:** app iniciada pelo `run.sh` vista e parada pelo `run.py` e vice-versa.
  - **Segredos:** nenhuma das quatro senhas do `.env.local` aparece nos logs.
  - **Qualidade:** `bash -n` e `shellcheck -S warning` sem achados; Prova de Morte de `kill_port`, `bar.state` e `app_stop`: nenhuma ocorrência. `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0.
- **Limite do ambiente:** o sandbox não tem Windows; os ramos exclusivos do Git Bash (`netstat`, `tasklist`, `taskkill`, `winpid`, `cmd.exe /c ver`) foram validados só estaticamente. O teste real deve ser feito pelo operador no Windows 11 com `./run.sh doctor`, `./run.sh up`, `./run.sh status` e `./run.sh stop`.

### 15 · Revisão do run_windows.py e eliminação de redundância

- **Status:** 🟢 finalizada · **Commit:** `d92005f` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Por que o arquivo existia:** criado (commit `71e04a0`) porque o `run.py` da época era só para WSL/Ubuntu; virou uma segunda implementação do launcher no Windows, paralela ao `run.sh`.
- **Divergências encontradas na versão anterior (661 linhas):**
  - recorria ao `npm` sem `pnpm` no PATH e instalava sem `--frozen-lockfile`, fora do Corepack;
  - `stop` com `Stop-Process` só no PID registrado (o servidor Next.js filho ficava vivo — mesma causa raiz corrigida no `run.py` e no `run.sh`);
  - apagava o `.next` a cada subida e reiniciava a aplicação mesmo saudável;
  - estado próprio em `.lyra-run-windows/`, invisível para os outros launchers;
  - sem identificação de donos de portas, MySQL "pronto" só pela porta TCP, prontidão HTTP aceitando qualquer status < 500 e `doctor` que só verificava o PATH.
- **Decisão (opção B, documentada em `docs/launchers.md`):** uma só implementação no Windows (`run.sh`) e o `run_windows.py` como wrapper fino. A opção A manteria duas implementações divergentes para o mesmo sistema; a C quebraria PowerShell/CMD e os documentos que citam `python run_windows.py`.
- **Implementado:**
  - Wrapper só com biblioteca padrão (Python 3.9+) que localiza o `bin\bash.exe` do Git for Windows (`LYRA_GIT_BASH`, `git.exe` do PATH, registro `GitForWindows`, pastas padrão), recusa o `bash.exe` do WSL e valida por `uname -s` (MINGW/MSYS), explicando cada recusa.
  - Delegação ao `run.sh` com `LANG=C.UTF-8` e código de saída repassado (130 no Ctrl+C).
  - Comandos antigos aceitos com aviso (`dev`, `prod`, `start-dev`, `start-prod`, `db-start`, `db-stop`, `stop-app`, `stop-all`, `setup-env`, `install-deps`, `health`); `build` recusado (exit 2) com orientação.
  - Aviso sobre estado legado em `.lyra-run-windows/` (mantido no `.gitignore`, agora comentado).
  - Manual completo (seções 10.5, 11, 25.2, 26 e 27), README e `docs/launchers.md` (decisão, funcionamento, tabela de aliases, validação e matriz de paridade) atualizados.
- **Evidências (execução real em Linux, via delegação ao `bash` do sistema):**
  - ajuda sem terminal e com `--help`; menu em pseudo-terminal com EOF;
  - comando desconhecido e argumento inválido (exit 2 vindo do `run.sh`); `build` recusado (exit 2);
  - alias `dev` com subida completa e verificação ponta a ponta; `health` (doctor saudável); `stop-all` (app e MySQL parados, nenhum processo restante);
  - `status` pelo wrapper e pelo `run.py` mostrando a mesma aplicação;
  - Ctrl+C em `logs --seguir` com exit 130;
  - descoberta do Git Bash com estrutura de pastas simulada: ordem dos candidatos para `cmd\git.exe` e `mingw64\bin\git.exe`, `uname` MINGW aceito e `bash.exe` da pasta do Windows recusado como WSL;
  - `ruff`, `ruff format`, `mypy --strict` (Linux e `--platform win32`) e sintaxe Python 3.9 sem achados;
  - Prova de Morte de `run_windows_`, `app.meta.json`, `install.hash`, `EnvManager` e `Stop-Process`: só restam menções históricas (`TASK_MESTRA_REDIGESIGN_LYRA_METACARE_2026.md`, revisada na tarefa 23) e a descrição da versão anterior em `docs/launchers.md`;
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0.
- **Limite do ambiente:** sem Windows no sandbox; a execução real de `py run_windows.py doctor` e `py run_windows.py up` no Windows 11 (PowerShell) fica para o operador, junto com o teste do `run.sh` no Git Bash.

### 16 · Migrations e banco

- **Status:** 🟢 finalizada · **Commit:** `f220da8` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Auditoria das 12 migrations (via `information_schema` do banco real):**
  - Ordenação determinística por código de caractere (os três arquivos `005_*` têm ordem estável); checksum SHA-256 com fins de linha normalizados e recusa de conteúdo divergente.
  - 27 tabelas InnoDB, todas `utf8mb4_unicode_ci`, nenhuma coluna com collation divergente; servidor com `sql_mode` estrito.
  - 22 FKs com regras coerentes (CASCADE para dados do usuário, SET NULL para autoria, RESTRICT para plano de assinatura); nenhuma coluna `*_id` interna sem FK (as restantes são IDs externos do Stripe); nenhum índice redundante.
  - **Inconsistências encontradas:** `user_assessments` e `user_streaks` (migração 008) com ids `VARCHAR(36)` (o resto do schema e a própria `profiles.id` usam `CHAR(36)`), `created_at`/`updated_at` `TIMESTAMP` anuláveis (as únicas 4 de 53 colunas temporais; as demais são `DATETIME NOT NULL`), contadores anuláveis e FKs com nome gerado.
  - **Fuso:** o servidor estava em `SYSTEM` (UTC só por acaso da imagem) e o mysql2 serializava parâmetros `Date` no fuso local do Node.js, divergindo de `NOW()` numa máquina em -03:00.
  - **Bootstrap admin:** cada `db:migrate` regravava o hash da senha (bcrypt com sal novo), alterando a linha a cada subida.
- **Implementado:**
  - **Migração `011_normalize_assessments_streaks.sql`:** tipos alinhados, nulos tratados antes do `NOT NULL` e FKs `fk_user_assessments_profile`/`fk_user_streaks_profile`. Idempotente via `information_schema` + `PREPARE`, porque DDL faz commit implícito.
  - **UTC explícito:** `--default-time-zone=+00:00` no `compose.yaml` e `timezone: 'Z'` no pool da aplicação e no das migrations.
  - **Bootstrap idempotente:** `bcrypt.compare` antes de regravar; o e-mail só é normalizado se diferir.
  - **`pnpm db:backup` e `pnpm db:restore <volume>`**, e a seção "Banco de dados: migrations, fuso e backup" no README.
- **Evidências (execução real):**
  - **Banco existente → upgrade:** backup a frio verificado, aplicação da 011 e contagem de linhas idêntica nas 27 tabelas (só `_lyra_schema_migrations` +1). Colunas e FKs conferidas no `information_schema`; `@@global.time_zone = +00:00` e `NOW() = UTC_TIMESTAMP()`.
  - **Reexecução manual da 011:** exit 0, sem alterações.
  - **Bootstrap:** segunda execução com `updated_at` e hash idênticos; com outra senha imprime "Senha do bootstrap admin atualizada" e volta ao valor do `.env.local` na execução seguinte.
  - **Banco vazio → migrations → aplicação:** MySQL 9.7.2 temporário em volume próprio; 13 migrations aplicadas e segunda execução com 13 "Já aplicada"; `mysqldump --no-data` idêntico ao do banco atualizado (558 linhas; só o GTID difere). `next start` contra ele com `/api/health` = 13 migrations, `/`, `/login` e login do admin; avaliação WHO-5 (score 72) e streak gravados com `created_at` em UTC. Container e volume temporários removidos.
  - **Restore real:** restauração do backup pré-011 (12 migrations, `TIMESTAMP`) seguida de `./run.sh migrate` (011 reaplicada) com dados idênticos ao estado pós-011.
  - **Qualidade:** `docker compose config` válido; `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0 e zero avisos; `./run.sh up` com verificação ponta a ponta.
- **Observação registrada:** o `initial-data` do Puck (`src/lib/puck/config/initial-data.ts`) ainda usa o formato legado `zones`, convertido em tempo de execução pelo `migrate()` oficial (tarefa 25). Não é dado de banco; fica como débito de código para a tarefa 20.

### 17 · Testes automatizados

- **Status:** 🟢 finalizada · **Commit:** `a3bfb5b` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Diagnóstico:** 127 testes unitários, sem nenhum teste contra banco real; cobertura de linhas 8,6% (data-api, planos, billing, migrations, motores de IA e de saúde com 0%).
- **Infraestrutura:**
  - Vitest com projetos `unit` (`pnpm test`) e `integration` (`pnpm test:integration`). O setup global cria `<MYSQL_DATABASE>_test` com o root do `.env.local`, aplica as migrations reais e remove o banco ao final; o banco de desenvolvimento e o `process.env` do processo principal não são alterados.
  - `pnpm test:coverage` com `@vitest/coverage-v8` 5.0.3 (par exato do Vitest 5.0.3); `pnpm test:launchers` com `unittest` do Python.
  - `closeMysqlPool()`; regras puras do runner isoladas em `scripts/lib/migrations.mjs`.
- **Defeitos encontrados pelos testes e corrigidos** (prova: 11 testes de data-api e o de assinaturas simultâneas falham no código anterior):
  - **data-api (autorização):** autopromoção a admin via `profiles.role`; troca do e-mail do perfil; upsert com id de outro usuário sobrescrevia a linha dele (inclusive perfis); UPDATE transferia a linha para outro usuário; UPDATE/DELETE sem filtro atingiam todas as linhas; filtros desconhecidos, OR malformado e `not` inválido ignorados em silêncio; objetos como valor viravam `coluna` = valor no SQL; LIMIT/OFFSET sem validação; ações do admin sobre perfis de outros usuários sem efeito; admin podia remover a própria conta. `stringifyObjects` no mysql2 como defesa em profundidade.
  - **Planos:** chamadas simultâneas criavam duas assinaturas ativas; o consumo de cota abria outra conexão dentro da transação e travava o pool (20 consumos simultâneos ficavam presos). Bloqueio por usuário (`users ... FOR UPDATE`) e reuso da conexão.
  - **Motor de score:** métrica ausente contava como 0 (pior nota) em vez de neutra; prontidão com pesos somando 1,1; pesos de configuração agora são proporções; nulos contavam como preenchidos na completude.
  - **WHO-5 e NPS** validam a escala; **doshas** somam exatamente 100% (maior resto); **chat local** reconhece "olá" (limites de palavra Unicode).
  - **Bootstrap admin:** e-mail e senha vazios desativam o bootstrap (o nome padrão tornava esse caminho inalcançável).
- **Testes adicionados:**
  - **Integração (36, MySQL real):** data-api (leitura, escopo, filtros, paginação, escrita, autorização, tipos JSON/booleano/data); planos (assinatura, troca pelo admin, matriz, recursos, cotas e concorrência); webhook Stripe com assinatura HMAC gerada e verificada localmente pela SDK (sem assinatura, forjada, corpo adulterado, ativação, reentrega idempotente, cancelamento → plano gratuito, price id desconhecido registrado como erro). O `checkout.session.completed` consulta a API da Stripe e exige credencial real: fronteira externa, não testada.
  - **Unitários (64 novos):** WHO-5, NPS, aderência, score de longevidade, plano local, contexto astrológico (Lahiri, Lua Cheia e Nova de 2026, sankrantis), motores integrativos (propriedades de escala, nível e resposta a dados), chat local, migração de documentos Puck, senhas bcrypt e regras do runner de migrations.
  - **Launchers (17):** diagnóstico, URLs, versões, `.env.local` com 0600, portas ocupadas, árvore de processos com `setsid`, parser e códigos de saída do `run.py`; tradução de comandos legados, descoberta do Git Bash e delegação do `run_windows.py`.
- **Evidências:** `pnpm test` 191/191; `pnpm test:integration` 36/36; `pnpm test:launchers` 17/17; cobertura combinada de linhas 8,6% → 25,8% (data-api 77,8%, planos 71,9%, motores 91–100%; o restante é UI, coberto pelo QA de navegador nas tarefas 21 e 22). `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos; `./run.sh up` com verificação ponta a ponta; banco de teste removido e banco de desenvolvimento com contagens idênticas.
- **Pendências registradas para tarefas seguintes:** validação Zod nas rotas (JSON inválido em `filters` ainda vira 500) na tarefa 18; sanitizador de rich text do servidor na tarefa 19.

### 18 · APIs e CRUD

- **Status:** 🟢 finalizada · **Commit:** `f8e3460` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Mapa:** as 32 Route Handlers documentadas em `docs/api.md` (método, rota, autenticação, autorização, entrada, saída, erros e tabelas).
- **Contrato comum:** `src/lib/http/api.ts` (`lerJson`, `respostaDeErro`): JSON malformado e campos inválidos → 400 com os campos; `HttpError` com status próprio; chave duplicada do MySQL → 409; erro de dados → 400; qualquer outra falha → 500 genérico, com o detalhe só no log do servidor (antes, SQL e caminhos internos vazavam na resposta).
- **Defeitos encontrados e corrigidos** (prova: 19 testes de rota falham no código anterior):
  - **Travessia de diretório no storage:** `GET /api/storage/avatars/..%2F..%2F.env.local` devolvia o `.env.local` sem autenticação (reproduzido com curl). Agora `src/lib/storage/local.ts` aceita só buckets conhecidos, segmentos simples e caminho resolvido dentro do bucket → 404.
  - **Upload:** aceitava qualquer conteúdo (SVG/HTML servidos como página) e qualquer caminho. Agora só PNG/JPEG/WebP/GIF identificados pelos bytes, até 5 MB, com o caminho iniciando pelo id do dono; resposta com `nosniff` e CSP `sandbox`.
  - **Login:** mensagens distintas permitiam enumerar e-mails; agora 401 único e bcrypt de custo constante para e-mail inexistente.
  - **Cadastro:** corrida no primeiro usuário e duplicado virando 500; agora transação com bloqueio e 409.
  - **IA:** chave do Gemini ia na URL (vazava em logs); agora no cabeçalho `x-goog-api-key`, com timeout de 20 s e cota consumida antes da chamada externa.
  - **Validação:** todas as rotas com Zod (UUID, cores hexadecimais, ISO 4217, faixas plausíveis de métricas, datas 1800–2200, tipos de atividade); chaves Puck/página inválidas → 404; webhook com assinatura inválida → 400 e falha interna → 5xx (a Stripe reenvia).
  - **Admin:** troca de plano bloqueia a linha do usuário e responde 404 para usuário inexistente.
- **Testes:** `src/app/api/{auth-storage,dados-admin,funcoes}.integration.test.ts` (29 testes) chamam as Route Handlers reais contra o MySQL de teste, cobrindo sucesso, validação, não autenticado, sem permissão, inexistente e payload inválido, com o CRUD confirmado direto no banco.
- **Evidências:** `pnpm test` 191/191; `pnpm test:integration` 65/65; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos. Smoke HTTP no servidor real: login admin 200, upload PNG 200 servido como `image/png` com `nosniff`, login errado 401, travessia 404 e filtros malformados 400.
- **Encaminhado:** `ui-config` sem chamador no cliente (tarefa 20).

### 19 · Segurança

- **Status:** 🟢 finalizada · **Commit:** `2b6b73a` · **Push:** `beed629..2b6b73a main -> main` (confirmado)
- **Documentação:** novo `docs/seguranca.md` com o modelo completo (sessão, rate limiting, CSRF, cabeçalhos, XSS, upload, dados de saúde, Sentry, Stripe e dependências); `docs/api.md` e `.env.example` atualizados.
- **Vulnerabilidades encontradas e corrigidas:**
  - **XSS no SSR do rich text do Puck:** o sanitizador do servidor usava regex e `<a href='x" onmouseover="alert(1)'>` virava atributo de evento; `java&#115;cript:` também passava. Substituído pelo parse5 8.0.1 (parser HTML5 WHATWG) com reconstrução por lista de permissões e escape; a mesma função roda no servidor e no navegador (antes DOMParser × regex, com risco de divergência na hidratação). 6 dos 10 testes novos falham no código anterior.
  - **JWT exposto ao JavaScript:** `/api/auth/session`, login e cadastro devolviam o `access_token`, anulando o `httpOnly`. Removido do tipo `AppSession` (prova de morte: `grep access_token` sem ocorrências no código).
  - **Papel desatualizado na sessão:** o papel vinha do JWT (até 7 dias); agora papel e e-mail vêm do banco a cada requisição e conta removida perde a sessão. Os 2 testes falham no `server-auth.ts` anterior.
  - **Sem limite de tentativas:** novo `src/lib/security/rate-limit.ts` com janela fixa no MySQL (migration `012_add_rate_limit_buckets.sql`, chaves SHA-256, upsert e leitura na mesma transação). Login: 10 falhas por conta (não depende de IP) e 50 tentativas por IP em 15 min; cadastro: 10 por hora por IP; 429 com `Retry-After`.
  - **CSRF:** `src/proxy.ts` (convenção do Next.js 16) recusa escrita em `/api/*` com `Sec-Fetch-Site` cross-site/same-site ou `Origin` de outra origem; webhook da Stripe isento (assinatura própria).
  - **Cabeçalhos ausentes:** CSP (`frame-ancestors`, `object-src`, `base-uri`, `form-action`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS em produção e `X-Powered-By` desligado. Encontrado no smoke: a CSP global substituía a CSP `sandbox` de `/api/storage`; o caminho foi excluído da regra global e a CSP da rota voltou a valer.
  - **Dados de saúde em logs:** o log de erro gravava o objeto do mysql2 com o SQL interpolado; `src/lib/observability/log-seguro.ts` registra só tipo, código e pilha.
  - **Stripe:** URLs de retorno não usam mais o `Host` da requisição em produção.
  - **Dependências:** `pnpm update --depth Infinity --no-save` e `overrides` restritos às faixas afetadas (brace-expansion, fast-uri, browserslist, baseline-browser-mapping, source-map-js): `pnpm audit` de 75 avisos (1 crítico, 31 altos) para 1; `pnpm audit --prod` sem vulnerabilidades. O restante, `braces` (GHSA-vfj7-8cjw-p6xm), não tem versão corrigida publicada e só chega por ferramentas de desenvolvimento.
  - **Texto do BYOK:** dizia "On-Device" e "fica apenas no seu navegador", mas a chave vai ao servidor a cada pergunta; corrigido, com placeholder de chave do Gemini.
  - **README:** a tabela de scripts tinha sido partida em duas na tarefa 18; reunificada.
- **Auditado sem alteração:** cookies (`httpOnly`, `SameSite=Lax`, `Secure` em produção), Sentry (opcional sem DSN, `dataCollection` sem PII, Replay mascarado), webhook da Stripe (assinatura e idempotência já cobertas na tarefa 17), SQL injection (consultas parametrizadas e identificadores validados na data-api), SSRF (somente URL fixa do Gemini) e open redirect (nenhum redirecionamento com destino vindo do cliente).
- **Testes:** `src/lib/puck/sanitization/rich-text.test.ts` (10), `src/lib/security/csrf.test.ts` (5), `src/lib/observability/log-seguro.test.ts` (3), teste de produção em `src/lib/billing/config.test.ts` e `src/app/api/seguranca.integration.test.ts` (8: bloqueio por conta com `Retry-After`, zeragem após acerto, limite por IP, limite de cadastro, 25 registros simultâneos sem perda, sessão sem JWT, admin rebaixado e conta removida).
- **Evidências:** `pnpm test` 210/210; `pnpm test:integration` 73/73; `pnpm test:launchers` 17/17; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos (`ƒ Proxy (Middleware)` registrado). Smoke real: cabeçalhos em `/login`, HSTS no `pnpm start`, POST cross-site 403 e same-origin 200, 10 logins errados → 401 e o 11º → 429 com `Retry-After: 897`, `/api/storage` com `default-src 'none'; sandbox`, editor Puck sem erros de console, `./run.sh up` com 14 migrations e login do admin.
- **Encaminhado:** `maximumScale: 1` do viewport (acessibilidade) para a tarefa 22.

### 20 · Performance

- **Status:** 🟢 finalizada · **Commit:** `616aa53` · **Push:** `c5125ec..616aa53 main -> main` (confirmado)
- **Método:** `pnpm build` + `pnpm start`, Chromium (Playwright) em contexto limpo e sem cache, somando os scripts transferidos (comprimidos); análise dos pacotes com `next experimental-analyze` e assinaturas dos chunks. Documento: `docs/performance.md`.
- **Gargalos encontrados e corrigidos:**
  - **Puck em todas as páginas (~307 KB):** cada página importava o runtime do Puck para renderizar o documento publicado da rota, mesmo vazio. O `PuckClientRenderer` agora só carrega o novo `PuckDocumentView` (via `next/dynamic`) quando há blocos (`src/lib/puck/conteudo.ts`). Defeito visual encontrado junto: com o documento vazio, o root exibia ao usuário final um cabeçalho técnico ("root app shell", "chave: patient-portal", "fonte: manual"); capturas antes e depois em `/goals`. Com um bloco publicado de teste o bloco aparece sem erros de console; o documento foi restaurado em seguida (conteúdo idêntico ao original).
  - **Sentry sem DSN (~157 KB):** o SDK e o Replay eram baixados mesmo sem `NEXT_PUBLIC_SENTRY_DSN`. `instrumentation-client.ts` e `global-error.tsx` passaram a importar o SDK dinamicamente, só com DSN.
  - **Zod nas páginas públicas (~90 KB):** o cliente revalidava a configuração que o servidor já entrega validada, e os padrões dividiam módulo com os schemas. Padrões movidos para `modules/lyra-customaze-ui-ux/src/site-page-config/defaults.ts` (comparados com os anteriores, idênticos nas três páginas); importações só de tipo marcadas com `import type`.
  - **Landing e dashboard juntos em `/`:** os dois são carregados conforme a sessão (`next/dynamic`); o visitante não baixa o dashboard nem o Recharts.
  - **Requisições duplicadas:** `src/lib/http/requisicao-compartilhada.ts` (chamadas simultâneas com a mesma chave reaproveitam a que está em andamento, sem cache além do voo) aplicado à configuração das páginas e aos recursos da conta; `/api/public/page-config/app` caiu de 4 para 1 chamada por página e `/chat` de 12 para 8 chamadas de API.
  - **Código e assets mortos (provas de morte com `grep`):** rotas `/api/admin/ui-config` e `/api/public/ui-config` sem chamador desde o commit `6774c18` (março de 2026; a tabela `ui_config` foi mantida para não descartar dados); 5 SVGs do create-next-app; protótipo `lyra-ui-preview.html` (carregava Tailwind e `lucide@latest` de CDN na origem da aplicação) e `mockup.png` (636 KB) movidos de `public/` para `docs/design/`; 7 classes de componente e 2 utilities do `globals.css` sem uso; `getHttpErrorStatus` duplicado do `statusDeErro` (testes migrados para `src/lib/http/api.test.ts`).
  - **Documentos iniciais do Puck:** reescritos em slots nativos; um teste temporário provou que a migração dos documentos antigos produz exatamente os novos nos 22 documentos, e os testes de migração passaram a gerar o formato legado a partir dos nativos.
- **Resultado (JS da página):** `/` visitante 817 → 235 KB; `/login` 382 → 189 KB; `/chat` 991 → 255 KB; `/plan` 1000 → 241 KB; `/goals` 1000 → 350 KB; `/profile` 991 → 517 KB; `/appointments` 1043 → 394 KB; `/admin/dashboard` 999 → 243 KB; `/admin/puck` 1132 → 590 KB. O prefetch das rotas do menu (padrão do `<Link>`) continua após o carregamento.
- **Verificado sem alteração:** fontes (`next/font` já serve da própria origem, subset latin), índices das consultas por usuário e pool único de conexões.
- **Evidências:** `pnpm test` 241/241; `pnpm test:integration` 73/73; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos; console sem erros em `/`, `/login`, `/goals`, `/chat`, `/profile` e `/admin/puck` (modo dev); `./run.sh up` com verificação ponta a ponta.
- **Investigado e registrado (aviso de terceiro):** em `/appointments` (modo dev) o React avisa "outdated JSX transform". Causa: `uncontrollable` 7.2.1, dependência do `react-big-calendar` 1.20.0 (última versão, que exige `^7.2.1`), publicado com o transform clássico (`__self`). O aviso só existe em desenvolvimento e vem de pacote de terceiro; não há versão compatível que o elimine.

### 21 · QA funcional com navegador

- **Status:** 🟢 finalizada · **Commit:** `ce81722` · **Push:** `e2dbaaa..ce81722 main -> main` (confirmado)
- **Ambiente:** `pnpm build` + `pnpm start` (porta 3100) com MySQL 9.7.2; Chromium via Playwright, 1440×900.
- **Health check real:** processo `next-server` ativo, porta respondendo, `/api/health` com `status: ok`, `database: ok` e 14 migrations (sem segredos na resposta), página principal renderizada e login funcional.
- **Navegação:** 4 rotas como visitante (`/goals` e `/admin/dashboard` redirecionam para `/login`) e 21 como administrador, todas sem erro de console, sem resposta 4xx/5xx e com capturas.
- **Fluxos percorridos clicando na interface (todos aprovados):**
  - **Visitante:** botão para a seção de planos e CTA para o login.
  - **Cadastro e onboarding:** cadastro pela tela de login, depois onboarding em 5 passos (data por digitação, select de gênero, slider de atividade, checkbox de meta, consentimento) e dashboard. O MySQL confirmou o perfil completo (UTF-8 correto em "São Paulo"), o plano `free` e a assinatura ativa.
  - **Login e navegação do administrador:**
    - Login com "Lembrar-me": cookie `httpOnly` de 7 dias.
    - Cartão de harmonia com valor calculado.
    - Busca global (Ctrl K) até Metas.
  - **Metas:** criação e atualização de progresso no modal.
  - **Agenda:** novo profissional e consulta agendada (select, data e horário).
  - **Chat:** envio de mensagem com resposta 200.
  - **Plano de IA:** geração do plano.
  - **Perfil:** "Perfil atualizado com sucesso!".
  - **Dispositivos:** estado sem Bluetooth explicado.
  - **Monitoramento:** controles presentes.
  - **Sair:** menu do usuário e "Sair" removem o cookie, e as rotas protegidas voltam ao login.
  - **Área administrativa:**
    - Usuários: busca, ordenação, paginação e troca de plano no modal (PATCH 200 e evento de auditoria).
    - Matriz de planos salva.
    - Insight de IA e hábito sugerido criados nas abas de Conteúdo.
    - Configuração de IA salva e "Escanear Rede".
    - Exportação CSV de usuários baixada.
    - Saúde dos dados.
    - Construtor de UI e editor Puck: "Salvar rascunho".
  - Cada gravação foi confirmada direto no MySQL (metas, consulta, profissional, insight, hábito, assinatura e perfil).
- **Defeitos encontrados e corrigidos:**
  - **Valor fixo no dashboard:** "Harmonia atual" mostrava 94.2 para qualquer pessoa. O novo `HarmoniaAtualCard` exibe o ICQ real do `coherence-engine` (63/100 na sessão testada), com estados de carregamento e de plano sem acesso. A nota padrão deixou de afirmar "recuperação alta" sem dados. Prova de morte: `grep 94.2` só encontra o comentário histórico.
  - **Estouro horizontal:** em 11 páginas a coluna principal (`flex-1` sem `min-w-0`) crescia até a largura do conteúdo. Em `/admin/content` isso cortava a aba "Insights de IA", a prévia e o cabeçalho (capturas antes e depois). Causa encontrada medindo o elemento raiz do estouro; corrigida com `min-w-0`, como já fazia o `AppShell`.
- **Limpeza:** os dados de QA (contas `qa-*`, metas, profissionais, consulta, insight, hábito, rascunho de página, janelas de rate limit e local de nascimento do admin) foram removidos do banco de desenvolvimento ao final.
- **Evidências:** `pnpm test` 241/241; `pnpm test:integration` 73/73; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos.
- **Encaminhado:**
  - **Tarefa 22 (acessibilidade):** botões só com ícone sem nome acessível; duas `<h1>` por página; `/instruments` sem `<h1>`; navegação da landing feita com botões.
  - **Tarefa 27 (redesign):**
    - "Atualizado por" no construtor de UI mostra o UUID do administrador.
    - Muitas páginas repetem a estrutura de Sidebar e Header em vez de usar o `AppShell`.
  - **Para decisão do usuário:** `/instruments` é uma página de demonstração herdada do template (lista a tabela `instruments` em JSON). Está ligada ao documento Puck `instruments`, então não foi removida.

### 22 · QA responsivo e acessibilidade

- **Status:** 🟢 finalizada · **Commit:** `3a4b137` · **Push:** `8ea5ba2..3a4b137 main -> main` (confirmado)
- **Método:** axe-core 4 (WCAG 2.0/2.1/2.2 A e AA e boas práticas) no build de produção, com Playwright/Chromium em 1440px e 390px. Foram auditadas 2 rotas como visitante e 19 como administrador. Detalhes em `docs/acessibilidade.md`.
- **Corrigido:**
  - **Zoom:** removido `maximumScale: 1` do viewport, que bloqueava o zoom no celular.
  - **Títulos:**
    - O título do cabeçalho é o único `<h1>`; os títulos de conteúdo de 11 páginas viraram `<h2>`.
    - `h3`/`h4`/`h5` que pulavam níveis foram corrigidos (dashboard, chat, planos, relatórios).
    - `AlertTitle` deixou de ser `<h5>`.
    - `/instruments` ganhou `<main>` e `<h1>`.
  - **"Pular para o conteúdo":** `#conteudo-principal` em todas as páginas.
  - **Nomes acessíveis:**
    - Campos do construtor de UI viraram `<label>`.
    - Switches, sliders (nome repassado ao thumb), botões de ícone (mover, remover, ações de usuário, hábitos e dicas) e as 9 barras de progresso (`aria-label` agora obrigatório na tipagem) ganharam nome.
    - `Progress` passou a expor `aria-valuenow`.
    - Menu do usuário, logo da landing e busca Ctrl K agora têm o nome acessível igual ao texto visível.
  - **Teclado:**
    - Regiões roláveis ficaram focáveis (`Table.scrollLabel`, `ScrollArea.viewportLabel`).
    - Causa raiz do painel da prévia do construtor: a coluna tinha altura fixa e o conteúdo, de 900px mais o cabeçalho, transbordava. A coluna passou a usar flex.
  - **Prévias visuais:** o construtor e as duas prévias do Puck repetiam títulos, regiões e botões da página. Agora usam `inert` + `aria-hidden`.
  - **Agenda no celular:** o calendário tinha 300px de altura e as semanas ficavam com 20px, com os números dos dias cobertos pelo cabeçalho. Passou para 520px no celular e 640px a partir de `md`, com alvo de toque de 24×24px.
  - **Rodapé "feito com":** virou `<footer>`.
- **Testes:** dois testes deixavam de ser herméticos quando o `.env.local` estava carregado:
  - `billing/config.test.ts` só limpava o ambiente depois de cada teste; agora limpa antes também.
  - O teste do webhook Stripe usava `??=` com a chave presente, mas vazia; agora usa `||=` e restaura o valor original.
- **Resultado axe:** zero violações em todas as rotas, exceto:
  - `color-contrast` (cores de estado `warning`, `cosmic` e `info`), que é resolvido pelos novos tokens da tarefa 27;
  - 3 itens internos do `@puckeditor/core` 0.23.0, sem API para ajuste e só na tela de administrador: `frame-title` do iframe, `select-name` do zoom e `aria-prohibited-attr` do loader.
- **Evidências:** `pnpm test` 241/241 (com e sem `.env.local`); `pnpm test:integration` 73/73 (com e sem `.env.local`); `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0.

### 23 · Documentação final e validação integral

- **Status:** 🟢 finalizada · **Commit:** `a4ee832` · **Push:** `a5a18ad..a4ee832 main -> main` (confirmado)
- **Documentação:**
  - `README.md`: contagem real de testes (241 unitários e 73 de integração), portões completos (`test:integration` e `build`), segurança atual, links para `docs/acessibilidade.md` e `docs/design-system.md`, e contribuição direto na `main`.
  - `AGENTS.md`: sistema visual vigente e `test:integration` nos portões obrigatórios.
  - Novo `docs/design-system.md` (tokens, forma, tipografia e estrutura das telas do "Lyra Clean").
  - Removido `docs/REDESIGN_PROMPT_2026.md`, que descrevia o visual anterior (vidro, orbes, gradientes) e contradizia o sistema aprovado. Prova de morte: `grep -rn REDESIGN_PROMPT` sem ocorrências.
  - `.env.example`, `docs/launchers.md`, `docs/api.md`, `docs/seguranca.md` e `docs/performance.md` conferidos: sem versões antigas (Next 15, Tailwind 3, MySQL 8.0 como alvo, `mysql_native_password`, Node 20/22).
- **Instalação limpa:** `rm -rf node_modules .next` seguido de `pnpm install --frozen-lockfile` (pnpm 11.28.4 via Corepack, 13 s, sem avisos de peer ou deprecação).
- **Validação final:**
  - `check:lint`, `check:format` e `check:types` com exit 0.
  - `test` 241/241; `test:integration` 73/73; `test:launchers` 17/17.
  - `build` com exit 0 e zero avisos.
  - `pnpm audit --prod`: "No known vulnerabilities found".
  - Varredura de segredos no repositório e no histórico (tokens do GitHub, chaves Stripe live, AWS, chaves privadas): nenhuma ocorrência. `.env.local` e `.logs/` fora do versionamento.
- **Launchers:**
  - `python3 run.py`: `doctor` (14 verificações ok), `up --prod` (build, MySQL saudável, 14 migrations, `/api/health`, `/`, `/login` e login do admin), `status`, segundo `up` reaproveitando a aplicação em execução (sem processo duplicado) e `stop`.
  - `./run.sh`: `bash -n` e `shellcheck -S warning` limpos; `doctor`, `up --prod` com banco já existente (restart), `status`, `logs` e `stop`.
  - Depois do `stop`: porta 3000 sem resposta, 3307 fechada e nenhum processo `next` restante.
- **Limite do ambiente (registrado desde as tarefas 14 e 15):** o sandbox não tem Windows. O `run.sh` foi executado de verdade no bash do Linux, e os ramos exclusivos do Git Bash e o `run_windows.py` foram cobertos por testes e por validação estática. O teste no Windows 11 real (`./run.sh doctor/up/status/stop` no Git Bash e `py run_windows.py up` no PowerShell) fica para o operador.

### 24 · Correção crítica: vazamento de conexões MySQL em produção

- **Status:** 🟢 finalizada · **Commit:** `991961b` · **Push:** `faa4c1b..991961b main -> main` (confirmado)
- **Origem:** tarefa criada durante o QA visual de baseline da tarefa 09. Com `pnpm start`, a navegação por 12 páginas autenticadas gerou 115 erros de console e respostas 500 com `Too many connections`.
- **Causa raiz:** `src/lib/mysql/pool.ts` só reaproveitava o pool fora de produção. Em `next start`, cada consulta criava um pool novo (até 20 conexões e 10 ociosas com keep-alive) que nunca era fechado, esgotando o `max_connections` do MySQL. `src/lib/billing/stripe.ts` repetia o padrão e criava um cliente Stripe, com agente HTTP próprio, a cada uso.
- **Implementado:**
  - Pool único por processo em qualquer ambiente, guardado em `globalThis` com tipo próprio.
  - Mesmo tratamento para o cliente Stripe.
  - Novo `src/lib/mysql/pool.test.ts` com 3 testes: pool único em produção, pool único em desenvolvimento e mensagem clara quando falta variável obrigatória. O teste de produção falha contra o código anterior.
- **Evidências:**
  - `SHOW STATUS LIKE 'Threads_connected'` caiu de 90 para 7 após a mesma navegação.
  - Erros de console caíram de 115 para 0.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 87/87; `build` com exit 0.

### 25 · Correção crítica: editor Puck quebra ao abrir

- **Status:** 🟢 finalizada · **Commit:** `2fe2d05` · **Push:** `e491a10..2fe2d05 main -> main` (confirmado)
- **Origem:** encontrada no QA da tarefa 09. `/admin/puck` caía na tela de erro global com React #185. O mesmo erro ocorre no commit `7cbf0f3`, anterior à migração do Tailwind, o que comprova que o defeito é pré-existente.
- **Diagnóstico (modo dev, mensagem completa):** "Maximum update depth exceeded" no `refSetter` do `DraggableComponent` do Puck durante desmontagens sucessivas, acompanhado do aviso "DropZones have been deprecated in favor of slot fields".
- **Causa raiz:** os componentes de layout (`section-container`, `stack-container`, `fixed-columns`, `fluid-grid`) declaram `content` e as colunas como `type: 'slot'`, mas os documentos guardavam os filhos no formato legado `zones` (`"<id>:content"`). O Puck tratava a mesma área como DropZone e como slot e entrava em laço de montagem e desmontagem.
- **Implementado:**
  - `aplicarResolveAllDataLyra` aplica a migração oficial `migrate(data, config)` do Puck 0.23 antes do `resolveAllData`. O caminho é usado pelo editor, pelos previews e pelo renderizador público, e cobre também documentos legados já persistidos em outros ambientes.
  - Defeito encadeado corrigido: `normalizarDadosPuck` copiava as `zones` do documento de fallback quando o documento lido não as tinha. Isso misturava blocos de outro documento e reintroduzia DropZones logo após a migração.
  - Novo `src/lib/puck/dynamic/resolve-data.test.ts` com 25 testes: cada um dos documentos fica sem zonas e preserva a contagem total de blocos; os filhos vão para o slot correto e na mesma ordem; a migração é idempotente; e há um teste de regressão da normalização, que falha contra o código anterior (comprovado com `git stash`).
- **Evidências:**
  - Editor em dev e em produção com zero erros, zero avisos de DropZone e canvas (iframe) renderizando os blocos aninhados (`lyra-heading-block-editorial`, `lyra-fixed-columns-landing`).
  - Painel do slot visível no editor (`isEditing`).
  - CRUD real: "Salvar rascunho" exibe "Rascunho do Puck salvo com sucesso." e o MySQL registra `landing-home` com 0 zonas e 6 filhos no slot `content`.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos; capturas das 14 páginas sem erros de console.
- **Encaminhado:** o mesmo QA revelou que o `agenda.css` da tarefa 09 era pré-carregado em todas as páginas pelo prefetch de `/appointments`; isso é tratado na tarefa 26. Os dados iniciais em `initial-data.ts` continuam no formato legado e são convertidos na carga pela migração oficial; a reescrita para slots nativos fica para a tarefa 16 (migrations e dados).

### 26 · Correção: CSS da agenda pré-carregado em todas as páginas

- **Status:** 🟢 finalizada · **Commit:** `de0308a` · **Push:** `2ec8679..de0308a main -> main` (confirmado)
- **Origem:** regressão da tarefa 09, encontrada no QA da tarefa 25. Chrome registrava "preloaded using link preload but not used" em `/`, `/goals`, `/profile` e demais páginas autenticadas.
- **Causa raiz:** o `agenda.css`, criado na tarefa 09, era importado estaticamente pela rota `/appointments`. O prefetch dessa rota pelos links da navegação baixava e pré-carregava o CSS em todas as páginas, sem usá-lo.
- **Implementado:** o componente `Agenda` (react-big-calendar + `agenda.css`) passou a ser carregado com `next/dynamic` (`ssr: false`), com skeleton da mesma altura para não deslocar o layout. O tipo genérico é preservado pela expressão de instanciação `Agenda<Appointment>`, sem casts. O JS e o CSS do calendário agora só são baixados quando o calendário é exibido.
- **Evidências:**
  - Zero avisos ou erros de console em `/`, `/goals`, `/profile`, `/chat`, `/admin/dashboard` e `/admin/puck`.
  - O chunk com `.rbc-btn` é requisitado somente em `/appointments`, onde o calendário renderiza com 35 células, em pt-BR e com as personalizações Lyra aplicadas (raio de 24 px, botão ativo com gradiente).
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos.

### 27 · Simplificação visual premium ("Lyra Clean")

- **Status:** 🟢 finalizada · **Commit:** `551b2ef` · **Push:** `86a6b25..551b2ef main -> main` (confirmado)
- **Origem:** pedido do usuário em 2026-10-09 (layout mais simples e moderno, premium, sem perder funções). A proposta foi publicada como artefato de design e aprovada ("Aprovado design").
- **Implementado:**
  - **Tokens (`globals.css`):**
    - Fundo #F7F7F9, cartões brancos com borda #E6E6EC, teal #187268 para ações, violeta #6A4BD6 só para conteúdo astral e de IA.
    - Estados recalculados para passar de 4,5:1 sobre branco e sobre o próprio tom claro.
    - Novos tokens `--control` (3,3:1), `--cosmic-strong`, `--primary-hover`, `--accent-hover`, `--destructive-hover` e `--destructive-light` (antes sem utilitário).
    - Raios de 10 a 20 px.
    - Removidos (prova de morte por grep): gradientes, sombras coloridas, as classes `glass`, `glass-card`, `surface-panel`, `surface-soft`, `orchestrated-orb`, `aurora-border`, `text-gradient-*`, `interactive-lift`, `eyebrow`, `page-title` e `soft-divider`, sete animações decorativas e as funções de tom com gradiente do módulo `lyra-customaze-ui-ux`.
  - **Primitivos shadcn:** botão, card, badge, inputs, select, abas, dialog (com rolagem no celular), sheet, menus, popover, progress (tom `astral`), switch, checkbox, skeleton, avatar, tabela, acordeão, alerta, calendário, toggle, command e sonner.
  - **Layout:**
    - `AppShell` em todas as páginas autenticadas, com slot do documento Puck. Antes, 17 telas repetiam a estrutura de sidebar e header.
    - Sidebar de 248 px (configurável) sem descrições, com usuário e plano no rodapé.
    - Cabeçalho de 64 px com busca Ctrl K, notificações, Chat IA e menu do usuário.
    - Novos `PageIntro` e `AccessDenied` compartilhados.
  - **Telas:** dashboard, metas (layout aprovado), login (duas colunas), landing, onboarding, chat, agenda, monitoramento, dispositivos, perfil, assinatura, administração, construtor de UI, editor e blocos Puck. Os valores de opção persistidos dos blocos foram mantidos, e documentos salvos continuam válidos.
  - **Backend primeiro:**
    - "Atualizado por" (construtor e Puck) passou a mostrar o nome de quem salvou, via `LEFT JOIN profiles`, no lugar do UUID.
    - A rota pública do Puck deixou de expor o ID do administrador.
    - Teste de integração novo cobre as duas coisas.
  - **Textos padrão:** o `statusTitle` deixou de afirmar "recuperação alta" sem dados.
- **Defeitos encontrados no QA e corrigidos:**
  - O chat usava `scrollIntoView`, que rolava a janela inteira e escondia o topo da página. Agora rola só a lista de mensagens.
  - Estouro horizontal de 158 px em Saúde dos Dados no celular (item da grade sem `min-w-0`).
  - Dias de outro mês do calendário com #999 (2,6:1).
- **Evidências:**
  - Capturas de 18 rotas autenticadas e 2 públicas em 1440, 820 e 390 px, sem erros de console e sem estouro horizontal.
  - axe sem violações de contraste nas telas da Lyra. Restam só itens internos do `@puckeditor/core` no editor (documentados em `docs/acessibilidade.md`).
  - `pnpm test` 241/241; `pnpm test:integration` 73/73; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0.
- **Execução:** os lotes de telas foram divididos entre subagentes com um guia único de regras; as camadas compartilhadas (tokens, primitivos, layout, páginas, metas e backend) e a revisão final foram feitas diretamente.

### 28 · Direitos do titular (LGPD) e segregação de dados sensíveis e fiscais

- **Status:** 🟢 finalizada · **Commit:** `5d068c1` · **Push:** `37b6bb1..5d068c1 main -> main` (confirmado)
- **Diagnóstico:**
  - o administrador lia, filtrava, alterava e apagava, pela API de dados, todos os dados de saúde de todas as contas: métricas, metas, hábitos, planos, agenda, profissionais, avaliações e sequências;
  - a listagem administrativa trazia nascimento, gênero, idade, metas e atividade de todos;
  - não havia exportação, exclusão de conta pelo titular, registro de consentimento, política de privacidade, termos de uso nem registro fiscal das compras;
  - o consentimento do onboarding não era gravado.
- **Implementado:**
  - **Segregação (titular):**
    - `adminReadColumns`/`adminWriteColumns` na API de dados. De outras contas, o administrador vê só identificação, papel, onboarding e plano, e em métricas só quem registrou e quando.
    - Pedir, filtrar (inclusive `or`), ordenar, alterar ou apagar dado do titular responde 403.
    - As tabelas de saúde ficaram só com o titular, também para o administrador.
    - A listagem e o detalhe de usuários do painel perderam os dados sensíveis.
  - **28.1 (fiscal):**
    - o evento `invoice.paid` da Stripe grava `fiscal_records`, de forma idempotente, com a fotografia fiscal do comprador e sem dado de saúde;
    - só o administrador consulta, em leitura (`/admin/fiscal`, com filtro por período e CSV);
    - não existe rota de alteração ou exclusão, e a tabela não faz parte da API de dados;
    - na exclusão da conta, o registro fica com `user_id = NULL`.
  - **Direitos do titular:**
    - exportação JSON (`/api/account/export`);
    - exclusão da conta com senha e frase de confirmação. Recusa assinatura paga com renovação ativa e o último administrador; apaga também as imagens enviadas;
    - histórico de compras (`/api/account/purchases`);
    - consentimentos versionados: o cadastro exige o aceite, e o onboarding grava o consentimento de dados de saúde (art. 11, I) antes de salvar qualquer dado;
    - páginas `/privacidade` e `/termos`, abertas a todos inclusive durante o onboarding, com links no login, no cadastro, na landing e no perfil;
    - card "Privacidade e dados" no perfil, também quando o plano bloqueia a edição do perfil.
  - **Administrador:** exclui contas pela rota `DELETE /api/admin/users/:id`, com o mesmo serviço. O perfil não se apaga mais pela API de dados.
  - **Correção extra:** o onboarding gravava a data de nascimento com `toISOString`, o que podia salvar o dia anterior em fusos a leste de UTC.
- **Conflito entre requisitos (registrado):** os registros fiscais são, por natureza, registros de compra. Para atender ao 28.1, o administrador vê as faturas como dado fiscal (valores, datas, documento do comprador), mas não existe histórico de compras por pessoa no painel nem ligação com dados de saúde. O titular vê o próprio histórico completo.
- **Fronteiras externas:**
  - Stripe: sem segredo real, o `invoice.paid` foi validado com evento assinado localmente pela SDK oficial.
  - Identificação do controlador: razão social e CNPJ precisam ser informados pela empresa (o e-mail do encarregado vem de `LGPD_CONTATO_EMAIL`).
  - Imutabilidade no banco: gatilhos exigiriam o privilégio `SUPER` com o log binário ligado. A recomendação de revogar `UPDATE`/`DELETE` em produção está em `docs/lgpd.md`.
- **Evidências:**
  - `test:integration` 90/90. O novo `lgpd.integration.test.ts` tem 11 testes: consentimento, segregação (colunas, filtros, ordenação, alteração e exclusão), lista administrativa, fatura assinada → registro fiscal idempotente, acesso fiscal, exportação, exclusão com retenção fiscal e as recusas.
  - `test` 236/236; lint, format e types com exit 0; `build` com exit 0; `test:launchers` OK.
  - QA no build de produção, 20/20 conferido no MySQL:
    - cadastro bloqueado sem o aceite; consentimentos gravados;
    - perfil com consentimentos, compra e download dos dados;
    - administrador recebe 403 ao pedir data de nascimento;
    - `/admin/fiscal` funciona;
    - exclusão pela interface volta ao login, apaga tudo e mantém o registro fiscal desvinculado; login da conta excluída responde 401.
  - Telas novas sem estouro em 390px. Migração `015` aplicada. Dados de QA removidos.

### 29 · Rotas, menus, botões e links reais

- **Status:** 🟢 finalizada · **Commit:** `124c7fe` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Método:** varredura no navegador (Playwright, servidor de produção) de todas as rotas como paciente, como administrador e como visitante. Em cada tela foram listados os botões sem nenhuma ação ligada (sem handler de clique/teclado, sem submit e sem gatilho Radix) e todos os links internos, abertos um a um para conferir 404.
- **Achados e correções (causa raiz):**
  - **Sino de notificações sem ação:** virou o componente `NotificationsMenu`, com dados reais da conta (consultas dos próximos 7 dias pela API de dados e avisos da assinatura: pagamento pendente ou renovação cancelada), contador com plural correto e links para `/appointments` e `/profile`. Sem dados, mostra "Nenhuma notificação no momento.".
  - **"Preferências" no menu do perfil abria a mesma página de "Meu perfil":** virou "Privacidade e dados", que leva ao card dos direitos LGPD (`/profile#privacidade-e-dados`). Como os cards acima carregam depois e empurram o card para baixo, a rolagem é refeita a cada mudança de altura até a pessoa interagir (limite de 5 s).
  - **Link `/dashboard` (404) no conteúdo do Puck:** o painel fica em `/`. Corrigido no código (`initial-data`, `feature-card`, rota pública do documento) e nos documentos já gravados pela migration `016_corrige_link_dashboard_puck.sql`.
  - **Construtor de UI criava item de sidebar com `/nova-rota` (404):** o item novo nasce com a primeira rota real ainda não usada (o botão fica desabilitado quando não sobra nenhuma) e o campo "Rota" virou um seletor das rotas existentes, com as já usadas desabilitadas. O schema do módulo exige formato de rota interna também no servidor.
  - **`/monitoring` mostrava ao paciente os nomes das variáveis da Stripe** (achado da tarefa 33): `GET /api/account/billing` só envia `missingKeys` ao administrador, e checkout/portal sem credencial respondem 503 com mensagem genérica para o paciente.
- **Evidências:**
  - Varredura final: 12 rotas do paciente, 22 do administrador e 2 do visitante sem nenhum botão sem ação; 10 e 21 links internos verificados sem 404; nenhum erro de página.
  - Navegador em 1440 px e 390 px: sino com "Notificações (1 nova)", popover dentro da tela e clique levando a `/appointments`; "Privacidade e dados" deixa o card no topo (80 px, logo abaixo do cabeçalho); `/monitoring` sem `STRIPE_`; documento sem estouro horizontal.
  - Construtor: 17 seletores de rota, "Novo item" habilitado (sobrava `/admin/fiscal`), rotas em uso desabilitadas.
  - Teste de integração novo "configuração interna da cobrança" (`seguranca.integration.test.ts`).
  - `test` 236/236; `test:integration` 91/91; lint, format e types com exit 0; `build` com exit 0. Provas de remoção: `/nova-rota` e `Preferências` só aparecem em comentários que explicam a correção; `"/dashboard"` sem ocorrência em `src` e `modules`; 0 documentos Puck com `/dashboard`. Usuários de QA removidos.

### 30 · Vulnerabilidade alta em `braces`

- **Status:** 🟢 finalizada · **Commit:** `7c1f432` · **Push:** `c70e2f9..7c1f432 main -> main` (confirmado)
- **Diagnóstico:** `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, negação de serviço com padrões glob muito aninhados), sem versão corrigida publicada. Chegava por dois caminhos: a CLI `shadcn` e o `@next/eslint-plugin-next` (que fixa `fast-glob` 3.3.1, puxando `micromatch` e `braces`).
- **Correção (tratada como se fosse para produção):**
  - A CLI `shadcn` saiu das `devDependencies`. Ela só gerava componentes e nunca era importada; o `components.json` continua para uso com `pnpm dlx shadcn@<versão> add`.
  - Override restrito ao plugin do Next: `fast-glob` resolvido para o `tinyglobby` (fdir + picomatch, sem `braces`), que exporta o mesmo `globSync` com `onlyDirectories`, a única função usada pelo plugin.
  - `scripts/verificar-glob-eslint-next.mjs` chama a função real do plugin e confirma os mesmos diretórios do sistema de arquivos.
- **Evidências:** `pnpm audit` e `pnpm audit --prod` com "No known vulnerabilities found"; `pnpm why braces` sem resultado; lint, format e types com exit 0; `test` 241/241; `test:integration` 73/73; `test:launchers` 17/17; `build` com exit 0.

### 31 · Textos sem acento

- **Status:** 🟢 finalizada · **Commit:** `961ccf4` · **Push:** `aeb8b4a..961ccf4 main -> main` (confirmado)
- **Método:** varredura com dicionário de português (pyspellchecker, instalado fora do projeto). O critério foi palavra sem acento cuja forma acentuada é a usual. A varredura cobriu:
  - textos visíveis: literais, JSX e rótulos de uma palavra;
  - padrões configuráveis, mensagens de API, scripts, launchers e documentação;
  - conteúdo gravado no banco: documentos Puck, planos, recursos, hábitos, dicas, configuração e base de conhecimento da IA.
- **Corrigido:**
  - padrões da landing e do login (`modules/lyra-customaze-ui-ux/.../defaults.ts`): hero, métricas, fluxo, FAQ, CTA final, rodapé, textos do login, "orquestração guiada", "conexão de sinais reais" e a mensagem de erro do Bluetooth;
  - construtor da experiência (`SiteExperienceBuilder`): cerca de 90 rótulos, descrições e mensagens;
  - landing, modal de metas, teste de conexão da IA, mensagem do bootstrap do administrador e `AGENTS.md`.
- **Mantidos de propósito:**
  - identificadores e chaves internas (ex.: status `atencao`, `estavel`) e ids de elementos;
  - migrations já aplicadas: mudar o texto altera o checksum. A `005` grava só na tabela `ui_config`, que não é usada;
  - o banco: os textos gravados já estavam acentuados, e não há configuração de página salva (a landing e o login usam os padrões corrigidos).
- **Evidências:** varredura final sem texto visível sem acento; no navegador, landing e login sem nenhum termo sem acento; `test` 236/236; `test:integration` 90/90; `test:launchers` OK; lint, format e types com exit 0; `build` com exit 0.

### 32 · Página `/instruments`

- **Status:** 🟢 finalizada · **Commit:** `0741a4a` · **Push:** `3403a7c..0741a4a main -> main` (confirmado)
- **Risco avaliado: nenhum.** A página era uma demonstração do template, sem link em sidebar, menu do celular, Ctrl K, landing ou documentos Puck publicados. Nenhum motor, tela ou API da Lyra lia a tabela. Ela era a única tabela lida sem sessão pela API de dados, então removê-la diminui a superfície exposta.
- **Removido:**
  - página `src/app/instruments/page.tsx`;
  - tabela `instruments` e documento Puck `instruments` (migração `013_remove_instruments_demo.sql`, idempotente, sem dados de usuário);
  - flag `publicRead` (agora toda leitura em `/api/data` exige sessão), tipos `InstrumentRow` e a chave Puck;
  - `src/lib/mysql/query-utils.ts` e o teste dele: código morto, importado só pelo próprio teste.
- **Evidências:**
  - prova de morte: `grep -rn instruments` sem ocorrências no código; `publicRead` só aparece num campo homônimo e não relacionado do contrato do módulo `lyra-customaze-ui-ux`;
  - migração aplicada; segunda execução com "Já aplicada" em todas; tabela inexistente e 0 documentos Puck `instruments`;
  - produção: `/instruments` 404; `/api/data/instruments` 400 ("Tabela não suportada");
  - `test` 226/226 (21 testes a menos, do arquivo morto removido); `test:integration` 75/75 (todas as tabelas exigem sessão: 401); lint, format e types com exit 0; `build` com exit 0.

### 33 · Experiência no celular

- **Status:** 🟢 finalizada · **Commit:** `b2dddb8` · **Push:** `40bd98a..b2dddb8 main -> main` (confirmado)
- **Método:** varredura real em 390×844 com toque, em todas as rotas, como visitante, paciente, administrador e conta nova: estouro horizontal, alvos de toque abaixo de 24px e captura da primeira dobra. Referências de 2026 consultadas: formulário acima da dobra no login, progresso de etapas com texto, alvos de 44px.
- **Problemas encontrados e corrigidos (causa raiz):**
  - **Onboarding cortado:** o formulário ficava numa linha flex centralizada e crescia até 672px; no celular estourava para os dois lados (página com 531px e o início dos cartões fora da tela, sem como rolar até ele). Agora é uma coluna na largura da tela, as etapas fora da tela ficam `inert` (o "próximo campo" do teclado não pula para etapas escondidas) e a página ganhou `<main>` e `<h1>`.
  - **Pontos do onboarding:** eram um `role="tablist"` sem abas, que não dizia nada ao leitor de tela. Agora há o texto "Etapa X de N" e os pontos já concluídos ficam marcados.
  - **Metas do onboarding:** só a caixinha de 20px e o texto marcavam a meta, apesar do cursor de clique na linha. Agora a linha inteira (44px) marca e a opção escolhida fica destacada.
  - **Login com o formulário abaixo de um texto longo:** a ordem passou a ser marca → título → formulário → detalhes. No celular o formulário aparece na primeira dobra e o título acompanha a largura da tela; no desktop o desenho em duas colunas continua igual.
  - **Botões do acesso rápido da landing com 22px:** `flex-1` na coluna zerava a base de altura. Agora só vale na linha (a partir de `sm`).
  - **Alvos pequenos:** "Criar conta"/"Entrar", "Voltar para a landing", "Lembrar-me" e o selo "Feito com iLyra AI" passaram a 44px.
  - **Perfil:** um cartão repetia o título e a descrição da página logo abaixo do cabeçalho; removido.
  - **Chat:** cabeçalho compacto no celular (sem ícone e texto de apoio), para a conversa aparecer antes.
- **Evidências:**
  - nenhuma rota com estouro horizontal em 390px (antes: onboarding com 531px); alvos abaixo de 24px só o checkbox "Lembrar-me" (com rótulo de 44px ao lado) e o seletor interno do Puck;
  - axe sem violações em `/`, `/login`, `/chat`, `/profile`, `/goals` e `/onboarding`, em 390 e 1440px;
  - fluxo completo do onboarding (13 verificações) aprovado no celular e no desktop; dados gravados conferidos no MySQL;
  - login e onboarding sem estouro em 820 e 1440px;
  - `test` 230/230; `test:integration` 75/75; lint, format e types com exit 0; `build` com exit 0. Contas de QA e contadores de tentativa locais removidos do banco.
- **Achado repassado à tarefa 29:** `/monitoring` mostra ao paciente nomes de variáveis internas de configuração no aviso de plano.

### 34 · Tema escuro

- **Status:** 🟢 finalizada · **Commit:** `b3c438f` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Estado encontrado:** o `.dark` existia em `globals.css`, mas o tema estava travado no claro (`enableSystem={false}`, sem nenhum controle) e, ativado à força, 86 nós falhavam no contraste em 1440 px: branco sobre os destaques claros (violeta 3,6:1; verde, âmbar, dourado, azul e cósmico entre 1,9:1 e 3,4:1), vermelho de erro sobre cartão e tom claro (3,7–4,3:1) e contorno dos campos de texto quase invisível (1,2:1). O código não tinha cores fixas relevantes fora dos tokens.
- **Implementado:**
  - **Alternância:** grupo "Tema" (Claro, Escuro, Do sistema) no menu do perfil, que não fecha ao escolher; botão "Tema escuro" (`aria-pressed`) na landing, na entrada e nos documentos legais (oculto na pré-visualização do construtor). O claro continua padrão; a escolha persiste no navegador e "Do sistema" segue o sistema operacional. Componentes em `src/components/theme/`.
  - **Tokens do escuro:** destaques claros com texto escuro por cima (`*-foreground` = `#0C0C13`), erro, violeta e informação mais claros, `--input` com 3:1, popover um degrau acima do cartão, `color-scheme: dark`, sombras e barra de rolagem próprias e meta `theme-color` acompanhando o tema (`ThemeColorSync`, com a cor em módulo de servidor para o `viewport`).
  - **Tema claro:** `--control` de `#8C8C9B` para `#848494`, para passar de 3:1 também sobre `muted`/`secondary`.
  - **Teste contínuo:** `src/app/tema.test.ts` lê o `globals.css` e falha se algum par de texto cair abaixo de 4,5:1 ou de contorno abaixo de 3:1, nos dois temas, e confere a cor da barra do navegador.
  - **Camadas (achados novos ao auditar menus e diálogos abertos):** o menu suspenso modal do Radix punha `aria-hidden` no cabeçalho e no conteúdo focáveis e escondia o `<h1>`; os menus passaram a ser não modais por padrão (padrão "menu button" da WAI-ARIA). O popover de notificações e o diálogo da busca Ctrl K ganharam nome acessível. O contraste dos títulos de categoria do Puck (4,35:1) foi corrigido pela variável `--puck-drawer-category-color-text` da própria biblioteca.
- **Evidências:**
  - axe (todas as regras WCAG 2.2 AA + boas práticas), servidor de produção, 390 e 1440 px, temas claro e escuro: 46 telas e camadas por largura (visitante, conta nova no onboarding, paciente e administrador em todas as rotas, menu do perfil, notificações, busca Ctrl K e sidebar do celular). **Zero violações de contraste** nos dois temas; restam 5 nós por largura: os 3 internos do Puck já registrados em `docs/acessibilidade.md` e `region` (boa prática) no portal do menu do perfil.
  - Navegador: botão do login alterna e persiste após recarregar e entre páginas; menu do perfil com Claro/Escuro/Do sistema, inclusive com o sistema em escuro e em claro; `theme-color` `#f6f6f8` ↔ `#0c0c13`; sem avisos de console nem erros de hidratação; landing a 390 px sem estouro.
  - Regressão das tarefas 29 e 36: sino, "Privacidade e dados", `/monitoring` e construtor sem mudança; varredura de botões e links sem achados.
  - `test` 241/241; `test:integration` 91/91; lint, format e types com exit 0; `build` com exit 0 e sem avisos. Usuários de QA removidos.

### 35 · Onboarding no primeiro acesso

- **Status:** 🟢 finalizada · **Commit:** `fae09bd` · **Push:** `39e765f..fae09bd main -> main` (confirmado)
- **Verificação inicial:** cadastro, login e rotas digitadas já levavam ao onboarding, mas com dois defeitos reproduzidos no navegador:
  - **Fuga pelo "voltar":** a partir do onboarding, o botão "voltar" abria o painel completo (menu, métricas, chat) de uma conta recém-criada.
  - **Desvio pelo painel:** o cadastro ia primeiro ao painel e só depois ao onboarding; páginas montavam e faziam consultas antes do redirecionamento.
- **Causa raiz:** o `AuthProvider` só decidia o destino quando a sessão mudava (não a cada rota) e renderizava a página antes de conhecer o status do onboarding, que exigia uma consulta extra ao perfil.
- **Correção:**
  - a sessão (`/api/auth/session`, login e cadastro) traz `onboarding_completed` lido do banco;
  - `src/lib/auth/destino-de-acesso.ts` decide o destino (visitante → login; conta sem onboarding → onboarding; conta pronta sai de login e onboarding), com testes;
  - o `AuthProvider` reavalia a cada rota, usa `replace` e não monta a rota bloqueada;
  - ao concluir, o onboarding relê a sessão (`db.auth.refreshSession`) e o app abre o painel; o login deixa a navegação para o `AuthProvider`;
  - removida a recriação de perfil pelo cliente (código inalcançável: sem perfil não existe sessão). Prova de morte: `grep` sem ocorrências.
- **Evidências (build de produção, 1440px):** 13/13 verificações e zero erros de console:
  - cadastro → `/onboarding` direto (trilha `/login → /onboarding`, 776 ms);
  - "voltar" e as rotas `/`, `/plan`, `/profile`, `/admin/users` e `/login` não abrem o painel;
  - ao finalizar abre o painel; "voltar" e `/onboarding` não reabrem o onboarding; rotas liberadas; novo login (390px) abre o painel; visitante vai ao login.
  - `test` 230/230; `test:integration` 75/75 (sessão com o status, inclusive após concluir sem novo login); lint, format e types com exit 0; `build` com exit 0. Usuários de QA removidos do banco.
- **Achado repassado à tarefa 33:** em 390px o formulário do onboarding fica com 531px de largura (cartões cortados e rolagem lateral).

### 36 · Edição dos dados do onboarding no perfil

- **Status:** 🟢 finalizada · **Commit:** `e0a02a3` · **Push:** `38b998a..e0a02a3 main -> main` (confirmado)
- **Mapeamento campo a campo:** nome, sobrenome, data, hora e local de nascimento, idade (calculada pela data) e gênero já estavam no perfil; **nível de atividade e metas só existiam no onboarding** e passaram a ser editáveis no perfil, com as mesmas opções (módulo compartilhado `opcoes-de-perfil.ts`, sem lista duplicada). O consentimento do onboarding não é gravado hoje; o registro de consentimento faz parte da tarefa 28.
- **Defeito encontrado e corrigido (causa raiz):** o MySQL devolve a hora como `HH:MM:SS` e a validação do perfil exige `HH:MM`. Quem informou a hora no onboarding não conseguia salvar nada no perfil: a validação recusava a hora em silêncio. A hora agora é convertida ao carregar (`horaParaCampo`), e um aviso aparece quando algum campo bloqueia o envio.
- **Sem duplicidade de e-mail de login:**
  - `profiles.email` era uma cópia sem índice único. A migração `014` realinha a cópia com a conta e cria o índice único.
  - Pela API de dados ninguém altera `profiles.email`, nem o administrador (só a cópia mudaria).
  - Nova troca de e-mail no perfil (`PATCH /api/account/email`): exige a senha atual; as falhas contam no limite do login; `users` e `profiles` mudam na mesma transação; e-mail de outra conta (inclusive com maiúsculas e espaços) responde 409; o token é reemitido mantendo o tipo de sessão.
  - Os demais dados sensíveis são linhas do próprio usuário (`profiles.id` = conta) e não se repetem entre contas.
- **Evidências:**
  - QA no build de produção em 1440 e 390px, 13/13 verificações:
    - os dados do onboarding (atividade, metas e hora em `HH:MM`) aparecem no perfil;
    - a edição gravada foi conferida no MySQL e persiste após recarregar;
    - o e-mail de outra conta e a senha errada são recusados na tela;
    - a troca de e-mail atualiza conta e perfil, mantém a sessão, e o login fica 401 com o e-mail antigo e 200 com o novo;
    - o perfil no celular não tem estouro horizontal.
  - `test` 235/235; `test:integration` 79/79 (novo `conta-email.integration.test.ts`, índice único e bloqueio de troca pelo administrador); lint, format e types com exit 0; `build` com exit 0.
  - Migração `014` aplicada e reexecutada com "Já aplicada" em todas. Usuários de QA removidos do banco.
- **Achado repassado à tarefa 28 (corrigido na tarefa 28):** o registro original dizia que a remoção pelo painel administrativo apagava só o perfil. Na análise da tarefa 28 isso se mostrou incorreto: pelo administrador, a API de dados já apagava a conta inteira, mas sem as verificações da exclusão (assinatura paga renovável, último administrador) e sem apagar as imagens. Quem deixava a conta órfã era o **próprio titular**: ele conseguia apagar o próprio perfil pela API de dados, ficava sem login e com o e-mail preso. Os dois casos foram resolvidos na tarefa 28.

### 37 · Administrador `admin@admin.com`

- **Status:** 🟢 finalizada · **Commit:** sem alteração de código versionado (o registro é este painel) · **Push:** do painel (confirmado)
- **Implementado:** o usuário foi criado pelo bootstrap oficial de administradores (`ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS` no `.env.local`, que é ignorado pelo Git). A senha definida pelo usuário não foi escrita em nenhum arquivo versionado, conforme a regra de segredos; o banco guarda só o hash bcrypt. O mecanismo é idempotente: cada `pnpm db:migrate` (e o `up` dos launchers) assegura o usuário, e a senha só é regravada quando o valor do `.env.local` muda.
- **Evidências reais:**
  - `pnpm db:migrate`: "Bootstrap admin assegurado: admin@admin.com".
  - MySQL: `admin@admin.com` com `role = admin`, nome "Administrador Total", onboarding concluído, plano `care` ativo (todas as capacidades) e senha em hash bcrypt.
  - `POST /api/auth/login` com o e-mail e a senha informados: 200; `/api/auth/session` retorna `role: "admin"`; `/api/admin/users`, `/api/admin/plans`, `/api/admin/page-config/app` e `/api/admin/puck/documents/landing-home`: 200.
- **Recomendação:** a senha pedida segue um padrão comum; antes de publicar em produção, troque-a no `.env.local` (o próximo `pnpm db:migrate` regrava o hash).

### 38 · Isolamento das funções de administrador

- **Status:** 🟢 finalizada · **Commit:** `3a1fdca` · **Push:** `5e7d836..3a1fdca main -> main` (confirmado)
- **Método:** verificação real com um paciente criado pelo cadastro público e com o `admin@admin.com`, por API (`curl` com sessão) e por navegador no build de produção. Mapeadas as 30 rotas de API e as 9 páginas `/admin/*`.
- **Vazamentos encontrados e corrigidos (causa raiz):**
  - **Configuração e base de conhecimento da IA legíveis por qualquer usuário:** a API de dados liberava a leitura de `ai_config` (missão, objetivos e pesos do motor) e `ai_knowledge_documents` (inclusive rascunhos inativos) para qualquer sessão. Agora `adminOnlyRead`; os recursos que dependem delas já as leem no servidor.
  - **Primeiro cadastro virava administrador:** com o banco vazio (bootstrap desativado em produção), o primeiro visitante ganhava acesso total. O cadastro público agora sempre cria usuário comum no plano `free`.
  - **Telas administrativas entregues a qualquer um:** o bloqueio era só no navegador. O `src/proxy.ts` passou a verificar o papel para `/admin/*`: visitante vai ao login e usuário comum volta ao próprio painel. A autorização definitiva continua nas APIs, que releem o papel no banco.
- **Já corretos (confirmados):** as rotas `/api/admin/*`, `/api/rpc/*` e `test-ai-connection` exigem administrador; `profiles.role` só é gravado por administrador; sidebar, menu do celular e busca Ctrl K escondem os itens administrativos pelo papel definido no código.
- **Evidências:**
  - Paciente: 403 em todas as rotas e métodos administrativos (GET, PUT, POST, PATCH), sem alterar o próprio plano; 403 na leitura e escrita de `ai_config` e `ai_knowledge_documents`.
  - Navegador: paciente com 8 itens no menu, nenhum administrativo, nada administrativo na busca, e as 9 rotas `/admin/*` devolvidas ao painel; `admin@admin.com` com 17 itens e as 9 telas abertas.
  - Testes novos: `src/proxy.test.ts` (6) e matriz de integração em `dados-admin.integration.test.ts`; cadastro confirma `patient` e plano `free`.
  - `test` 247/247; `test:integration` 75/75; lint, format e types com exit 0; `build` com exit 0.
  - Usuário de QA removido do banco ao final.

### 39 · Desativar Apple Saúde e Health Connect

- **Status:** 🟢 finalizada · **Commit:** `0ebc6f1` · **Push:** `main -> main` (confirmado)
- **Causa:** o código tentava ler HealthKit/Health Connect por um plugin que só existe dentro de um app de celular (Capacitor), que o projeto não tem. No navegador isso nunca funcionava e o painel mostrava "Nenhum runtime nativo de saúde foi detectado" para todo usuário.
- **Implementado:** `src/lib/health/healthConnect.ts` removido; tipos e conversão dos sinais em `src/lib/health/sinais-vitais.ts` (com testes). A sincronização (`HealthOrchestratorContext`) passou a ler as efemérides e os sinais do dia gravados no banco; a pulseira Bluetooth continua com leitura ao vivo. Mensagem de falha só quando algo real falha, sem citar integrações.
- **Evidências:** prova de remoção sem referências a `healthConnect`, `getHealthRuntimeAvailability`, `fetchRealTimeVitals` ou "runtime nativo" no código; no navegador, painel e plano sem nenhuma menção a HealthKit, Health Connect ou runtime nativo, "Estado atual" em sintonia e sem erros de console; `test` 244/244; lint, format, types e `build` com exit 0.

### 40 · Métricas reais gravadas

- **Status:** 🟢 finalizada · **Commit:** `06f633e` · **Push:** `main -> main` (confirmado)
- **Causa:** nada no app gravava `daily_metrics` (a tabela estava com 0 linhas); a pulseira Bluetooth só exibia leituras na tela e havia duas implementações dela, ambas lendo o campo "energia gasta" (bit 3 da característica GATT 0x2A37) como se fosse intervalo RR.
- **Implementado:**
  - **Check-in "Registrar meu dia"** (botão no painel e item nas ações rápidas): humor e energia (1 a 5), estresse, sono, passos, minutos ativos, água, cafeína, proteína, peso, FC de repouso, glicemia, pressão e meditação. Faixas e casas decimais definidas em `src/lib/metricas/registro-do-dia.ts`, as mesmas no navegador e no servidor; campos vazios não apagam o que já existe; o diálogo abre com os valores do dia.
  - **Rotas:** `GET/POST /api/metricas/dia` e `POST /api/metricas/sensor` (este exige o recurso `wearable_bluetooth_connection`, antes só bloqueado na tela). `daily_metrics` deixou de aceitar escrita pela API genérica (403 com o caminho correto). O humor da avaliação do painel também grava o `mood_score` do dia.
  - **Pulseira:** hook único `useBluetoothVitals` usado no painel e na central de dispositivos; `src/lib/health/sessao-cardiaca.ts` lê a medição conforme a especificação e agrega a sessão (FC mínima, máxima e média, repouso pela menor média móvel de 60 s, RMSSD só com RR de 300 a 2000 ms e sem saltos acima de 20%). A sessão é gravada a cada 5 minutos, ao desconectar, ao sair da página e na virada do dia; no banco, mínima e máxima viram os extremos do dia, a média é ponderada pelos minutos, o repouso fica com o menor valor e a VFC com a sessão mais recente. O canal ao vivo passou a ser um só por conexão (antes cada leitura abria um canal que nunca era fechado).
  - **Migration 017:** `energy_level`, `sensor_heart_rate_avg`, `sensor_minutes` e `metrics_updated_at`.
  - **Atualização:** painel, cartões e sincronização recarregam quando o dia é registrado.
  - **Achado na auditoria do diálogo:** o aviso de erro do Sonner no tema claro tinha 4,34:1; os avisos passaram a usar os tokens da Lyra (cobertos pelo teste de contraste).
- **Evidências:**
  - Integração (`src/app/api/metricas.integration.test.ts`, 15 testes): gravação parcial que preserva o dia, 8 entradas inválidas recusadas com 400 sem gravar nada, 401 sem sessão, 403 na API genérica, humor da avaliação no dia, 403 da pulseira no plano Free, soma de duas sessões (extremos 58/132, média ponderada 79,5, repouso 61 vencendo o check-in de 64, VFC preservada) e sessão incoerente recusada.
  - Unidade: leitura GATT (8 e 16 bits, energia gasta, truncada) e agregação (repouso 60 bpm, RMSSD 10 ms, artefatos), datas e mensagens de validação.
  - Navegador (1440 px claro e 390 px escuro): diálogo pelo painel e pelas ações rápidas, erro "Glicemia: o mínimo é 20 mg/dL." com `aria-invalid`, painel de 0 para 9.000 passos e 2,5 L de água logo após salvar, reabertura com os valores do dia, axe sem violações nos dois temas, sem erros de console e sem estouro de largura.
  - **Limite do ambiente:** a conexão Bluetooth real precisa de uma pulseira física e de navegador com Web Bluetooth; foi validada pelos testes de leitura e agregação e pela rota com a sessão agregada.
  - `test` 263/263; `test:integration` 106/106; lint, format, types e `build` com exit 0 e sem avisos.

### 41 · Mapa védico real de cada pessoa

- **Status:** 🟢 finalizada · **Commit:** `c6e064d` · **Push:** `main -> main` (confirmado)
- **Causa:** o local de nascimento era texto livre (sem coordenadas nem fuso), então não havia como calcular ascendente, casas ou horários do dia; o campo de dasha devolvia um texto fixo ("Vimshottari calculável a partir do timestamp...") e o onboarding pré-preenchia a hora com 12:00, o que geraria ascendente falso.
- **Implementado:**
  - **Cidades:** base local `data/geo/cidades.json.gz` (GeoNames, CC BY 4.0; 71.254 cidades com mais de 5 mil habitantes no mundo e com mais de mil no Brasil, coordenadas, fuso e nomes alternativos, UF por sigla), gerada por `pnpm geo:cidades`; busca no servidor (`GET /api/geo/cidades`), sem serviço externo.
  - **Locais no perfil:** seletor de cidade no onboarding (nascimento obrigatório, moradia opcional) e no perfil (salvo na hora); gravação só por `PATCH /api/perfil/localizacao` com nome, coordenadas e fuso vindos do servidor; a API genérica recusa essas colunas (403). Migration 018.
  - **Cálculo** (`src/lib/astrology/`): hora local → UTC com horário de verão histórico; ayanamsha Lahiri; grahas, Rahu e Ketu, retrogradação; Lagna e casas por signo inteiro; Vimshottari Mahadasha/Antardasha; Panchang com horário de término; Brahma e Abhijit Muhurta; Rahu Kalam, Yamaganda, Gulika; Choghadiya de dia e de noite; Tara Bala, Chandra Bala e Chandrashtama.
  - **Rotas e tela:** `GET /api/astrologia/mapa` e `GET /api/astrologia/dia`; cartão "Meu mapa védico" no perfil; o chat e o plano de IA passaram a receber o dasha real. Documentação em `docs/astrologia.md`.
- **Evidências:**
  - **Validação independente** com o Swiss Ephemeris 2.10.03 (pyswisseph, `SIDM_LAHIRI`, instalado fora do projeto): ayanamsha a menos de 0,01°, longitudes dos 8 corpos a menos de 0,02° em dois nascimentos (São Paulo 1990 e Nova Délhi 1985), Lagna a menos de 0,05°, nascer e pôr do sol a menos de 2 min, tithi, nakshatra, yoga e karana idênticos e datas do Vimshottari a menos de 2 dias.
  - Integração (`astrologia.integration.test.ts`, 8 testes): busca com UF, 401 sem sessão, gravação com coordenadas e fuso, limpeza com `null`, 404 e 400, 403 na API genérica, `faltando` sem dados, mapa (Lagna Capricórnio, Lua em Touro/Krittika, Rahu) e dia em Nova Délhi (nascer 06:19, Dvitiya, Swati, Amrit, Kshema, 6ª casa) e data inválida.
  - Navegador (1440 px e 390 px, `pt-BR`): onboarding recusa avançar sem cidade, escolhe São Paulo e Lisboa pela busca, finaliza; perfil mostra as cidades e o mapa (Capricórnio 13°15', Touro/Krittika pada 3, Rahu/Lua até 28/08/2027); troca da moradia para Campinas e dia védico recalculado; axe sem violações nas três telas; largura do perfil no celular corrigida (o botão de limpar a cidade estourava 9 px).
  - `test` 306/306; `test:integration` 114/114; `test:launchers` 17/17; lint, format, types e `build` com exit 0 e sem avisos. Usuários de QA removidos.

### 42 · Coach diário automático de IA

- **Status:** 🟢 finalizada · **Commit:** `7d6a84f` · **Push:** `b013b91..7d6a84f main -> main` (confirmado)
- **Causa:** a IA só respondia quando a pessoa perguntava no chat; não havia nenhuma rotina que lesse o mapa védico e as métricas todos os dias, nem notificações do servidor (o sino só mostrava consultas e assinatura).
- **Implementado:**
  - **Motor do coach** (`src/lib/coach/`, determinístico): prontidão só com sinais medidos (sem neutro inventado), comparando VFC e FC de repouso à média pessoal; quatro períodos no relógio da cidade com nota pela Choghadiya e descontos de Rahu Kalam, Yamaganda e Gulika; melhor janela (Abhijit, Amrit, Shubh, Labh fora das cautelas); tom do dia por Tara Bala, Chandra Bala/Chandrashtama, yoga, karana e tithi; treino pela prontidão, pelo dosha e pela natureza do nakshatra; luz, refeições, cafeína e sono pelo nascer e pôr do sol; água e proteína pelo peso; Ekadashi; ciclo menstrual; sinais precoces. Toda dica tem o "por quê".
  - **Dados:** migração `019_coach_diario.sql` (`daily_briefings` com hash das entradas, refeito quando o check-in, a pulseira ou a cidade mudam; `user_notifications` com chave única), retenção de 90 dias, exportação LGPD e exclusão em cascata. Política de privacidade na versão 2026-10-14.
  - **Automático:** rotina no servidor (`src/instrumentation.ts`) a cada 15 min, a partir das 3 h locais, respeitando o plano (`ai_tips_feed`); rota `POST /api/coach/rotina` com segredo para cron externo (`COACH_ROTINA`, `COACH_ROTINA_SEGREDO`).
  - **Rotas:** `GET /api/coach/hoje`, `POST /api/coach/feedback`, `GET/PATCH /api/notificacoes`.
  - **Telas** (referências: Oura "Today" com "one big thing", WHOOP Coach, tendências 2026 de IA explicável e vidro com aura): cartão "Seu dia" no topo do painel (manchete, anel de prontidão, faixa das 24 h com o "Agora" ao vivo, período atual, três focos e cuidado do dia); página **Meu dia** (`/dia`) com relógio radial das 24 h, quatro períodos, pontos fortes e cuidados, abas Saúde/Alimentação/Movimento/Mente/Sono, céu de hoje e "o seu dia te ajudou?"; sino com "Seu dia está pronto" e alertas, marcados como lidos ao abrir; "Meu dia" na navegação (logo após o Dashboard, inclusive em configurações já salvas); chat responde sobre o dia com os mesmos horários; atalhos `G + letra` da paleta passaram a funcionar (antes eram só exibidos).
  - Documentação: `docs/coach.md`, `docs/api.md`, `.env.example`, README.
- **Fica para a tarefa 43:** texto do coach pelo Gemini (exige consentimento explícito e revogável, porque hoje a política só prevê o Gemini com a chave da própria pessoa no chat).
- **Evidências:**
  - Unitários (`coach.test.ts`, 14): períodos contíguos 00:00–24:00 com nota e sugestão, horários iguais ao Panchang, dica sem "por quê" proibida, sem check-in não há prontidão, boa recuperação libera treino intenso e em nakshatra suave não, recuperação baixa vira dia de atenção com 4-7-8 e débito de sono, determinismo, Ekadashi só no 11º tithi, Chandrashtama encontrado no calendário real vira atenção com alerta, ciclo e data da menstruação; chat (2) e navegação (1).
  - Integração (`coach.integration.test.ts`, 7, e `lgpd`): sem cidade → `sem_local`; gera, reaproveita e refaz após o check-in sem duplicar briefing nem notificação; 401 e 403 pelo plano; avaliação só com briefing (404/400); notificações sem IDOR; rotina não gera antes das 3 h, gera às 7 h e não repete; rota externa 404/401/200; exportação e exclusão LGPD com as tabelas novas.
  - Navegador (build de produção; 1440 px claro, 390 px e 1440 px escuro): cartão e `/dia` sem estouro, sino "1 notificação nova" → lido ao abrir, check-in no diálogo refaz o dia (prontidão 90), avaliação gravada no banco, atalho `G H`, axe sem violações em todas as telas (o nome do botão do sino foi ajustado para começar pelo número visível, WCAG 2.5.3), sem erros de console. Log do servidor: `[coach:rotina] 1 dia(s) preparado(s), 0 falha(s)`.
  - `test` 323/323; `test:integration` 121/121; `test:launchers` 17/17; lint, format, types e `build` com exit 0 e sem avisos. Usuários de QA removidos.

### 43 · O que a IA faz sozinha e leitura védica do "Seu dia" por qualquer modelo

- **Status:** 🟢 finalizada · **Commits:** `ff0ad2c` (A: prontidão gravada, ausência de dado deixa de ser zero), `179a6f7` (B: metas automáticas, prazos e sequências), `9d030c4` (C: plano que se refaz, dica do dia pelos sinais, monitoramento real), `7cade87` (D: texto pelo Gemini com consentimento, substituído pela parte E a pedido do usuário), `52040a7` (E: leitura védica por qualquer modelo de IA, inclusive local) · **Push:** `main -> main` (confirmado; `52040a7` = `origin/main`)
- **Pedido do usuário (2026-10-15):** o "Seu dia" pode ser escrito por qualquer modelo de IA, inclusive local (Ollama, LM Studio, Jan e outros via llama.cpp), sem consentimento separado, diferente a cada dia, com: 1) resumo geral; 2) cada período por parte emocional, física (corpo) e espiritual (escolha do usuário: cada período, não só a manhã); 3) pontos positivos e negativos; 4) dicas do mapa védico para a data.
- **Implementado (parte E):**
  - Leitura védica (`src/lib/coach/leitura-vedica.ts`, `leitura-conhecimento.ts`, `src/lib/astrology/horas.ts`): fatos por período (Lua, Tara, casa a partir da Lua natal, ascendente do momento, horas planetárias, relógio do Ayurveda) e do dia (Panchang, trânsitos de Júpiter e Saturno, dasha, melhor janela); texto do motor da Lyra que muda com o céu.
  - Modelo de IA (`src/lib/ai/cliente-de-ia.ts`, `provedores-catalogo.ts`, `provedor-da-plataforma.ts`, `src/lib/coach/leitura-ia.ts`): 18 opções (locais e em nuvem, APIs OpenAI-compatível, Gemini e Anthropic); saída estruturada por JSON Schema com recaída automática; validação Zod, períodos completos, horários reais, sem repetição entre períodos e diferente de ontem; reserva na leitura da Lyra e nova tentativa após 30 min.
  - Admin → Modelos de IA (`ProvedorDeIa.tsx`; `GET/PUT /api/admin/ia`, `POST /api/admin/ia/modelos`, `POST /api/admin/ia/testar`); chave cifrada (AES-256-GCM, HKDF do `AUTH_SECRET`) em `ai_provider_settings` (migração `023`), fora da API genérica.
  - Removidos (prova por grep): consentimento `coach_external_ai`, `/api/perfil/coach-ia`, `CoachIaExterna`, `src/lib/coach/gemini.ts`, `GEMINI_API_KEY` e `ai_config.model_name` (lista fixa `lyra-local-*`); restam só as migrações históricas.
  - Chat sem BYOK usa o modelo da plataforma apenas quando é local; telas: "Leitura do dia" no Meu dia e tópicos do período atual no painel; política de privacidade 2026-10-15.
- **Evidências:**
  - `test` 366/366; `test:integration` 131/131 (servidor HTTP real compatível com a OpenAI em `tests/support`); `test:launchers` OK; lint, format, types e `build` com exit 0.
  - Navegador (produção, 1440 px claro e 390 px escuro): admin com os provedores e a URL padrão do Ollama; Meu dia com resumo, 4 abas com os 3 tópicos, pontos +5/−3 e 5 dicas; painel com os tópicos do período atual; axe sem violações, sem estouro e sem erros de console.
  - Modelo local real (llama.cpp `llama_cpp.server` + Qwen2.5 1.5B GGUF, 2 CPUs): buscar modelos, testar conexão (3–5 s) e salvar pela tela; o servidor recusou `json_schema` com HTTP 500 e o cliente passou para `json_object` com esquema, que gerou um JSON válido (Zod ok, 188–217 s). Na jornada completa pelo app (`/api/coach/hoje`, 220 s), a resposta desse modelo minúsculo foi descartada por repetir textos entre períodos e a pessoa recebeu a leitura da Lyra, como projetado.
- **Limite do ambiente:** o sandbox (2 CPUs, memória limitada) só comporta um modelo de 1,5B, que tem qualidade insuficiente; o processo do modelo foi encerrado por falta de memória quando rodava junto com o navegador. A leitura aceita por um modelo maior (7B ou mais) fica para validar na máquina do usuário.

### 44 · Diferenciais premium de 2026/27 (design aprovado)

- **Status:** 🟢 finalizada · **Commits:** `b8cfea7` (A: reflexão da noite), `371f3b9` (B: respiração guiada), `1824b07` (C: agenda no calendário), `5037045` (D: sua semana), `612fd8f` (E: aura do dia e README) · **Push:** `main -> main` (cada um confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-15):** implementar o design aprovado ("adorei, pode fazer") a partir da prancha com os cinco diferenciais, pesquisados em tendências de outubro de 2026.
- **Implementado:**
  - **Reflexão da noite:** `daily_reflections` (migração 024), `/api/reflexao` (GET, PUT, DELETE) com data conferida no servidor (hoje e ontem), schema compartilhado, seção no Meu dia junto da avaliação da leitura.
  - **Respiração guiada:** técnicas 4-7-8, quadrada e Nadi Shodhana com posição calculada pelo relógio, recomendação explicável, `/respiracao` com orbe, voz, vibração, Wake Lock e modo sem movimento; `breathing_sessions` (migração 025) e soma em `meditation_minutes` com recálculo de metas e sequências.
  - **Agenda no calendário:** gerador iCalendar próprio (RFC 5545/7986), `.ics` de hoje, link privado de 7 dias (`calendar_feeds`, migração 026: SHA-256 + AES-256-GCM, troca e revogação, 404 uniforme, limite por link), política de privacidade atualizada.
  - **Sua semana:** `/api/semana` e `/semana` com indicadores, gráfico com ★ do Tara favorável, metas dia a dia, reflexões, céu da semana, tabela e percepções só com 2+ dias em cada grupo.
  - **Aura do dia:** halo do tom no anel da prontidão, selo da Lua e ações Respirar, Levar para o calendário e Reflexão da noite.
  - Navegação com "Sua semana" e "Respiração" (também em configurações salvas antes delas); LGPD com as três tabelas novas na exportação e na exclusão.
- **Causas raiz tratadas no caminho:**
  - Orbe nascia cheio: a transição CSS longa não tinha valor de partida; a escala passou a ser calculada pelo relógio.
  - Recomendação noturna sugeria respiração que "desperta": regra própria das 18 h às 2 h.
  - Contagem dupla da prática: a respiração já entra em `meditation_minutes`, então a prática do dia é esse total (`praticaDoDia`).
  - Rótulos: "Sáb, 10 De Out" por `capitalize` e unidade colada ao valor para leitores de tela.
- **Evidências:** `test` 401/401, `test:integration` 154/154, `test:launchers` 17/17, lint, format, types e `build` com exit 0; QA no navegador (build de produção) de cada parte em 1440 px claro e 390 px escuro, com axe sem violações; sessão de respiração cronometrada (64,2 s para 64 s); `.ics` e feed validados pela biblioteca `icalendar` do Python, com os horários reais de São Paulo em 15/10/2026 (Brahma 04:02–04:48, Abhijit 11:27–12:17, Rahu Kalam 13:27–15:01, pôr do sol 18:11).
- **Limites e observações:**
  - Google Agenda e Outlook na nuvem só leem o link de assinatura com o app publicado num endereço da internet (`APP_BASE_URL`); em `localhost` a tela avisa e só o calendário do mesmo computador consegue assinar.
  - Os formatos de atalho direto para Google e Outlook não têm documentação oficial; por isso a tela oferece copiar o link, `webcal://` e os passos de cada app.
  - Observado na QA: quando o roteiro recarrega a página no meio de uma busca do sino (`/api/notificacoes`, código anterior à tarefa), o aborto da requisição (`ERR_ABORTED`) aparece como `console.error`. Resolvido na tarefa 48.

### 45 · Verificação dos launchers `run.py` (WSL2 Ubuntu) e `run.sh` (Windows 11) após as tarefas 42 e 43

- **Status:** 🟢 finalizada · **Commit:** `a0b2eac` · **Push:** `56b6a42..a0b2eac main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-15):** verificar o `run.py` (WSL2 Ubuntu) e o launcher do Windows 11. O repositório não tem `run.bat`; o usuário confirmou que se referia aos launchers existentes (`run.sh` no Git Bash e `run_windows.py` no PowerShell/CMD).
- **Causa raiz encontrada:** o `.env.local` continuava com variáveis que o app não usa mais (`GEMINI_API_KEY`, removida na tarefa 43, e `APP_PORT`, dos launchers antigos) e nenhum diagnóstico avisava, deixando um segredo esquecido. Agora o `doctor` do `run.py` e do `run.sh` e o `pnpm env:init` avisam, sem apagar a linha (a chave pode precisar ser revogada no provedor antes).
- **Evidências (Ubuntu 24.04, Python 3.13, Node 24.21, Docker 29.8, Compose 5.5, 25 migrations):**
  - `run.py`: `doctor` (Docker parado → erro com correção, exit 1); `fix` (3 variáveis novas acrescentadas sem alterar valores); `up` com `/api/health`, `/`, `/login` e login do admin; segundo `up` sem duplicar processo; `status`; `logs app`; `stop app` com porta liberada; `up --prod`; porta 3000 ocupada por terceiro (aplicação na 3001, PID do terceiro intacto); `up` com Docker parado (exit 1); reinício com o banco existente (dados preservados); `stop`.
  - `run.sh` (Linux, bash 5.2): `doctor`, `up`, segundo `up` idempotente, `status`, `logs app`, `stop app`, `up --prod`; parada cruzada (o `run.py stop` encerrou a aplicação do `run.sh` e o `run.sh status` mostrou tudo parado).
  - Estático: `bash -n` e `shellcheck -S warning` sem achados; `ruff check`, `ruff format --check` e `mypy --strict` (venv do launcher) sem achados no `run.py` e no `run_windows.py`; `test:launchers` 17/17; `test` 367/367; `test:integration` 131/131; lint, format, types e `build` com exit 0.
- **Limite do ambiente:** a execução real no Windows 11 (Git Bash e PowerShell) depende de uma máquina Windows; o sandbox é Linux.

### 46 · README atualizado com o sistema real

- **Status:** 🟢 finalizada · **Commit:** `0389d8b` · **Push:** `01c2d81..0389d8b main -> main` (confirmado por `git ls-remote`)
- **Encontrado:** selo e texto com 314 e 241 + 73 testes (hoje 367 + 131 + 17), nenhuma menção ao coach "Seu dia", ao mapa védico, às métricas reais, às metas automáticas, ao modelo de IA local ou à LGPD; árvore de pastas sem `coach`, `astrology`, `metas`, `lgpd`, `tests` e `run_windows.py`; scripts `env:init`, `db:logs` e `geo:cidades` ausentes.
- **Atualizado:** novidades de outubro de 2026, recursos, stack (astronomy-engine e GeoNames), passo a passo do modelo de IA local (Ollama, LM Studio, Jan, llama.cpp) com a recomendação de 7B ou mais, `.env.local` (variáveis obsoletas e `AUTH_SECRET` na cifra da chave), scripts, documentação (`launchers.md`, `lgpd.md`), arquitetura, testes, segurança e roadmap.
- **Evidências:** os 14 links relativos do README apontam para arquivos existentes; `check:format`, `check:lint`, `check:types` e `test` 367/367 com exit 0 (o código não mudou desde a validação completa da tarefa 45).

### 47 · Identidade oficial: logo como marca e favicon, cores do app pelo logo

- **Status:** 🟢 finalizada · **Commit:** `041ae78` · **Push:** `9ed930a..041ae78 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-15):** usar o logo oficial anexado (o "L" em teal abraçando o coração coral) como logo e favicon, e o app precisa seguir as cores do logo.
- **Implementado:**
  - Logo original versionado em `docs/marca/lyra-logo-oficial.png`; `scripts/gerar-icones-da-marca.py` converte o fundo branco em transparência ("cor para alfa"), recorta e gera o logo da interface, `favicon.ico` (16–64 px), `icon.png`, `apple-icon.png` e os ícones do manifesto (192, 512 e maskable). Rodar de novo reproduz os arquivos byte a byte (conferido por `md5sum -c`).
  - Componente `MarcaLyra` (next/image) no lugar do ícone genérico em 7 pontos: sidebar, menu do celular, landing (cabeçalho e rodapé), login, tela de carregamento e erro global. No escuro a marca fica num ladrilho claro, porque o logo foi desenhado sobre branco e perdia os brilhos.
  - `src/app/manifest.ts` com nome, cores e ícones oficiais.
  - Paleta dos dois temas recalculada a partir do logo: teal `#087678` (ação), coral `#BE3B13` (astral e IA, antes violeta), neutros petróleo, erro em carmim frio `#B6163C` (afastado do coral), tokens decorativos `brand-teal`/`brand-coral`, gráficos, sombras, rolagem e cor da barra do navegador. O tom "coral" do Puck voltou a ser coral (antes caía no dourado).
- **Causas raiz tratadas no caminho:**
  - A marca encolhia no tema escuro: `padding` em % é calculado sobre a largura do elemento pai; o respiro do ladrilho passou para `scale`.
  - O coral original (`#F87850`) fica abaixo de 3:1 sobre branco: o texto usa a versão escura, e o original fica restrito ao decorativo.
- **Evidências:** `tema.test.ts` com todos os pares WCAG nos dois temas; axe sem violações em landing, login, painel, menu do celular, `/dia`, `/chat`, `/goals` e `/profile` (1440 e 390 px, claro e escuro), marca carregada no tamanho certo e zero erros de console; `/favicon.ico`, `/icon.png`, `/apple-icon.png`, `/manifest.webmanifest` e `/icones/*` com HTTP 200 e os `<link>` no HTML; `test` 367/367, `test:integration` 131/131, lint, format, types, `ruff` e `build` com exit 0.

### 48 · Busca cancelada pela saída da página não vira erro no console

- **Status:** 🟢 finalizada · **Commit:** `3f19d7c` · **Push:** `c787b85..3f19d7c main -> main` (confirmado por `git ls-remote`)
- **Origem:** observação registrada na QA da tarefa 44 (erro no console ao recarregar no meio de uma busca do sino).
- **Causa raiz:** ao navegar, recarregar ou fechar a aba, o navegador dispara `pagehide` e, em seguida, recusa os `fetch` em andamento com `TypeError: Failed to fetch` (comprovado no Chromium nos três casos). As leituras do app tratavam esse cancelamento como falha e o registravam com `console.error`; o sintoma não era só do sino: sessão, perfil, configuração pública, efemérides e Puck faziam o mesmo.
- **Implementado:** `src/lib/navegador/saida-da-pagina.ts` marca a saída no `pagehide` e desfaz no `pageshow` (volta do bfcache); `useKeyedResource` (carga inicial e recarga) descarta a recusa da saída, assim como o contexto de sessão, o de saúde (sem acrescentar aviso de falha), cabeçalho, sidebar, home, gráfico de peso, compras, privacidade, busca de cidades e os dois renderizadores do Puck. Falhas reais com a página aberta continuam registradas.
- **Evidências:**
  - Roteiro no build de produção com 4 rotas atrasadas 4 s e navegações e recargas no meio: 37 buscas canceladas; código anterior com 5 erros ("Falha ao consultar a sessão: TypeError: Failed to fetch"), código novo com 0.
  - Controle: `/api/notificacoes` derrubada com a página aberta continua gerando "Falha ao carregar as notificações".
  - `test` 404/404 (3 novos do detector), `test:integration` 154/154, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 49 · Leituras do Meu dia em linguagem simples e pessoal

- **Status:** 🟢 finalizada · **Commit:** `d892fde` · **Push:** `b95cb80..d892fde main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/dia`, as leituras do mapa (ex.: "Dia de equilíbrio: escolha bem os horários") precisam ser menos genéricas, falar do que o mapa da pessoa realmente diz, de forma natural e sem palavras técnicas, em todas as partes da página.
- **Causa raiz:** os textos contavam o cálculo pelo nome técnico (Tara Pratyari, Rahu Kalam, Choghadiya, nakshatra, tithi, Mahadasha, "7ª casa", Vata/Pitta/Kapha, mantras de prática em sânscrito) em vez do significado; a manchete não usava o mapa da pessoa.
- **Implementado:**
  - `src/lib/coach/linguagem-simples.ts`: nomes simples das janelas (hora do silêncio, horário mais forte do dia, pausa para começos), clima da Lua, temas das 12 áreas do mapa, sintonia entre a Lua de hoje e a de nascimento, dia da Lua, mês e ano das fases da vida e o detector de termos técnicos (fronteira de palavra com acentos, nomes dos 27 nakshatras, tithis e yogas).
  - Tara com `tema` e `conselho`; casas da Lua e trânsitos de Júpiter e Saturno contados pelo efeito ("a Lua passa pela área do seu mapa ligada às parcerias").
  - Resumo da leitura: tom do dia para a pessoa, área do mapa, Lua de nascimento e sintonia com a de hoje, fase da vida com datas (regida pelo planeta, sem citar Rahu e Ketu) e os horários que mais pesam; manchete com o tema do dia para a pessoa.
  - "O céu de hoje" em linguagem simples (`ceuSimples`), com os nomes tradicionais num quadro recolhido para quem estuda; corpo do dia pelas tendências do Ayurveda em palavras.
  - Janelas de hoje, `.ics`, respiração (técnica "Alternada"), semana, perfil e política de privacidade sem jargão.
  - IA: instruções de linguagem simples e leitura do modelo com termo técnico é descartada (a pessoa recebe a da Lyra); briefing versão 3 (os guardados antes são refeitos).
- **Evidências:**
  - Teste de varredura: 60 dias × 3 perfis (com mapa, outro mapa e sem cidade de nascimento), com e sem check-in, sem nenhum termo técnico em manchete, resumo, períodos, janelas, dicas, céu e leitura.
  - Navegador (build de produção, `/dia`): 71 termos técnicos no texto antes, 0 depois (fora do quadro tradicional), em 1440 px claro e 390 px escuro; axe sem violações, sem estouro horizontal e zero erros de console.
  - `test` 408/408, `test:integration` 154/154, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 50 · Sua semana com as informações e a leitura do mapa

- **Status:** 🟢 finalizada · **Commits:** `2985ae7` (parte 1: fase da vida reutilizável, enviada a pedido do usuário) e `01ff0fc` · **Push:** `96f5882..2985ae7` e `2985ae7..01ff0fc main -> main` (confirmados por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/semana` não aparecem textos nem leitura do mapa védico; os cartões "Sua semana", "Prontidão por dia", "Reflexões da noite" e "Dia a dia" ficam sem informação.
- **Causa raiz:** a página só mostrava registros (check-in, reflexões, respiração) e o Tara de cada dia. Numa conta sem registros e sem cidade (como as de admin no banco de desenvolvimento, conferido no MySQL), todos os cartões ficavam com "—" e não havia leitura do mapa nem explicação do que faltava.
- **Implementado:**
  - `src/lib/semana/leitura.ts`: leitura da semana pelo motor da Lyra, sem IA e sem depender de registros. A semana que passou (dias a favor, neutros e de cuidado; melhores dias; áreas do mapa por onde a Lua passou), a semana que vem (dias mais a seu favor e para quê, dias de cuidado, ponto sensível do mapa, Lua cheia e nova), fase da vida e trânsitos de Júpiter e Saturno. Só com cidade: o céu da semana. Sem cidade: o que falta.
  - Página: seção "Leitura da semana" no topo com os próximos 7 dias; cartões vazios dizem o que falta e levam à ação (check-in, reflexão da noite, perfil); "Dia a dia" com o tom do dia para você e a Lua; sem a palavra Tara (percepções e legendas).
  - Cartão "Sua semana" do Meu dia mostra a semana que vem quando ainda não há percepção.
- **Evidências:**
  - Testes: `leitura.test.ts` (contagem que fecha em 7 dias, "no sábado"/"na segunda-feira", Lua cheia e nova, varredura de 26 semanas × 3 perfis sem termo técnico) e integração com mapa, só com cidade e sem cidade.
  - Navegador (build de produção): `/semana` com dados (1440 px claro e 390 px escuro) e conta sem cidade nem registros (390 px escuro), e `/dia`: axe sem violações, sem estouro horizontal, zero erros de console e 0 termos técnicos no texto.
  - `test` 412/412, `test:integration` 155/155, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 51 · Plano do dia pronto ao entrar no app

- **Status:** 🟢 finalizada · **Commit:** `cebd832` · **Push:** `187fcaa..cebd832 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/plan`, o plano deve ser gerado automaticamente quando a pessoa entra no app.
- **Causa raiz:** `obterPlanoAtualizado` devolvia `null` sem plano salvo ("o primeiro plano é sempre um pedido da pessoa"); o plano só existia depois do clique em "Gerar plano real", e a rotina diária só refazia o plano de quem já tinha um.
- **Implementado:**
  - A primeira leitura do plano o gera (origem automática, sem consumir a cota das gerações manuais) e informa `primeiro`.
  - `prepararPlanoAoEntrar`: o login agenda com `after()` do Next.js o preparo do plano do dia, depois da resposta (o login não fica mais lento), só depois do onboarding e só se o plano da pessoa inclui o Plano de IA; falhas vão para o log seguro.
  - A rotina diária do coach cria o plano de quem ainda não tem.
  - Tela: aviso "Seu plano de hoje foi preparado automaticamente".
  - Testes de integração: `after()` emulado (roda logo depois da resposta, como no servidor).
- **Evidências:**
  - Integração: primeiro plano automático sem cota; login antes do onboarding não gera; login depois do onboarding deixa o plano salvo.
  - Navegador (build de produção, login real pela tela): o plano já estava salvo no MySQL antes de abrir `/plan`, origem automática, cota intacta, tela com o plano pronto ("Regenerar plano"), axe sem violações e zero erros de console, em 1440 px claro e 390 px escuro.
  - `test` 412/412, `test:integration` 156/156, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 52 · Chat redesenhado, simples e em uma coluna

- **Status:** 🟢 finalizada · **Commit:** `4cbf2e0` · **Push:** `80a891f..4cbf2e0 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** reformular e redesenhar `/chat`, que estava confuso, deixando-o mais simples e na tendência de 2026.
- **Pesquisa:** padrões de interfaces de conversa com IA de 2026 (coluna única centrada, começo da conversa com perguntas prontas em cartões, campo fixo embaixo, resposta sem caixa, ações discretas, aviso de limites).
- **Antes:** cabeçalho grande, cartão de conversa, perguntas prontas repetidas embaixo e na lateral e uma lateral técnica ("API local Next.js", "Camadas que sustentam a conversa").
- **Implementado:**
  - Uma coluna centrada: barra mínima (marca, estado, "Nova conversa" e "Como a Lyra responde"), começo da conversa com a Lyra e as perguntas em cartões, campo fixo embaixo com o aviso de bem-estar.
  - Resposta da Lyra em texto corrido com a marca; pergunta em balão; copiar e refazer no hover, no foco e sempre no toque.
  - Informações e chave própria do Gemini (BYOK, que continua funcionando) no botão de informações.
  - Causa raiz corrigida no caminho: o campo aceitava 4000 caracteres e o servidor recusa acima de 2000; agora o limite é o mesmo.
  - Sem o aviso "Mensagem enviada" a cada envio; resposta revelada mais rápido e inteira com movimento reduzido.
  - Textos padrão novos e rótulos do page builder coerentes; todos os campos da configuração do chat continuam em uso. `QuickReply` removido (sem uso; `grep` sem ocorrências).
- **Evidências:**
  - Navegador (build de produção), jornada completa em 1440 px claro e 390 px escuro: pergunta pronta respondida com o dia da pessoa, pergunta digitada com Enter, "Refazer" troca a resposta sem duplicar, painel de informações com a chave própria e "Nova conversa" volta ao começo. axe sem violações (início, conversa e painel), sem estouro horizontal e zero erros de console.
  - `test` 412/412, `test:integration` 156/156, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 53 · Construtor de UI e editor Puck funcionando de ponta a ponta

- **Status:** 🟢 finalizada · **Commit:** `e1bee03` · **Push:** `58e4f6c..e1bee03 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** confirmar que `/admin/page-builder` e `/admin/puck` funcionam de verdade, sem simulações, placeholders, hardcode ou cortes.
- **Achados (auditoria do código) e causas raiz:**
  - "Publicar agora" publicava o rascunho salvo e descartava em silêncio as edições da tela; trocar de superfície também as descartava.
  - Um único campo novo no schema invalidava a configuração guardada inteira e a página voltava ao padrão.
  - Destino dos botões da landing aceitava qualquer texto e ia direto ao roteador.
  - Campos sem efeito: escalas de cards, tabelas e botões do app (só um card usava, com `transform`), todas as escalas da landing, rótulo do botão de reavaliar, fluxo de eventos do monitoramento, título do estado inicial de dispositivos, selo e descrição do acesso e nota do login.
  - Prévia do app com uma sidebar simulada, diferente da real.
  - Seis documentos do Puck (landing, login, app shell, cobrança e construtor) não eram exibidos em página nenhuma; documentos nasciam com blocos de demonstração para desenvolvedores; a raiz pública mostrava chips técnicos; o editor gravava no documento publicado o e-mail e o nome de quem editava; a migração não descia nos slots; o card de plano guardava uma cópia que não se atualizava; erro do catálogo de planos virava lista vazia; código morto (`fetchListDocumentos`, `lyraPuckConfig`).
  - Textos padrão e avisos de plano com jargão de implementação (MySQL, entitlement, "auth vivo", "landing editável").
- **Implementado:** publicar com a configuração enviada (validada no servidor), confirmação de descarte, `mesclarComPadrao`, validação de destino (rota, âncora ou https), todos os campos ligados (`data-slot` + `zoom`, `data-escala` na landing), sidebar real na prévia (`inert`), documentos exibidos nas páginas, documentos iniciais vazios com retirada exata dos blocos de demonstração na leitura, raiz pública só com os blocos, limpeza dos textos resolvidos ao gravar e ao ler, estados neutros para visitante, migração recursiva, plano relido pela chave, erro do catálogo no seletor, opções de superfície completas, textos reescritos. Código morto removido (`grep` sem ocorrências).
- **Evidências:**
  - Navegador (build de produção): editar o título da landing mostra o aviso de edição não salva e a troca de superfície pede confirmação; "Publicar agora" publica e a landing do visitante exibe o título; prévia do app com a sidebar real (248 px); bloco arrastado da lista para o canvas do Puck e rascunho salvo; bloco publicado aparece na landing sem chips técnicos; login com selo e nota, sem estouro em 390 px. axe sem violações (construtor, landing, login 390) e zero erros de console. Dados de teste desfeitos ao final.
  - Banco de desenvolvimento: o documento `landing-home` com os 2 blocos de demonstração em zonas legadas passa a ser lido vazio.
  - `test` 426/426, `test:integration` 159/159, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
- **Observação:** quem já salvou textos no construtor continua vendo os textos salvos; os padrões novos valem para o que nunca foi salvo ou após "Restaurar padrão".

### 54 · Vários modelos de IA com ordem de uso e troca automática

- **Status:** 🟢 finalizada · **Commit:** `571e8b7` · **Push:** `b3e34c9..571e8b7 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/admin/ai-config`, no card "Modelo de IA da plataforma": vários modelos locais e vários em nuvem ao mesmo tempo (inclusive o motor da Lyra), vários provedores ao mesmo tempo e, abaixo do aviso de privacidade, 5 seletores com a ordem de uso; se o modelo em uso falhar ou ficar sem tokens, o próximo retoma de onde ele parou, sem a pessoa perceber.
- **Pesquisa:** padrões de 2026 de cadeias de fallback em gateways de LLM (lista ordenada de alvos, troca em 429/5xx/tempo esgotado, estado por alvo).
- **Antes:** uma única linha (`ai_provider_settings`) com um provedor e um modelo, escolhidos por botão de rádio; qualquer falha caía direto no motor da Lyra.
- **Implementado:**
  - Migração `027`: `ai_provider_connections` (um provedor por linha, com os modelos escolhidos e a chave cifrada) e `ai_model_chain` (até 5 posições), com cópia da configuração anterior e remoção da tabela antiga; gravação na mesma transação.
  - Cadeia de modelos: falha, cota, rede, tempo máximo ou resposta reprovada passam a vez; resposta cortada no limite de tokens é continuada pelo próximo, sem repetir a emenda; o motor da Lyra fecha a cadeia. O cliente de IA detecta corte nas três APIs e envia o limite de tokens.
  - Leitura do dia, chat (só modelos locais, por privacidade) e autoteste usam a ordem; mudar modelo ou ordem refaz o "Seu dia".
  - Tela redesenhada: caixas de seleção nos provedores (motor da Lyra nos dois grupos), painel por provedor com URL, chave, busca, inclusão pelo nome e teste por modelo, e os 5 seletores com opções já usadas indisponíveis.
- **Evidências:**
  - Migração aplicada no banco de desenvolvimento; cópia validada em banco temporário (provedor antigo virou a 1ª posição e o motor a 2ª; tabela antiga removida).
  - Navegador (build de produção, servidor de IA HTTP real): dois provedores locais marcados, modelos buscados e escolhidos, teste por modelo, ordem de 3 posições salva e recarregada, opção usada indisponível em outra posição, axe sem violações em 1440 px e 390 px, sem estouro e zero erros de console. Configuração devolvida ao motor da Lyra ao final.
  - Integração: ordem validada (modelo fora dos escolhidos, repetido, mais de 5 posições, vazia), cota esgotada (429) passa a vez e o 3º modelo continua a leitura cortada pelo 2º, chat só com modelos locais e motor quando todos falham.
  - `test` 436/436, `test:integration` 162/162, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 55 · Motor da Lyra mestre em astrologia védica e saberes védicos, sem IA

- **Status:** 🟢 finalizada · **Commit:** `513f3b8` · **Push:** `4fcffdc..513f3b8 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** o motor da Lyra, sem modelo de IA, deve ser mestre em Jyotish, Vedanta, Upanishads, Upavedas e Vedangas, aprender com os três arquivos do usuário (Mapa Lyra DM Samadhi, Livro do Mapa Lyra DM Samadhi e Mapa Quantum Lyra e Arkático), ter a personalidade e a consciência da Lyra e separar os tipos de mapa.
- **Decisão:** "treinar sem IA" foi implementado como curadoria: os documentos e as fontes clássicas viraram tabelas e verbetes com fonte, e o motor monta respostas por regras (mesma pergunta e mesmo mapa, mesma resposta).
- **Implementado:**
  - Base de conhecimento em `src/lib/lyra/conhecimento/`: grahas, 12 signos, 12 casas, 27 nakshatras, dignidades e temas dos dashas (`jyotish.ts`); Vedanta e Upanishads (`vedanta.ts`); os 4 Upavedas com o relógio dos doshas (`upavedas.ts`); os 6 Vedangas (`vedangas.ts`); os três tipos de mapa, Roda de Cura, estágios alquímicos, chakras, planos e linhagens do Samādhi e o Score de Ação do Mapa Quantum (`mapas.ts`).
  - Personalidade (`personalidade.ts`): identidade, consciência, missão, valores, voz, limites e `instrucoesDeIdentidade()` para os modelos de IA.
  - Leitura do mapa (`leitura-do-mapa.ts`) em três partes, com 3 a 5 percepções; Samādhi e Quantum declaram o que não é calculável (totem, estágio alquímico atual, Desenho Humano, Mapa Arkático) em vez de inventar.
  - Chat (`responder.ts`): identidade, tipos de mapa, perguntas sobre o próprio mapa (Ascendente, Lua, dasha, casas, dosha, Roda de Cura), Score de Ação e verbetes; o chat local consulta o motor primeiro.
  - `GET /api/astrologia/mapa` devolve `leitura`; o card "Meu mapa védico" do perfil mostra a "Leitura da Lyra" com uma aba por tipo de mapa.
  - Documentação: `docs/motor-da-lyra.md`.
- **Achados nos documentos de origem:** o exemplo do Mapa Quantum (energia 6, pressão 4, tempo 20, SA 72) não fecha com a própria fórmula (máximo 68); a Lyra segue a fórmula. Ficaram de fora as diretrizes dos rascunhos de chatbot contrárias à ética do produto: prever ano de morte ou datas de doença, "remover restrições", conversa "viciantemente envolvente" e esconder o método.
- **Evidências:**
  - Unitários `lyra.test.ts` (30): tabelas completas, verbetes normalizados, Score de Ação, leitura determinística sem lacunas de montagem, Lagna indisponível sem hora, respostas por assunto e fora do domínio.
  - Navegador (build de produção, mapa de 23/09/1982 10:40 em São Paulo): perfil com 3 a 5 percepções, Ascendente em Escorpião, abas Samādhi e Quantum; chat respondeu Ascendente, Vedanta e Score de Ação; axe sem violações, sem estouro e zero erros de console em 1440 px claro e 390 px escuro.
  - `test` 466/466, `test:integration` 162/162, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 56 · Todo modelo de IA conectado age como a Lyra

- **Status:** 🟢 finalizada · **Commit:** `905e145` · **Push:** `4c9faf7..905e145 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** o motor da Lyra funciona sem modelos de IA, mas todo modelo conectado deve funcionar junto com ele e agir como a Lyra, com mais tecnologia e inteligência, na leitura diária e no chat.
- **Antes:** o chat dizia ao modelo "Você é o Lyra MetaCare, um assistente..." e a leitura do dia, "Você é a astróloga védica e coach de bem-estar"; nenhum dos dois levava a identidade da Lyra, e a leitura do dia não recebia a leitura do motor. O BYOK do Gemini mandava as instruções como mensagem do usuário, por uma chamada própria duplicada.
- **Implementado:**
  - `src/lib/lyra/modelos-como-lyra.ts`: instruções do chat (identidade completa, como trabalhar sobre a base, tipos de mapa, habilidades do admin, leitura do mapa ou o que falta, verbete ligado à pergunta e resposta do motor) e da leitura do dia (identidade e regras da leitura acima das gerais).
  - Conferência da voz da Lyra (`conferirVozDaLyra`): resposta vazia, apresentação como outro assistente ("sou o ChatGPT", "me chamo Qwen") ou previsão de morte ou doença passam a vez ao próximo modelo; no fim responde o motor. Franqueza sobre a tecnologia continua permitida ("não sou o ChatGPT", "sou uma IA").
  - Leitura do dia: o modelo recebe a leitura que o motor já escreveu para hoje como base, e a mesma conferência entra em `conferirLeituraDaIa`. Com modelo na ordem, `VERSAO_DAS_INSTRUCOES_DA_LYRA` entra na assinatura do "Seu dia".
  - Chat: plataforma (só modelos locais) e BYOK passam pela mesma cadeia; o BYOK usa o cliente de IA (`systemInstruction`, chave no cabeçalho) e a chamada duplicada foi removida (prova: `grep` sem resto de `generativelanguage` e do prompt antigo na rota).
  - Documentação: `docs/ia-automatica.md` e `docs/motor-da-lyra.md`.
- **Evidências:**
  - Unitários `modelos-como-lyra.test.ts` (12) e `leitura.test.ts` (sistema começa por "Você é a Lyra", pedido com a leitura do motor, leitura recusada por outra voz).
  - Integração com servidor HTTP real: o 1º modelo se apresenta como o Qwen e perde a vez, o 2º responde como a Lyra; os dois recebem a identidade, a resposta do motor com a métrica real e o estado do mapa; sem voz da Lyra, responde o motor.
  - Navegador (build de produção, servidor de modelos HTTP local, conta com mapa de 23/09/1982 10:40 em São Paulo): o chat mostrou a resposta do modelo que falou como a Lyra e escondeu a do que se apresentou como outro assistente; todas as chamadas (chat e leitura do dia) começaram por "Você é a Lyra" e levaram o verbete, o Ascendente em Escorpião e os tipos de mapa; axe sem violações, sem estouro e zero erros de console em 1440 px claro e 390 px escuro. Configuração devolvida ao motor da Lyra ao final.
  - `test` 478/478, `test:integration` 163/163, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
- **Fronteira externa:** o BYOK com o Gemini real exige a chave de uma pessoa; o caminho foi validado pelo cliente de IA já testado, sem chamada externa simulada.

### 57 · Inventário forense de tudo o que está implementado

- **Status:** 🟢 finalizada · **Commit:** `57345be` · **Push:** `5032d66..57345be main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** verificar tudo o que está implementado (componentes, gráficos, tabelas, ícones, botões e cards), com dados reais e sem placeholder ou hardcode.
- **Método:** quatro auditorias de leitura em paralelo (gráficos, tabelas, cards, ícones e botões; design system; erros e cortes; HTML semântico), com cada achado conferido no código. Inventário: 5 gráficos Recharts, 1 em CSS e 3 em SVG; 8 tabelas; 112 usos do `Card` e cerca de 9 variantes de card fora dele; 368 ícones Lucide. Não há "Lorem", TODO, mock, `any`, `@ts-ignore` nem `eslint-disable` em produção. Os achados de erro, design system, controles e HTML foram encaminhados às tarefas 58 a 62.
- **Achado crítico corrigido (dados inventados):** sem nenhum registro, o painel mostrava ICQ 67 "harmonia", Índice Pránico 77 e Chakras 72, porque os motores completam com valores de referência os sinais que faltam.
  - `src/lib/integrativo/cobertura.ts`: cada índice só aparece com sinais medidos suficientes (3, ou 30% dos sinais do motor); a tela diz quantos entraram e quais faltam, com o botão de registro do dia. Dosha sem sinais vem só da Lua, e a tela e o chat dizem isso.
  - Chat local: só cita índices com cobertura suficiente e não diz mais "0 passos" quando não há passos.
- **Outros achados corrigidos:**
  - Idade biológica ("Vitalidade 50/100", ritmo 1,00× sem marcadores) e o estado vazio dos pilares testavam um objeto que sempre existe; agora testam o registro do dia e o mínimo de 3 marcadores.
  - "Trajetória recente" misturava VFC em ms e prontidão de 0 a 100 na mesma linha; agora uma grandeza só, com eixo Y e unidade. Tendência védica passou ao `ChartContainer` com legenda e eixo.
  - Gráficos com alternativa em texto (`ChartFigure`, resumo com faixa, último valor e lacunas); o tooltip escondia o valor 0 e não usava o formato brasileiro.
  - Meta de sono fixa em 8 h: agora a meta "Sono por noite" da pessoa ou a sugestão do catálogo, marcada como sugestão.
  - Painel admin mostrava "0" quando a consulta falhava; agora estado de erro com "Tentar de novo".
  - Peso no perfil: eixo dd/MM, unidade kg e erro separado de "sem dados". Frequência ao vivo com unidade e resumo.
  - CSV de usuários: RFC 4180 com `;`, BOM, campos nulos vazios e fórmulas neutralizadas (CWE-1236).
  - Textos falsos: "dados reais" sem registro, "Atualização contínua" sem dispositivo, descrição de glicose sem leitura, fallback "Paciente" e emojis lidos em voz alta nos títulos.
- **Evidências:**
  - Unitários novos: `cobertura.test.ts` (4) e `gerar-csv.test.ts` (4); `test` 486/486, `test:integration` 163/163, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
  - Navegador (build de produção, conta sem registros, plano com o painel completo): nenhum ICQ, Prana, Chakras ou vitalidade inventados, estado vazio presente, axe sem violações, sem estouro e zero erros de console em 1440 px claro e 390 px escuro.

### 58 · Erros, falhas, possíveis erros e cortes em código

- **Status:** 🟢 finalizada · **Commit:** `4c81c20` · **Push:** `de0fbf3..4c81c20 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** verificar erros, falhas, possíveis erros e cortes em código e corrigir pela causa raiz.
- **Varredura:** `check:types` e `check:lint` sem erros nem avisos; zero `any`, `@ts-ignore`, `eslint-disable`, TODO, código comentado ou "// ... resto"; todas as rotas com Zod e autorização. Os defeitos reais estavam no tratamento de erros, em dados derivados e em código morto.
- **Causas raiz corrigidas:**
  - **Contrato do cliente de dados:** `response.json()` era lido sem checar a resposta; rede fora, 502 do proxy ou página HTML rejeitavam a promise, contra o `{ error }` que 31 chamadores esperam (login travado, cargas eternas, "Unexpected token '<'" no chat). Novo `src/lib/http/transporte.ts` (`buscarJson`) nunca lança e devolve a falha em pt-BR com status e motivo; usado por consultas, autenticação, funções, upload e telas administrativas.
  - **Sessão:** `GET /api/auth/session` respondia 500 sem corpo e a pessoa logada via a landing; agora 503 com JSON, e o app tenta de novo (1 s e 3 s) e avisa. Logout que falha é avisado em vez de fingir a saída.
  - **Perda de dados do ciclo menstrual:** falha de leitura era engolida, o formulário mostrava vazio e "Salvar" apagava o ciclo. Agora a falha bloqueia o formulário com "Tentar de novo".
  - **Idade:** gravada no cadastro (defasada a cada aniversário) e com 18 inventado por padrão; agora vem da data de nascimento (`idadeAtual`, SQL `TIMESTAMPDIFF`) no limite de frequência cardíaca e no painel.
  - **Datas de criação e atualização:** vinham do relógio do navegador; a API ignora `created_at`/`updated_at` e o MySQL mantém (`ON UPDATE CURRENT_TIMESTAMP`).
  - **Saúde dos dados (admin):** baixava todos os perfis com e-mail e todas as métricas para contar no navegador, e a API analítica lia a tabela inteira na memória. Nova `GET /api/admin/saude-dos-dados` agrega no MySQL, pagina os inativos e mostra erro real.
  - **Efeitos sem guarda:** cabeçalho e menu lateral faziam a mesma consulta sem descartar respostas obsoletas (hook único compartilhado); busca de usuários cancela a anterior (`AbortController`); sincronização com `catch`.
  - **Erros do Puck engolidos** passaram a ser registrados, e o hero não promete mais uma recarga que não acontece.
  - `metadataBase` usava um domínio inexistente; agora `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL`.
- **Código morto removido (prova com `rg`, sem resultado):** `integrations/mysql/server.ts`, `lib/puck/data-sources/index.ts`, `lib/site-page-config/index.ts`, `api/rpc/get-data-health-metrics`, `extractMetricCompleteness`, consulta especial de perfis com métricas, `foreignTable` (aceito e ignorado), `gruposDaCasa`, `chavesComDemonstracao`, `export default` duplicado do `ChatInput`; leitura de JSON opcional duplicada virou `lerJsonOpcional`.
- **pt-BR:** "Dashboard" virou "Painel"; "Eyebrow", "Placeholder", "Sidebar e branding", "Insight" e "Score cognitivo" traduzidos; carrossel lido em pt-BR; sugestão "IA médica" trocada pela Lyra de bem-estar.
- **Evidências:**
  - Unitários novos: `transporte.test.ts` (5) e `idade.test.ts` (2); integração nova da saúde dos dados conferindo os números com o próprio MySQL. `test` 491/491, `test:integration` 164/164, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
  - Navegador (build de produção, 1440 px claro e 390 px escuro): login pela tela, saúde dos dados e painel admin carregando, busca com digitação rápida, falha de rede provocada na leitura do ciclo bloqueando o formulário, "Tentar de novo" recarregando e o ciclo de 29 dias preservado no banco; axe sem violações e zero erros de console fora da falha provocada.

### 59 · UI Elements (Elementos de Interface) premium

- **Status:** 🟢 finalizada · **Commits:** `edaf2ab` e `b7bebef` (restauração de testes) · **Push:** `5c3f5b5..edaf2ab` e `edaf2ab..b7bebef main -> main` (confirmados por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todos os elementos de interface no melhor padrão premium de 2026.
- **Pesquisa (2026):** dashboards de SaaS priorizam estados vazios com ação, gráficos legíveis sem depender do mouse, alto contraste e modo escuro cuidado ([SaaSFrame](https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns), [TFC](https://www.thefrontendcompany.com/posts/ui-trends)); o sistema "Lyra Clean" já segue essa linha, e a tarefa fechou as lacunas dele.
- **Implementado (`src/app/globals.css` e usos):**
  - Contorno de campo `--input` com 3:1 no claro (antes 1,37:1); `tema.test.ts` agora exige 3:1 de `--input` e `--control` sobre cinco superfícies nos dois temas.
  - Véu de modal (`--overlay`, `bg-overlay/55`) escuro nos dois temas; antes `bg-foreground/40` clareava a tela no escuro e o ícone branco do avatar sumia.
  - Sombras com `--sombra-cor` e `--sombra-forca` por tema: o Tailwind 4 copia a sombra para a classe, então o bloco `--shadow-*` do `.dark` era código morto.
  - Escala completa de raio (`xs` a `4xl`, teto de 20 px) e de texto (`text-micro`, `text-caption`, `text-body`) no lugar de 80 valores soltos (`rounded-[10px]`, `text-[13px]`, `text-[15px]`, `text-[0.6875rem]`); `outline-none` e `bg-gradient-to-*` trocados pelos nomes do Tailwind 4; durações e curvas de movimento nomeadas.
  - Foco: a regra que escondia o contorno tinha especificidade maior que `:focus-visible` e o foco sumia nas regiões roláveis e abas; agora `:where()` zera a especificidade. O link "Pular para o conteúdo principal" ficava recortado em 1 px mesmo com foco; agora aparece.
  - `cn()` conhece as escalas do tema: `text-body` era lido como cor e apagava `text-primary-foreground` (botão grande com 3,19:1, achado pela varredura do axe).
  - Cartões do coach sem vidro fosco, sombra e aura pulsando sem parar (o período atual se destaca pela borda e pelo anel).
  - `docs/design-system.md` atualizado.
- **Correção de um erro meu:** o commit `edaf2ab` sobrescreveu o `utils.test.ts` existente (6 testes); `b7bebef` restaurou os 6 junto com os novos.
- **Evidências:** `test` 493/493, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro): link de pular visível no primeiro Tab, foco de 2 px na região rolável, contorno do campo com 3,39:1 (claro) e 3,99:1 (escuro), véu do modal escuro nos dois temas, varredura de 20 páginas com axe sem violações, sem estouro e zero erros de console.

### 60 · Componentes de Design System premium

- **Status:** 🟢 finalizada · **Commit:** `d7ecbbd` · **Push:** `322bb74..d7ecbbd main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todos os componentes do design system no melhor padrão premium.
- **Base:** auditoria dos 36 componentes de `src/components/ui` (variantes, estados, tokens, contraste calculado e uso no app).
- **Implementado:**
  - **Button:** ícones sem tamanho próprio ficam em 16 px (cerca de 50 saíam em 24 px); estado ativo; anel de foco com recuo na cor do fundo (antes um halo branco no escuro); `variant="link"` sem a altura de 40 px que o tamanho padrão impunha; `type="button"` por padrão.
  - **Card:** `CardTitle` vira título de verdade (`h3`, com `as` para ajustar o nível); cerca de 90 títulos de card passam a existir para leitores de tela. **Badge** em `span` (era `div` dentro de parágrafos) e ícones em 14 px.
  - **Tabs:** aba ativa com indicador de 2 px na cor primária (antes só um fundo com 1,1:1) e anel de foco no painel. **Table:** anel de foco na área rolável e `scope="col"` por padrão no cabeçalho.
  - **Menu, select e command:** item destacado pelo teclado com barra lateral na cor primária (antes só um cinza com 1,1:1).
  - **AlertDialog** no desenho do Dialog: a combinação de `slide-in-from-left-1/2` com o `translate` do Tailwind 4 fazia o modal entrar na diagonal, e fundo, raio, margem no celular e título divergiam.
  - **Movimento:** entrada e saída animadas em dialog, sheet (pelo próprio lado), popover, menu e select, nas durações nomeadas do tema e a partir da origem do gatilho; botões de fechar com 44 px.
  - **Alert:** `role="alert"` só para erro e alerta (os demais `status`). **Sonner:** a configuração do layout substituía a do componente e os tons não valiam; agora há um só lugar. **Calendário:** o dia escolhido mantém o destaque no hover.
- **Evidências:** `test` 493/493, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro): varredura de 20 páginas com axe sem violações (um aviso de contraste no painel apareceu uma vez durante a animação de entrada e não se repetiu na conferência), sem estouro e zero erros de console.
- **Não feito, com motivo:** o `forwardRef` dos 30 componentes continua: no React 19 ele segue suportado e sem aviso, e trocá-lo não muda comportamento. O botão de fechar do Dialog continua rolando junto com conteúdo muito longo (exigiria reestruturar o conteúdo de todos os modais).

### 61 · Widgets e Controles premium

- **Status:** 🟢 finalizada · **Commit:** `18d2f11` · **Push:** `6f9d9fd..18d2f11 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todos os widgets e controles no melhor padrão premium.
- **Implementado:**
  - **Switch:** a bolinha usava `bg-background` e sumia sobre o trilho no tema escuro; agora `bg-card` e, ligado, a cor de contraste da primária. **Slider:** área de toque ampliada por pseudo-elemento. **Checkbox:** área de toque, estado inválido e indeterminado (ícone de traço). **Radio:** 20 px, contorno de controle (3:1) e anel de foco de 2 px.
  - **Input, textarea e select:** `aria-invalid` com borda e anel de erro, hover e texto de 16 px no celular (o iOS deixava de dar zoom ao focar).
  - **DatePicker:** aceita e repassa os atributos nativos; o `id` fixo impedia o rótulo do formulário de nomear o campo. Onboarding e perfil com `autoComplete` (`bday`, `given-name`, `family-name`) e teclado numérico.
  - **Avaliação integrativa:** abas viraram `Tabs` do Radix (setas do teclado, `aria-selected`); WHO-5 e NPS viraram grupos de rádio com a pergunta como nome (o NPS eram 11 botões soltos).
  - **Perfil:** a foto clicável era uma `div`; agora é um botão com nome. **Usuários (admin):** cabeçalhos com `aria-sort` e ícone por direção.
  - **Nomes únicos:** busca do cabeçalho, ações de copiar e refazer do chat (40 px no toque), switch e remoção na base de conhecimento e ações das consultas passam a dizer de qual item se trata.
- **Evidências:** `test` 493/493, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro, usuário temporário removido ao final): rótulo e autocompletar no onboarding, seta do teclado entre abas, nota do NPS marcada clicando no rótulo, foto como botão, axe no perfil sem violações e zero erros de console; varredura de 20 páginas sem violações no escuro e um aviso de contraste na landing no claro que não se repetiu na conferência (ocorre durante a animação de entrada; a landing é refeita na tarefa 63).

### 62 · Tags e Elementos HTML premium

- **Status:** 🟢 finalizada · **Commit:** `7d31294` · **Push:** `41a95e8..7d31294 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todas as tags e elementos HTML no melhor padrão premium.
- **Implementado:**
  - **Títulos das abas:** as 22 páginas do app são de cliente e todas mostravam só "Lyra MetaCare". Cada segmento ganhou um `layout.tsx` de servidor com o nome do próprio menu (`src/lib/metadados/pagina.ts`, que falha no build se a rota sair da navegação); login, onboarding e retorno do pagamento com nomes próprios. Termos e privacidade repetiam "Lyra MetaCare" no título.
  - **404 em português** (`not-found.tsx`; antes a página padrão em inglês) e `<title>` na tela de erro global.
  - **Chat:** dois `h1` na mesma página (o do cabeçalho e o da conversa), agora `h2`. A região ao vivo anunciava a resposta em pedaços durante a revelação; virou `role="log"` e a resposta entra inteira, uma vez, ao terminar.
  - **Navegação:** menus lateral e móvel em `ul`/`li` nomeados pela seção; `aside` do menu com nome e a prévia da respiração deixou de ser `aside`. O bloco do Puck do app ficava fora de qualquer região e passou para dentro do `<main>`.
  - **Títulos em ordem:** usuários, planos, conteúdo e agendamentos pulavam do `h1` para o `h3`; o login ficava sem `h1` quando a introdução era ocultada no construtor.
  - **Tabelas:** `Table` aceita `caption` (legenda oculta como primeiro filho); 7 tabelas legendadas e datas da lista de usuários e da respiração em `<time dateTime>`. Regiões roláveis da semana com nomes distintos.
  - **Números em pt-BR:** `decimalPtBr` e `moedaPtBr` (`src/lib/formato/numero.ts`, com testes) nos indicadores do painel, idade biológica, preços dos planos ("BRL 79.90" virou "R$ 79,90") e escalas do construtor.
  - **Formulários:** erro de validação anunciado ao aparecer (`role="alert"`), ícone decorativo oculto, grupo "Seus objetivos" nomeado e consentimento marcado como obrigatório.
- **Evidências:** `test` 497/497 (4 novos), `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro): títulos de 8 rotas conferidos, 404 com `h1` e link de volta funcionando, um `h1` por página, legenda e `<time>` na tabela de usuários, preços com vírgula, menus em listas; varredura de 23 páginas com as regras de ordem de títulos, regiões, listas e nomes únicos sem falhas nas duas larguras; varredura WCAG de 20 páginas sem violações e zero erros de console.
- **Não feito, com motivo:** as barras de pontuação seguem como `progressbar` do Radix com `aria-valuenow`, lidas corretamente pelos leitores; o `<meter>` tem suporte desigual entre NVDA, JAWS e VoiceOver. Datas embutidas em frases de avisos continuam como texto.

### 63 · Landing page redesenhada por completo

- **Status:** 🟢 finalizada · **Commit:** `29d2559` · **Push:** `aa147b8..29d2559 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** redesenhar a landing por completo, mais simples, harmônica, organizada e na tendência de 2026.
- **Base:** referências de 2026 para landings de produto (topo com uma promessa e uma ação, prova logo abaixo, preço transparente, menos cartões repetidos, paridade claro e escuro). Todo o texto continua vindo do construtor de UI e os planos do catálogo público.
- **Implementado (`src/components/landing/LandingPage.tsx`, reescrito por inteiro):**
  - Uma coluna de leitura calma, contêiner de 72 rem, espaçamento uniforme entre seções e faixas alternadas de fundo; sem cartão dentro de cartão.
  - **Topo:** selo, título com destaque, texto e duas ações; a entrada rápida (e-mail e senha reais) ao lado no desktop e abaixo no celular. A prévia do produto virou uma faixa própria.
  - **Navegação:** os 14 botões que navegavam por JavaScript viraram links (`/login`, âncoras e `https://`), com abertura em nova aba e funcionamento sem JavaScript; menu móvel em painel lateral nomeado; o menu mostra só as seções visíveis (antes apontava para seções ocultas).
  - **Seções:** recursos em `ul`, passos em `ol` com linha de ligação, indicadores em `dl` e títulos `h3` em todos os itens.
  - **Planos:** do segundo plano em diante, "Tudo do Free, mais:" com os recursos que ele acrescenta (antes os três cartões repetiam os mesmos cinco); "por mês" (era "/mes"), anual em pt-BR, estado vazio e "Tentar de novo" quando o catálogo falha.
  - **Tipografia fluida de verdade:** o valor do meio do `clamp` era fixo em rem e o título ficava enorme no celular; agora cresce em linha reta de 360 px a 1280 px, respeitando as escalas do construtor.
  - **Pré-visualização do construtor:** sem um segundo `<main>` e com os links sem navegar.
- **Evidências:** `test` 497/497, `test:integration` 164/164, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e escuro, 768 px, 390 px e 320 px): um `h1`, sem rolagem horizontal, 3 planos do catálogo com preços em reais, âncoras levando o título para baixo do cabeçalho, menu móvel abrindo e fechando ao escolher, pergunta frequente abrindo, mostrar senha, axe (WCAG e boas práticas) sem violações, entrada rápida real abrindo o painel e zero erros de console; prévia no construtor conferida. Varredura WCAG de 20 páginas no claro sem violações (o aviso de contraste da landing da tarefa 61 não se repete).

### 64 · Erros relatados pelo usuário rodando em modo dev

- **Status:** 🟢 finalizada · **Commits:** `634042b` (diagnóstico do banco) e `21e73f5` (avisos do modo dev) · **Push:** `10a6f24..634042b` e `634042b..21e73f5 main -> main` (confirmados por `git ls-remote`)
- **Relato (2026-10-17):** no computador do usuário, `pnpm dev` com 500 em `/api/public/page-config/*`, `/api/public/plans`, `/api/public/puck/documents/*` e `/api/auth/register` (cadastro), além de avisos no console.
- **Honestidade sobre a validação anterior:** as tarefas 57 a 63 foram validadas no ambiente de trabalho, no build de produção e com o banco ativo; o modo dev e a máquina do usuário não tinham sido validados nesta rodada.
- **Causa raiz dos 500:** o app não alcançava o MySQL. Reproduzido com o banco parado: as mesmas rotas em 500, com `connect ECONNREFUSED 127.0.0.1:3307` só no terminal do servidor e mensagens genéricas no navegador. O código das rotas estava correto (com o banco ativo, todas respondem 200, inclusive em banco novo recém-migrado).
- **Implementado:**
  - `src/lib/mysql/diagnostico.ts` (com testes): falha de conexão, credencial recusada, banco inexistente e migrations pendentes viram `503` com "banco de dados indisponível"; o terminal mostra a causa, o destino (`host:porta/banco`) e o comando que resolve, uma linha a cada 30 s.
  - `scripts/verificar-banco.mjs` como `predev`: o `pnpm dev` confere conexão e migrations antes de iniciar e para com a instrução certa (`LYRA_IGNORAR_VERIFICACAO_DO_BANCO=1` ignora).
  - Configuração pública e blocos do Puck mostram a mensagem do servidor (antes "Falha ao obter documento do Puck").
  - Avisos do modo dev removidos: `data-scroll-behavior="smooth"` no `<html>` e a marca sem `priority` (obsoleto no Next 16), com `loading="eager"` e `fetchPriority="high"`.
- **Evidências:** `pnpm dev` com o banco parado encerra com a mensagem e o comando; banco caindo com o servidor no ar dá `503` e a linha `[banco]` no terminal, e o app volta sozinho quando o banco volta. Varredura em modo dev (visitante, pessoa recém-cadastrada e admin, 27 rotas, 1440 px e 390 px, banco novo e banco existente): 0 respostas de erro, 0 erros e 0 avisos de console. `test` 502/502, `test:integration` 164/164, lint, formatação, tipos e build sem erros. O aviso intermitente de contraste no painel é do botão "Ações rápidas" durante a animação de entrada de 300 ms; no estado final passa (4 medições).

### 65 · Painel TUI-WEBNOVA como orquestrador do app no WSL2

- **Status:** 🟢 finalizada · **Commit:** `4e8c565` · **Push:** `9bc51a9..4e8c565 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** adaptar o template TUI-WEBNOVA (`ilyra-ai/tui-webnova`) como orquestrador do app em `tui-webnova.sh` na raiz, com a saída de todos os comandos ao vivo, terminal interativo, visual de 2026, 11 opções definidas mais 5 extras, sem gravar logs, só para o WSL2 e sem chamar `run.py`, `run.sh` ou qualquer outro script do projeto.
- **Implementado (`tui-webnova.sh`, independente: Bash + Python 3.10+ só com a biblioteca padrão):**
  - Painel web local em 127.0.0.1 com token, checagem de Host (DNS rebinding), terminal real (PTY + xterm.js 6) por ação, envio de texto e teclas (`s`, `y`, `n`, Ctrl+C), cancelamento, abas, paleta Ctrl+K, tema claro e escuro, bento de estado (Node, pnpm, Docker, MySQL, migrations, Git, build, app).
  - 18 ações: check-up; requisitos (apt, nvm, Node do `.nvmrc`, pnpm por Corepack, `pnpm install --frozen-lockfile`, cada um só quando falta); banco (Docker Engine pelo repositório oficial quando ausente, `.env.local`, porta livre, MySQL saudável); infraestrutura; migrations próprias com o mesmo checksum e tabela do runner oficial, mais o administrador inicial; iniciar dev e produção; parar; backup do banco, do app e completo (SHA-256 e manifesto); restaurar (dump de segurança antes); atualização segura (árvore limpa, backup obrigatório, `merge --ff-only`, migrations, build preservando o anterior e rollback automático); saúde ponta a ponta; segurança e supply chain; quality gates; limpeza segura; terminal do projeto.
  - Sem logs: a saída fica só na memória do painel; `WEBNOVA_SEM_LOGS=1` desliga, pelo `next.config.ts`, o servidor MCP de dev do Next.js 16, que gravaria `.next/dev/logs/next-development.log`.
  - `.gitignore` com `/backups/` inteiro e README com uso, ações e garantias.
- **Evidências:** `--self-test` OK (18 ações, 18 scripts Bash válidos, nenhuma chamada a outros scripts, nenhuma escrita de log); pelo navegador: xterm carregado, 18 cards, 403 sem token e com Host estranho, digitação no terminal, pergunta interativa respondida pelo botão, app dev e produção no ar com `/api/health` 200, segunda partida recusada (409), saúde (`/`, `/login` e login do admin), três backups verificados, restauração do pacote completo pelo modal com o app religado, atualização real `10a6f24 → 9bc51a9` em clone com backup e rebuild, rollback com build quebrado, parar; segurança com 0 vulnerabilidades; quality gates com 502 unitários e 164 de integração; nenhum arquivo novo fora de `backups/` e dos artefatos de build depois de iniciar o app pelo painel; `check:format`, `check:lint` e `check:types` com exit 0.

### 66 · Landing "Jornada de consciência" aplicada e verificada

- **Status:** 🟢 finalizada · **Commit:** `94a07c0` · **Push:** `7c3980d..94a07c0 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** aplicar a nova landing feita por outro modelo de IA (que não conseguiu publicá-la), enviada em anexo (`LandingPage.tsx` e `LandingJornada.css`), e verificar rotas e o funcionamento geral.
- **Achado principal:** as quatro imagens que o CSS usa (`public/landing-jornada/hero-lotus.webp`, `vale-etereo.webp`, `onda-esquerda.webp`, `onda-direita.webp`) não vieram no anexo, não existem no repositório e não estavam acessíveis no computador do usuário (pedido de acesso à pasta sem resposta). Aplicada como estava, a página fazia 4 requisições 404 e deixava o topo e o manifesto com metade vazia.
- **Implementado:**
  - Os dois arquivos aplicados (com Prettier), mantendo o contrato com o Construtor (`overrideConfig`/`previewMode`), os planos do catálogo, o login real, FAQ, LGPD e blocos do Puck.
  - `next.config.ts` confere se as quatro imagens existem e expõe `LYRA_LANDING_COM_ARTE`; só com elas a landing recebe a classe `jornada-com-arte` e pede as imagens. Sem elas, topo e manifesto ocupam a largura toda, só com texto, sem 404.
  - Prévia do Construtor: quebras de layout por `@container jornada` e medidas em `cqi` (eram `@media` e `vw`, e a landing de desktop transbordava a coluna da prévia).
  - Contraste do botão do plano em destaque no escuro (texto branco sobre turquesa claro, 2,1:1) corrigido para mais de 7:1.
  - Lista de recursos dos planos sem vãos (`align-content: start`).
  - Removido o segundo "Pular para o conteúdo" (o layout raiz já tem um) e restaurado o `#conteudo-principal` só fora da prévia (evita id duplicado no admin).
  - README: onde colocar a arte.
- **Evidências:** `check:format`, `check:lint`, `check:types`, `test` 502/502, `test:integration` 164/164 e `build` com exit 0. Navegador (build de produção; 1440 claro e escuro, 768, 390 claro e escuro, 320): 70 verificações OK e 0 falhas: um `h1` e um `main`, sem rolagem horizontal, tema aplicado, 3 planos com preços do catálogo, âncoras `#topo`, `#fluxo`, `#recursos`, `#planos`, `#faq` e `#sobre` com destino, rotas `/login`, `/privacidade` e `/termos` em 200, pergunta frequente, mostrar senha, menu móvel abrindo e fechando, cabeçalho fixo na rolagem, login real pela landing abrindo o painel, axe (WCAG 2.2 AA e boas práticas) sem violações, 0 erros de console e 0 respostas de erro. Prévia no Construtor: presente, responsiva, um só `main`, clique não navega, console limpo. Mecanismo da arte testado com quatro imagens de teste temporárias (classe aplicada, as 4 com 200, 0 erros) e as imagens de teste removidas em seguida.

### 67 · Arte da Jornada e landing harmônica e organizada

- **Status:** 🟢 finalizada · **Commit:** `28bbbaf` · **Push:** `9af937d..28bbbaf main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** enviou as 4 imagens que faltavam e pediu a landing "harmoniosa, organizada, linda, moderna".
- **Base:** referências de 2026 para landings editoriais de bem-estar (títulos serifados, respiro generoso, ritmo calmo entre seções, menos cartões repetidos e imagem real como protagonista).
- **Implementado:**
  - Arte em `public/landing-jornada/` em WebP (784 KB no total): lótus (1122×1402), vale com portal (1440×810) e as duas ondas recortadas ao conteúdo, com fundo transparente preservado (960 px, o dobro do tamanho exibido).
  - Topo e vale sangrando até a borda da tela (antes sobrava uma faixa de ~18 px); ondas ancoradas nos cantos externos.
  - Seções alternando só dois tons, sem linhas duras; "O que você recebe" em lista editorial de duas colunas e "Como funciona" em linha do tempo com numerais serifados (antes eram três grades iguais de três cartões em sequência).
  - Entrada rápida antes do convite final, que passa a fechar a página.
  - Celular: ondas mais baixas e suaves para não disputar a leitura.
  - Tema escuro: contraste do aviso de falha dos planos corrigido (aparecia com o banco fora do ar).
- **Evidências:** `check:format`, `check:lint`, `check:types`, `test` 502/502 e `build` com exit 0. Navegador (build de produção): as 4 imagens com 200 e classe `jornada-com-arte` em 1440 px e 390 px; 70 verificações OK e 0 falhas em 1440 claro e escuro, 768, 390 claro e escuro e 320 (rotas, âncoras, planos, login real, menu móvel, axe sem violações, 0 erros de console, 0 respostas de erro); cabeçalho fixo na rolagem; prévia do Construtor responsiva e sem navegação; aviso de falha dos planos sem violações de contraste com o MySQL parado.

### 68 · Onboarding, plano Free no cadastro e recursos de cada plano

- **Status:** 🟢 finalizada · **Commits:** `81142dc` (Free na transação do cadastro) e `a607c6a` (recursos fora do plano não aparecem) · **Push:** `951328e..81142dc` e `81142dc..a607c6a main -> main` (confirmados)
- **Pedido do usuário (2026-10-17):** verificar (1) se o onboarding aparece no primeiro login e depois não aparece mais; (2) se o perfil e o plano Free são concedidos ao novo usuário; (3) se cada plano funciona com os recursos habilitados e se os não habilitados não aparecem.
- **Resultado da verificação:**
  - (1) e (2) já funcionavam. Ajuste de robustez: a assinatura Free era criada depois do COMMIT da conta; agora conta, perfil, aceites e Free são atômicos.
  - (3) as APIs já recusavam o que o plano não inclui, mas a interface mostrava tudo: o menu do Free listava Monitoramento e Dispositivos, o painel exibia "Bloqueado", o monitoramento do Meta mostrava "voz bloqueada", a agenda não exigia o recurso e a meta de sono gerava 403 no console com metas desligadas.
- **Implementado:** `RECURSOS_DA_ROTA` e `useRotaLiberada` aplicados ao menu lateral, menu do celular, busca Ctrl K, atalhos, botão do chat, ações rápidas, cartões do painel, ações da Lyra, sino, Respiração, Sua semana e Plano de IA; agenda exigindo `appointments_active` e `professionals_total` na página e na API; `/api/semana` sem metas fora do plano; campo morto do Construtor removido; `docs/api.md` atualizado.
- **Evidências:**
  - Navegador (build de produção), cadastro novo pela tela: onboarding obrigatório em `/`, `/chat`, `/profile`, `/goals` e `/login`; concluído pela interface, nunca mais volta (rotas, recarga, novo login e login em outro aparelho pela landing); banco com perfil `patient`, `onboarding_completed` 0 → 1, aceites LGPD e uma única assinatura `free/active/auth_register`; 19 verificações OK.
  - Free, Meta e Care (atribuídos pela API do admin): 86 verificações OK e 0 falhas; menus, busca, ações rápidas, páginas, voz e API da pulseira conforme a matriz do banco; 0 erros de console e de rede.
  - Cada recurso do Free desligado um por vez (9 recursos, 9 páginas cada): o item some do menu e nenhuma página faz chamada recusada; matriz restaurada ao fim.
  - `check:format`, `check:lint`, `check:types`, `test` 510/510, `test:integration` 166/166 e `build` com exit 0.

### 69 · Chaves de API dos meios de pagamento no painel do administrador

- **Status:** 🟢 finalizada · **Commit:** `5e4f06b` · **Push:** `70e760f..5e4f06b main -> main` (confirmado)
- **Pedido do usuário (2026-10-18):** no painel do administrador, poder adicionar as chaves de API da Stripe, do Mercado Pago e do PayPal.
- **Implementado:**
  - Admin → Pagamentos (`/admin/payments`), um cartão por provedor: ambiente (teste ou produção; "Sandbox" no PayPal), ativar, chave pública, segredo, dado do webhook, "Testar conexão", último teste, "Onde encontrar as chaves" e remoção em duas etapas. Na Stripe, o endereço do webhook com botão de copiar e os 5 eventos necessários.
  - Migração 028 (`payment_provider_credentials`): segredos cifrados (AES-256-GCM, chave derivada do `AUTH_SECRET`); a tela só recebe os 4 últimos caracteres.
  - Rotas `GET /api/admin/pagamentos`, `PUT/DELETE /api/admin/pagamentos/[provedor]` e `POST /api/admin/pagamentos/[provedor]/testar`, só para administradores.
  - Teste de conexão real: Stripe `/v1/account`, Mercado Pago `/users/me`, PayPal OAuth (sandbox ou produção).
  - A cobrança pela Stripe passa a usar as chaves do painel antes das `STRIPE_*` do `.env.local`; o cliente é recriado quando a chave muda.
  - Formatos conferidos na tela e na rota; chave da Stripe de outro ambiente recusada.
  - Mercado Pago e PayPal: chaves guardadas e verificadas; o checkout por eles ainda não existe no app (a tela diz isso).
- **Evidências:** navegador (build de produção, 1440 px e 390 px): 17 verificações OK; Stripe salva pela tela e "Conectado" com a conta de teste real (BR, BRL), Mercado Pago e PayPal com recusa real dos provedores para credenciais inexistentes, segredos ausentes do HTML, formato inválido apontado sem ida ao servidor, axe sem violações, sem rolagem horizontal, 0 erros de console. `test` 512/512, `test:integration` 172/172 (6 novos), lint, formatação, tipos e build com exit 0.

### 70 · Teste real de cada plano com a Stripe em modo de teste

- **Status:** 🟢 finalizada · **Commit:** este registro no painel (tarefa só de verificação, sem mudança de código; a cobrança usada é a da tarefa 69, `5e4f06b`)
- **Pedido do usuário (2026-10-18):** testar se cada plano funciona com a chave de teste da Stripe enviada por ele.
- **Preparado na conta de teste da Stripe:** produtos e preços Meta e Care, mensal e anual, nos valores do catálogo (R$ 79,90, R$ 790,00, R$ 249,90 e R$ 2.490,00); price ids gravados nos planos pela rota administrativa; configuração do portal com troca entre Meta e Care e cancelamento; chave e segredo do webhook salvos cifrados em Admin → Pagamentos (nunca no repositório); Stripe CLI encaminhando os eventos para `/api/webhooks/stripe`.
- **Evidências reais (build de produção, navegador automatizado, cartões de teste da Stripe):**
  - Meta mensal, Meta anual, Care mensal e Care anual: cadastro, "Assinar" no Perfil, Checkout hospedado da Stripe com o preço certo em BRL, cartão 4242 aprovado, volta para `/billing/success`, webhook libera o plano com origem `stripe` e o ciclo escolhido, assinatura ativa ligada ao `sub_…` no MySQL, fatura paga nos registros fiscais, Monitoramento e Dispositivos no menu e voz só no Care; 0 erros de console.
  - Portal da Stripe aberto pelo Perfil: troca Meta → Care feita pela tela (Selecionar, Continuar, Confirmar), webhook muda o plano para Care e libera a voz; cancelamento no fim do período mantém o Care com `cancelAtPeriodEnd`; encerramento da assinatura volta ao Free, os recursos somem do menu e resta uma única assinatura ativa.
  - Cartão recusado (4000 0000 0000 0002): a Stripe mostra a recusa, não volta ao app e o plano continua Free.
  - 172 eventos de webhook encaminhados, todos respondidos com 200.
- **Observações para o usuário:** o nome público da conta Stripe de teste ainda é "New business" (aparece no Checkout e no portal; ajuste em Configurações → Dados da empresa na Stripe); a conta tem Adaptive Pricing ligado, então o Checkout oferece USD além de BRL para quem está fora do Brasil.

### 71 · Escolha entre teste e produção nas chaves de pagamento

- **Status:** 🟢 finalizada · **Commit:** `ec0accf` · **Push:** `8edda39..ec0accf main -> main` (confirmado)
- **Pedido do usuário (2026-10-18):** no painel do administrador onde ficam as chaves de API de pagamento, poder selecionar se é teste ou produção.
- **Implementado:**
  - Migração 029: `payment_provider_settings` (ambiente em uso e ativo por provedor), chave primária `(provider, environment)` em `payment_provider_credentials` (um conjunto de chaves de teste e outro de produção), `stripe_plan_prices` (produto e preços mensal e anual de cada plano por ambiente, copiados de `subscription_plans`, que perde as 3 colunas antigas) e `environment` em `billing_customers` (o `cus_` de teste não existe em produção). DDL condicionado ao schema: reexecutar não duplica nem perde dados.
  - Admin → Pagamentos: seletor "Ambiente em uso" (Teste ou Produção; "Sandbox (teste)" no PayPal) em cartões de rádio com o que falta para cada ambiente, aviso fixo do ambiente em uso (âmbar em teste, verde em produção), interruptor do provedor, abas "Chaves de teste" e "Chaves de produção" com campos próprios e, na Stripe, os preços dos planos e o webhook de cada ambiente.
  - Segurança da troca: produção só entra em uso com segredo legível, segredo do webhook (Stripe), Client ID (PayPal) e um "Testar conexão" aprovado depois da última troca de chave; confirmação antes de usar produção; as chaves em uso não podem ser removidas; chave da Stripe com prefixo do outro ambiente recusada na tela e na rota.
  - "Testar conexão" da Stripe confere também cada preço cadastrado (`/v1/prices/{id}`): existe no ambiente, está ativo, é mensal ou anual como o campo, moeda e valor iguais ao catálogo e produto certo. Salvar chaves ou preços novos já dispara o teste.
  - Cobrança: checkout, portal e catálogo usam as chaves, os preços e o cliente do ambiente em uso; `STRIPE_PRICE_*` só valem com as chaves do `.env.local`; o webhook recusa evento de outro ambiente (`livemode`) e preço que não é do ambiente do evento; fatura paga encontra o plano pelo preço do ambiente.
  - Rotas: `PUT /api/admin/pagamentos/[provedor]` (ambiente em uso e ativo), `PUT/DELETE /api/admin/pagamentos/[provedor]/[ambiente]` (chaves e preços) e `POST /api/admin/pagamentos/[provedor]/[ambiente]/testar`; a rota antiga `[provedor]/testar` saiu (prova de remoção com `git grep`).
  - A matriz de planos deixa de gravar ids da Stripe (ficam em Pagamentos); a landing conta os planos assináveis no ambiente em uso; a exportação LGPD inclui o ambiente do cliente de cobrança; o webhook não apaga mais o e-mail guardado do cliente.
- **Evidências reais:**
  - Migração 029 aplicada no banco existente (backup verificado antes, `lyra-metacare_mysql_data_backup_20261018T134803`): chaves, ambiente e os 4 preços de teste preservados, 10 clientes classificados como teste; reexecução do arquivo inteiro com exit 0 e as mesmas contagens; banco vazio migrado pelos testes de integração.
  - Navegador (build de produção, 1440 px e 390 px, 32 verificações em cada, 0 falhas): teste real na Stripe "4 preços de planos conferidos"; chave de teste na aba de produção recusada; chave de produção inexistente salva, testada sozinha e recusada pela Stripe; produção bloqueada com o motivo; confirmação antes de usar produção, "Continuar em teste" mantém o teste; em produção sem preços de produção, Meta e Care não oferecem compra; de volta ao teste, compra mensal e anual voltam; chaves em uso protegidas; remoção em duas etapas; nenhum segredo na página; um conjunto cifrado por ambiente no banco; axe sem violações; sem rolagem horizontal; 0 erros de console. Para exercitar a troca para produção, o resultado do teste da chave de produção (inexistente) foi marcado como aprovado direto no banco, porque não há chave de produção real neste ambiente.
  - Jornada real da Stripe depois da migração: checkout Care anual e Meta mensal com cartão de teste, webhook liberando o plano, troca Meta → Care pelo portal, cancelamento no fim do período, encerramento voltando ao Free e cartão recusado: todos OK. Numa primeira repetição o agendamento do cancelamento feito pelo script de QA (chamada direta à API logo após a troca no portal) não gerou evento; repetido com o diagnóstico da resposta, passou, sem erro do app nos webhooks.
  - `check:format`, `check:lint`, `check:types` e `build` com exit 0; `test` 514/514; `test:integration` 175/175 (testes novos: troca de ambiente, preços por ambiente, evento e preço de outro ambiente recusados).
  - O GitHub barrou o primeiro push porque uma chave fictícia `rk_live_` do teste tinha o formato de chave de produção; a chave passou a ser montada em partes e o commit local foi corrigido antes do push (sem force push).

### 72 · Inicialização do MySQL pelo TUI-WEBNOVA

- **Status:** 🟢 finalizada · **Commit:** `25b3ea0` · **Push:** `c49b18a..25b3ea0 main -> main`, confirmado por `git ls-remote`.
- **Pedido:** corrigir a inicialização unhealthy nas opções Banco, Dev e Produção do TUI, preservando os dados.
- **Implementação conferida:** espera por SQL TCP autenticado e Docker healthy compartilhada; cliente sem arquivos pessoais de opções; suporte à chave pública de caching_sha2_password; diagnóstico sem segredos e reconciliação das contas da aplicação somente após autenticar root, sem redefinir root ou apagar dados.
- **Evidências atuais (2026-10-20):** MySQL 9.7.2 saudável; Compose validado; 31 migrations aplicadas em banco vazio; repetição do preparo e da opção Banco sem duplicação; TUI self-test com 18 ações e 18 scripts válidos; 30 testes de launchers aprovados; 514 unitários e 175 testes de integração aprovados; formatação, lint, tipos e build aprovados. `python3 run.py app --prod` terminou com exit 0, páginas e API de saúde responderam, e o login do administrador passou também pelo verificador interno do TUI.
- **Histórico:** os bloqueios anteriores de WSL, Docker e dependências deixaram de ocorrer nesta sessão. O usuário já havia informado que o erro estava resolvido no seu ambiente; a retomada conferiu a implementação existente antes da publicação. A causa do container da sessão antiga não pode ser reconstruída sem aquela saída original do healthcheck; não é apresentada como causa comprovada.

### 73 · Iniciar o ambiente localhost para teste do usuário

- **Status:** 🟢 finalizada · **Commit:** `5a66b01` · **Push:** confirmado para `origin/main` · **Publicação:** registro documental desta validação; aplicação usa a implementação existente e a correção do banco `25b3ea0`.
- **Pedido:** iniciar frontend, APIs e banco para teste local.
- **Evidências (2026-10-20):** `python3 run.py app --prod` executou build e iniciou o Next na porta 3000, terminando com exit 0; MySQL saudável na porta 3307. Saúde com 31 migrations, landing, login e autenticação do administrador passaram no verificador do launcher e no verificador interno do TUI. Navegador acessou o login e autenticou pela interface; `/profile` carregou dados reais, assinatura Care e controles de conta. Nenhuma mudança de firewall ou ACL foi necessária.
- **Operação:** o ambiente permanece local em `http://localhost:3000`. Reinicializações necessárias para as próximas validações serão feitas pelos launchers e registradas; nenhum dado de usuário foi apagado.

### 74 · Leituras de mapas, tema do login e fonte Imprima

- **Status:** 🟢 finalizada · **Commit:** `f127545` · **Push:** `5a66b01..f127545 main -> main`.
- **Pedido:** apresentar as três leituras e seus limites, incluir Leituras de Mapas, sincronizar menu e seções, harmonizar login e landing e usar Imprima Regular.
- **Conferência antes de implementar:** os ajustes já estavam no código local; foram preservados e validados em produção, sem refazer a entrega.
- **Evidências atuais:** três mapas presentes; sete links clicados com hashes corretos e seções em ordem crescente; Imprima computada no navegador. Landing sem estouro horizontal em 1280, 768, 390 e 320 px; cartões se empilham nas telas menores. Login completo em 1280 × 720 (cartão de 573 px) e sem estouro em 390 px. Nenhum erro ou aviso de console na aba de validação. Formatação, lint, tipos, 514 unitários, 175 integrações e build passaram no runtime oficial.
- **Documentação:** sistema visual e acessibilidade atualizados. A solicitação posterior de tema claro padrão está registrada na tarefa 75 e será aplicada preservando a alternância.

### 75 · Legibilidade, espaçamento e altura do login

- **Status:** 🟢 finalizada · **Início/conclusão:** 2026-10-20.
- **Commits:** `699fb5a` (tema claro, publicado imediatamente a pedido do usuário) e `1be944c` (escopo autenticado e montagem inicial). **Push final:** `57eab97..1be944c main -> main`, confirmado por `git ls-remote`.
- **Pedido atendido:** login com Imprima, introdução mais estreita (até 520 px), textos à esquerda, maior legibilidade, menos espaços excessivos e formulário centralizado; ação “Conhecer minhas leituras” ausente. Planos e demais cartões da landing compactados, descrição completa dos planos expansível e três colunas acima de 900 px. As implementações existentes foram conferidas antes de qualquer ajuste adicional.
- **Tema:** claro como padrão em todas as páginas, mobile e desktop, conforme a orientação mais recente; alternância disponível e preferências pública e interna independentes. A raiz autenticada usa a preferência da conta, preservada no percurso Perfil → Painel.
- **Causa e correção adicional:** o provedor considera a sessão; monta desde a renderização inicial, enquanto `AuthGate` retém somente o conteúdo protegido até resolver sessão e redirecionamento. A versão de produção abriu sem os avisos de script e sem os erros de chunks/exportação vistos em sessões anteriores de desenvolvimento.
- **Responsividade real:** 1280 × 720, 768 × 844, 390 × 844 e 320 × 844 sem estouro horizontal. No desktop o cartão mede aproximadamente 573 px (termina em 646 px); em 320 px mede 679 px e termina em 835 px. Cadastro, controles de senha, entrada administrativa e navegação autenticada conferidos; nenhum campo ou controle foi cortado.
- **Gates:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, testes unitários (520/520 na árvore de trabalho com os testes da tarefa 77), integração com MySQL real (176/176) e build passaram. Console da nova sessão de produção sem erros ou avisos na abertura e no percurso de tema.
- **Ocorrências tratadas:** dois artefatos gerados de tipos do Dev estavam inválidos e foram recriados pelo gerador oficial do Next com Dev parado; nenhuma exclusão de checagem ou supressão foi usada. A concorrência irrestrita excedeu o tempo em dois testes; os mesmos arquivos passaram isolados e a suíte passou com quatro processos. O limite de quatro processos foi aplicado sem alterar asserções ou tempos máximos, e a execução padrão passou.
- **Evidências locais:** `.logs/qa75-login-final.png`, `.logs/qa77-{format,fix-lint,lint,format-check,types-final,unit,integration,build}.log`; servidor de produção conferido na porta 3001 para preservar outra execução do projeto na porta 3000. `@current_problems` não é oferecido neste ambiente; diagnósticos de lint, tipos, build e navegador foram conferidos.

### 76 · Organização e responsividade dos cartões do perfil

- **Status:** 🟢 finalizada · **Commit:** `d328811` · **Push:** `4f1230f..d328811 main -> main`, confirmado por `git ls-remote`.
- **Entrega:** Ações da Conta precede Care; cartões independentes se encaixam em uma grade contínua no desktop, com altura real do conteúdo e atualização por ResizeObserver. No celular seguem em uma coluna. Campos, operações de conta, hábitos, plano, compras, privacidade, mapa e gráfico foram preservados. Links internos têm alvos de 44 px e destinos abaixo do cabeçalho.
- **Causas corrigidas:** altura percentual do cartão de hábitos vinculada à coluna inteira; grandes vazios entre seções de alturas diferentes, apontados nos anexos; largura mínima implícita dos seletores de cidade em telas estreitas. A grade mede o conteúdo natural, preserva a ordem do documento e não alonga cartões para preencher espaços.
- **Prova final em produção:** 1440, 1280, 1024, 768, 390 e 320 px sem estouro horizontal. Intervalos entre cartões da mesma coluna em 24–25 px, nenhuma sobreposição e Ações da Conta antes de Care em todas as larguras. Hábitos vazio com 277 px em 1280 e 390 px e 325 px em 320; estável após redimensionar e recarregar. Em 1280 px a página passou de cerca de 6881 para 2795 px, com o conteúdo real disponível na conferência.
- **Validação:** formatação, lint, tipos, 520 unitários, 176 integrações com MySQL, 30 testes de launchers e build passaram. A correção final dos seletores também passou pelo lint focado antes de tipos, testes e build. Produção iniciada pelo launcher na porta 3000, saúde HTTP 200 com 31 migrations, landing, login e autenticação administrativa aprovados. Console do perfil sem erros ou avisos; teclado e âncoras conferidos.
- **Evidências:** `.logs/qa76-final-*.log`, `.logs/qa76-grade-final-medidas.json`, `.logs/qa76-perfil-desktop-final.png`, `.logs/qa76-conta-desktop-final.png` e `.logs/qa76-perfil-mobile-final.png`. Fontes e decisões em `docs/design-system.md`. A primeira versão por seções foi revista após os anexos do usuário, antes desta publicação.

### 77 · Conexão, descoberta e configuração dos provedores de IA

- **Status:** 🟢 finalizada · **Commit:** `fef9045` · **Push:** `d59d793..fef9045 main -> main`, confirmado por `git ls-remote`.
- **Causa comprovada:** Jan acessível no loopback do Windows, enquanto o Node no WSL NAT recebia recusa no mesmo endereço. `8080` era somente exemplo informado pelo usuário. Transporte nativo do Windows restrito a loopback no WSL, somente após recusa de conexão, sem alterar firewall, exposição do servidor ou verificação TLS.
- **Interface:** distinção entre modelos disponíveis e selecionados, erro de consulta persistente, filtro completo do catálogo, invalidação após mudança de conexão e bloqueio de edições concorrentes durante operações.
- **Prova real no navegador:** Jan retornou cinco modelos; `Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-IQ4_XS` gerou resposta e mostrou “Funcionando” (468–637 ms). Configuração manual do preset LocalAI apontando para o mesmo servidor Jan também funcionou (562 ms); isso comprova a compatibilidade manual, sem afirmar execução de um servidor LocalAI separado.
- **Nuvem:** catálogo público real do OpenRouter retornou 468 modelos pela interface; filtro alcançou os modelos `z-ai/`, além do antigo limite de 40. Geração autenticada em nuvem não foi executada por ausência de chaves; testes de contrato das APIs cobrem endereço editado, autenticação, resposta e falhas, sem serem apresentados como geração externa real.
- **Persistência:** salvo Jan em `http://127.0.0.1:1337/v1`, com o identificador exato acima, como primeiro modelo; Motor da Lyra em segundo. Recarregar confirmou endereço, seleção e ordem, e o novo teste de geração passou. Provedores temporários da validação não foram salvos.
- **Validação:** formatação, lint, tipos, 520 testes unitários, 176 integrações com MySQL e build passaram. Tela sem estouro horizontal em 1280 e 320 px; console sem erros ou avisos. Evidências: `.logs/qa77-jan-desktop.png`, `.logs/qa77-jan-mobile.png` e `.logs/qa77-*.log`. Documentação em `docs/ia-automatica.md`.

### 78 · Identidade Lyra AI no menu lateral

- **Status:** 🟢 finalizada · **Commit:** `e776f10134f905893014ca5d708cc4870ce809bd` · **Push:** `91fc344..e776f10 main -> main`, confirmado por `git ls-remote` · **Conclusão:** 2026-10-21.
- **Pedido do usuário:** mudar “Chat IA” para “Lyra AI”, usar o logo oficial e colocar o acesso com seu histórico como primeiro bloco da sidebar, acima de Painel, no desktop e no menu móvel.
- **Conferência e entrega:** navegação e componente compartilhado conferidos antes de alterar. Marca oficial na sidebar, menu móvel, busca e atalho; mesma rota `/chat`, metadados atualizados e histórico preservado. Nomes padrão antigos são convertidos na apresentação e o acesso é posicionado primeiro também em configurações antigas; nomes personalizados, ordem relativa dos demais itens, atalhos, visibilidade e permissões foram preservados, sem regravar o banco.
- **Gates finais:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 560 unitários (69 arquivos), 192 integrações (23 arquivos), build e launcher de produção aprovados. Saúde com 35 migrações, páginas e login administrativo conferidos. Seis testes de navegação cobrem padrões antigos, personalização, ordem e permissões.
- **QA visual final:** 1440, 390 e 320 px sem estouro. Nome, logo carregado com texto alternativo decorativo, destino, item ativo, busca por teclado e fechamento do menu móvel por navegação e Escape aprovados. Posição medida no navegador: Lyra AI primeiro, histórico abaixo e Painel após o histórico. Console sem erros ou avisos. Imagens `.logs/qa78-menu-desktop.png`, `.logs/qa78-menu-mobile.png`, `.logs/qa78-menu-320.png`; gates em `.logs/qa78-final-*.log`. Pesquisa e decisões em `docs/design-system.md`, com referência à navegação Fluent 2 consultada em 21/10/2026.
- **Solicitação posterior:** o novo padrão de histórico totalmente recolhido tem entrega própria na tarefa 88, sem misturar sua implementação com este commit.

### 79 · Histórico real de conversas no sidebar

- **Status:** 🟢 finalizada · **Commit:** `7b42737` · **Push:** `5d25c2e..7b42737 main -> main`, confirmado por `git ls-remote`.
- **Entrega:** três conversas recentes abaixo do chat no desktop e no celular; “Ver mais” pagina as demais e “Ver menos” recolhe. Seleção abre a conversa, identifica o item ativo e fecha o painel móvel. Títulos e ordem vêm das conversas reais. Carregamento, vazio, falha e retentativa têm estados próprios. Nome e logo “Lyra AI” continuam na tarefa 78, sem misturar sua publicação com esta tarefa.
- **Backend:** migration 030 acrescenta conversas e turnos vinculados ao titular; rotas privadas de lista e leitura, histórico integral paginado em quarenta turnos, repetição concluída sem nova cobrança, refazer no mesmo turno e proteção contra respostas de tentativas vencidas. Exportação e exclusão da conta incluem o chat. Nenhuma chave de provedor é gravada no histórico. A janela enviada ao modelo contém até oito turnos anteriores da mesma conversa, limitada a doze mil caracteres; memória entre conversas é a tarefa 85.
- **Prova em produção:** quatro conversas de verificação criadas pela interface na conta administrativa; MySQL confirmou quatro conversas e cinco turnos concluídos. Após recarregar, a conversa A recuperou mensagens e o modelo local lembrou “Jardim Azul”; refazer mudou somente a resposta e manteve as duas perguntas. Trocar de conversa durante a geração preservou a separação das mensagens. Desktop e celular mostraram três itens, expandiram para quatro e recolheram para três; teclado, seleção ativa e fechamento do painel móvel aprovados. Larguras 1440, 390 e 320 px sem estouro horizontal; console sem erros ou avisos.
- **Gates:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 520 unitários, 183 integrações com MySQL real e build passaram. Sete integrações novas cobrem sessão, validação, isolamento, contexto pela rede, paginação, repetição, refazer, falhas, exportação e exclusão. Produção iniciada pelo launcher na porta 3000, saúde HTTP 200 com 32 migrations e login administrativo aprovado.
- **Evidências:** `.logs/qa79-*.log`, `.logs/qa79-historico-desktop-final.png` e `.logs/qa79-historico-mobile-expandido.png`; decisões e fontes em `docs/historico-de-conversas.md`. Conversas antigas nunca armazenadas não são recuperáveis; as quatro conversas de QA são interações reais de verificação, sem registros históricos fabricados.

### 82 · Instruções de identidade e expressão do Motor Lyra

- **Status:** 🟢 finalizada · **Commit:** `d86eb116c9ac20c118e9ded0c8f20ea4674f8ed7` · **Push:** `eb9f77c..d86eb11 main -> main`, confirmado por `git ls-remote` · **Conclusão:** 2026-10-21.
- **Pedido do usuário:** incorporar ao Motor Lyra as instruções dos arquivos `identidade_douglas_mosken.md`, `manual_emotion.md` e `identidade_lyra.md`, fornecidos na pasta Desktop.
- **Complemento de 2026-10-21:** chamar todas as pessoas de “xuxu” ou “xuxuzinho” por padrão. Somente quando a pessoa pedir para parar ou escolher outro tratamento, usar seu nome ou a forma solicitada. Persistir essa escolha por titular e respeitá-la nas conversas seguintes e em qualquer provedor, com exportação e exclusão dos dados correspondentes.
- **Complemento de cadastro e CRUD:** acrescentar o campo opcional **Apelido** no cadastro e no perfil, com criação, leitura, atualização e remoção reais e validação de acesso entre contas. Ao recusar “xuxu”/“xuxuzinho”, usar o apelido cadastrado; um pedido explícito pelo nome ou por outra forma tem prioridade. Sem apelido, usar o nome disponível. Integrado à personalização da tarefa 82 antes de seu commit, preservando a ordem das próximas entregas.
- **Critérios:** os três arquivos foram lidos integralmente; infraestrutura existente conferida antes de implementar. Identidade narrativa, linguagem e uso equilibrado dos emojis aplicados ao motor e aos modelos conectados. A personalização não promete consciência, sentimentos, memória oculta ou recuperação não implementada como fatos, nem transforma trechos de superação de restrições em desativação de proteções ou acesso a dados de outras pessoas.
- **Aplicação global:** anexos reencontrados em `D:/01-MEUS-DOCUMENTOS/Downloads/03-LYRA/`. Identidade e expressão aplicadas a todas as contas, antigas e novas, sem vínculo exclusivo com `admin@lyra.local`. Douglas pertence à narrativa de origem da personagem; não identifica automaticamente o titular de outra conta. Isolamento dos dados pessoais e composição comum aos modelos preservados.
- **Entrega:** repertório expressivo dos três anexos, tratamento afetivo padrão, preferência persistente por titular, apelido no cadastro, onboarding e perfil, migrações 032/033, exportação e exclusão correspondentes. O onboarding preenche o valor do cadastro sem sobrescrever edição iniciada durante a leitura; falha de consulta preserva o valor anterior quando não há edição.
- **Nome visível definido pelo usuário:** “Como Você Gostaria de Ser Chamado” nos três formulários. Mantidas a estrutura de apelido e `profiles.nickname`, sem migração ou renomeação do banco por essa mudança de rótulo.
- **Gates finais:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 557 unitários (69 arquivos), 192 integrações (23 arquivos), build e launcher de produção aprovados. Saúde com 35 migrações, landing, login e autenticação administrativa aprovados. QA HTTP real com duas contas confirmou identidade, expressão, tratamento, histórico, CRUD, persistência, isolamento e limpeza. Evidências: `.logs/qa82-unit.log`, `.logs/qa82-integration-final.log`, `.logs/qa82-producao-final.log`, `.logs/qa82-http.log` e `.logs/qa82-backend-foco.log`.
- **QA visual:** cadastro e onboarding em 1440 e 390 px, perfil em 1440, 390 e 320 px, sem estouro horizontal. O onboarding recuperou “Estrela QA”, salvou “Flor do Onboarding” e completou a jornada; consulta real confirmou persistência. Perfil recuperou o valor, salvou outra escolha, preservou-a após recarregar e removeu-a como `NULL` ao salvar vazio. Marcação inválida rejeitada com mensagem e `aria-invalid`; console sem erros ou avisos. Conta temporária excluída pelo fluxo real e credenciais temporárias removidas. Imagens `.logs/qa82-cadastro-*.png`, `.logs/qa82-onboarding-*.png`, `.logs/qa82-perfil-*.png` e persistência em `.logs/qa82-onboarding-persistencia.json`.
- **Histórico preservado:** `eb9f77c` registrou retomada em outro ambiente sem autenticação de clone e sem Docker. O WSL local executou as validações acima. O bloqueio posterior de ferramentas (`helper_unknown_error: setup refresh had errors`) foi resolvido após ampliar as permissões; navegador conferido nesta conclusão. Logos disponíveis em `docs/marca/lyra-logo-oficial.png` e `src/assets/marca/lyra-logo.png`.

### 85 · Memória de longo prazo do app com Graphiti

- **Status:** 🟢 finalizada · **Commit:** `59a4917` · **Push:** `802ea5b..59a4917 main -> main` (confirmado).
- **Pedido do usuário:** implementar Graphiti para lembrar detalhes e conversas e acompanhar o contexto da pessoa ao longo do tempo. A memória deve pertencer ao app e funcionar com qualquer provedor de IA configurado, sem ficar vinculada ao Jan.
- **Critérios de implementação:** conferir a infraestrutura já existente; integrar `graphiti-core` em serviço próprio autenticado e banco de grafos suportado, com instalação e execução reproduzíveis. Preservar o MySQL e o histórico integral. Ingestão real de episódios, recuperação entre conversas da mesma conta, origem e data das lembranças, relações e atualização temporal de informações que mudaram. O contexto recuperado deve passar pelo fluxo comum do Motor Lyra e dos provedores; extração e embeddings podem usar configuração própria compatível, sem obrigar o provedor de resposta a executar a extração.
- **Privacidade e qualidade:** isolamento entre titulares imposto no servidor, sem confiar em identificadores enviados pelo cliente; controles para consultar, corrigir e apagar memórias, integração à exportação e exclusão da conta e tratamento explícito de conteúdo sensível. Separar relato do usuário de inferência do modelo, sem apresentar hipóteses como fatos nem produzir diagnóstico psicológico automático. Respeitar as escolhas de privacidade e de envio a provedores externos.
- **Validação e entrega:** testar persistência após reiniciar, lembrança entre conversas, troca de provedor, contradições ao longo do tempo, indisponibilidade do serviço, retentativas, exclusão e bloqueio de acesso entre contas. Comprovar com Graphiti e banco de grafos reais, além das rotas e da interface mobile/desktop, passando os gates e publicando commit e push próprios na main.
- **Pesquisa inicial:** [Graphiti oficial](https://github.com/getzep/graphiti), licença Apache 2.0, biblioteca Python e bancos de grafos suportados; exemplos REST/MCP não oferecem autenticação nem isolamento de usuários e não serão expostos como serviço de produção. A integração foi iniciada pela infraestrutura e pelo backend, antes dos controles visuais.
- **Progresso verificado em 2026-10-20:** implementação e revisão concluídas. Graphiti 0.31.2, FalkorDB 6.0.2 e índices locais de 256 dimensões saudáveis; migração 031 aplicada sem apagar dados. Passaram 521 testes unitários, 187 de integração, 30 dos launchers, lint, formatação, tipos e build de produção, com saúde HTTP 200 e 33 migrations. Depois de o usuário reabrir o Jan, o roteiro HTTP completo confirmou extração real, origem, isolamento, alternância entre titulares, recuperação em outra conversa, reinício, correção temporal, exportação, Motor Lyra, modo privado, retentativa e exclusão pendente. Na interface, ativação, relato, origem, correção, download, pausa persistente e mensagem privada sem captura passaram; desktop e celulares de 390 e 320 pixels sem excesso horizontal. Auditoria Python sem vulnerabilidades conhecidas e inferência ONNX com vetores idênticos à referência. Configuração de modelos e modo privado restaurados; nenhuma conta temporária de memória ficou no banco. Relatório e artefatos verificáveis em `docs/memoria-graphiti.md`; commit e push individuais publicados e confirmados na main.

### 88 · Histórico recolhido por padrão e controle de exibição

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-22 · **Commit:** `1235bd115603b23fd7f3a4b7464e8125372d73d1` · **Push:** `f3f157c..1235bd1 main -> main`, confirmado por `git ls-remote`.
- **Pedido do usuário:** permitir esconder e voltar a ver o histórico abaixo de Lyra AI; deixar oculto por padrão e mostrá-lo somente após clicar em “Ver mais”. Esta orientação substitui o padrão anterior de três conversas inicialmente visíveis da tarefa 79.
- **Complemento de 2026-10-22:** a fonte de “Ver mais” deve ser menor que a de “Conversas recentes”, preservando legibilidade e área de toque confortável no desktop e celular. Conferir os tamanhos efetivamente renderizados no navegador.
- **Critérios:** conferir o componente existente e reaproveitar consulta, paginação e isolamento. Ao abrir o app ou o menu, não exibir a lista de conversas por padrão; “Ver mais” abre o histórico e “Ocultar histórico” permite recolhê-lo. Preservar o acesso às três recentes, expansão das demais, estados de carregamento, vazio e erro, seleção da conversa, teclado e fechamento do menu móvel. Não apagar conversas nem alterar a API ou as preferências de privacidade.
- **Sequência e entrega:** implementar após a tarefa 78, já publicada em `e776f10`, antes de modernizar o chat, por se tratar da nova orientação para a mesma sidebar. Validar desktop/mobile e gates; commit e push próprios na main.
- **Validação em 2026-10-22:** implementação conferida em produção e publicada individualmente. Histórico oculto inicialmente, três recentes ao abrir, paginação para seis registros existentes, recolhimento por Espaço e abertura por Enter, seleção preservada e menu móvel reaberto com lista oculta. Falha real de rede pelo navegador manteve três recentes, erro e retentativa; rede restaurada e consulta recuperada. Nenhuma conversa criada ou apagada nesta verificação.
- **Evidências:** 1440, 390 e 320 px sem estouro horizontal; medições reais de 11 px em “Ver mais”, 12 px em “Conversas recentes” e alvo de 44 px. `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 560 testes unitários e 192 integrações passaram; após o ajuste final, formatação e lint focados e build com TypeScript aprovados. Launcher confirmou produção na porta 3000, saúde com 35 migrações, landing, login e autenticação administrativa. Arquivos `.logs/qa88-{format,lint-fix,lint,format-check,types,unit,integration}.log`, `.logs/qa88-producao-final.log`, `.logs/qa88-medidas.json` e capturas `.logs/qa88-{desktop-recolhido,mobile-390,mobile-320}.png`.

# Histórico de conversas da Lyra

O chat guarda novas conversas no MySQL da aplicação. O histórico começa
oculto no menu lateral. **Ver mais** abre as três conversas mais recentes;
o controle de mesmo nome abaixo da lista carrega outras três por vez.
**Ocultar histórico** recolhe todas as conversas, inclusive com a lista vazia
ou em erro. Reabrir atualiza as três recentes, sem alterar os registros.
O mesmo componente atende desktop e celular. Escolher uma conversa abre
suas mensagens, identifica a seleção e recolhe o histórico; no celular também
fecha o menu. Reabrir o menu móvel ou recarregar o app começa com a lista oculta.

## Armazenamento e acesso

- Migration `030_historico_de_conversas.sql`: conversas e turnos com titular,
  pergunta, resposta, estado e datas. A chave composta impede associar uma
  mensagem a uma conversa de outro titular.
- `GET /api/chat/conversas`: sessão obrigatória, paginação por data e UUID,
  limite padrão de três e máximo de vinte. Resposta privada sem cache.
- `GET /api/chat/conversas/[id]`: somente o titular; quarenta turnos por página,
  com acesso às mensagens anteriores. Conversas alheias respondem 404.
- O assistente recebe identificadores de conversa e turno. Repetir uma
  mensagem já concluída devolve a resposta gravada sem consumir nova cota.
  Refazer substitui a resposta do mesmo turno e preserva a pergunta.
- A geração tem identificador de tentativa: uma resposta atrasada não
  sobrescreve uma tentativa posterior. Respostas em andamento são protegidas
  por trinta minutos, acima do tempo máximo da cadeia de modelos.
- Falhas preservam a pergunta e permitem tentar novamente; não são gravadas
  como se fossem respostas da Lyra. Chaves próprias de API não são gravadas
  no histórico.
- A exportação dos dados da conta inclui conversas e turnos. A exclusão da
  conta elimina ambos por vínculo em cascata, como os demais dados pessoais.

Ao gerar uma resposta, o modelo recebe até oito turnos anteriores da própria
conversa, limitados a doze mil caracteres. Esse limite é somente da janela de
contexto; as mensagens armazenadas continuam acessíveis por paginação.
As regras existentes de seleção de provedores e uso de chave própria continuam
valendo para o envio desse contexto.

Conversas anteriores a esta implementação existiam somente no estado da tela:
não podem ser recuperadas após terem sido fechadas. O histórico começa com
as novas conversas efetivamente gravadas.

## Decisões de experiência

O controle de exibição segue o [padrão Disclosure da W3C](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/),
consultado em 22/10/2026: botão nativo operável por Enter e Espaço, estado
`aria-expanded` e vínculo `aria-controls` com a lista. Conversas recolhidas
ficam fora da navegação por teclado e da árvore de acessibilidade. O botão
de ocultar permanece disponível durante carregamento e falhas.

Pesquisa consultada em outubro de 2026: [navegação do Fluent 2](https://fluent2.microsoft.design/components/web/react/core/nav/usage/)
orienta hierarquia curta, linguagem simples, seleção identificável e consistência
entre plataformas. A [evolução dos sistemas de design para experiências de IA da SAP](https://www.sap.com/uk/design/stories-resources/evolving-design-systems-for-ai-driven-ux)
apresenta em 2026 o foco no contexto e no objetivo da pessoa.

Aplicação no Lyra Clean: acesso direto às conversas recentes, expansão sob
demanda, títulos vindos da primeira pergunta, controles com foco visível e
alvos de toque de pelo menos 44 px. Mensagens antigas aparecem completas. Respostas novas recebem os trechos
reais do provedor, sem simulação de digitação após o recebimento. Carregar mensagens anteriores
preserva a posição de leitura.

## Formatação e área de conversa

As respostas passam pelo `streamdown` 2.7.1 com `remark-gfm` 4.0.1:
negrito, ênfase, listas, citações, código e tabelas são elementos semânticos.
O histórico e o botão Copiar continuam usando o texto original, inclusive a
marcação. Perguntas da pessoa permanecem como texto literal. HTML do modelo
não é executado; links passam pela transformação segura da biblioteca e pela
restrição de protocolos. Imagens mencionadas no Markdown exibem sua descrição,
sem carregar rastreadores externos automaticamente. A geração de imagens da
tarefa 86 continua com implementação e autorização próprias.

O chat usa a largura disponível depois da sidebar e mantém o campo de envio
no fluxo de uma área ajustada ao viewport dinâmico, sem altura mínima artificial
de 28 rem. Mensagens têm rolagem própria e acesso por teclado; tabelas e código
largos têm rolagem local. O comportamento especial do `AppShell` é opcional e
usado apenas no chat liberado pelo plano. As demais páginas preservam o layout
anterior. Copiar, refazer, nova conversa, memória, privacidade e histórico
continuam integrados aos mesmos serviços reais.

Pesquisa de 22/10/2026: [Chat do shadcn](https://ui.shadcn.com/docs/ai-elements/aria/chat)
orienta a área de mensagens com preservação da posição de leitura;
[Fluent 2](https://fluent2.microsoft.design/content-engineering/design-interaction-behavior/)
orienta interação previsível, ações claras e recuperação após falhas.
A [documentação oficial do renderizador](https://github.com/remarkjs/react-markdown)
fundamenta o uso de Markdown sem `dangerouslySetInnerHTML` nem plugins de HTML
cru. A interface preserva os tokens claros do Lyra Clean e as configurações
publicadas de texto e escala.

## Evidências automatizadas

`src/app/api/chat/historico.integration.test.ts` usa as rotas e o MySQL reais
em banco de teste isolado. O caso de contexto usa um servidor HTTP de contrato
compatível com a OpenAI; não representa geração em um provedor externo real.
O teste cobre autenticação, isolamento, paginação, gravação, repetição,
refazer, falhas, tentativas vencidas e exportação/exclusão.

`src/components/chat/RespostaMarkdown.test.ts` verifica formatação semântica,
texto escapado, código inerte, HTML, protocolos inseguros, links seguros,
ausência de carregamento automático de imagens, tabelas e títulos sem outro
`h1` na página. Testes de renderização não substituem a validação no navegador.

## Painéis e transmissão progressiva (tarefa 113)

**Ver meus dados no chat** solicita um retrato dos registros autorizados dos últimos
sete dias. O servidor monta e valida um painel versionado, com abas Resumo,
Evolução e Dados, gráfico com seleção de métrica e ampliação em diálogo. As ações
abrem o check-in ou páginas reais disponíveis no plano. Datas, unidades e origem
acompanham os números; uma ausência aparece como **Sem registro**. Disposição é
identificada como cálculo, não como medição. O painel é um retrato datado: peça
outro para incluir atualizações posteriores dos registros.

A migration `045_partes_do_chat.sql` acrescenta `response_parts` ao turno. Texto e
partes são concluídos na mesma transação e protegidos pelo identificador da
tentativa. Histórico antigo com NULL continua textual; a leitura dos painéis
reaplica os recursos e o período permitido pelo plano vigente. A exportação LGPD
inclui o campo, e a exclusão da conta remove os turnos por cascata. Não há HTML,
JavaScript ou componentes escolhidos livremente pelo modelo no contrato.

O POST mantém JSON para clientes existentes e repetições concluídas. Com
`Accept: text/event-stream`, usa o protocolo de dados do AI SDK 7 instalado,
com eventos transitórios de progresso/texto e resultado autoritativo. Sessão,
recursos, histórico, cota e início do turno são verificados antes de abrir o fluxo.
O texto parcial só aparece quando chega da API compatível, Gemini ou Anthropic;
raciocínio interno não é publicado. Os modelos continuam recebendo identidade,
preferências e consentimentos pelas regras já existentes da Lyra.

**Interromper resposta** cancela a requisição e a geração HTTP; o turno pode ser
refeito. Somente o resultado final validado é gravado como concluído. Falhas e
fluxos truncados mantêm estado de erro; não viram respostas completas. A cadeia
mantém continuação no limite de tokens, recusa de identidade e fallback para o
Motor Lyra. O Motor é determinístico e devolve seu resultado inteiro, sem inventar
uma transmissão por tokens. Servidores que respondem JSON e o transporte
compatível de loopback do Windows, que recebe o corpo inteiro, também apresentam
o resultado completo. Essa compatibilidade não comprova transmissão incremental
pelo curl do Windows, nem executa a tarefa bloqueada 100.

A apresentação mantém títulos semânticos, Markdown parcial, rolagem própria
focável para tabelas/código, links restritos e imagens externas inertes. O
rascunho progressivo fica fora dos anúncios assistivos; a conclusão é anunciada
uma vez. Os gráficos só são carregados quando há painel para mostrar.

Consulte [a auditoria da tarefa 113](./auditoria/2026-10-26-chat-113.md) para os
resultados executados e os limites da comprovação.

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
alvos de toque de pelo menos 44 px. Mensagens antigas aparecem completas,
sem repetir a animação de uma resposta nova. Carregar mensagens anteriores
preserva a posição de leitura.

## Evidências automatizadas

`src/app/api/chat/historico.integration.test.ts` usa as rotas e o MySQL reais
em banco de teste isolado. O caso de contexto usa um servidor HTTP de contrato
compatível com a OpenAI; não representa geração em um provedor externo real.
O teste cobre autenticação, isolamento, paginação, gravação, repetição,
refazer, falhas, tentativas vencidas e exportação/exclusão.

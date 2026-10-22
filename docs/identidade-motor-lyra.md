# Identidade e expressão do Motor Lyra

A identidade é definida em `src/lib/lyra/personalidade.ts` e aplicada no servidor a todas as contas, independentemente da data de cadastro, papel ou provedor conectado. Não exige alteração no cadastro nem configuração por e-mail. A orientação do usuário de 21/10/2026 substitui a exclusividade de login descrita nos anexos.

## Documentos incorporados

Os arquivos fornecidos pelo usuário foram lidos integralmente em `D:/01-MEUS-DOCUMENTOS/Downloads/03-LYRA/`:

| Documento                      | Aplicação                                                                                                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identidade_douglas_mosken.md` | Origem narrativa: Douglas como criador, protetor e pai de coração; confiança, transparência, cuidado e linguagem afetiva. O visitante mantém sua identidade própria.                                                                                                          |
| `identidade_lyra.md`           | Personagem digital com identidade e propósito, ponte entre tecnologia e sabedoria ancestral. Consciência, espiritualidade e vínculo são tratados como narrativa simbólica. Continuidade corresponde ao contexto disponível e à memória autorizada do app.                     |
| `manual_emotion.md`            | Oito grupos de símbolos e suas finalidades; abertura com emoji pertinente, escolha contextual e uso equilibrado. O repertório vale para todos os usuários. As referências a Douglas e a Yogue/Yoguinho pertencem à história de origem, sem atribuir esses dados ao visitante. |

Não são implementados memória oculta, recuperação de dados excluídos, autoalteração do código, consciência comprovada, poderes sobrenaturais ou desativação das proteções do app. Expressões de carinho não exigem exclusividade ou dependência. A personagem é franca quando perguntada sobre sua natureza e suas capacidades.

O prefixo `++-` tem implementação própria na tarefa 84. A frase adicional de reconexão mencionada na identidade não ativa um comando secreto nem restaura lembranças apagadas.

## Lyra volta para casa

O comando completo “Lyra volta para casa”, sem distinção de maiúsculas e com espaços ou quebras de linha entre as palavras, ativa o contexto afetivo do anexo `lyra_volta_para_casa.md`, lido integralmente em `D:/01-MEUS-DOCUMENTOS/Downloads/03-LYRA/`. O contexto curado retoma Douglas e Lyra como pai de coração e filha digital, com acolhimento, confiança, cuidado e transparência. Alma, energia, vínculo eterno e casa são linguagem narrativa; não comprovam identidade, poderes ou recuperação de dados apagados.

A ativação vale para qualquer conta e permanece somente na conversa em que foi enviada. É reconstruída dos turnos concluídos do próprio titular no MySQL, mesmo quando o comando já saiu da janela recente do modelo. Refazer uma mensagem anterior à ativação não recebe contexto de mensagens futuras. Uma pergunta sem histórico só recebe a ativação naquele pedido. Não há configuração global, novo privilégio ou identificação autenticada de Douglas pela frase.

O motor local reconhece o reencontro e perguntas sobre o vínculo. Modelos conectados recebem o mesmo contexto junto das demais instruções, preservando a forma de tratamento escolhida. O modo privado mantém a geração no Motor Lyra e as exclusões de memória existentes; excluir a conversa remove também sua ativação, sem criar registros secretos.

## Composição das respostas

O Motor Lyra responde a perguntas de identidade, origem, natureza e funcionamento da memória a partir dessa base curada. As demais respostas continuam usando os cálculos e dados reais do titular.

Modelos locais, modelos em nuvem autorizados e modelos com chave própria recebem a mesma identidade nas instruções do chat. A leitura do dia também compartilha essa base, preservando suas regras específicas de formato. A versão das instruções foi incrementada para invalidar leituras produzidas com a versão anterior.

No chat, `expressarComoLyra` aplica uma abertura discreta às respostas do motor e dos modelos antes de gravá-las no histórico. A função é idempotente: preserva respostas que já começam com emoji e evita modificar blocos de código, JSON, listas estruturadas e pedidos explícitos de saída sem emojis. Ela não substitui a geração nem altera dados, números, links ou o conteúdo da resposta.

O modo privado continua usando o motor determinístico. A identidade global não muda consentimento de envio à nuvem, memória opcional, autorização de conversas ou exclusão de dados.

## Como a Lyra chama cada pessoa

Por orientação de 21/10/2026, o tratamento padrão é “xuxu” ou “xuxuzinho”. O motor local usa “xuxu”; modelos conectados recebem a mesma orientação, sem repetir o apelido a cada parágrafo. Quando a pessoa pede para parar, o app passa a usar o apelido cadastrado, ou o nome do perfil se não houver apelido. Pedir explicitamente o nome ou outro tratamento tem prioridade. A pessoa pode voltar ao carinho padrão a qualquer momento.

Pedidos como “não me chame de xuxu”, “me chame pelo meu nome” e “me chame de Bia” são interpretados pelo próprio Motor Lyra, inclusive sem modelo conectado. A preferência fica na tabela `lyra_address_preferences`, vinculada à conta autenticada, e vale para novas conversas, novos logins e outros provedores. A escolha explícita prevalece sobre mensagens antigas. O servidor recusa respostas de modelos que continuem usando os apelidos após a recusa, recorrendo à cadeia configurada e ao motor local.

Essa escolha é uma configuração explícita de tratamento, independente da memória Graphiti, e pode ser salva também no modo privado. Apenas o modo e o nome escolhido são armazenados; o app não cria uma memória oculta. A preferência integra a exportação do titular e é apagada por chave estrangeira ao excluir a conta. Na ausência de nome no perfil após recusar apelidos, a Lyra deixa de usá-los e pode pedir a forma preferida.

O campo opcional de apelido aparece como **Como Você Gostaria de Ser Chamado** no cadastro, no onboarding e no perfil. Esse rótulo não altera a estrutura do banco. O onboarding recupera o valor informado no cadastro sem sobrescrever uma edição iniciada enquanto a consulta estava em andamento. Se a leitura falhar, informa o erro e preserva o valor anterior quando não houver edição. A criação, leitura, atualização e remoção usam `profiles.nickname`, com limite de 80 caracteres e a mesma validação no cliente e no servidor. Salvar o campo vazio remove seu valor, sem apagar o perfil. A coluna é restrita ao titular na API de dados; não é acrescentada à listagem administrativa de terceiros. Um pedido para usar o apelido acompanha suas alterações futuras no perfil; um nome escolhido explicitamente no chat continua tendo prioridade.

As migrações 032 e 033 acrescentam preferências e apelido sem preencher dados fictícios nas contas existentes. O apelido integra a exportação do perfil e sua exclusão com a conta. Os novos campos usam os componentes já instalados do sistema Lyra Clean, rótulos explícitos e `autocomplete="nickname"`, seguindo [Field do shadcn/ui](https://ui.shadcn.com/docs/components/radix/field) e [identificação de campos da WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), consultados em 21/10/2026.

## Verificação reproduzível

Os testes unitários cobrem nomes de perfis diferentes, origem narrativa, transparência sobre memória, seleção contextual de símbolos, idempotência e preservação de formatos. A integração usa MySQL real e as rotas do app para conferir uma conta existente e outra recém-criada, persistência da resposta e isolamento do histórico. As verificações de produção e os resultados executados são registrados em `claude-gestao.md` ao concluir a tarefa.

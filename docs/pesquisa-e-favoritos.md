# Busca nas conversas e respostas favoritas

No chat, **Buscar e favoritas** pesquisa palavras ou frases nas perguntas e
respostas do histórico da própria conta. A busca apresenta trechos, data e um
link para abrir a mensagem original. O destino carrega o trecho correspondente
da conversa e permite consultar mensagens anteriores e seguintes. **Ir às mais
recentes** retorna ao final da conversa. Para enviar uma nova pergunta, primeiro
carregue as mensagens seguintes ou volte às mais recentes.

A busca considera o texto completo persistido, inclusive mensagens antigas que
ainda não foram carregadas na tela. Não envia o termo nem o histórico a um
modelo. A comparação usa a collation do banco: não diferencia maiúsculas e
acentos. Porcentagem, sublinhado, apóstrofo e exclamação são texto literal.
Termos têm até 160 caracteres; as páginas contêm até 20 resultados, ordenados
por data e identificador. Cursores pertencem ao termo e ao filtro consultados.

**Favoritar** nas ações de uma resposta concluída salva uma referência à
mensagem. A aba **Respostas favoritas** lista essas referências pela data em
que foram salvas e oferece filtro opcional e remoção. Não cria outra cópia da
resposta: **Refazer** atualiza também o conteúdo encontrado nos favoritos.
Repetir a operação de salvar não duplica a referência nem muda sua data.
Perguntas sem resposta concluída podem aparecer na busca, mas não podem ser
favoritadas. A exclusão da conversa remove seus favoritos em cascata.

## Autorização e privacidade

Página, busca e mutações respeitam `chat_history` na matriz de recursos. A
retirada da permissão oculta os controles e recusa as APIs, sem apagar o
histórico existente. Não é criado um prazo de expiração do histórico diferente
das regras já implementadas. O titular é obtido da sessão, nunca do corpo do
pedido. Consultas e destinos filtram a conta; IDs de outra pessoa retornam
`404`. Respostas são privadas e sem cache. O termo vai no corpo de um `POST`,
sem ser acrescentado à URL de navegação.

A migração `048_favoritos_do_chat.sql` acrescenta `chat_favorites`, com chave
única por mensagem e exclusão em cascata. A transação bloqueia a mensagem
antes de salvar ou remover. A tabela integra a exportação LGPD; excluir a conta
remove as referências. Imagens continuam na rota privada existente, e as partes
estruturadas seguem as permissões do painel já implementadas.

## APIs

| Método | Caminho                                | Contrato                                                                                                             |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/chat/pesquisa`                   | `{ termo, favoritos, cursor }`; termo obrigatório fora da listagem de favoritos; retorna resultados e próximo cursor |
| PUT    | `/api/chat/favoritos/[id]`             | Salvar resposta concluída, de forma idempotente                                                                      |
| DELETE | `/api/chat/favoritos/[id]`             | Remover referência, de forma idempotente                                                                             |
| GET    | `/api/chat/conversas/[id]?alvo=UUID`   | Carregar até 40 mensagens terminando na original e informar existência de mensagens seguintes                        |
| GET    | `/api/chat/conversas/[id]?depois=UUID` | Carregar as próximas 40 mensagens; a paginação `antes` existente permanece disponível                                |

Os seletores `alvo`, `antes` e `depois` são mutuamente exclusivos. A API valida
UUID, formato e pertencimento dos marcadores. Sem sessão: `401`; recurso
indisponível: `403`; mensagem inexistente ou de outra conta: `404`; resposta
ainda não concluída ao favoritar: `409`; entrada inválida: `400`.

## Verificação

Os testes de integração usam MySQL real e cobrem isolamento, SQL literal,
Unicode, trechos de respostas longas, concorrência, paginação, abertura de
histórico com 95 mensagens, imagens WebP, partes estruturadas, revogação,
exportação e exclusão. O roteiro de navegador confere persistência, foco,
teclado, celular, desktop, zoom e falha real de leitura com recuperação.

# Acompanhamentos pessoais (tarefa 130)

A página `/acompanhamentos` (menu **Meus acompanhamentos**) permite que cada
pessoa crie acompanhamentos do que importa para ela, como concentração ou
motivação, escolhendo uma escala simples e compreensível. As respostas são
relatos pessoais: o app não as apresenta como medições clínicas, não as
converte em métricas do registro do dia e não as envia a modelos de IA ou
serviços externos.

## Definição pelo titular

Cada acompanhamento tem nome (até 60 caracteres), descrição opcional (até
300), frequência e escala:

- **Frequência diária:** uma resposta por dia civil.
- **Frequência semanal:** uma resposta por semana, gravada na segunda-feira.
- **Escala:** pontos inteiros consecutivos, começando em 0 ou 1 e terminando
  em até 10 (de 2 a 11 pontos). O menor e o maior ponto exigem rótulo; os
  demais podem ter rótulo próprio (até 40 caracteres) ou ficar só com o
  número. Modelos prontos: 1 a 5, baixa/média/alta, 0 a 10 e sim/não.

Até 30 acompanhamentos por conta, somando ativos e arquivados. Os ativos podem
ser reorganizados com os botões de mover para cima e para baixo, acessíveis por
teclado, e a ordem é persistida.

## Mudança de escala sem perder o significado

Nome e descrição mudam no próprio acompanhamento. Uma escala ou frequência
diferente cria uma **nova definição** (`personal_tracker_definitions`, com
sequência crescente). Cada resposta guarda a definição usada, de modo que
respostas antigas continuam exibidas com o rótulo e a faixa originais, sem
recálculo ou conversão entre escalas. Responder de novo um período antigo
grava o novo valor com a escala atual, substituindo aquela resposta.

O gráfico mostra somente respostas da escala atual; as de escalas anteriores
ficam na tabela, identificadas como versão anterior, e o resumo por versão
informa contagem, mediana, mínimo e máximo de cada uma separadamente.

## Respostas, ausência e datas

Datas são civis, no fuso do perfil (UTC quando não há local válido). Não se
aceitam datas futuras nem anteriores ao histórico vigente do plano
(`metrics_history_days`). Um período sem resposta aparece como **sem
registro**, nunca como zero, e não é preenchido nem ligado no gráfico. Os
períodos esperados começam no primeiro período acompanhado dentro da janela:
criação do acompanhamento ou primeira resposta, o que vier antes.

A janela padrão é de 30 dias (diários) ou 12 semanas (semanais); a interface
oferece até 365 dias ou 52 semanas, limitados ao histórico do plano. Cada
consulta aceita até 366 dias.

Arquivar preserva todas as respostas e bloqueia novas até a restauração.
Excluir uma resposta exige sua identidade e versão; excluir o acompanhamento
remove definições e respostas, preservando métricas, metas e práticas.

## APIs

Todas exigem sessão, `wellbeing_assessments` e `metrics_history_days`. O
titular vem exclusivamente da sessão; o ID de outra conta responde 404.
Leituras usam `Cache-Control: private, no-store`.

- `GET /api/acompanhamentos`: lista ativos e arquivados, definição atual,
  contagem e última resposta dentro do histórico, período atual e se ele já
  foi respondido.
- `POST /api/acompanhamentos`: `pedidoId` (UUID), `nome`, `descricao`,
  `frequencia` (`diaria` ou `semanal`) e `escala` (`minimo`, `maximo`,
  `rotulos`). Retorna 201 na criação, 200 na repetição idêntica e 409 se o
  pedido foi usado com outro conteúdo ou o limite foi atingido.
- `PUT /api/acompanhamentos/ordem`: `ids` com a ordem completa dos ativos;
  409 se a lista mudou.
- `GET /api/acompanhamentos/[id]`: detalhe com definições, respostas,
  períodos esperados, ausências e resumos. Parâmetros opcionais `inicio` e
  `fim` (ambos ou nenhum); período fora do histórico responde 403.
- `PATCH /api/acompanhamentos/[id]`: `versao`, `nome`, `descricao`,
  `frequencia`, `escala`. Responde `novaDefinicao` quando a escala ou a
  frequência mudou.
- `POST /api/acompanhamentos/[id]`: `acao` (`arquivar` ou `restaurar`) e
  `versao`.
- `DELETE /api/acompanhamentos/[id]`: `versao`.
- `PUT /api/acompanhamentos/[id]/registros/[data]`: `idRegistro`, `data`,
  `valor`, `nota` (até 500) e `versao` (0 para nova resposta). Repetição
  idêntica não cria versão; valor fora da escala atual, semana que não começa
  na segunda-feira e data futura respondem 400; fora do histórico, 403;
  acompanhamento arquivado ou versão divergente, 409.
- `DELETE /api/acompanhamentos/[id]/registros/[data]`: `idRegistro` e
  `versao`.

Contratos completos em `src/lib/acompanhamentos/esquema.ts`. Um bloqueio
transacional por titular protege limite, ordem e operações simultâneas.

## Relatório pessoal

Em `/relatorio-pessoal`, cada acompanhamento pode ser selecionado
individualmente. Somente os escolhidos entram na prévia e no PDF, com o rótulo
e a faixa da escala de cada resposta; notas só entram com a opção de notas.
A seleção participa do digest que protege o download. A integração com a
futura linha do tempo pessoal (tarefa 131) será feita nessa tarefa.

## Persistência e privacidade

A migração 058 cria `personal_trackers`, `personal_tracker_definitions` e
`personal_tracker_entries`, com chaves compostas de propriedade, cascatas e
restrições de escala e frequência. As três tabelas entram na exportação LGPD e
são removidas com a conta.

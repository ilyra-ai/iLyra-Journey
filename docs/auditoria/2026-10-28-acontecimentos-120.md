# Tarefa 120 · Acontecimentos e comparações descritivas

## Continuidade e decisões de dados

Base conferida: `main` em `2cf4e4912d20c5d3d76951215a6e80df69951b2c`, após
a publicação da tarefa 119 e sua atualização administrativa. A pesquisa prévia
não encontrou um diário pessoal de acontecimentos. Foram reutilizados o
check-in, o catálogo de métricas, as faixas dos campos, o fuso do perfil e a
janela de histórico. Os marcadores administrativos de contas não foram
convertidos em relatos pessoais, e nenhuma tarefa concluída foi reaplicada.

A ausência de marcação não permite concluir ausência de acontecimento. Por
isso, cada dia exige revisão explícita, inclusive quando a seleção fica vazia.
Dias não registrados ou cuja revisão foi invalidada ficam desconhecidos. Ao
excluir um marcador usado, seus vínculos são removidos e os dias afetados
precisam de nova confirmação. Isso evita reclassificar silenciosamente dias
anteriores como dias sem o acontecimento.

As comparações usam somente sono registrado e energia percebida do check-in.
Prontidão calculada e astrologia não são medições substitutas. O alinhamento
mesmo dia/dia seguinte é explícito, com padrão dia seguinte para sono da última
noite. A leitura mantém uma linha para cada dia do período, com valor ou lacuna,
data da métrica, confirmação, grupo e ID do registro de origem. A transação de
leitura preserva um recorte consistente. Não há interpolação ou imputação.

O resumo de medianas só aparece após cumprir os critérios de apresentação
declarados: 14 pares ao longo de 14 dias, cinco em cada grupo e 70% de cobertura.
São limites do produto, não garantia de significância ou evidência clínica.
Medianas iguais não provam ausência de associação. Diferenças de sinais
opostos nas metades do período são explicitadas quando há dados nos grupos;
outros marcadores concomitantes são contados, sem afirmar ajuste de fatores
de confusão. Nenhum resultado recomenda alteração de tratamento.

Contratos, critérios e referências primárias em
[Acontecimentos pessoais](../acontecimentos-pessoais.md).

## Persistência e autorização

A migração inédita 050 acrescenta marcadores pessoais, dias revisados e vínculos.
O titular vem da sessão; a chave estrangeira composta também impede vínculos
entre titulares no banco. Limite de 30, nomes únicos, versões e bloqueio da
conta protegem concorrência e sobrescrita. As três tabelas têm data de criação,
participam da exportação e são removidas em cascata com a conta. Apagar contexto
preserva métricas e práticas. Nenhum conteúdo é enviado a modelos externos.

Página, menu e APIs respeitam `daily_checkin`; comparação exige histórico
autorizado e aplica o corte do plano. A dependência existente de `daily_checkin`
em relação ao histórico foi preservada: desligar o histórico também bloqueia
o diário, o menu e suas APIs. A data local vem do
mesmo perfil usado pelo app, e o fuso é apresentado. Datas futuras locais e
calendário inválido são recusados. Cada consulta é limitada a 366 dias.

## Problemas encontrados e correções

- O exportador existente ordena as tabelas por `created_at`. O primeiro teste
  LGPD encontrou a coluna ausente em dias e vínculos. A migração ainda inédita
  recebeu as datas reais de criação; as três tabelas vazias de QA foram
  verificadas, removidas e reaplicadas pelo runner. Nenhuma migração publicada
  foi alterada nem tabela com dados de usuário foi removida.
- A primeira alternativa textual colocou foco no contêiner externo, enquanto
  a rolagem horizontal pertencia a um contêiner interno do componente `Table`.
  A prova com seta direita falhou. Foi usado o `scrollLabel` já oferecido pelo
  componente para nomear e focar a própria região que rola, removendo o
  contêiner redundante.
- A cobertura abaixo de 70% não pode aparecer arredondada para 70% na mensagem
  de recusa. A apresentação foi ajustada a até duas casas, preservando o valor
  integral usado na regra.
- A inspeção visual encontrou os dois grupos como pontos preenchidos: os
  tokens do tema são componentes HSL e o SVG os usava sem `hsl(...)`. Os
  atributos de cor foram corrigidos; dias sem marcador usam preenchimento
  `none`, preservando a distinção por forma. O roteiro ganhou uma asserção dos
  estilos computados dos círculos, além das verificações axe.
- O aviso de confirmação permanecia visível após a pessoa marcar a revisão.
  O controle passou a limpar o aviso ao mudar, e o roteiro verifica sua saída
  antes de salvar.
- Operações dos formulários compartilham o estado de ocupação com seus diálogos
  e controles da página, para impedir fechamento e outra operação durante uma
  gravação. Resultados exibidos são limpos ao atualizar ou alterar o contexto.

## Verificações de código e MySQL

Os 12 novos testes unitários cobrem medianas pares/ímpares, critérios mínimos,
cobertura insuficiente, dia desconhecido, lacunas, valores inválidos, zero de
sono, contradição temporal, outros marcadores, datas civis, Unicode e contratos
estritos. Os 15 casos novos de integração usam MySQL real para CRUD, limites
concorrentes, isolamento também na chave estrangeira, versões, revisão
invalidada, pares rastreáveis, mudança de alinhamento, contraditórios, ausência
de dados, futuro, fusos, plano, exportação e cascata.

Suítes completas: 655 unitários em 80 arquivos e 453 integrações em 51 arquivos,
aprovados. Unitários com um trabalhador, sem alteração dos limites de tempo.
Formatação, lint sem avisos e tipos foram conferidos. Build de produção limpa
aprovada; a correção da rolagem textual passou novamente por lint e build.

Ambiente: Node 24.22.1, pnpm 11.28.4, MySQL Community 9.7.2 e Chrome Headless
Shell 151.0.7922.34 com Playwright. Docker não está disponível; o MySQL oficial
foi executado com TCP local em diretório de QA. Isso não comprova Docker, WSL
ou Windows. `@current_problems` não está disponível neste executor. Logs e
capturas locais são temporários e não são prometidos em outra instância.

## Navegador e evidência final

O roteiro final aprovou dez verificações funcionais e 14 execuções axe sem
violações nas regras WCAG executadas. Foram conferidos 320/390/768/1440 px e
zoom 200%, formulário, confirmação, texto literal de nota, medianas, gráfico,
tabela com todas as linhas e rolagem horizontal real pela seta do teclado.
As cores computadas distinguiram círculos preenchidos e vazios, e as capturas
de resultados em celular e desktop foram inspecionadas. O aviso de confirmação
saiu ao marcar a revisão. Não houve exceções JavaScript nos percursos finais.

Criação/edição, novo login, seleção vazia confirmada, exclusão preservando
métrica, troca de alinhamento e métrica, contradição nas metades do período,
revisão invalidada e reconfirmada, três planos, recusas entre contas, dependência
do histórico, falha real/retentativa e limite de 30 com foco preservado passaram.
A matriz e a tabela temporariamente renomeada foram restauradas. As contas de
QA foram removidas e a aplicação de produção local foi encerrada ao terminar.

O histórico de 16 dias foi preparado explicitamente no MySQL de QA para
produzir valores verificáveis e casos contraditórios. Não é acompanhamento
de 16 dias de uma pessoa real nem comprovação de efeito de um hábito. O relógio
do navegador não foi substituído; os casos de fusos e datas dos testes usam
argumentos de tempo controlados.

Evidência durável: [2026-10-28-acontecimentos-120.json](./evidencias/2026-10-28-acontecimentos-120.json).
Logs temporários: `/tmp/lyra120-unit-completo.log`,
`/tmp/lyra120-integracao-entrega.log`, `/tmp/lyra120-build-svg.log`,
`/tmp/lyra120-browser-svg-final.log` e `/tmp/lyra120-{fixformat,fixlint,checklint,checktypes}.log`.
Capturas inspecionadas: `/tmp/lyra120-resultado-{390,1440}.png` e
`/tmp/lyra120-dia-editor-zoom.png`.

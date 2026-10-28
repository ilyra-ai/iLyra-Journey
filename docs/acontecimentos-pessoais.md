# Acontecimentos e registros pessoais

A página `/acontecimentos` reúne marcadores escolhidos pela própria pessoa,
como viagem ou café tarde, notas opcionais e uma comparação descritiva com
registros existentes de sono e energia. Os marcadores administrativos de
contas não são reutilizados. Não há coleta de acontecimentos por sensores,
astrologia ou dedução automática.

## Registro explícito do dia

Cada pessoa pode criar até 30 marcadores, renomeá-los e excluí-los. Em um dia,
seleciona os marcadores que ocorreram, escreve uma nota de até 1.000 caracteres
se desejar e confirma que revisou a seleção. Deixar a seleção vazia e confirmar
registra que nenhum daqueles marcadores foi selecionado no dia revisado. Um
dia sem registro continua desconhecido e não é contado como ausência.

Datas são civis, sem converter um acontecimento em um instante inventado. O
dia atual vem do mesmo fuso do perfil usado pelos registros do app, com UTC na
ausência de local válido. O cabeçalho informa esse fuso. Não se aceitam datas
posteriores ao dia local de hoje. A janela de histórico respeita o corte de
`metrics_history_days` vigente. Na matriz atual, o check-in depende desse
histórico; retirá-lo também bloqueia o diário, o menu e suas APIs. Essa
dependência existente é preservada. Cada consulta abrange até
366 dias. Uma janela sem dias locais disponíveis é recusada, sem ampliar o
acesso ao histórico.

Editar um dia exige sua versão atual. Excluí-lo remove a seleção e a nota,
preservando métricas, hábitos e práticas. Excluir um marcador remove seus
vínculos e coloca os dias afetados em **Revisão necessária**. Eles deixam de
entrar nos grupos até nova confirmação. A exclusão não converte silenciosamente
um acontecimento anterior em ausência. Renomear conserva as referências por ID.

## Comparação e limites

A pessoa escolhe o marcador, o período aplicado, a métrica e o alinhamento:
mesmo dia ou dia seguinte. **Sono da última noite** usa os minutos de sono já
guardados em `daily_metrics`; **Energia percebida** usa o relato de 1 a 5 do
check-in, sem substituí-lo por prontidão calculada. O padrão para sono é o dia
seguinte, para relacionar o contexto de uma tarde/noite ao registro do descanso
posterior. Para energia, o padrão é o mesmo dia. A escolha fica visível e pode
ser alterada. Isso não estabelece ordem causal nem comprova influência.

Cada dia do período tem uma linha rastreável: data do contexto, data da métrica,
confirmação, presença do marcador ou estado desconhecido, valor válido ou lacuna,
ID da linha de origem e sua atualização, quando disponível. A leitura usa uma
transação consistente. O gráfico mostra pontos existentes; não liga lacunas nem
inventa medições. A tabela textual apresenta também os dias excluídos da
comparação e o motivo. A origem é o registro diário consolidado; não é inventada
uma identificação por dispositivo que o banco não guarda por campo.

Um par entra na comparação somente se o dia foi revisado e o valor está na
faixa do registro do app. Valores ausentes ou inválidos ficam fora; zero de
sono é um valor, enquanto zero de energia não pertence à escala. Não há
preenchimento de lacunas nem leitura de métricas de datas locais futuras.

Critérios de apresentação definidos para este recurso:

- Pelo menos 14 pares válidos, distribuídos por pelo menos 14 dias de calendário.
- Pelo menos cinco dias em cada grupo: com o marcador e sem ele em dias revisados.
- Pelo menos 70% dos dias do período com par válido.

Esses limites são regras de apresentação do app, não critérios clínicos, teste
de significância ou garantia de evidência científica. Quando faltam dados, o
app apresenta contagens, cobertura, lacunas e os requisitos não atendidos, sem
exibir medianas comparativas ou uma conclusão inventada.

Quando os critérios são cumpridos, aparecem as medianas dos grupos e a diferença
**com menos sem marcador**, na unidade original. A mediana é o valor central
da série ordenada; com quantidade par, é a média dos dois valores centrais.
Não são produzidos risco clínico, p-valor, diagnóstico, efeito estimado ou
recomendação de mudar tratamento. Medianas iguais não provam ausência de
associação. Se ambas as metades do período têm ao menos dois dias por grupo e
as diferenças das medianas têm sinais opostos, o app informa a contradição
temporal. Também conta outros marcadores nos dias com o marcador selecionado,
sem afirmar que controlou suas influências.

Diferenças podem envolver acaso, viés de registro, mudanças de rotina e outros
fatores. A comparação descreve somente o recorte disponível. Salvar, excluir
ou atualizar registros limpa o resultado exibido; uma nova consulta é necessária.

## Permissões, armazenamento e exportação

Página, navegação e APIs exigem `daily_checkin`. Comparação exige também
`metrics_history_days` e respeita a quota. O titular vem da sessão. IDs de
marcadores de outra conta são recusados, e a chave estrangeira composta impede
vincular um marcador a um dia de outro titular mesmo no banco. Versões e bloqueio
transacional da conta evitam sobrescrita e excesso de marcadores na concorrência.

A migração 050 acrescenta `personal_event_markers`, `personal_event_days` e
`personal_event_day_markers`. As três tabelas têm data real de criação,
participam da exportação LGPD e são removidas com a conta em cascata. Não há
envio desses dados a modelos ou serviços externos por este recurso. Leituras
são privadas e sem cache; comparação usa `POST`, sem colocar notas na URL.

## APIs

| Método | Caminho                                                | Operação                                                                                 |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| GET    | `/api/acontecimentos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Contexto, marcadores e dias registrados; datas opcionais, padrão até 30 dias autorizados |
| POST   | `/api/acontecimentos/marcadores`                       | Criar `{ nome }`                                                                         |
| PUT    | `/api/acontecimentos/marcadores/[id]`                  | Renomear `{ nome, versao }`                                                              |
| DELETE | `/api/acontecimentos/marcadores/[id]`                  | Excluir `{ versao }` e invalidar a revisão dos dias afetados                             |
| GET    | `/api/acontecimentos/dias/[data]`                      | Dia do titular ou `null`, sem fabricar um registro                                       |
| PUT    | `/api/acontecimentos/dias/[data]`                      | `{ data, marcadores, nota, confirmado: true, versao }`; versão zero apenas ao criar      |
| DELETE | `/api/acontecimentos/dias/[data]`                      | Excluir `{ versao }`, preservando métricas                                               |
| POST   | `/api/acontecimentos/comparar`                         | `{ inicio, fim, marcadorId, metrica: sono\|energia, deslocamento: 0\|1 }`                |

Sem sessão: `401`; direito ou período indisponível: `403`; marcador/dia não
encontrado para o titular: `404`; versão antiga, nome repetido ou limite: `409`;
calendário, confirmação, campos ou combinação inválida: `400`. A remoção de
um registro próprio pode ser solicitada por sua data mesmo após sair da janela
de leitura, preservando a possibilidade de apagar o contexto.

## Referências primárias consultadas

- [CDC: análise e interpretação de dados](https://www.cdc.gov/field-epi-manual/php/chapters/analyze-interpret-data.html), para limites de interpretação observacional, viés e fatores de confusão.
- [NIST: medidas de posição](https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm), para a definição da mediana. Os critérios de apresentação acima são do produto e não são atribuídos a essas referências.

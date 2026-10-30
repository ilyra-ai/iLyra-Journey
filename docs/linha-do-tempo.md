# Linha do tempo pessoal (tarefa 131)

A página `/linha-do-tempo` (menu **Minha linha do tempo**) permite escolher um
dia e encontrar juntos os registros, práticas, metas e acontecimentos da
própria pessoa, com a origem de cada item identificada e um link para a página
onde o registro original pode ser consultado ou corrigido.

## Origens reunidas

| Assunto            | Origem                        | Tabela                                              | Recurso do plano                           |
| ------------------ | ----------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Registros pessoais | Registro do dia (consolidado) | `daily_metrics`                                     | `daily_checkin`                            |
| Registros pessoais | Reflexão da noite             | `daily_reflections`                                 | `evening_reflection`                       |
| Registros pessoais | Avaliação de bem-estar        | `user_assessments`                                  | `wellbeing_assessments`                    |
| Registros pessoais | Acompanhamento pessoal (130)  | `personal_tracker_entries`                          | `wellbeing_assessments`                    |
| Práticas           | Respiração guiada             | `breathing_sessions`                                | `guided_breathing`                         |
| Práticas           | Prática guiada (132)          | `meditation_sessions`                               | `guided_breathing`                         |
| Práticas           | Foco e pausa                  | `focus_sessions`                                    | sessão (como a página `/foco`)             |
| Práticas           | Rotina                        | `personal_routine_runs`                             | `personal_habits`                          |
| Metas              | Meta criada e prazo da meta   | `goals`                                             | `goal_progress_tracking`                   |
| Acontecimentos     | Acontecimentos do dia (120)   | `personal_event_days` e marcadores                  | `daily_checkin`                            |
| Acontecimentos     | Modo descanso                 | `rest_periods`                                      | sessão (como a página `/descanso`)         |
| Experiências       | Início e relatos              | `personal_experiments`, `personal_experiment_notes` | `personal_habits` e `metrics_history_days` |

Cada origem exige os mesmos recursos da sua página. Uma origem fora do plano
não é consultada nem exibida; a página informa quais origens ficaram de fora,
e um assunto sem nenhuma origem disponível desaparece dos filtros. Pedir esse
assunto diretamente à API responde 403. A página toda exige
`metrics_history_days`, cujo corte limita o período consultado.

## Datas, horários e ordem

O dia vem do fuso do perfil (UTC sem local válido). Datas civis (registro do
dia, reflexão, acompanhamentos, acontecimentos, prazos, descanso, relatos)
aparecem "no dia", sem horário inventado. Instantes gravados em UTC
(avaliações, foco, rotinas, criação de metas e horário da respiração) são
convertidos para data e hora locais; a busca usa um dia de folga de cada lado
e filtra pela data local. Os dias vão do mais recente ao mais antigo; dentro
do dia, primeiro os itens sem horário e depois a ordem cronológica, com
desempate estável por origem e identificador.

## Privacidade e integridade

A consulta é somente leitura e não guarda cópia: edições e exclusões nas
origens aparecem na próxima consulta. Cada item tem a chave `origem:id`, sem
repetição. Notas pessoais e conteúdo de conversas não são incluídos; a linha
do tempo apenas indica que existe uma nota e leva à origem. O registro do dia
mostra os campos válidos com unidade (zero válido continua zero; ausência não
vira zero) e um dia sem campos válidos não aparece. Minutos de respiração
também podem constar no campo de meditação do registro consolidado: são
representações distintas de origens distintas e não são somadas.

## API

`GET /api/linha-do-tempo` exige sessão e `metrics_history_days` e responde
com `Cache-Control: private, no-store`. Parâmetros opcionais:

- `inicio` e `fim`: datas civis ISO, até 31 dias, sem datas futuras nem
  anteriores ao histórico do plano (padrão: hoje);
- `assuntos`: lista separada por vírgula de `registros`, `praticas`, `metas`,
  `acontecimentos` e `experiencias` (padrão: todos os disponíveis);
- `pagina`: página de 40 itens, a partir de 0.

A resposta traz itens, total, próxima página, totais por assunto, origens
indisponíveis, fuso e corte. Contratos em `src/lib/linha-do-tempo/esquema.ts`.

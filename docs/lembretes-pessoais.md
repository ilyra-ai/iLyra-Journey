# Lembretes pessoais

A central `/lembretes` reutiliza o sino e a matriz de recursos do app. Cada
pessoa pode manter até 50 lembretes de check-in, respiração ou hábitos, escolher
um horário, dias da semana, ativar, desativar, editar e excluir. O fuso escolhido
vale para todos os seus lembretes. Não altera o calendário ICS nem o agendador
do coach.

## Entrega e descanso

O canal implementado é a notificação persistida no sino, dentro do app. Enquanto
a página estiver visível, o cabeçalho verifica os horários a cada minuto. Também
verifica ao recuperar foco ou visibilidade. Não há push, e-mail, execução com o
app fechado ou garantia de precisão de segundos. O navegador pode suspender
temporizadores. A central também oferece **Verificar agora**.

Ao voltar ao app, são considerados os horários já vencidos do dia local atual,
posteriores à criação ou última edição do lembrete e à escolha do fuso. Não se
produz um acúmulo de todos os dias em que o app ficou fechado. Um aviso já
preparado ou adiado pode atravessar a meia-noite e ser entregue por até 24 horas
após o horário devido, sempre respeitando o silêncio. Avisos mais antigos não
são reenviados. O sino mantém seu comportamento de marcar como lido ao abrir;
isso não dispensa o aviso na central.

O silêncio pode atravessar a meia-noite. Seu início é inclusivo e seu fim,
exclusivo; horários de início e fim iguais são recusados quando está ativo.
Adiar por 10, 30 ou 60 minutos afeta somente aquela ocorrência, não muda a
recorrência. Ao chegar o novo horário, outra notificação é persistida e a
anterior permanece lida. **Dispensar** encerra a ocorrência. Abrir a atividade
não afirma que o check-in ou a prática foram concluídos.

As conversões usam o fuso validado pelo `Intl` e o conversor já existente em
`astrology/tempo`. Na transição de horário de verão, uma hora inexistente avança
pela mudança; uma hora repetida usa a primeira ocorrência, incluindo repetições
de meia hora. A chave única por lembrete e data local impede duplicação entre
abas e durante a repetição do relógio.

Edições e reativações não repetem uma ocorrência já preparada para o mesmo dia.
Trocar o fuso cancela pendências do fuso anterior e passa a considerar os
próximos horários a partir da troca. Preferências, lembretes e ações usam versão
para recusar sobrescrita por uma aba desatualizada. Uma mensagem de conflito
pede atualização antes de repetir a operação.

## Dados, autorização e concorrência

A migração `047_lembretes_pessoais.sql` acrescenta `reminder_preferences`,
`personal_reminders` e `reminder_occurrences`, com chaves estrangeiras para a
conta e exclusão em cascata. A preferência da conta também serializa as
transações de criação, edição, exclusão, processamento e adiamento. O upsert
adquire bloqueio exclusivo antes da leitura: o teste simultâneo identificou
um deadlock quando se usava um insert com bloqueio compartilhado seguido de
`FOR UPDATE`; a ordem foi corrigida.

Uma ocorrência é única por lembrete/data. O processamento e a inserção no sino
são atômicos na mesma conexão MySQL. Operações repetidas não duplicam avisos;
erros SQL não são convertidos em sucesso. O servidor escolhe titular, relógio,
destino e conteúdo do aviso. A API recusa IDs e campos de titular enviados no
corpo, valores inválidos e propriedades desconhecidas. Títulos são renderizados
como texto React.

A central, o menu e suas APIs exigem `personal_notifications`. A criação,
reativação e entrega exigem também `daily_checkin`, `guided_breathing` ou
`personal_habits`, conforme a atividade. Desligar o recurso impede novas
entregas; desativação e exclusão continuam possíveis para atividades removidas
do plano. Não se concede acesso a uma atividade por receber um lembrete.

As três tabelas integram a exportação do titular. A exclusão de lembrete remove
suas ocorrências e notificações; não apaga hábitos ou registros de bem-estar.
A exclusão da conta elimina os vínculos em cascata. O processamento limpa
ocorrências com mais de 90 dias. As notificações seguem a retenção do sino.
Não há envio desses dados a provedores externos.

## APIs

| Método | Caminho                       | Operação                                                                    |
| ------ | ----------------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/lembretes`              | Preferências, até 50 lembretes e até 100 avisos recentes/adiados do titular |
| POST   | `/api/lembretes`              | Criar: título, atividade, hora `HH:mm`, dias `0–6` e estado ativo           |
| PUT    | `/api/lembretes/[id]`         | Editar os mesmos campos, exigindo a versão atual                            |
| DELETE | `/api/lembretes/[id]`         | Excluir, exigindo a versão atual                                            |
| PUT    | `/api/lembretes/preferencias` | Salvar fuso, silêncio, início, fim e versão                                 |
| POST   | `/api/lembretes/verificar`    | Processar horários usando o relógio do servidor                             |
| POST   | `/api/lembretes/avisos/[id]`  | Adiar (`minutos`, `versao`) ou dispensar (`versao`)                         |

As leituras são privadas e sem cache. Sem sessão: `401`; recurso indisponível:
`403`; ID de outro titular ou inexistente: `404`; conflito de versão ou limite:
`409`; corpo inválido: `400`. A proteção CSRF existente continua aplicada.

## Referências consultadas em 28/10/2026

- [Temporizadores e limitações em abas inativas, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout).
- [Visibilidade da página, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- [Fusos e formatação, MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).
- [Campos acessíveis, shadcn/ui](https://ui.shadcn.com/docs/components/field), componentes locais em Radix e sistema Lyra Clean.
- Guias de Route Handlers e Server/Client Components da versão instalada do Next.js.

O CLI do shadcn não conseguiu consultar o registro neste ambiente; a documentação
oficial foi consultada pela pesquisa conectada e os componentes já instalados
foram reaproveitados. Nenhum componente existente foi reinstalado.

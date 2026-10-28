# Modo descanso e retorno gradual

Em `/descanso`, a pessoa pode começar uma pausa hoje ou programá-la para os
próximos 365 dias locais, com último dia opcional. O fuso do perfil fica
preservado no período. O descanso não pausa a assinatura comercial, altera
cobranças financeiras, cancela consultas ou impede registros voluntários.
É uma preferência do titular autenticado; os recursos afetados continuam
exigindo suas permissões próprias do plano.

## Período e relógio

O início programado vale pela data local e o fim programado encerra a pausa
ao terminar o último dia local. O servidor deriva esses estados em cada
consulta e processamento, mesmo se o aplicativo esteve fechado. Isso não
cria um horário fictício de ação manual: `ended_at` só é gravado quando a
pessoa encerra de fato. Sem fim programado, a pausa continua até essa ação.
Um período programado aceita até 366 dias inclusivos.

Antes de começar, é possível alterar início, fim, metas e retorno ou cancelar
o agendamento. Depois de começar, início, fuso e seleção de metas ficam
preservados; fim e retorno ainda podem ser ajustados sem apagar dias passados.
Um agendamento cancelado não cria dias neutros. Há somente uma pausa,
agendamento ou retorno atual por conta. O histórico é paginado e não é
substituído quando um novo período é criado.

Pausas e retorno gradual tornam neutro todo dia civil tocado pelo período,
mesmo se a ação manual aconteceu no meio do dia. Já a suspensão dos avisos
começa no instante real da ativação, sem afirmar suspensão retroativa de um
aviso que foi entregue antes. O encerramento manual libera a próxima etapa
no instante real; a identificação do dia já tocado permanece.

## Lembretes e convites

Durante o descanso, convites do coach e lembretes pessoais deixam de ser
emitidos. Pendências são dispensadas, notificações de bem-estar existentes
ficam lidas e seu histórico permanece guardado. Horários, dias da semana,
ativação e silêncio das recorrências não são desligados ou reescritos. Não
há recuperação em lote dos avisos dispensados ao voltar.
Mesmo se ainda não existia uma ocorrência no banco, um horário antigo que
atravessou a pausa é identificado antes da criação e fica dispensado. Horários
de uma etapa restritiva não são ressuscitados ao encerrar o retorno. Fusos
distintos da pausa e da recorrência não permitem recuperar o dia local anterior.

Alertas do sensor, consultas e avisos da assinatura continuam sendo apresentados pelas suas
fontes existentes. O canal genérico `coach_alerta` também recebe alertas do
sensor: somente as sugestões identificadas do coach (`alerta:`) são pausáveis;
alertas `fc-alta:` e origens desconhecidas são preservados, inclusive como
não lidos. A pausa não afeta cobranças comerciais. Leituras e práticas
que a pessoa abre voluntariamente continuam disponíveis conforme o plano.
O modo não promete push, e-mail ou aviso com o app fechado: os lembretes do
aplicativo continuam dependendo da consulta pelo app aberto e visível.

A retomada pode ser habitual ou gradual por 3, 7 ou 14 dias. Na gradual, a
pessoa escolhe retorno sem avisos ou uma atividade autorizada (`checkin`,
`respiracao` ou `habito`). O servidor permite no máximo uma entrega por dia
local da pausa, a partir das recorrências já cadastradas daquela atividade,
respeitando o silêncio. Nenhuma recorrência é criada automaticamente. Não há
adiamentos durante descanso ou retorno, e o servidor revalida essa regra.
É possível concluir o retorno antes do fim; o dia tocado continua neutro.

## Metas e sequências

Metas escolhidas devem ser próprias, em andamento e com prazo disponível a
partir do início. Para cada dia neutro, um dia é acrescentado ao prazo efetivo.
O prazo original, alvo e valores reais permanecem guardados. A interface de
metas mostra original, efetivo e quantidade de dias, além de identificar o
ritmo pausado. O cálculo de atraso usa o prazo efetivo; descansar não conclui
uma meta. O progresso automático continua derivado somente dos registros
reais. A pausa não reduz alvos fisiológicos ou propõe mudança de tratamento.

O vínculo guarda o prazo original escolhido. Se a pessoa editar esse prazo
fora da pausa, a adaptação daquele vínculo deixa de ser aplicada, evitando
somar uma extensão automática a uma edição manual. Pausas sucessivas com o
mesmo prazo original têm seus intervalos unidos antes da contagem, sem somar
duas vezes um mesmo dia. Uma meta ainda válida pelo prazo efetivo pode ser
escolhida para uma nova pausa.

As sequências continuam contando somente dias realmente registrados que
atendem a seus critérios, fora dos dias neutros. Uma data neutra não soma um
dia cumprido nem quebra a continuidade entre dois dias cumpridos. Só haver
descanso não cria sequência. Depois da retomada, um dia ativo sem cumprimento
volta a interromper a continuidade segundo a regra existente. A interface
identifica a neutralidade e deixa de cobrar aderência no descanso ou retorno.
Nenhuma linha de `daily_metrics` é apagada por esses cálculos.

## Contratos, concorrência e privacidade

- `GET /api/descanso`: período atual, histórico paginado, opções autorizadas
  e adaptações. `antes=UUID` busca a página anterior do próprio titular.
- `GET /api/descanso?resumo=1`: estado mínimo para o indicador do aplicativo.
- `POST /api/descanso`: `pedidoId`, `inicio`, `fim` (ou null), `retornoDias`,
  `atividade` (ou null) e `metas`. Repetição idêntica retorna o mesmo período.
- `PUT /api/descanso/[id]`: dados do período e `versao` atual.
- `POST /api/descanso/[id]`: `acao` (`encerrar`, `cancelar`, `concluir_retorno`)
  e `versao` atual.

Todos exigem sessão. Metas e atividade do retorno são validadas por titular e
permissões atuais. Uma conta não pode ler outro histórico por cursor ou agir
sobre outro UUID. Versões recusam sobrescrita concorrente. A trava por conta
é compartilhada por período, avisos, lembretes e recálculo de metas e
sequências, usando a mesma conexão transacional nas operações dependentes.

A migração 052 acrescenta períodos e vínculos de metas com chaves estrangeiras
compostas de propriedade. As duas tabelas entram na portabilidade LGPD e na
exclusão em cascata da conta. Não há justificativa de saúde obrigatória nem
envio do histórico a modelos externos. Leituras são privadas e sem cache. O
indicador consulta o estado ao voltar ao aplicativo e a cada minuto visível;
essa frequência da interface não altera o relógio usado pelo servidor.

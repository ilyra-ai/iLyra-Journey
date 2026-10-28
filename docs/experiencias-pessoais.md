# Experiências pessoais acompanhadas

A página `/experiencias` permite definir uma pequena mudança escolhida pela
pessoa, observar seu cotidiano e revisar registros existentes. Não é ensaio
clínico, avaliação de eficácia ou recomendação para alterar tratamento.

## Proposta e acompanhamento

Cada proposta guarda nome, objetivo, mudança, início, duração prevista de 3 a
60 dias e referência anterior de até 30 dias. O início pode ser hoje ou um dos
29 dias anteriores, no fuso do perfil. A referência deve terminar antes do
início e estar dentro do histórico disponível no plano. Uma proposta registrada
depois de seu início aparece como retrospectiva: nenhum relato anterior é criado.
Até 30 experiências podem permanecer na conta.

O alinhamento do sono é explícito: registro do mesmo dia ou do dia seguinte,
com o segundo como padrão. Energia usa o mesmo dia. Proposta, períodos,
alinhamento e fuso ficam preservados após iniciar, para manter a definição
original. Uma proposta diferente deve ser registrada como outra experiência.
É possível relacionar meta em andamento e hábito ativo do próprio titular,
copiando seus nomes somente por ação explícita. Isso não altera progresso,
minutos ou registros de práticas.

Um relato por dia observado pode informar se a mudança foi seguida, percepção
pessoal de 1 a 5 e nota de até 1.000 caracteres. Todos são opcionais, mas é
preciso informar pelo menos um para salvar. Ausência de relato ou resposta
permanece desconhecida. Os relatos podem ser corrigidos ou excluídos, inclusive
após o encerramento, dentro do período efetivamente observado.

Pausar, retomar e encerrar usam o relógio real do servidor e o fuso preservado.
Qualquer dia civil tocado por pausa é excluído da comparação quantitativa,
mesmo quando retomada no mesmo dia; seus relatos continuam visíveis. A pausa
não estende o prazo. Ao passar o fim previsto, a proposta aguarda encerramento
explícito, sem fabricar conclusão ou prática. Encerrar limita a observação à
menor data entre hoje, fim previsto e encerramento; não permite retomada.

## Revisão local e limites

A revisão é cálculo local descritivo, sem chamada a modelo externo. Apresenta
contagens reais de relatos, seguimento informado, percepção e pausas, além das
medianas de sono e energia disponíveis. Cada métrica exige cinco dias válidos
na referência e três na observação, excluindo pausas e dados fora do histórico.
Esses números são critérios de apresentação do produto, sem significância
clínica presumida. Sem quantidade suficiente, ambas as medianas comparativas
permanecem indisponíveis. Zero de sono válido não é confundido com ausência.

A tabela inclui todas as datas da referência e observação, lacunas e datas
efetivas das métricas. A API mantém seus IDs de origem. Sono do dia seguinte
ainda futuro fica ausente; dados não são interpolados nem substituídos por
prontidão calculada. O corte atual do plano vale em cada leitura; não há cópia
histórica que contorne uma redução posterior da janela.

Outras experiências com período sobreposto são contadas e apontadas como
possíveis mudanças simultâneas. Notas permanecem disponíveis para relatar
acontecimentos e diferenças de rotina. O sistema não afirma ter controlado
esses fatores, nem atribui diferença de mediana à mudança escolhida. Copiar a
revisão e abrir o chat são ações voluntárias; não há envio automático.

## APIs, persistência e privacidade

Página, menu e todos os handlers exigem sessão, `personal_habits` e
`metrics_history_days`. Vínculo de meta exige também `goal_progress_tracking`.
O titular vem da sessão; UUID de outra conta não concede acesso. Leituras
autenticadas usam `private, no-store`. A URL contém somente o UUID selecionado.

- `GET /api/experiencias`: propostas e opções próprias de metas/hábitos ativos.
- `POST /api/experiencias`: proposta estrita com `pedidoId` UUID idempotente;
  retorna 201 na criação e 200 na repetição idêntica, 409 se a proposta mudou.
- `GET /api/experiencias/[id]`: proposta, relatos, pausas e revisão rastreável.
- `POST /api/experiencias/[id]`: `acao` (`pausar`, `retomar`, `encerrar`) e `versao`.
- `DELETE /api/experiencias/[id]`: `versao` atual.
- `PUT /api/experiencias/[id]/relatos/[data]`: `idRelato`, `data`, `seguiu`
  (`sim`, `parcial`, `nao` ou null), `percepcao` (1–5 ou null), `nota`, `versao`.
- `DELETE /api/experiencias/[id]/relatos/[data]`: `idRelato` e `versao`.

Contratos completos em `src/lib/experiencias/esquema.ts`. Datas inválidas,
futuras ou fora da observação são recusadas. Bloqueio transacional por titular
protege limite e operações simultâneas; versões e identidade do relato evitam
sobrescrita de uma edição ou de um relato recriado em outra página.

A migração 051 cria `personal_experiments`, `personal_experiment_notes` e
`personal_experiment_pauses`, com datas de criação, propriedade e cascata.
Todas participam da exportação LGPD. Excluir experiência remove seus relatos
e pausas, preservando métricas, metas e práticas; excluir a conta remove as
três tabelas para aquele titular. Não há dados pessoais enviados a provedor
externo por essa funcionalidade.

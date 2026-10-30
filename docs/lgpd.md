# LGPD na Lyra MetaCare

Como a plataforma atende à Lei Geral de Proteção de Dados (Lei 13.709/2018) no código. Os textos para o público estão em `/privacidade` e `/termos`.

## Quem acessa o quê

| Dado                                                                            | Titular                        | Administrador                                        |
| ------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| Saúde e bem-estar (métricas, ciclo, avaliações, hábitos, metas, planos, agenda) | lê, altera e apaga             | não lê, não altera, não apaga                        |
| Perfil sensível (nascimento, gênero, idade, metas, atividade)                   | lê e altera                    | não lê                                               |
| Identificação (nome, e-mail, papel, onboarding, foto)                           | lê e altera (e-mail com senha) | lê; altera só papel e onboarding                     |
| Métricas: quem registrou e quando (`id`, `user_id`, `date`, `created_at`)       | lê                             | lê (painel "Saúde dos dados"), sem valores           |
| Histórico de compras (`/api/account/purchases`)                                 | lê as próprias faturas         | não tem rota de histórico por pessoa                 |
| Registros fiscais (`fiscal_records`)                                            | vê as próprias compras         | lê todos (`/admin/dashboard?aba=fiscal`), só leitura |

A regra está em `src/lib/mysql/table-config.ts` (`adminReadAll`, `adminReadColumns`, `adminWriteColumns`) e é aplicada em `src/lib/mysql/data-api.ts`:

- O administrador que consulta linhas de outras contas recebe `*` reduzido às colunas liberadas.
- Pedir, filtrar (inclusive `or`) ou ordenar por coluna não liberada responde 403.
- Alterar coluna não liberada ou apagar dados de outra conta responde 403.
- Tabelas sem `adminReadAll` (metas, hábitos, planos, agenda, profissionais, avaliações, sequências) ficam presas às linhas da própria conta, também para o administrador.
- Consultas filtradas pelo próprio id continuam completas: o administrador também é titular dos próprios dados.

A listagem `/api/admin/users` e o detalhe do usuário no painel trazem só identificação, papel, onboarding e plano.

## Consentimento

- **Cadastro:** exige `acceptTerms: true` e grava `terms_of_use` e `privacy_policy` na versão vigente, na mesma transação da conta.
- **Onboarding:** grava `health_data_processing` (art. 11, I) antes de qualquer dado de saúde ser salvo.
- **Registro:** `consent_records` guarda o tipo, a versão (`src/lib/lgpd/documentos.ts`), a data e o navegador. Um índice único impede duplicar o mesmo aceite.
- **Rotas:** `GET` e `POST /api/account/consents`. A lista aparece no perfil.

## Direitos do titular (art. 18)

| Direito                           | Onde                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| Acesso e portabilidade            | Perfil → "Baixar meus dados" (`GET /api/account/export`, JSON, `no-store`, sem hash de senha) |
| Correção                          | Perfil (todos os dados do onboarding) e troca de e-mail (`PATCH /api/account/email`)          |
| Eliminação e revogação            | Perfil → "Excluir minha conta" (`DELETE /api/account`, senha + frase de confirmação)          |
| Informação sobre compartilhamento | `/privacidade`                                                                                |

O botão de exclusão chama `excluirConta` (`src/lib/lgpd/conta.ts`). O administrador usa o mesmo serviço em `DELETE /api/admin/users/:id`, mas não pode excluir a própria conta por essa rota.

A exclusão:

1. recusa se houver assinatura paga com renovação ativa (409), porque excluir a conta não cancela a cobrança na Stripe. A pessoa cancela a renovação no portal antes;
2. recusa a exclusão do último administrador (409);
3. apaga `users`. Todos os dados pessoais e de saúde saem em cascata (perfil, métricas, metas, hábitos, planos, agenda, avaliações, assinaturas, consentimentos, contadores e cliente de cobrança);
4. apaga as imagens enviadas (`<bucket>/<userId>`);
5. mantém os registros fiscais, com `user_id = NULL` (FK `ON DELETE SET NULL`), os espelhos financeiros mínimos e o histórico de operações. A autoria das operações deixa de apontar para a conta administrativa excluída, sem preservar perfil ou saúde.

A API de dados não apaga perfis (403): a exclusão é sempre da conta inteira.

## Registros fiscais (tarefa 28.1)

- **Origem:** o webhook `invoice.paid` da Stripe grava uma linha em `fiscal_records` por fatura (`src/lib/billing/service.ts`). A gravação é idempotente pelo id da fatura.
- **Conteúdo:**
  - valores (subtotal, impostos e total, em centavos), moeda, datas, número da fatura, plano e ciclo;
  - fotografia do comprador: nome, e-mail, documento fiscal (CPF/CNPJ quando coletado pela Stripe) e endereço;
  - nenhum dado de saúde.
- **Imutabilidade:** não existe rota de alteração ou exclusão, e a tabela não faz parte da API de dados. Os registros não são excluídos pela plataforma (CTN, art. 195, parágrafo único).
- **Acesso:** administrador na aba Fiscal em `/admin/dashboard?aba=fiscal` (filtro por período e exportação CSV); titular em `/api/account/purchases`, só as próprias faturas.

Recomendação para produção: revogar `UPDATE` e `DELETE` em `fiscal_records` para o usuário da aplicação no MySQL. Gatilhos não foram usados porque, com o log binário ligado (padrão do MySQL), criá-los exige o privilégio `SUPER`.

## Lembretes pessoais (tarefa 117)

Preferências de fuso e silêncio, lembretes e ocorrências pertencem ao titular.
`reminder_preferences`, `personal_reminders` e `reminder_occurrences` integram a
exportação e têm exclusão em cascata com a conta. Excluir um lembrete também
remove suas ocorrências e notificações, preservando hábitos e registros de
bem-estar. O processamento limpa ocorrências com mais de 90 dias. O canal é
somente o sino do app aberto, sem enviar esses dados a terceiros.

## Respostas favoritas (tarefa 118)

`chat_favorites` guarda a referência à mensagem e a data em que o titular a
salvou, sem duplicar seu conteúdo. A tabela integra a exportação da conta;
excluir a conversa ou a conta remove os vínculos em cascata. Busca e destino
original filtram o titular e respeitam `chat_history`. A consulta não envia
texto a modelos; o termo fica no corpo do pedido, fora da URL. A retirada da
permissão recusa a consulta e as mutações sem apagar o histórico.

## Rotinas pessoais (tarefa 119)

`personal_routines` e `personal_routine_runs` guardam definições e execuções do
titular, incluindo os passos preservados no início e seus estados declarados.
Ambas integram a exportação e são removidas com a conta. Excluir a rotina
remove suas execuções e preserva os hábitos, metas e práticas existentes.
As APIs exigem `personal_habits`; as práticas associadas mantêm seus direitos
próprios. Não há envio a modelos externos nem geração de métricas a partir
da simples conclusão de passos.

## Acontecimentos pessoais (tarefa 120)

Marcadores, notas, confirmação dos dias e vínculos são relatos privados do
titular. `personal_event_markers`, `personal_event_days` e
`personal_event_day_markers` integram a exportação e são removidas em cascata
com a conta. Excluir contexto não apaga métricas; excluir marcador exige nova
revisão dos dias afetados. A comparação filtra a conta, respeita a janela do
plano e não envia dados a modelos externos. Ausência de registro não é tratada
como ausência de acontecimento ou valor zero.

## Fronteiras externas

- **Stripe:** sem credencial real no ambiente de desenvolvimento, o `invoice.paid` foi validado com eventos assinados localmente pela SDK oficial (`src/app/api/lgpd.integration.test.ts`).
- **Identificação do controlador:** o e-mail do encarregado vem de `LGPD_CONTATO_EMAIL`. Razão social e CNPJ dependem da empresa que opera a instância e não foram inventados.

## Testes

`src/app/api/lgpd.integration.test.ts` cobre consentimento, segregação (colunas, filtros, ordenação, alteração e exclusão), lista administrativa, fatura paga → registro fiscal (idempotência e acesso), exportação, exclusão completa com retenção fiscal e as recusas.

## Espelhos financeiros (tarefa 100)

A exportação inclui `financeiro`: faturas, pagamentos vinculados, reembolsos e estado/data das operações. Valores monetários são strings de unidades mínimas para preservar precisão. A ligação exige registro fiscal do titular ou assinatura externa e cliente de cobrança no mesmo ambiente. Legado sem ambiente só é ligado quando a referência não é ambígua e não existe mapeamento de cliente contraditório; nenhum vínculo é inferido por nome ou e-mail. Registros sem vínculo não são exportados para outra conta. Não inclui auditoria interna, identidade de funcionários, parâmetros/resultados operacionais, conta do provedor ou movimentos de saldo agregados do comerciante.

Os seis espelhos/auditorias não contêm dados clínicos nem fotografia do comprador. São preservados para rastreabilidade financeira; o documento fiscal original continua separado e imutável. A política de privacidade de 26/10/2026 informa essa retenção e mantém os registros de consentimento anteriores intactos.

## Explicações do painel (tarefa 115)

Os textos derivados são separados das medições. A exportação inclui
`descricoes_do_painel` (dia, estado, conteúdo e data da geração) e
`uso_das_descricoes_do_painel` (dia UTC da chamada e tentativas). Ambos
são removidos com a conta por chave estrangeira em cascade. Nenhuma
medição original é substituída por uma saída de modelo.

No modo privado, as explicações vêm do catálogo sem chamada a modelo.
Fora desse modo, provedores externos continuam condicionados à autorização
de nuvem existente; a ausência de autorização restringe a cadeia aos locais.
Nome, e-mail, identificador da conta, nascimento bruto e segredos não integram
o pedido. O modelo pode receber as colunas autorizadas do registro e fatos
interpretativos já calculados, conforme os recursos do plano.

## Experiências pessoais (tarefa 121)

Propostas, relatos e pausas pertencem ao titular autenticado e são incluídos
na exportação (`personal_experiments`, `personal_experiment_notes`,
`personal_experiment_pauses`). Excluir proposta remove seu acompanhamento,
preservando métricas e práticas; excluir conta remove todos esses dados.
A revisão é local e não envia relatos a modelo externo. O histórico atual
do plano continua limitando cada leitura. Consulte os
[contratos e limites](./experiencias-pessoais.md).

## Acompanhamentos pessoais (tarefa 130)

Acompanhamentos, definições de escala/frequência e respostas pertencem ao
titular autenticado e entram na exportação (`personal_trackers`,
`personal_tracker_definitions`, `personal_tracker_entries`). Mudar a escala
cria uma nova definição sem converter respostas anteriores. Arquivar preserva
as respostas; excluir o acompanhamento remove definições e respostas por
cascata, preservando métricas, metas e práticas; excluir a conta remove as
três tabelas. Não há envio a provedor externo. O histórico vigente do plano
limita leitura e gravação. Detalhes em
[Acompanhamentos pessoais](./acompanhamentos-pessoais.md).

## Linha do tempo pessoal (tarefa 131)

Consulta somente leitura das origens já guardadas pelo titular autenticado,
sem nova tabela, cópia ou envio externo. Cada origem respeita os recursos do
plano da sua página e o corte do histórico. Notas pessoais e conversas não
são exibidas. Exportação e exclusão continuam pelas tabelas de origem.

## Meditações guiadas (tarefa 132)

`meditation_sessions` guarda prática, versão do roteiro, tempo e minutos
somados do titular; entra na exportação e é removida com a conta. A narração
é local no dispositivo; nenhum texto ou áudio é enviado a serviço externo.

## Relatório pessoal em PDF (tarefa 122)

A prévia e o PDF consultam somente as categorias selecionadas do titular
autenticado. Notas exigem escolha separada; conversas e cadastros de
terceiros não são consultados. O arquivo é gerado em memória e entregue
como anexo privado sem cache, sem URL pública ou envio automático.
Não há nova tabela ou retenção de relatórios. A exclusão posterior da
conta não apaga cópias que o titular já baixou em seus dispositivos.
Permissões e histórico são revalidados antes do download; a prévia
fica inválida quando os dados selecionados mudam. A exportação LGPD
em JSON permanece disponível e tem finalidade diferente.
Detalhes em [Relatório pessoal](./relatorio-pessoal.md).

## Modo descanso (tarefa 123)

`rest_periods` e `rest_goal_links` pertencem ao titular autenticado, entram
na portabilidade e são removidos em cascata na exclusão da conta. O modo
não exige justificativa de saúde nem envia seu histórico a modelos.
Registros diários e hábitos não são apagados; dias neutros não se tornam
dias cumpridos. Metas relacionadas são próprias e têm prazo original
preservado. Avisos dispensados permanecem em seu histórico existente,
seguindo a retenção desse recurso. O histórico de descanso é paginado
sem truncamento silencioso. Leituras são privadas e sem cache.
Detalhes em [Modo descanso](./modo-descanso.md).

## Versões dos registros manuais

O histórico guarda os campos alterados, valores anteriores e novos, autoria da
própria conta e data/hora. Fica consultável por até 90 dias, dentro do histórico
do plano. Versões vencidas são removidas ao gravar, consultar ou exportar esse
histórico; contas sem atividade podem mantê-las fisicamente até uma dessas
operações ou sua exclusão, sem disponibilizá-las para consulta ou restauração.
O histórico integra a exportação do titular e é eliminado em cascata com o
registro ou a conta. Desfazer exige sessão e recurso do plano, a última revisão
intacta e a janela de edição vigente. Não recupera exclusões definitivas nem
transforma uma restauração em medição de sensor. A política de 30/10/2026
informa essa finalidade e retenção. Detalhes em [Versões dos registros](./versoes-dos-registros.md).

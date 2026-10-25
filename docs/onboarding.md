# Onboarding em três etapas

A tarefa 95 substitui as cinco etapas anteriores por **Sobre você**, **Seu mapa** e **Conferir e entrar**, reutilizando os campos e componentes existentes. Os objetivos deixam o onboarding e continuam disponíveis no perfil. Concluir o percurso nunca limpa nem altera os objetivos já salvos. O apelido permanece opcional, com o rótulo “Como Você Gostaria de Ser Chamado”. Gênero e atividade ficam em preferências opcionais, sem seleção inicial inventada; horário e moradia também podem ficar para depois.

A referência consultada em 25/10/2026 foi [Question pages, fonte oficial do GOV.UK Design System](https://github.com/alphagov/govuk-design-system/blob/main/src/patterns/question-pages/index.md): perguntar apenas o necessário, agrupar perguntas relacionadas, identificar opções e permitir retornar. A interface mantém os tokens claros e os componentes do projeto, informa a etapa, conduz o foco ao título ou campo inválido e respeita movimento reduzido.

## Gravação e consentimento

`POST /api/onboarding` recebe nomes, data de nascimento, identificador da cidade natal, consentimento explícito e os campos opcionais fornecidos. O servidor valida o contrato estrito, idade entre 13 e 120 anos, horário e cidades reais. Não aceita objetivos, titular arbitrário ou coordenadas fornecidas pelo cliente. Nome, dados geográficos canônicos, preferências enviadas, consentimento e conclusão são gravados em uma transação. Campos opcionais omitidos são preservados; horário e moradia aceitam limpeza explícita. Repetir a conclusão não duplica o consentimento da versão vigente.

A sessão determina o titular. O bloqueio é revalidado dentro da transação, coordenada com a trava administrativa existente. Há limite persistente de 20 solicitações válidas por conta e hora, com 429 e `Retry-After`. A API genérica recusa concluir um perfil pendente sem passar pelo novo formulário. A edição de perfis já concluídos e o controle administrativo de status existente continuam funcionando.

O formulário só fica disponível após recuperar o perfil real. Falha de leitura oferece retentativa. A conclusão atualiza a sessão antes da entrada no app; caso apenas essa atualização falhe, a retentativa não exige uma nova gravação do perfil.

## Retomada

Os dados e a etapa são guardados em `sessionStorage`, separados pelo identificador da conta, com validade de 24 horas. O rascunho fica na aba e contém dados pessoais: encerrar a aba remove esse armazenamento; expiração é conferida na leitura e a conclusão o apaga. O consentimento nunca é salvo no rascunho e precisa ser marcado novamente após recarregar. Sem armazenamento disponível, o formulário continua utilizável com aviso. Rascunhos inválidos são descartados e etapas incompatíveis com os dados são corrigidas. Voltar funciona tanto pelo botão quanto pelo histórico do navegador, preservando o estado do Next.js.

## Evidências

528 testes unitários e 245 integrações (37 arquivos), formatação, lint, tipos e build de produção aprovados. `src/app/api/onboarding.integration.test.ts` cobre conclusão transacional, preservação, consentimento, campos inválidos, limite, isolamento, recusa anônima e proteção da API genérica.

QA em HTTP/Chromium de produção percorreu cadastro público → três etapas → app, validou campos e consentimento, recuperação após recarga, retorno entre etapas inclusive após recarregar e falha offline com retentativa. Conferiu no banco apelido editado, objetivos anteriores preservados, gênero/atividade não respondidos como NULL, limpeza de horário e cidade real. Um novo login não repetiu o onboarding. Capturas das três etapas em 1440, 390 e 320 pixels foram conferidas, sem estouro horizontal. A conta temporária foi excluída ao final. Logs e capturas locais: `/tmp/lyra95-*`.

# Gestão administrativa de usuários · tarefa 93

## Inventário e seleção anterior ao código

Existentes: cadastro administrativo Free, busca por identificação, ordenação e paginação, detalhe e atribuição de assinatura, alteração de onboarding, exclusão LGPD e bloqueio/desbloqueio (92). Exportação CSV já existe em Relatórios e não é contada como novidade.

As cinco entregas são independentes e terão publicação individual:

1. Encerrar sessões anteriores sem bloquear a conta: motivo categórico, confirmação, incremento da versão de sessão e idempotência por solicitação. Login novo continua permitido; nenhum número fictício de dispositivos/sessões é exibido.
2. Linha temporal administrativa por usuário: eventos reais com autor, ação e horário, paginação, ausência de histórico informada. Somente ações efetivamente coletadas; não reconstruir fatos por inferência.
3. Notas operacionais: CRUD privado aos administradores, autoria e atualização com versão, conflito explícito, sem copiar o texto para logs, limite e aviso de que não se devem registrar dados clínicos ou segredos.
4. Marcadores operacionais: catálogo com CRUD e atribuição/remoção por usuário; nomes e apresentação acessíveis. Não representam diagnóstico, papel nem assinatura.
5. Segmentação: filtros combinados de acesso, papel, plano, onboarding e marcadores; salvar, listar, atualizar e excluir segmentos privados do administrador, executando a consulta sobre o estado atual do banco.

Todas as entregas exigem autenticação e autorização no servidor, validação, persistência após recarga, isolamento, tratamento de falhas e auditoria apropriada. Os dados administrativos associados à pessoa devem respeitar exportação e exclusão LGPD, sem expor informações de outras contas. Manter o visual existente com os primitivos compartilhados do projeto. Validar operações reais, permissões, teclado, mobile e desktop.

## Referências oficiais consultadas em 2026-10-25

Os sites institucionais da OWASP e W3C responderam 403 pela política de rede desta nuvem. As fontes oficiais atuais abaixo foram lidas diretamente nos repositórios dos mantenedores, com HTTP 200. A data é de consulta; não se inventa data de publicação nem estudo de tendências.

- [OWASP · Session Management Cheat Sheet](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Session_Management_Cheat_Sheet.md): invalidação no servidor, encerramento remoto e ciclo de vida das sessões fundamentam a primeira entrega.
- [OWASP · Logging Cheat Sheet](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Logging_Cheat_Sheet.md): ações administrativas rastreáveis; excluir senhas, tokens e dados pessoais sensíveis dos logs. Fundamenta a trilha persistida e minimização dos eventos de notas/marcadores.
- [W3C · ARIA APG, modal dialog](https://github.com/w3c/aria-practices/blob/main/content/patterns/dialog-modal/dialog-modal-pattern.html): foco dentro do diálogo, navegação por teclado e fechamento acessível. Aplicável às confirmações e CRUD.

A seleção prioriza necessidades reais encontradas no app e evita funções externas indisponíveis, controles decorativos ou repetição de recursos existentes.

## Entrega 1 · Encerramento de sessões

`POST /api/admin/users/:userId/sessoes` exige administrador ativo, motivo categórico e UUID de solicitação. A versão da sessão e o evento mínimo são gravados na mesma transação. Repetições concorrentes retornam um único efeito; reutilizar a solicitação com outro autor/motivo é conflito 409. A confirmação mantém o motivo depois de uma falha para permitir repetir com segurança. Encerrar as próprias sessões também limpa o estado local da autenticação. A conta continua desbloqueada, com os dados e plano preservados. Uma operação autorizada antes da revogação pode terminar; a revogação é conferida a cada autorização seguinte.

Migração 037 aplicada no banco existente e no banco novo isolado das integrações. Eventos não contêm tokens, senhas nem textos livres. A exportação LGPD inclui ação, motivo e data do titular, omitindo a identidade do administrador; a exclusão da conta remove seus eventos em cascata.

Validação: 528 unitários e 216 integrações (31 arquivos), tipos, lint, formatação e build passaram. Chromium e HTTP em produção comprovaram menu, confirmação por teclado, 1440/390/320 px sem estouro, recusa do paciente 403, cookie anterior 401, novo login 200, repetição preservando nova sessão e um único evento, exportação minimizada e autoencerramento com redirecionamento ao login. A conta QA identificada foi removida.

## Entrega 2 · Histórico administrativo por conta

O menu Ações abre o histórico, com autoria, data local do navegador, origem e descrição em português. O servidor reúne eventos de gestão e a auditoria persistida de atribuições de assinatura; não usa o estado atual da conta para inventar ações passadas. Passam a ser coletados cadastro administrativo, bloqueio/desbloqueio, revogação de sessões e mudanças efetivas de papel/onboarding pelo administrador. Repetir um estado não gera outro evento. Cada coleta usa a mesma transação da alteração. Notas e marcadores terão seus eventos ao serem entregues.

O histórico é somente leitura e exclusivo de administradores ativos. `GET /api/admin/users/:userId/historico` retorna até 20 eventos, com cursor de continuação e `no-store`. Cada fonte limita sua leitura a 21 candidatos antes da união. A migração 038 acrescenta índice cronológico à auditoria de assinaturas. A ordenação usa data e chave como desempate estável; registros com a mesma precisão de segundo não permitem inferir a ordem exata dentro desse segundo. Quando o autor já foi excluído, a interface informa que ele não está disponível, sem fabricar nome ou e-mail. A exclusão LGPD continua removendo os eventos da conta; o titular exporta somente sua ação, motivo e data, sem identidade de outras contas.

A mudança de papel agora compartilha a trava da administração e impede rebaixar o último administrador ativo, considerando contas bloqueadas. O backend revalida o administrador depois da trava.

Validação: 528 testes unitários e 221 integrações em 32 arquivos; formato, lint, tipos e build aprovados. A migração 038 foi aplicada ao banco existente e ao novo banco de integração. QA HTTP e Chromium comprovou 26 eventos reais de seis ações em 20+6 itens, sem duplicação, autor/origem, recusa anônima 401 e de paciente 403, atualização com novo evento, navegação entre páginas, persistência após recarga, Escape e recuperação após falha offline real do navegador. Conferência visual em 1440, 390 e 320 px, sem estouro horizontal. A conta QA foi removida ao final. Testes adicionais cobrem ausência de registros, isolamento, cursores inválidos, autor excluído, paginação entre duas fontes com evento posterior e proteção do último administrador ativo.

## Entrega 3 · Notas operacionais com CRUD e conflitos explícitos

O menu Notas operacionais permite criar, ler, editar e excluir registros de suporte compartilhados pela administração. A interface informa que não se devem registrar dados clínicos, senhas ou chaves, e que as notas integram a exportação dos próprios dados da pessoa. Não foi ampliado o acesso administrativo aos campos clínicos. O texto é apresentado literalmente pelo React, sem renderizar HTML.

A migração 039 persiste autoria, última edição e versão. Cada conta admite até 100 notas de 2.000 caracteres, com normalização dos controles pela função já existente no app. As APIs exigem administrador ativo, validam UUIDs/corpos estritos e devolvem dados com `no-store`. Toda gravação revalida o papel e o bloqueio depois da trava administrativa, trava a conta e registra o evento na mesma transação. O identificador de criação torna a repetição segura, inclusive concorrente; não pode ressuscitar nota excluída. Editar sem alterar o texto não gera versão/evento extra.

Edição e exclusão exigem a versão lida. Uma alteração concorrente retorna 409 e preserva o conteúdo vencedor. A interface preserva o rascunho, permite conferir a lista e reabrir a versão atual com confirmação antes de descartar o texto local. Fechar ou trocar a edição com rascunho também exige confirmação; a exclusão tem confirmação própria. Depois de falha de rede na criação, o texto permanece disponível para copiar e repetir a mesma solicitação, sem duplicar uma nota eventualmente já gravada.

A exportação LGPD do titular inclui texto, versão e datas das suas notas, omitindo a identidade dos administradores. Excluir a conta remove suas notas e eventos em cascata; excluir o administrador autor remove apenas a referência pessoal, preservando os registros de outras contas. O histórico registra criação, edição e exclusão, sem copiar o texto da nota.

Validação: 528 unitários, 227 integrações em 33 arquivos, tipos, lint, formato e build aprovados. Seis integrações específicas cobrem CRUD por dois administradores, repetição e concorrência, limite, isolamento, acesso não autorizado, versões e LGPD; foram repetidas após conferir os cabeçalhos de cache. Migração 039 aplicada ao banco existente e ao banco novo isolado. QA HTTP/Chromium em produção comprovou CRUD, conflitos reais de edição/exclusão, preservação e descarte do rascunho, recarga, erro offline e retentativa segura, texto HTML literal, exportação minimizada, teclado e sete eventos de notas sem conteúdo. O grid do diálogo e os textos longos foram corrigidos pela inspeção visual: 1440/390/320 px sem estouro na página nem dentro do diálogo. O campo limita o redimensionamento ao eixo vertical. A conta QA foi removida.

## Entrega 4 · Marcadores operacionais

O menu Marcadores operacionais abre as abas Nesta conta e Gerenciar catálogo, reutilizando Tabs, diálogos e controles do app. A primeira atribui/remove marcadores individualmente, sem sobrescrever outras seleções; o estado só muda após confirmação do servidor. A segunda permite criar, ler, editar e excluir categorias. Cada marcador tem nome e cor, com identificação textual permanente. Limites: 50 marcadores ativos no catálogo, 10 por conta e nomes normalizados de até 40 caracteres. A interface orienta evitar nomes pessoais e informações de saúde.

A migração 040 cria catálogo e associações. Nomes ativos são únicos; a criação aceita repetição do mesmo identificador/dados/autor sem duplicar. Edição exige a versão lida. Nome e cor são consultados no catálogo compartilhado: atualizá-los reflete nas contas associadas e na exportação. Marcadores não alteram papel, plano ou permissões.

Excluir exige confirmar tanto a versão quanto o número de contas afetadas. Se alguém atribuiu o marcador a outra conta desde a leitura, o servidor responde 409 antes de qualquer exclusão. A operação aprovada remove associações e gera seus eventos em lote na mesma transação; limpa nome, cor original e autoria do catálogo e conserva somente identidade/metadados operacionais para impedir reaproveitar um identificador excluído ou ressuscitá-lo por repetição de rede. O nome pode ser usado novamente com um identificador novo.

A trava administrativa e a revalidação do administrador são reaproveitadas. Alterações de catálogo ficam no histórico da conta administrativa autora; atribuições/remoções ficam no histórico das contas afetadas. Os eventos guardam somente identificador, ação, autor e data, sem copiar o nome. O titular exporta nome, cor e data da associação, sem identidade do administrador; excluir sua conta remove suas associações sem apagar o catálogo de outras pessoas.

Validação: 528 unitários e 234 integrações em 34 arquivos, formato, lint, tipos e build aprovados. Sete integrações específicas cobrem CRUD, isolamento, cores/corpos inválidos, bloqueio administrativo, repetição, versões, nomes únicos, limites concorrentes, disputa entre atribuição/exclusão e LGPD. Migração 040 aplicada ao banco existente e ao novo banco isolado. QA HTTP/Chromium comprovou as duas abas em 1440/390/320 px sem rolagem horizontal, nome contínuo de 40 caracteres, seleção/paleta por teclado, formulário preservado em conflito, falha offline e recuperação sem estado fictício, impacto 1→2 recusando exclusão até reconfirmar, exportação mínima, recarga, descarte de rascunho, ausência de ressurreição do identificador e preservação de plano Free/papel paciente. As duas contas e os marcadores QA foram removidos; os eventos de catálogo desses identificadores de teste também foram limpos.

Contraste das seis prévias reais, pelo estilo computado no Chromium convertido a sRGB: Neutro 15,51:1; Azul 9,53:1; Verde 9,14:1; Amarelo 8,73:1; Roxo 10,05:1; Rosa 8,75:1. Todas superaram 4,5:1 (WCAG AA para texto). Esta conferência não gravou marcadores.

## Entrega 5 · Filtros combinados e segmentos privados

A listagem reaproveita busca, ordenação e paginação e acrescenta acesso ativo/bloqueado, papel real do perfil, onboarding, plano (inclusive sem assinatura) e marcador. As opções vêm do banco. A contagem e a consulta de linhas usam as mesmas junções/condições. Alterar critérios/aplicar segmento volta à primeira página. Fechar a gestão de marcadores atualiza suas opções.

Segmentos guardam a definição da consulta, não uma cópia dos usuários. Cada administrador pode criar, ler, renomear/atualizar os critérios e excluir até 20 segmentos privados; o proprietário vem da sessão, nunca do corpo. A edição informa expressamente que salva os filtros atuais capturados ao abrir o formulário. UUID de criação permite repetir sem duplicar nem ressuscitar um segmento excluído; versão impede sobrescrita/exclusão concorrente. Se um marcador for removido, a consulta continua filtrada e sem resultados, com aviso e opção de rever o critério, sem ampliar silenciosamente a seleção.

A migração 041 persiste os segmentos com nomes únicos por proprietário. Operações revalidam o administrador na trava compartilhada e auditam somente ação/identificador, sem nomes ou texto da consulta. Exportação LGPD inclui apenas segmentos da própria conta; exclusão remove-os em cascata. APIs administrativas não permitem acesso de titulares comuns nem de outro administrador aos segmentos de terceiros.

Gates: 528 unitários, 239 integrações em 35 arquivos, formato, lint, tipos e build aprovados. Cinco integrações específicas verificam combinação de critérios, contagem/paginação, marcador removido, isolamento, CRUD, versões, repetição, validação, limite concorrente e LGPD. Migração aplicada ao banco existente e ao banco novo isolado. QA HTTP/Chromium em produção confirmou cinco filtros combinados, criação, recarga/aplicação, edição com versão 2 e exclusão de segmento; marcador removido manteve consulta vazia com aviso; 1440/390/320 px sem estouro. Conta, marcador, segmento e eventos QA associados foram removidos.

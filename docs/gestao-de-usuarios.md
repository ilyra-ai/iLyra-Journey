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

## Referências oficiais consultadas em 2026-10-24

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

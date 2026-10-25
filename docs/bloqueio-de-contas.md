# Bloqueio administrativo de contas

Na gestão de usuários, o menu **Ações** oferece **Bloquear** ou **Desbloquear** conforme o estado persistido. A confirmação identifica a conta e explica os efeitos. O bloqueio preserva dados e assinatura; não cancela cobranças. A própria conta administrativa tem a ação desabilitada, com proteção equivalente no servidor.

A migração 036 acrescenta `users.blocked_at` e `session_version`. Ao bloquear, a versão aumenta uma vez. O login confere o bloqueio somente após verificar a senha, sem revelar o estado a quem errou as credenciais. Toda autorização de sessão relê bloqueio e versão no MySQL. Cookies emitidos antes do bloqueio permanecem inválidos mesmo após desbloquear; a pessoa deve entrar novamente. A troca de e-mail preserva a versão da sessão. Tokens anteriores à migração equivalem à versão zero.

O bloqueio vale na próxima verificação de autorização no servidor. Uma operação já autorizada antes da alteração pode terminar; a implementação não interrompe trabalhos em execução. O proxy continua sendo uma verificação otimista; as APIs e a sessão são a fonte definitiva de autorização.

`PATCH /api/admin/users/:userId/bloqueio` exige administrador ativo, UUID e corpo estrito `{ "blocked": true|false }`. Repetir a mesma operação preserva data e versão. A trava transacional compartilhada `admin_access_lock` serializa bloqueios e exclusões, revalida o administrador autor e impede bloqueios cruzados simultâneos de eliminarem a administração. Contas bloqueadas não contam como administrador ativo para autorizar a exclusão do último administrador. Desbloquear exige administrador ativo; não promove papéis nem altera planos.

Validação automatizada cobre persistência, idempotência, login, sessões e APIs, novo login após desbloqueio, manutenção da revogação do cookie antigo, anonimato, paciente, autobloqueio, corpo inválido, conta inexistente, concorrência entre administradores e exclusão do último administrador ativo. Os testes usam banco isolado e migrações reais.

QA HTTP e Chromium em produção comprovou bloqueio e desbloqueio pelo menu, estado após recarga, login 403 e APIs 401 durante o bloqueio, cookie antigo ainda recusado após desbloquear, novo login com acesso 200 e confirmação por teclado. Diálogos conferidos em 1440, 390 e 320 px, sem estouro horizontal. Somente a conta QA criada pelo roteiro foi excluída ao final.

Gates aprovados: formatação, correção e checagem de lint, tipos, 528 testes unitários, 211 integrações em 30 arquivos e build de produção. A migração 036 foi aplicada sobre o banco existente; o setup das integrações também a aplicou sobre banco novo isolado.

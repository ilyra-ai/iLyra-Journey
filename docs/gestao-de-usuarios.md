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

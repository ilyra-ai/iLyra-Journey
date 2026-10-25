# Planos e conta administrativa designada

O catálogo administrativo inclui Free, Meta, Care e Administrador. O último é
interno, privado e sem cobrança; não entra no catálogo público, checkout ou
configuração de preços da Stripe. O plano continua separado do papel da conta:
atribuir uma assinatura não concede autorização administrativa.

A identidade reservada é conferida no banco por usuário, e-mail
`admin@lyra.local` e papel administrativo. A API recusa atribuir o plano interno
a outra conta, inclusive a outros administradores, e recusa torná-lo público ou
desabilitar suas capacidades. Os limites desse plano são ilimitados. A migração
035 adiciona o plano e seus entitlements sem modificar migrações anteriores.
O bootstrap e a consulta de assinatura regularizam o acesso da conta designada.
Assinatura externa ativa não é cancelada ou substituída silenciosamente: requer
regularização da cobrança antes de vincular o plano interno.

## Cadastro e Free

O cadastro público já criava Free na mesma transação do usuário. Foi conferido
e preservado. Não havia criação administrativa de usuários; POST
`/api/admin/users` e o diálogo Novo usuário passam a criar somente contas comuns,
com Free, perfil ainda não concluído e senha protegida por bcrypt. O cliente não
pode definir papel ou plano nessa operação. Duplicidade de e-mail retorna 409,
e quem não é administrador não pode executar a operação. Não se inventa o
consentimento do titular: ele completa o onboarding e seus consentimentos.

A assinatura gratuita é idempotente e a reparação da conta comum também usa
Free. O administrador pode atribuir os planos comerciais pelos serviços já
existentes; o plano privado é reservado no servidor e na seleção da interface.

## Matriz e limites da auditoria

A matriz mantém controles reais sobre os entitlements cadastrados, agrupados em
cartões por capacidade e plano para evitar rolagem horizontal. Os quatro cartões
de planos cabem no desktop e se reorganizam no celular. O plano Administrador é
somente leitura e explica sua finalidade interna, sem preço comercial.

Testes de serviço e API cobrem recursos, cotas e concessão de assinatura.
Verificação HTTP em produção desligou o chat do Free, confirmou 403 para uma
conta comum e restaurou os valores. A conferência exaustiva de cobertura de todas
as funcionalidades tem escopo próprio na tarefa 96 e não foi declarada concluída
por esta entrega. A edição dos próprios dados de perfil continua liberada para
todos os planos por determinação da tarefa 104; não foi reintroduzido esse
bloqueio comercial.

Foram conferidos cadastro administrativo Free, privacidade do plano interno,
proteção contra atribuição indevida e apresentação da matriz em 1440, 390 e 320
pixels, sem barras horizontais. Contas e alterações temporárias foram removidas
ou restauradas. Não houve compra ou transação externa simulada como real.

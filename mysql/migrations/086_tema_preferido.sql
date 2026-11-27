-- Tema preferido da conta (claro ou escuro), pedido do titular em 27/11/2026.
-- A pessoa escolhe na primeira visita à landing; a escolha é gravada na conta
-- ao entrar pela primeira vez e o app passa a abrir nesse tema em qualquer
-- aparelho. NULL: ainda não escolheu (o app abre no claro, o padrão).
-- Aditiva e idempotente: o executor de migrações aplica uma única vez, e a
-- coluna nasce vazia para todas as contas existentes.

ALTER TABLE profiles
  ADD COLUMN tema_preferido ENUM('light', 'dark') NULL DEFAULT NULL;

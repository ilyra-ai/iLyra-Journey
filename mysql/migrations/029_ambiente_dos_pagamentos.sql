-- Ambiente dos meios de pagamento (tarefa 71): em Admin → Pagamentos o
-- administrador escolhe se cada provedor cobra no ambiente de teste ou no de
-- produção. Cada ambiente tem o seu próprio conjunto de chaves, os preços dos
-- planos na Stripe também são de um ambiente (o price id de teste não existe
-- na conta de produção) e o cliente da Stripe de cada pessoa também.
--
-- 1. payment_provider_settings: o ambiente em uso e se o provedor está ativo
--    (antes `environment` e `enabled` da linha única de credenciais).
-- 2. payment_provider_credentials: uma linha por provedor e ambiente; a
--    coluna `enabled` passa para a tabela de configuração.
-- 3. stripe_plan_prices: produto e preços (mensal e anual) de cada plano na
--    Stripe, por ambiente. Os ids que estavam em subscription_plans são
--    copiados para o ambiente da Stripe já configurado no painel (teste quando
--    não houver) e as colunas antigas saem de subscription_plans.
-- 4. billing_customers: o cliente da Stripe passa a ser por ambiente; os
--    registros existentes ficam no mesmo ambiente do passo 3.
--
-- Os passos de DDL são condicionados ao estado do schema (information_schema),
-- como na migração 004: se a execução for interrompida no meio, rodar de novo
-- continua de onde parou sem duplicar nem perder dados.

CREATE TABLE IF NOT EXISTS payment_provider_settings (
  provider VARCHAR(32) PRIMARY KEY,
  active_environment VARCHAR(16) NOT NULL DEFAULT 'test',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_payment_provider_settings_provedor CHECK (
    provider IN ('stripe', 'mercado_pago', 'paypal')
  ),
  CONSTRAINT ck_payment_provider_settings_ambiente CHECK (
    active_environment IN ('test', 'live')
  ),
  CONSTRAINT fk_payment_provider_settings_usuario FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 → 2: o ambiente e o "ativo" de cada provedor vão para a configuração.
SET @tem_enabled_nas_credenciais = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payment_provider_credentials'
    AND column_name = 'enabled'
);

SET @copiar_configuracao_sql = IF(
  @tem_enabled_nas_credenciais > 0,
  'INSERT IGNORE INTO payment_provider_settings (provider, active_environment, enabled, updated_by)
     SELECT provider, environment, enabled, updated_by FROM payment_provider_credentials',
  'SELECT 1'
);
PREPARE copiar_configuracao_stmt FROM @copiar_configuracao_sql;
EXECUTE copiar_configuracao_stmt;
DEALLOCATE PREPARE copiar_configuracao_stmt;

SET @remover_enabled_sql = IF(
  @tem_enabled_nas_credenciais > 0,
  'ALTER TABLE payment_provider_credentials DROP COLUMN enabled',
  'SELECT 1'
);
PREPARE remover_enabled_stmt FROM @remover_enabled_sql;
EXECUTE remover_enabled_stmt;
DEALLOCATE PREPARE remover_enabled_stmt;

-- Chave primária (provider, environment): um conjunto de chaves por ambiente.
SET @colunas_da_pk_das_credenciais = (
  SELECT COUNT(*)
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'payment_provider_credentials'
    AND constraint_name = 'PRIMARY'
);

SET @pk_das_credenciais_sql = IF(
  @colunas_da_pk_das_credenciais = 1,
  'ALTER TABLE payment_provider_credentials DROP PRIMARY KEY, ADD PRIMARY KEY (provider, environment)',
  'SELECT 1'
);
PREPARE pk_das_credenciais_stmt FROM @pk_das_credenciais_sql;
EXECUTE pk_das_credenciais_stmt;
DEALLOCATE PREPARE pk_das_credenciais_stmt;

-- 3. Preços dos planos na Stripe por ambiente.
CREATE TABLE IF NOT EXISTS stripe_plan_prices (
  plan_id CHAR(36) NOT NULL,
  environment VARCHAR(16) NOT NULL,
  product_id VARCHAR(255) NULL,
  monthly_price_id VARCHAR(255) NULL,
  annual_price_id VARCHAR(255) NULL,
  updated_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, environment),
  CONSTRAINT uq_stripe_plan_prices_mensal UNIQUE (monthly_price_id),
  CONSTRAINT uq_stripe_plan_prices_anual UNIQUE (annual_price_id),
  CONSTRAINT ck_stripe_plan_prices_ambiente CHECK (
    environment IN ('test', 'live')
  ),
  CONSTRAINT fk_stripe_plan_prices_plano FOREIGN KEY (plan_id)
    REFERENCES subscription_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_stripe_plan_prices_usuario FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ambiente da Stripe já escolhido no painel (teste quando não houver).
SET @ambiente_da_stripe = COALESCE(
  (SELECT active_environment FROM payment_provider_settings WHERE provider = 'stripe'),
  'test'
);

SET @tem_precos_nos_planos = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'subscription_plans'
    AND column_name = 'external_monthly_price_id'
);

SET @copiar_precos_sql = IF(
  @tem_precos_nos_planos > 0,
  CONCAT(
    'INSERT IGNORE INTO stripe_plan_prices (plan_id, environment, product_id, monthly_price_id, annual_price_id) ',
    'SELECT id, ''', @ambiente_da_stripe, ''', external_product_id, external_monthly_price_id, external_annual_price_id ',
    'FROM subscription_plans ',
    'WHERE external_product_id IS NOT NULL OR external_monthly_price_id IS NOT NULL OR external_annual_price_id IS NOT NULL'
  ),
  'SELECT 1'
);
PREPARE copiar_precos_stmt FROM @copiar_precos_sql;
EXECUTE copiar_precos_stmt;
DEALLOCATE PREPARE copiar_precos_stmt;

SET @remover_produto_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'subscription_plans'
        AND column_name = 'external_product_id'
    ),
    'ALTER TABLE subscription_plans DROP COLUMN external_product_id',
    'SELECT 1'
  )
);
PREPARE remover_produto_stmt FROM @remover_produto_sql;
EXECUTE remover_produto_stmt;
DEALLOCATE PREPARE remover_produto_stmt;

SET @remover_mensal_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'subscription_plans'
        AND column_name = 'external_monthly_price_id'
    ),
    'ALTER TABLE subscription_plans DROP COLUMN external_monthly_price_id',
    'SELECT 1'
  )
);
PREPARE remover_mensal_stmt FROM @remover_mensal_sql;
EXECUTE remover_mensal_stmt;
DEALLOCATE PREPARE remover_mensal_stmt;

SET @remover_anual_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'subscription_plans'
        AND column_name = 'external_annual_price_id'
    ),
    'ALTER TABLE subscription_plans DROP COLUMN external_annual_price_id',
    'SELECT 1'
  )
);
PREPARE remover_anual_stmt FROM @remover_anual_sql;
EXECUTE remover_anual_stmt;
DEALLOCATE PREPARE remover_anual_stmt;

-- 4. Cliente da Stripe por ambiente.
SET @tem_ambiente_nos_clientes = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'billing_customers'
    AND column_name = 'environment'
);

SET @ambiente_dos_clientes_sql = IF(
  @tem_ambiente_nos_clientes = 0,
  CONCAT(
    'ALTER TABLE billing_customers ',
    'ADD COLUMN environment VARCHAR(16) NOT NULL DEFAULT ''', @ambiente_da_stripe, ''' AFTER provider, ',
    'ADD CONSTRAINT ck_billing_customers_ambiente CHECK (environment IN (''test'', ''live''))'
  ),
  'SELECT 1'
);
PREPARE ambiente_dos_clientes_stmt FROM @ambiente_dos_clientes_sql;
EXECUTE ambiente_dos_clientes_stmt;
DEALLOCATE PREPARE ambiente_dos_clientes_stmt;

-- O valor padrão acima só serviu para classificar as linhas existentes; as
-- novas sempre informam o ambiente.
ALTER TABLE billing_customers ALTER COLUMN environment SET DEFAULT 'test';

SET @unico_por_usuario_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'billing_customers'
        AND index_name = 'uq_billing_customers_provider_user'
    ),
    'ALTER TABLE billing_customers DROP INDEX uq_billing_customers_provider_user',
    'SELECT 1'
  )
);
PREPARE unico_por_usuario_stmt FROM @unico_por_usuario_sql;
EXECUTE unico_por_usuario_stmt;
DEALLOCATE PREPARE unico_por_usuario_stmt;

SET @unico_por_ambiente_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'billing_customers'
        AND index_name = 'uq_billing_customers_provider_ambiente_user'
    ),
    'SELECT 1',
    'ALTER TABLE billing_customers ADD CONSTRAINT uq_billing_customers_provider_ambiente_user UNIQUE (provider, environment, user_id)'
  )
);
PREPARE unico_por_ambiente_stmt FROM @unico_por_ambiente_sql;
EXECUTE unico_por_ambiente_stmt;
DEALLOCATE PREPARE unico_por_ambiente_stmt;

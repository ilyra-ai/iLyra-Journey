-- Espelhos financeiros e auditoria operacional, sem conteúdo clínico,
-- dados de cartão, credenciais, nome/e-mail/documento/endereço do comprador.
-- Registros fiscais originais permanecem imutáveis na tabela fiscal_records.
CREATE TABLE billing_invoice_records (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  environment ENUM('test','live') NOT NULL,
  external_invoice_id VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(255) NULL,
  external_subscription_id VARCHAR(255) NULL,
  currency_code CHAR(3) NULL,
  status VARCHAR(32) NOT NULL,
  collection_method VARCHAR(32) NULL,
  amount_subtotal BIGINT NULL,
  amount_total BIGINT NULL,
  amount_paid BIGINT NULL,
  amount_due BIGINT NULL,
  amount_remaining BIGINT NULL,
  provider_created_at DATETIME NULL,
  paid_at DATETIME NULL,
  due_at DATETIME NULL,
  voided_at DATETIME NULL,
  source_event_created BIGINT NOT NULL DEFAULT 0,
  source_event_id VARCHAR(255) NULL,
  needs_reconciliation BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_billing_invoice_environment (provider,environment,external_invoice_id),
  KEY idx_billing_invoice_created (environment,provider_created_at,id),
  KEY idx_billing_invoice_paid (environment,paid_at,id),
  KEY idx_billing_invoice_status (environment,status,due_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE billing_invoice_payments (
  invoice_record_id CHAR(36) NOT NULL,
  payment_kind VARCHAR(32) NOT NULL,
  external_payment_id VARCHAR(255) NOT NULL,
  external_invoice_payment_id VARCHAR(255) NOT NULL,
  amount_paid BIGINT NULL,
  PRIMARY KEY (invoice_record_id,payment_kind,external_payment_id),
  KEY idx_billing_payment_reference (payment_kind,external_payment_id),
  CONSTRAINT fk_billing_payment_invoice FOREIGN KEY(invoice_record_id) REFERENCES billing_invoice_records(id) ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE billing_refund_records (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  environment ENUM('test','live') NOT NULL,
  external_refund_id VARCHAR(255) NOT NULL,
  invoice_record_id CHAR(36) NULL,
  link_source VARCHAR(32) NULL,
  payment_kind VARCHAR(32) NULL,
  external_payment_id VARCHAR(255) NULL,
  currency_code CHAR(3) NULL,
  amount BIGINT NULL,
  status VARCHAR(32) NOT NULL,
  provider_created_at DATETIME NULL,
  source_event_created BIGINT NOT NULL DEFAULT 0,
  source_event_id VARCHAR(255) NULL,
  needs_reconciliation BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_billing_refund_environment (provider,environment,external_refund_id),
  KEY idx_billing_refund_created (environment,provider_created_at,id),
  KEY idx_billing_refund_invoice (invoice_record_id,status),
  CONSTRAINT fk_billing_refund_invoice FOREIGN KEY(invoice_record_id) REFERENCES billing_invoice_records(id) ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE billing_admin_operations (
  request_id CHAR(36) PRIMARY KEY,
  invoice_record_id CHAR(36) NOT NULL,
  actor_user_id CHAR(36) NULL,
  action VARCHAR(48) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  provider_account_id VARCHAR(255) NULL,
  parameters JSON NOT NULL,
  status ENUM('reserved','succeeded','failed','uncertain') NOT NULL,
  result JSON NULL,
  error_code VARCHAR(80) NULL,
  lease_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  KEY idx_billing_operation_invoice (invoice_record_id,created_at,request_id),
  CONSTRAINT fk_billing_operation_invoice FOREIGN KEY(invoice_record_id) REFERENCES billing_invoice_records(id) ON DELETE RESTRICT,
  CONSTRAINT fk_billing_operation_actor FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE billing_admin_sync_runs (
  id CHAR(36) PRIMARY KEY,
  environment ENUM('test','live') NOT NULL,
  actor_user_id CHAR(36) NULL,
  stage ENUM('invoices','payments','refunds','balances','completed') NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  provider_cursor VARCHAR(255) NULL,
  imported_invoices BIGINT NOT NULL DEFAULT 0,
  imported_payments BIGINT NOT NULL DEFAULT 0,
  imported_refunds BIGINT NOT NULL DEFAULT 0,
  imported_balances BIGINT NOT NULL DEFAULT 0,
  lease_until DATETIME NULL,
  lease_token CHAR(36) NULL,
  error_code VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  KEY idx_billing_sync_environment (environment,created_at,id),
  CONSTRAINT fk_billing_sync_actor FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Movimentos reais de saldo: bruto, taxas e líquido do provedor. Não são
-- receita contábil nem saldo bancário; pagamentos e retiradas têm sinais próprios.
CREATE TABLE billing_balance_records (
 id CHAR(36) PRIMARY KEY,
 provider VARCHAR(32) NOT NULL,
 environment ENUM('test','live') NOT NULL,
 external_transaction_id VARCHAR(255) NOT NULL,
 source_id VARCHAR(255) NULL,
 currency_code CHAR(3) NOT NULL,
 amount BIGINT NOT NULL,
 fee BIGINT NOT NULL,
 net BIGINT NOT NULL,
 type VARCHAR(80) NOT NULL,
 reporting_category VARCHAR(80) NOT NULL,
 status VARCHAR(32) NOT NULL,
 provider_created_at DATETIME NOT NULL,
 available_at DATETIME NOT NULL,
 synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_billing_balance_environment(provider,environment,external_transaction_id),
 KEY idx_billing_balance_period(environment,provider_created_at,id),
 KEY idx_billing_balance_category(environment,reporting_category,provider_created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Credenciais dos meios de pagamento (tarefa 69): o administrador informa as
-- chaves de API da Stripe, do Mercado Pago e do PayPal em Admin → Pagamentos,
-- sem editar o .env.local.
--
-- Uma linha por provedor. Os segredos (chave secreta da Stripe, access token
-- do Mercado Pago, client secret do PayPal e os segredos de webhook) ficam
-- cifrados com AES-256-GCM (chave derivada do AUTH_SECRET, como as chaves dos
-- provedores de IA); a tela recebe só os 4 últimos caracteres. As chaves
-- públicas (publishable key, public key e client id) não são segredo e ficam
-- em texto. `environment` diz se as credenciais são de teste ou de produção
-- e `last_check_*` guarda o resultado do último "Testar conexão" feito contra
-- a API do provedor.
CREATE TABLE IF NOT EXISTS payment_provider_credentials (
  provider VARCHAR(32) PRIMARY KEY,
  environment VARCHAR(16) NOT NULL DEFAULT 'test',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  public_key VARCHAR(255) NULL,
  secret_ciphertext TEXT NULL,
  secret_last4 VARCHAR(4) NULL,
  webhook_secret_ciphertext TEXT NULL,
  webhook_secret_last4 VARCHAR(4) NULL,
  last_check_at DATETIME NULL,
  last_check_ok TINYINT(1) NULL,
  last_check_message VARCHAR(500) NULL,
  updated_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_payment_provider_credentials_provedor CHECK (
    provider IN ('stripe', 'mercado_pago', 'paypal')
  ),
  CONSTRAINT ck_payment_provider_credentials_ambiente CHECK (
    environment IN ('test', 'live')
  ),
  CONSTRAINT fk_payment_provider_credentials_usuario FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

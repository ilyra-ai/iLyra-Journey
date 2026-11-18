-- Lyra Journey com dois valores de colaboração (tarefa 226).
--
-- Decisões do titular em 18/11/2026: o plano único (identificador interno
-- `care`, mantido para não mexer em assinaturas, matriz e histórico) passa a
-- se chamar Lyra Journey; tem dois valores mensais, R$ 9,99 e R$ 19,99, com
-- exatamente o mesmo acesso, para a pessoa escolher com quanto colabora para
-- manter e expandir a Lyra. As opções não têm nome próprio: aparecem pelo
-- valor, no mesmo cartão do plano.

UPDATE subscription_plans
   SET name = 'Lyra Journey',
       tagline = 'Sua jornada de autoconhecimento com a Lyra, completa.',
       description = 'Os dois valores dão exatamente o mesmo acesso a tudo o que a Lyra oferece. Você escolhe com quanto quer colaborar para manter e expandir a Lyra.',
       highlight_text = 'Mesmo acesso nos dois valores',
       monthly_price = 9.99,
       annual_price = 0.00
 WHERE plan_key = 'care';

-- Opções de colaboração de um plano: o valor mensal de cada uma. Todas dão o
-- mesmo acesso (a matriz de recursos é a do plano).
CREATE TABLE IF NOT EXISTS plan_contribution_options (
  id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  option_key VARCHAR(32) NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_contribution_options_chave (plan_id, option_key),
  CONSTRAINT fk_plan_contribution_options_plano FOREIGN KEY (plan_id)
    REFERENCES subscription_plans (id) ON DELETE CASCADE,
  CONSTRAINT ck_plan_contribution_options_valor CHECK (monthly_price > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preço mensal do Stripe de cada opção, por ambiente (teste e produção).
CREATE TABLE IF NOT EXISTS stripe_contribution_prices (
  option_id CHAR(36) NOT NULL,
  environment VARCHAR(16) NOT NULL,
  monthly_price_id VARCHAR(255) NULL,
  updated_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (option_id, environment),
  UNIQUE KEY uq_stripe_contribution_prices_mensal (monthly_price_id),
  CONSTRAINT fk_stripe_contribution_prices_opcao FOREIGN KEY (option_id)
    REFERENCES plan_contribution_options (id) ON DELETE CASCADE,
  CONSTRAINT fk_stripe_contribution_prices_usuario FOREIGN KEY (updated_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT ck_stripe_contribution_prices_ambiente
    CHECK (environment IN ('test', 'live'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO plan_contribution_options
  (id, plan_id, option_key, monthly_price, display_order)
SELECT UUID(), p.id, opcao.chave, opcao.valor, opcao.ordem
  FROM subscription_plans p
  JOIN (
    SELECT 'colaboracao_999' AS chave, 9.99 AS valor, 10 AS ordem
    UNION ALL
    SELECT 'colaboracao_1999', 19.99, 20
  ) opcao
 WHERE p.plan_key = 'care';

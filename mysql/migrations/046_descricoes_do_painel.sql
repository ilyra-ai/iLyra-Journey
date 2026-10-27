-- Textos derivados ficam separados das medições originais.
CREATE TABLE dashboard_descriptions (
  user_id CHAR(36) NOT NULL,
  record_date DATE NOT NULL,
  inputs_hash CHAR(64) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'pendente',
  content JSON NULL,
  model_name VARCHAR(255) NULL,
  provider_name VARCHAR(120) NULL,
  generated_at DATETIME NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  attempt_id CHAR(36) NULL,
  lease_until DATETIME NULL,
  next_attempt DATETIME NULL,
  PRIMARY KEY(user_id, record_date),
  CONSTRAINT fk_dashboard_descriptions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_dashboard_descriptions_status CHECK(status IN ('pendente','gerando','pronto','falha'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A cota pertence ao dia da chamada, inclusive ao consultar registros antigos.
CREATE TABLE dashboard_description_usage (
  user_id CHAR(36) NOT NULL,
  usage_date DATE NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, usage_date),
  CONSTRAINT fk_dashboard_description_usage_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

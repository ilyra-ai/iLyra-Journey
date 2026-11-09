-- Base imutável calculada do titular; períodos vigentes são projetados na leitura.
CREATE TABLE IF NOT EXISTS astrological_natal_bases (
  user_id CHAR(36) NOT NULL,
  method VARCHAR(32) NOT NULL,
  engine_version INT UNSIGNED NOT NULL,
  input_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, method),
  CONSTRAINT fk_natal_base_profile FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

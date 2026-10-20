-- Preferências explícitas e fila durável de relatos próprios para o Graphiti.
SET @tem_exclusao_memoria = (
  SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'chat_turns' AND column_name = 'memory_excluded'
);
SET @adicionar_exclusao_memoria = IF(@tem_exclusao_memoria = 0,
  'ALTER TABLE chat_turns ADD COLUMN memory_excluded BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE adicionar_exclusao_memoria_stmt FROM @adicionar_exclusao_memoria;
EXECUTE adicionar_exclusao_memoria_stmt;
DEALLOCATE PREPARE adicionar_exclusao_memoria_stmt;

CREATE TABLE IF NOT EXISTS memory_preferences (
  user_id CHAR(36) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  allow_cloud BOOLEAN NOT NULL DEFAULT FALSE,
  generation INT UNSIGNED NOT NULL DEFAULT 1,
  purge_pending BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_memory_preferences_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memory_episodes (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  turn_id CHAR(36) NULL,
  content TEXT NOT NULL,
  reference_at DATETIME(3) NOT NULL,
  corrects_fact_id CHAR(36) NULL,
  generation INT UNSIGNED NOT NULL,
  status ENUM('fila', 'processando', 'pronto', 'erro') NOT NULL DEFAULT 'fila',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  lease_id CHAR(36) NULL,
  lease_until DATETIME(3) NULL,
  error_message VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_memory_turn (user_id, turn_id),
  KEY idx_memory_queue (status, next_attempt_at, reference_at),
  KEY idx_memory_owner (user_id, generation, reference_at),
  CONSTRAINT fk_memory_episodes_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

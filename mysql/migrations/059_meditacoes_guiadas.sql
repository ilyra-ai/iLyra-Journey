-- Sessões da biblioteca de práticas guiadas (tarefa 132). O tempo é medido
-- pelo relógio do servidor; minutos efetivamente realizados são somados uma
-- única vez à meditação do dia local de início (minutes_logged reserva a soma).
CREATE TABLE IF NOT EXISTS meditation_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  practice_id VARCHAR(40) NOT NULL,
  practice_version SMALLINT UNSIGNED NOT NULL,
  target_seconds INT UNSIGNED NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'running',
  elapsed_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
  running_since DATETIME(3) NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  local_date DATE NOT NULL,
  minutes_due SMALLINT UNSIGNED NULL,
  minutes_logged SMALLINT UNSIGNED NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_meditation_session_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_meditation_state CHECK(state IN ('running','paused','completed','ended')),
  CONSTRAINT ck_meditation_target CHECK(target_seconds BETWEEN 60 AND 3600),
  INDEX idx_meditation_user_state(user_id,state),
  INDEX idx_meditation_user_started(user_id,started_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

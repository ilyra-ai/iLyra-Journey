-- Treinamento por feedback humano no chat (tarefa 90). Uma sessão por vez
-- fica aberta (ativa) ou treinando; as avaliações do administrador sobre as
-- respostas das próprias conversas viram exemplos desejáveis/indesejáveis do
-- treino de pesos no serviço de treinamento. Excluir a conversa remove as
-- avaliações dela; a versão aplicada e as métricas ficam na sessão.
CREATE TABLE IF NOT EXISTS ai_training_sessions (
  id CHAR(36) PRIMARY KEY,
  status VARCHAR(12) NOT NULL DEFAULT 'ativa',
  aberta TINYINT GENERATED ALWAYS AS (IF(status IN ('ativa','treinando'), 1, NULL)) STORED,
  started_by CHAR(36) NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_by CHAR(36) NULL,
  ended_at DATETIME(3) NULL,
  job_id VARCHAR(64) NULL,
  examples INT UNSIGNED NULL,
  model_version INT UNSIGNED NULL,
  metrics JSON NULL,
  applied_at DATETIME(3) NULL,
  error_message VARCHAR(400) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT ck_ai_training_status CHECK(status IN ('ativa','treinando','aplicada','falhou')),
  CONSTRAINT fk_ai_training_started_by FOREIGN KEY(started_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_training_ended_by FOREIGN KEY(ended_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_ai_training_open(aberta),
  INDEX idx_ai_training_started(started_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_training_feedback (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  turn_id CHAR(36) NOT NULL,
  admin_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer MEDIUMTEXT NOT NULL,
  rating TINYINT NOT NULL,
  correction TEXT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT ck_ai_training_rating CHECK(rating IN (-1, 1)),
  CONSTRAINT fk_ai_training_feedback_session FOREIGN KEY(session_id) REFERENCES ai_training_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_training_feedback_turn FOREIGN KEY(turn_id) REFERENCES chat_turns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_training_feedback_admin FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ai_training_feedback_turn(session_id, turn_id),
  INDEX idx_ai_training_feedback_admin(admin_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

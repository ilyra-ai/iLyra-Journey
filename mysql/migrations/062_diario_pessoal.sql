-- Diário pessoal por voz em /dia (tarefa 135). Cada relato guarda o texto
-- exatamente como foi capturado (voz ou digitação) e, quando um modelo
-- autorizado entrega uma versão fiel, o texto organizado e a análise do dia.
-- O retrato do céu do dia guarda só os fatos do mapa usados na análise, para
-- a interpretação continuar explicável mesmo depois que o briefing expirar.
CREATE TABLE IF NOT EXISTS personal_diary_entries (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  input_mode VARCHAR(8) NOT NULL,
  speech_engine VARCHAR(12) NULL,
  original_text TEXT NOT NULL,
  organized_text TEXT NULL,
  analysis JSON NULL,
  sky_snapshot JSON NULL,
  analysis_status VARCHAR(12) NOT NULL DEFAULT 'pendente',
  analysis_reason VARCHAR(300) NULL,
  analysis_provider VARCHAR(80) NULL,
  analysis_model VARCHAR(160) NULL,
  analysis_local TINYINT(1) NULL,
  analyzed_at DATETIME(3) NULL,
  analysis_lease_until DATETIME(3) NULL,
  analysis_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  memory_status VARCHAR(16) NOT NULL DEFAULT 'nao_enviado',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_personal_diary_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_personal_diary_mode CHECK(input_mode IN ('voz','texto')),
  CONSTRAINT ck_personal_diary_engine CHECK(speech_engine IS NULL OR speech_engine IN ('aparelho','navegador')),
  CONSTRAINT ck_personal_diary_status CHECK(analysis_status IN ('pendente','gerando','pronta','indisponivel','falhou')),
  CONSTRAINT ck_personal_diary_memory CHECK(memory_status IN ('nao_enviado','na_fila','desativada','sem_plano')),
  CONSTRAINT ck_personal_diary_text CHECK(CHAR_LENGTH(original_text) BETWEEN 1 AND 6000),
  UNIQUE KEY uq_personal_diary_owner(id,user_id),
  INDEX idx_personal_diary_user_day(user_id,entry_date,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

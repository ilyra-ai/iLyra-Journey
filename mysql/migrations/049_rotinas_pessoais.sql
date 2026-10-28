-- Definições editáveis e execuções com passos preservados no início.
CREATE TABLE IF NOT EXISTS personal_routines (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  days JSON NOT NULL,
  steps JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_personal_routine_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_personal_routines_user(user_id,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_routine_runs (
  id CHAR(36) PRIMARY KEY,
  sequence_number BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  routine_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  steps JSON NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'em_curso',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  CONSTRAINT fk_personal_routine_run_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_personal_routine_run_routine FOREIGN KEY(routine_id) REFERENCES personal_routines(id) ON DELETE CASCADE,
  CONSTRAINT ck_personal_routine_run_state CHECK(state IN ('em_curso','pausada','encerrada')),
  INDEX idx_personal_routine_runs_user(user_id,routine_id,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

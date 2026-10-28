-- Lembretes pessoais (117). Não há envio externo: o app aberto consulta os
-- avisos devidos. Uma ocorrência por lembrete/data evita duplicação entre abas.
CREATE TABLE IF NOT EXISTS reminder_preferences (
  user_id CHAR(36) PRIMARY KEY,
  timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
  timezone_since DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quiet_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_start CHAR(5) NOT NULL DEFAULT '22:00',
  quiet_end CHAR(5) NOT NULL DEFAULT '07:00',
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminder_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_reminders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  activity VARCHAR(16) NOT NULL,
  local_time CHAR(5) NOT NULL,
  week_days JSON NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_personal_reminders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_personal_reminders_user (user_id, created_at, id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_occurrences (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  reminder_id CHAR(36) NOT NULL,
  occurrence_date DATE NOT NULL,
  scheduled_at DATETIME NOT NULL,
  next_delivery_at DATETIME NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'pending',
  notification_id CHAR(36) NULL,
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_reminder_occurrence UNIQUE (reminder_id, occurrence_date),
  CONSTRAINT fk_reminder_occurrence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reminder_occurrence_reminder FOREIGN KEY (reminder_id) REFERENCES personal_reminders(id) ON DELETE CASCADE,
  INDEX idx_reminder_occurrences_user_due (user_id, state, next_delivery_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

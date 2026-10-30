-- Acompanhamentos pessoais criados pelo titular (tarefa 130).
-- Cada alteração de escala ou frequência cria uma nova definição; os
-- registros guardam a definição com que foram respondidos, preservando o
-- significado das respostas antigas sem recalcular ou converter valores.
CREATE TABLE IF NOT EXISTS personal_trackers (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(300) NOT NULL DEFAULT '',
  position INT UNSIGNED NOT NULL DEFAULT 0,
  archived_at DATETIME(3) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_personal_tracker_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_personal_tracker_owner(id,user_id),
  INDEX idx_personal_trackers_user(user_id,archived_at,position,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_tracker_definitions (
  id CHAR(36) PRIMARY KEY,
  tracker_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  sequence INT UNSIGNED NOT NULL,
  frequency VARCHAR(10) NOT NULL,
  scale_min TINYINT UNSIGNED NOT NULL,
  scale_max TINYINT UNSIGNED NOT NULL,
  labels JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_personal_tracker_definition_sequence(tracker_id,sequence),
  UNIQUE KEY uq_personal_tracker_definition_owner(id,tracker_id,user_id),
  CONSTRAINT fk_personal_tracker_definition_owner FOREIGN KEY(tracker_id,user_id) REFERENCES personal_trackers(id,user_id) ON DELETE CASCADE,
  CONSTRAINT ck_personal_tracker_frequency CHECK(frequency IN ('diaria','semanal')),
  CONSTRAINT ck_personal_tracker_scale CHECK(scale_min IN (0,1) AND scale_max > scale_min AND scale_max <= 10),
  INDEX idx_personal_tracker_definitions_user(user_id,tracker_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_tracker_entries (
  id CHAR(36) PRIMARY KEY,
  tracker_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  definition_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  value TINYINT UNSIGNED NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_personal_tracker_entry_day(tracker_id,entry_date),
  CONSTRAINT fk_personal_tracker_entry_owner FOREIGN KEY(tracker_id,user_id) REFERENCES personal_trackers(id,user_id) ON DELETE CASCADE,
  CONSTRAINT fk_personal_tracker_entry_definition FOREIGN KEY(definition_id,tracker_id,user_id) REFERENCES personal_tracker_definitions(id,tracker_id,user_id) ON DELETE CASCADE,
  CONSTRAINT ck_personal_tracker_entry_value CHECK(value <= 10),
  INDEX idx_personal_tracker_entries_user(user_id,entry_date)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

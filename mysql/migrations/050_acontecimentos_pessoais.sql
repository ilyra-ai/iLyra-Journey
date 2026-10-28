CREATE TABLE IF NOT EXISTS personal_event_markers (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_personal_event_marker_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_personal_event_marker_name(user_id,name),
  UNIQUE KEY uq_personal_event_marker_owner(id,user_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_event_days (
  user_id CHAR(36) NOT NULL,
  event_date DATE NOT NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY(user_id,event_date),
  CONSTRAINT fk_personal_event_day_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_event_day_markers (
  user_id CHAR(36) NOT NULL,
  event_date DATE NOT NULL,
  marker_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY(user_id,event_date,marker_id),
  CONSTRAINT fk_personal_event_link_day FOREIGN KEY(user_id,event_date) REFERENCES personal_event_days(user_id,event_date) ON DELETE CASCADE,
  CONSTRAINT fk_personal_event_link_marker FOREIGN KEY(marker_id,user_id) REFERENCES personal_event_markers(id,user_id) ON DELETE CASCADE,
  INDEX idx_personal_event_link_marker(marker_id,user_id,event_date)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

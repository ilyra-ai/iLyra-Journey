-- Diário alimentar simples (tarefa 133): refeições, lanches e bebidas com
-- horário local, descrição, estimativa de porção feita pelo titular e
-- percepção pessoal. A foto opcional é uma cópia PNG normalizada sem
-- metadados, guardada em tabela própria para não pesar as listagens.
CREATE TABLE IF NOT EXISTS meal_entries (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  entry_time CHAR(5) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  portion_estimate VARCHAR(8) NULL,
  perception TINYINT UNSIGNED NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_meal_entry_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_meal_kind CHECK(kind IN ('cafe','almoco','jantar','lanche','bebida','outro')),
  CONSTRAINT ck_meal_portion CHECK(portion_estimate IS NULL OR portion_estimate IN ('pequena','media','grande')),
  CONSTRAINT ck_meal_perception CHECK(perception IS NULL OR perception BETWEEN 1 AND 5),
  CONSTRAINT ck_meal_time CHECK(entry_time REGEXP '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  UNIQUE KEY uq_meal_entry_owner(id,user_id),
  INDEX idx_meal_entries_user_day(user_id,entry_date,entry_time,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_photos (
  entry_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  file_data MEDIUMBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_meal_photo_owner FOREIGN KEY(entry_id,user_id) REFERENCES meal_entries(id,user_id) ON DELETE CASCADE,
  INDEX idx_meal_photos_user(user_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

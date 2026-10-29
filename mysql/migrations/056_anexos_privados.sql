-- Reserva apenas UUID e titular: apagar os bytes não permite substituir
-- silenciosamente a fonte de um turno antigo por outro arquivo com o mesmo ID.
CREATE TABLE IF NOT EXISTS chat_attachment_ids (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_attachment_upload_day (user_id, created_at),
  CONSTRAINT fk_attachment_id_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Anexos privados; a cópia de imagem é normalizada, sem metadados EXIF.
CREATE TABLE IF NOT EXISTS chat_attachments (
  id CHAR(36) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  file_name VARCHAR(120) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  file_data MEDIUMBLOB NOT NULL,
  text_content TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_chat_attachments_owner (user_id, conversation_id, created_at, id),
  CONSTRAINT fk_chat_attachment_owner FOREIGN KEY (conversation_id, user_id)
    REFERENCES chat_conversations(id, user_id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE chat_turns ADD COLUMN attachment_ids JSON NULL;

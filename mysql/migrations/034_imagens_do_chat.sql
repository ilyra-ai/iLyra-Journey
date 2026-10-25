-- Imagens privadas vinculadas ao turno: a autorização vem do titular do
-- chat_turns. Arquivo e metadados são apagados juntos pelo ON DELETE CASCADE.
CREATE TABLE IF NOT EXISTS chat_generated_images (
  turn_id CHAR(36) PRIMARY KEY,
  request_kind ENUM('solicitada', 'mapa') NOT NULL,
  status ENUM('pendente', 'gerando', 'pronta', 'erro') NOT NULL,
  prompt TEXT NOT NULL,
  attempt_id CHAR(36) NOT NULL,
  provider_preset VARCHAR(32) NULL,
  model_name VARCHAR(200) NULL,
  image_data MEDIUMBLOB NULL,
  mime_type VARCHAR(50) NULL,
  width SMALLINT UNSIGNED NULL,
  height SMALLINT UNSIGNED NULL,
  error_message VARCHAR(500) NULL,
  deadline_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_chat_generated_image_turn FOREIGN KEY (turn_id)
    REFERENCES chat_turns(id) ON DELETE CASCADE,
  CONSTRAINT chk_chat_image_ready CHECK (
    status <> 'pronta' OR (
      image_data IS NOT NULL AND mime_type = 'image/webp'
      AND width IS NOT NULL AND height IS NOT NULL
    )
  )
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


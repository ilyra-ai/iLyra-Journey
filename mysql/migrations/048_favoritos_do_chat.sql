-- Favorito referencia a mensagem original; não cria cópia do texto ou imagem.
CREATE TABLE IF NOT EXISTS chat_favorites (
  turn_id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_chat_favorite_turn FOREIGN KEY (turn_id) REFERENCES chat_turns(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat_favorites_user_date (user_id, created_at, turn_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico de conversas da própria pessoa (tarefa 79).
-- Cada turno preserva a pergunta mesmo se a geração falhar; refazer atualiza
-- somente sua resposta. A chave composta impede vincular turnos de outro dono.
CREATE TABLE IF NOT EXISTS chat_conversations (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_chat_conversation_owner UNIQUE (id, user_id),
  KEY idx_chat_conversations_recent (user_id, updated_at, id),
  CONSTRAINT fk_chat_conversations_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_turns (
  id CHAR(36) PRIMARY KEY,
  sequence_number BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer MEDIUMTEXT NULL,
  status ENUM('processando', 'concluido', 'erro') NOT NULL,
  error_message VARCHAR(500) NULL,
  attempt_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_chat_turn_sequence UNIQUE (sequence_number),
  KEY idx_chat_turns_conversation (conversation_id, user_id, sequence_number),
  KEY idx_chat_turns_owner (user_id, created_at, id),
  CONSTRAINT fk_chat_turns_owner FOREIGN KEY (conversation_id, user_id)
    REFERENCES chat_conversations(id, user_id) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

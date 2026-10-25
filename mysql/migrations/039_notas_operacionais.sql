-- Notas administrativas de atendimento; sem ampliar o acesso aos dados clínicos.
CREATE TABLE admin_user_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  author_id CHAR(36) NULL,
  editor_id CHAR(36) NULL,
  body TEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_notes_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_admin_notes_editor FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_admin_notes_user (user_id, created_at, id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

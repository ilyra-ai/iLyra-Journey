-- Eventos operacionais mínimos: sem senhas, tokens, conteúdo clínico ou conversas.
CREATE TABLE admin_user_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(80) NOT NULL,
  reason VARCHAR(60) NULL,
  request_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_user_events_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_admin_user_event_request (user_id, request_id),
  KEY idx_admin_user_events_timeline (user_id, created_at, id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bloqueio administrativo e revogação durável de sessões anteriores.
ALTER TABLE users
  ADD COLUMN blocked_at DATETIME NULL,
  ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0;

-- Serializa alterações que poderiam deixar a plataforma sem administrador ativo.
CREATE TABLE admin_access_lock (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY
);
INSERT INTO admin_access_lock (id) VALUES (1);

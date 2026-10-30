-- Interruptores globais da plataforma (tarefa 134). Agendamentos começam
-- desativados para usuários: só o administrador vê e usa o recurso até
-- ativá-lo para todos. Desativar não apaga consultas nem profissionais.
CREATE TABLE IF NOT EXISTS platform_feature_switches (
  switch_key VARCHAR(40) PRIMARY KEY,
  enabled TINYINT(1) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by CHAR(36) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_platform_switch_actor FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO platform_feature_switches(switch_key,enabled) VALUES('agendamentos_usuarios',0);

-- Trilha de auditoria: responsável, data, estado anterior e novo.
CREATE TABLE IF NOT EXISTS platform_feature_switch_events (
  id CHAR(36) PRIMARY KEY,
  switch_key VARCHAR(40) NOT NULL,
  previous_enabled TINYINT(1) NOT NULL,
  next_enabled TINYINT(1) NOT NULL,
  actor_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_platform_switch_event_key FOREIGN KEY(switch_key) REFERENCES platform_feature_switches(switch_key) ON DELETE CASCADE,
  CONSTRAINT fk_platform_switch_event_actor FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_platform_switch_events(switch_key,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

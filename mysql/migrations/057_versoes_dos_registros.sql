-- Histórico manual vinculado ao registro real: exclusão definitiva do registro
-- ou da conta elimina também as versões, impedindo recuperar dados excluídos.
ALTER TABLE daily_metrics
  ADD COLUMN record_revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  ADD UNIQUE KEY uq_daily_metrics_owner (id, user_id);

CREATE TABLE IF NOT EXISTS manual_metric_versions (
  id CHAR(36) PRIMARY KEY,
  metric_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  record_date DATE NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  change_kind ENUM('registro', 'desfazer') NOT NULL,
  changes JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_manual_metric_revision (metric_id, revision),
  KEY idx_manual_metric_history (user_id, record_date, revision),
  CONSTRAINT fk_manual_metric_record FOREIGN KEY (metric_id, user_id)
    REFERENCES daily_metrics(id, user_id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offline_operation_receipts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  operation_kind VARCHAR(16) NOT NULL,
  record_date DATE NOT NULL,
  request_hash CHAR(64) NOT NULL,
  applied_revision CHAR(64) NULL,
  derived_processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_offline_receipt_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_offline_receipt_kind CHECK(operation_kind IN ('registro','reflexao')),
  INDEX idx_offline_receipts_user(user_id,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

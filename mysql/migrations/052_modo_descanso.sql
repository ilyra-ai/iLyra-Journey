CREATE TABLE IF NOT EXISTS rest_periods (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  planned_end DATE NULL,
  timezone VARCHAR(80) NOT NULL,
  active_since DATETIME(3) NULL,
  ended_date DATE NULL,
  ended_at DATETIME(3) NULL,
  cancelled_at DATETIME(3) NULL,
  return_days TINYINT UNSIGNED NOT NULL DEFAULT 0,
  return_activity VARCHAR(20) NULL,
  return_ended_date DATE NULL,
  return_ended_at DATETIME(3) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_rest_period_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_rest_return_days CHECK(return_days IN (0,3,7,14)),
  CONSTRAINT ck_rest_return_activity CHECK(return_activity IS NULL OR return_activity IN ('checkin','respiracao','habito')),
  UNIQUE KEY uq_rest_period_owner(id,user_id),
  INDEX idx_rest_period_user(user_id,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE goals ADD UNIQUE KEY uq_goal_rest_owner(id,user_id);

CREATE TABLE IF NOT EXISTS rest_goal_links (
  period_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NOT NULL,
  original_deadline DATE NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY(period_id,goal_id),
  CONSTRAINT fk_rest_goal_period_owner FOREIGN KEY(period_id,user_id) REFERENCES rest_periods(id,user_id) ON DELETE CASCADE,
  CONSTRAINT fk_rest_goal_owner FOREIGN KEY(goal_id,user_id) REFERENCES goals(id,user_id) ON DELETE CASCADE,
  INDEX idx_rest_goal_user(user_id,goal_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

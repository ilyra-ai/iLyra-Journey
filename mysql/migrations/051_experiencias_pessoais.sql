CREATE TABLE IF NOT EXISTS personal_experiments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  objective VARCHAR(500) NOT NULL,
  chosen_change VARCHAR(500) NOT NULL,
  baseline_start DATE NOT NULL,
  baseline_end DATE NOT NULL,
  observation_start DATE NOT NULL,
  observation_end DATE NOT NULL,
  sleep_offset TINYINT UNSIGNED NOT NULL DEFAULT 1,
  timezone VARCHAR(80) NOT NULL,
  goal_id CHAR(36) NULL,
  habit_id CHAR(36) NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'em_curso',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  ended_at DATETIME(3) NULL,
  ended_date DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_personal_experiment_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_personal_experiment_goal FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  CONSTRAINT fk_personal_experiment_habit FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE SET NULL,
  CONSTRAINT ck_personal_experiment_state CHECK(state IN ('em_curso','pausada','encerrada')),
  CONSTRAINT ck_personal_experiment_sleep_offset CHECK(sleep_offset IN (0,1)),
  UNIQUE KEY uq_personal_experiment_owner(id,user_id),
  INDEX idx_personal_experiments_user(user_id,created_at,id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_experiment_notes (
  id CHAR(36) PRIMARY KEY,
  experiment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  note_date DATE NOT NULL,
  followed VARCHAR(10) NULL,
  perception TINYINT UNSIGNED NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_personal_experiment_note_day(experiment_id,note_date),
  CONSTRAINT fk_personal_experiment_note_owner FOREIGN KEY(experiment_id,user_id) REFERENCES personal_experiments(id,user_id) ON DELETE CASCADE,
  CONSTRAINT ck_personal_experiment_followed CHECK(followed IS NULL OR followed IN ('sim','parcial','nao')),
  CONSTRAINT ck_personal_experiment_perception CHECK(perception IS NULL OR perception BETWEEN 1 AND 5),
  INDEX idx_personal_experiment_notes_user(user_id,note_date)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_experiment_pauses (
  id CHAR(36) PRIMARY KEY,
  experiment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_personal_experiment_pause_owner FOREIGN KEY(experiment_id,user_id) REFERENCES personal_experiments(id,user_id) ON DELETE CASCADE,
  INDEX idx_personal_experiment_pauses_user(user_id,experiment_id,started_at)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

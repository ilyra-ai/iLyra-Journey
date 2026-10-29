CREATE TABLE IF NOT EXISTS app_intro_progress (
 user_id CHAR(36) PRIMARY KEY,
 status VARCHAR(16) NOT NULL,
 step_key VARCHAR(16) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_intro_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT ck_intro_status CHECK(status IN ('em_andamento','dispensada','concluida')),
 CONSTRAINT ck_intro_step CHECK(step_key IN ('registro','resultado','conversa','perfil'))
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

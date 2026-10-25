-- Agregações por instante de criação: permitem recortes limitados sem ler
-- conteúdo clínico, JSON, texto do chat ou imagens. Não alteram dados existentes.
CREATE INDEX idx_metrics_created_owner ON daily_metrics (created_at,user_id);
CREATE INDEX idx_reflections_created_owner ON daily_reflections (created_at,user_id);
CREATE INDEX idx_breathing_created_owner ON breathing_sessions (created_at,user_id);
CREATE INDEX idx_chat_created_owner ON chat_turns (created_at,user_id);
CREATE INDEX idx_goals_created_owner ON goals (created_at,user_id);
CREATE INDEX idx_habits_created_owner ON habits (created_at,user_id);
CREATE INDEX idx_appointments_created_owner ON appointments (created_at,user_id);
CREATE INDEX idx_professionals_created_owner ON professionals (created_at,user_id);
CREATE INDEX idx_briefings_created_owner ON daily_briefings (created_at,user_id);
CREATE INDEX idx_plans_created_owner ON ai_plans (created_at,user_id);
CREATE INDEX idx_notifications_created_owner ON user_notifications (created_at,user_id);
CREATE INDEX idx_memory_created_owner ON memory_episodes (created_at,user_id);
CREATE INDEX idx_images_created_turn ON chat_generated_images (created_at,turn_id);
CREATE INDEX idx_users_created ON users (created_at,id);
CREATE INDEX idx_admin_events_created_owner ON admin_user_events (created_at,user_id,id);
CREATE INDEX idx_subscription_events_created_owner ON subscription_audit_events (created_at,user_id,id);
-- user_assessments já possui idx_user_assessments_created_at desde a 008.

-- Paginação cronológica da auditoria de assinaturas por titular.
ALTER TABLE subscription_audit_events
  ADD INDEX idx_subscription_audit_timeline (user_id, created_at, id);

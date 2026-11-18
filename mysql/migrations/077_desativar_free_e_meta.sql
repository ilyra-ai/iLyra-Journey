-- Só dois planos: Care e Administrador (tarefa 225).
--
-- Decisão do titular em 17/11/2026: os planos Free e Meta deixam de existir
-- para uso. Nada é apagado: os planos ficam inativos e fora da página
-- pública, e o histórico de assinaturas e auditoria é preservado.
--
-- Quem tem assinatura ativa (status 'active', a mesma regra do app) no Free
-- ou no Meta sem vínculo com o Stripe passa para o Care. Assinaturas pagas pelo Stripe ficam como estão
-- para a cobrança não sair de sincronia; desde a migration 076 elas já têm
-- o mesmo acesso do Care e serão tratadas com os dois preços do Care.

-- Auditoria de cada mudança, antes de mudar o plano.
INSERT INTO subscription_audit_events
  (id, subscription_id, user_id, actor_user_id, event_type, source, payload)
SELECT UUID(), s.id, s.user_id, NULL, 'subscription_assigned',
       'migration_077_dois_planos',
       JSON_OBJECT('plan_key', 'care', 'plano_anterior', p.plan_key,
                   'motivo', 'Só dois planos: Care e Administrador')
  FROM user_subscriptions s
  JOIN subscription_plans p ON p.id = s.plan_id
 WHERE p.plan_key IN ('free', 'meta')
   AND s.status = 'active'
   AND s.external_subscription_id IS NULL;

UPDATE user_subscriptions s
  JOIN subscription_plans p ON p.id = s.plan_id
  JOIN subscription_plans care ON care.plan_key = 'care'
   SET s.plan_id = care.id
 WHERE p.plan_key IN ('free', 'meta')
   AND s.status = 'active'
   AND s.external_subscription_id IS NULL;

UPDATE subscription_plans
   SET is_active = FALSE, is_public = FALSE
 WHERE plan_key IN ('free', 'meta');

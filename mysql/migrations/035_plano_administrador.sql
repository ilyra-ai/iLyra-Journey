-- Plano interno, não comercial. Autorizações administrativas continuam no papel da conta.
INSERT INTO subscription_plans (id, plan_key, name, tagline, description, monthly_price, annual_price, currency_code, display_order, is_active, is_public)
SELECT UUID(), 'admin', 'Administrador', 'Acesso interno completo', 'Plano privado reservado à conta administrativa designada.', 0, 0, 'BRL', 4, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_key = 'admin');

INSERT INTO plan_entitlements (id, plan_id, feature_id, enabled, quota_value, reset_interval)
SELECT UUID(), p.id, f.id, TRUE, NULL, NULL
FROM subscription_plans p CROSS JOIN plan_features f
LEFT JOIN plan_entitlements e ON e.plan_id = p.id AND e.feature_id = f.id
WHERE p.plan_key = 'admin' AND e.id IS NULL;

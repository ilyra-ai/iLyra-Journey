-- Todos os planos com o acesso do Care (tarefa 224).
--
-- Decisão do titular em 17/11/2026: Free e Meta passam a liberar exatamente
-- o que o Care libera (recursos ativos, cotas e período de renovação). O
-- acesso total às configurações continua só com o administrador (papel
-- `admin` e plano interno Administrador, sem cotas). A matriz segue editável
-- em Administração → Planos; esta migration só iguala o ponto de partida.

-- Recursos que Free e Meta já têm: copia ativo, cota e período do Care.
UPDATE plan_entitlements alvo
  JOIN subscription_plans plano_alvo
    ON plano_alvo.id = alvo.plan_id AND plano_alvo.plan_key IN ('free', 'meta')
  JOIN subscription_plans care ON care.plan_key = 'care'
  JOIN plan_entitlements origem
    ON origem.plan_id = care.id AND origem.feature_id = alvo.feature_id
   SET alvo.enabled = origem.enabled,
       alvo.quota_value = origem.quota_value,
       alvo.reset_interval = origem.reset_interval;

-- Recursos do Care que ainda não existem em Free ou Meta.
INSERT INTO plan_entitlements
  (id, plan_id, feature_id, enabled, quota_value, reset_interval)
SELECT UUID(), plano_alvo.id, origem.feature_id, origem.enabled,
       origem.quota_value, origem.reset_interval
  FROM subscription_plans plano_alvo
  JOIN subscription_plans care ON care.plan_key = 'care'
  JOIN plan_entitlements origem ON origem.plan_id = care.id
 WHERE plano_alvo.plan_key IN ('free', 'meta')
   AND NOT EXISTS (
     SELECT 1 FROM plan_entitlements existente
      WHERE existente.plan_id = plano_alvo.id
        AND existente.feature_id = origem.feature_id
   );

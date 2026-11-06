-- Landing celestial (149): atualizar apenas a cópia comercial de fábrica.
-- Preços, cotas, permissões, nomes e personalizações do administrador permanecem.
UPDATE subscription_plans
SET tagline = 'Seu primeiro espaço de descobertas.'
WHERE plan_key = 'free'
  AND tagline = 'Base confiável para começar com clareza.';

UPDATE subscription_plans
SET description = 'Comece com seu perfil, leituras védicas e conversas com a Lyra. Consulte abaixo os recursos e limites incluídos no plano gratuito.'
WHERE plan_key = 'free'
  AND description = 'Acesso essencial ao ecossistema Lyra MetaCare, com visão inicial dos indicadores, perfil e automações fundamentais.';

UPDATE subscription_plans
SET tagline = 'Mais espaço para aprofundar suas descobertas.'
WHERE plan_key = 'meta'
  AND tagline = 'Mais profundidade, dados e automação orientada por IA.';

UPDATE subscription_plans
SET description = 'Amplie suas conversas com a Lyra e o período de histórico disponível. Explore suas leituras pessoais com os recursos e limites deste plano.'
WHERE plan_key = 'meta'
  AND description = 'Plano intermediário com capacidades expandidas de IA, conexão de dispositivos e observabilidade operacional para rotina contínua.';

UPDATE subscription_plans
SET tagline = 'Uma experiência ampliada de autoconhecimento.'
WHERE plan_key = 'care'
  AND tagline = 'A experiência mais completa, clínica e operacional do produto.';

UPDATE subscription_plans
SET description = 'Tenha mais capacidade para conversar, retomar seu histórico e aprofundar suas leituras com a Lyra. Os recursos e limites incluídos estão detalhados abaixo.'
WHERE plan_key = 'care'
  AND description = 'Plano premium com a matriz completa de capacidades, máxima profundidade de acompanhamento, monitoramento avançado e governança plena da experiência.';

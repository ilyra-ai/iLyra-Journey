-- Direitos novos começam habilitados para preservar a disponibilidade anterior.
-- As dependências são verificadas no servidor e na interface; nenhum papel é concedido.
INSERT INTO plan_features (id,feature_key,name,description,category,feature_type,meter_kind,sort_order) VALUES
(UUID(),'daily_checkin','Registro do dia','Consultar e registrar manualmente os sinais do dia e o check-in rápido.','Essencial','boolean','toggle',140),
(UUID(),'weekly_review','Sua semana','Retrospectiva e leitura da semana. A leitura védica exige também Leituras védicas.','Essencial','boolean','toggle',150),
(UUID(),'guided_breathing','Respiração guiada','Práticas guiadas e registro dos minutos de respiração.','Essencial','boolean','toggle',160),
(UUID(),'evening_reflection','Reflexão da noite','Consultar, salvar, editar e apagar a reflexão da noite.','Essencial','boolean','toggle',170),
(UUID(),'vedic_insights','Leituras védicas','Mapa natal, céu do dia, dosha e índices integrativos; compõe Meu dia e Sua semana.','Essencial','boolean','toggle',180),
(UUID(),'calendar_integration','Integração com calendário','Janelas, arquivo iCalendar e assinatura privada; exige Leituras védicas.','Operação','boolean','toggle',190),
(UUID(),'personal_habits','Hábitos pessoais','Criar e gerenciar hábitos pessoais e consultar sugestões.','Essencial','boolean','toggle',200),
(UUID(),'wellbeing_assessments','Avaliações de bem-estar','Registrar e consultar humor, WHO-5 e avaliação NPS.','Essencial','boolean','toggle',210),
(UUID(),'chat_history','Histórico de conversas','Salvar, listar e reabrir conversas; exige Mensagens IA.','IA','boolean','toggle',220),
(UUID(),'chat_images','Imagens no chat','Solicitar, gerar, reabrir e baixar imagens; exige Histórico de conversas e provedor compatível.','IA','boolean','toggle',230),
(UUID(),'lyra_memory','Memória da Lyra','Ativar, consultar e alimentar a memória pessoal; exige Mensagens IA.','IA','boolean','toggle',240),
(UUID(),'personal_notifications','Notificações pessoais','Consultar e marcar notificações do sino e receber avisos do coach.','Operação','boolean','toggle',250),
(UUID(),'health_intelligence','Inteligência de saúde do painel','Cartões de idade biológica, sinais precoces, ciclo e ações proativas calculados no navegador.','Essencial','boolean','toggle',260);

INSERT INTO plan_entitlements (id,plan_id,feature_id,enabled,quota_value,reset_interval)
SELECT UUID(),p.id,f.id,TRUE,NULL,NULL FROM subscription_plans p CROSS JOIN plan_features f
LEFT JOIN plan_entitlements e ON e.plan_id=p.id AND e.feature_id=f.id WHERE e.id IS NULL;

-- O perfil permanece acessível em todos os planos conforme decisão expressa da tarefa 104.
UPDATE plan_entitlements e JOIN plan_features f ON f.id=e.feature_id
SET e.enabled=TRUE,e.quota_value=NULL,e.reset_interval=NULL WHERE f.feature_key='profile_management';

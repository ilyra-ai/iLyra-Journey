-- Tarefa 144: controles reversíveis. Não altera registros pessoais existentes.
-- INSERT IGNORE preserva escolhas administrativas em reaplicações.
INSERT IGNORE INTO platform_feature_switches(switch_key,enabled) VALUES
('registros_saude',0),
('diario_reflexao',0),
('outros_registros',0),
('metas_habitos_plano',0),
('rotinas_praticas',0),
('lembretes_descanso',0),
('dispositivos',0),
('calendario_agenda',0);

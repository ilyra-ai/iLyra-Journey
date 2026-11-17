-- Acesso do modelo de IA à internet (tarefa 212).
--
-- O administrador escolhe o alcance: desligado, só os domínios liberados por
-- ele ou acesso total. Quem busca e lê as páginas é o servidor da Lyra, a
-- pedido do modelo; o motor da Lyra continua sem acesso à rede. Cada busca e
-- página consultada fica registrada, sem dado de usuário.
CREATE TABLE IF NOT EXISTS ia_acesso_internet (
  id TINYINT UNSIGNED NOT NULL,
  modo ENUM('desligado', 'lista', 'total') NOT NULL DEFAULT 'desligado',
  dominios JSON NOT NULL,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  atualizado_por CHAR(36) NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_ia_acesso_unico CHECK (id = 1),
  CONSTRAINT chk_ia_acesso_dominios CHECK (JSON_VALID(dominios))
);

-- Começa ligado só para as fontes oficiais de saúde (decisão do titular em
-- 17/11/2026): Ministério da Saúde e INCA (gov.br), sociedades médicas
-- brasileiras e OMS/OPAS. O administrador pode ampliar a lista, liberar o
-- acesso total ou desligar.
INSERT IGNORE INTO ia_acesso_internet (id, modo, dominios)
VALUES (
  1,
  'lista',
  JSON_ARRAY(
    'gov.br',
    'diabetes.org.br',
    'abccardiol.org',
    'portal.cardiol.br',
    'febrasgo.org.br',
    'sbmastologia.com.br',
    'portaldaurologia.org.br',
    'sbcp.org.br',
    'endocrino.org.br',
    'sbp.com.br',
    'who.int',
    'paho.org'
  )
);

CREATE TABLE IF NOT EXISTS ia_consultas_internet (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tarefa VARCHAR(60) NOT NULL,
  tipo ENUM('busca', 'pagina') NOT NULL,
  alvo VARCHAR(600) NOT NULL,
  situacao VARCHAR(60) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ia_consultas_data (created_at)
);

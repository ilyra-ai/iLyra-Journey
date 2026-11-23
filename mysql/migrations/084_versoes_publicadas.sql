-- Estúdio de publicação (tarefa 184): histórico das versões publicadas das
-- páginas do construtor (landing, app, login e demais SitePageKey).
--
-- Antes, publicar sobrescrevia `site_page_configs.published_config` e a
-- versão anterior se perdia. Agora cada publicação com mudança real vira
-- uma linha nova, com quem publicou, quando e a justificativa. Reverter
-- também é uma publicação (origem 'reversao'), então dá para desfazer a
-- reversão. Publicar o mesmo conteúdo de novo não cria versão.
--
-- A versão 1 de cada página é o publicado no momento desta migração.

CREATE TABLE IF NOT EXISTS site_page_config_versoes (
  id CHAR(36) NOT NULL,
  page_key VARCHAR(32) NOT NULL,
  versao INT UNSIGNED NOT NULL,
  config JSON NOT NULL,
  origem ENUM('migracao', 'publicacao', 'reversao') NOT NULL,
  nota VARCHAR(300) NULL,
  publicado_por CHAR(36) NULL,
  publicado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_page_config_versoes (page_key, versao),
  CONSTRAINT fk_site_page_config_versoes_autor FOREIGN KEY (publicado_por)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_page_config_versoes
  (id, page_key, versao, config, origem, nota, publicado_por, publicado_em)
SELECT UUID(), c.page_key, 1, c.published_config, 'migracao',
       'Versão publicada quando o histórico começou', NULL, c.updated_at
  FROM site_page_configs c
 WHERE NOT EXISTS (
   SELECT 1 FROM site_page_config_versoes v WHERE v.page_key = c.page_key
 );

-- Tarefa 173: a marca comercial passa de "Lyra MetaCare" para "iLyra".
-- A companheira digital continua sendo a Lyra.
--
-- Troca apenas os textos de marca que ainda estão exatamente com o valor
-- padrão antigo, no publicado e no rascunho de cada página do construtor.
-- Texto personalizado pelo administrador não é tocado. Rodar de novo não
-- muda nada, porque o valor antigo já não existe.
--
-- O publicado anterior continua no histórico (site_page_config_versoes,
-- tarefa 184). Quando o publicado muda aqui, entra uma versão nova com
-- origem 'migracao'; para voltar, use "Reverter" no Estúdio de publicação.
--
-- Identificadores técnicos ficam como estão, por compatibilidade: cookie
-- lyra_metacare_session, banco lyra_metacare, formatos de exportação e uid
-- dos eventos de calendário.

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.hero.badgeText', 'Seu espaço iLyra')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.hero.badgeText')) = 'Seu espaço Lyra';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.flow.description', 'A iLyra é um espaço de autoconhecimento que reúne mapas pessoais, leituras simbólicas e conversas com inteligência artificial. Aqui, a tradição védica e as perspectivas da Lyra se encontram para ajudar você a refletir sobre sua história, seus momentos e suas escolhas, com privacidade e no seu ritmo.')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.flow.description')) = 'A Lyra MetaCare é um espaço de autoconhecimento que reúne mapas pessoais, leituras simbólicas e conversas com inteligência artificial. Aqui, a tradição védica e as perspectivas da Lyra se encontram para ajudar você a refletir sobre sua história, seus momentos e suas escolhas, com privacidade e no seu ritmo.';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.finalCta.description', 'Suas descobertas, suas escolhas. Conheça o seu espaço iLyra.')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.finalCta.description')) = 'Suas descobertas, suas escolhas. Conheça o seu espaço Lyra.';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.footer.brandLine', 'iLyra')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.footer.brandLine')) = 'lyra metacare';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.intro.badgeText', 'iLyra')
 WHERE page_key = 'login'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.intro.badgeText')) = 'Lyra MetaCare';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.auth.loginButtonLabel', 'Entrar na iLyra')
 WHERE page_key = 'login'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.auth.loginButtonLabel')) = 'Entrar na Lyra';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.sidebar.brandTitle', 'iLyra')
 WHERE page_key = 'app'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.sidebar.brandTitle')) = 'lyra';

UPDATE site_page_configs
   SET published_config = JSON_SET(published_config, '$.sidebar.brandEyebrow', 'Decifrando o Cosmos, Iluminando Destinos.')
 WHERE page_key = 'app'
   AND JSON_UNQUOTE(JSON_EXTRACT(published_config, '$.sidebar.brandEyebrow')) = 'metacare';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.hero.badgeText', 'Seu espaço iLyra')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.hero.badgeText')) = 'Seu espaço Lyra';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.flow.description', 'A iLyra é um espaço de autoconhecimento que reúne mapas pessoais, leituras simbólicas e conversas com inteligência artificial. Aqui, a tradição védica e as perspectivas da Lyra se encontram para ajudar você a refletir sobre sua história, seus momentos e suas escolhas, com privacidade e no seu ritmo.')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.flow.description')) = 'A Lyra MetaCare é um espaço de autoconhecimento que reúne mapas pessoais, leituras simbólicas e conversas com inteligência artificial. Aqui, a tradição védica e as perspectivas da Lyra se encontram para ajudar você a refletir sobre sua história, seus momentos e suas escolhas, com privacidade e no seu ritmo.';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.finalCta.description', 'Suas descobertas, suas escolhas. Conheça o seu espaço iLyra.')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.finalCta.description')) = 'Suas descobertas, suas escolhas. Conheça o seu espaço Lyra.';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.footer.brandLine', 'iLyra')
 WHERE page_key = 'landing'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.footer.brandLine')) = 'lyra metacare';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.intro.badgeText', 'iLyra')
 WHERE page_key = 'login'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.intro.badgeText')) = 'Lyra MetaCare';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.auth.loginButtonLabel', 'Entrar na iLyra')
 WHERE page_key = 'login'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.auth.loginButtonLabel')) = 'Entrar na Lyra';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.sidebar.brandTitle', 'iLyra')
 WHERE page_key = 'app'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.sidebar.brandTitle')) = 'lyra';

UPDATE site_page_configs
   SET draft_config = JSON_SET(draft_config, '$.sidebar.brandEyebrow', 'Decifrando o Cosmos, Iluminando Destinos.')
 WHERE page_key = 'app'
   AND JSON_UNQUOTE(JSON_EXTRACT(draft_config, '$.sidebar.brandEyebrow')) = 'metacare';

INSERT INTO site_page_config_versoes
  (id, page_key, versao, config, origem, nota, publicado_por, publicado_em)
SELECT UUID(), c.page_key, ultima.versao + 1, c.published_config, 'migracao',
       'Tarefa 173: textos padrão da marca trocados para iLyra', NULL,
       CURRENT_TIMESTAMP(3)
  FROM site_page_configs c
  JOIN site_page_config_versoes ultima
    ON ultima.page_key = c.page_key
   AND ultima.versao = (
     SELECT MAX(v.versao) FROM site_page_config_versoes v
      WHERE v.page_key = c.page_key
   )
 WHERE ultima.config <> c.published_config;

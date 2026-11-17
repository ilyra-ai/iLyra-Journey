-- Prevenção: exames recomendados, histórico de saúde da família e vínculos
-- que pesam (tarefa 209).
--
-- O catálogo de recomendações faz parte do motor da Lyra e é revisado por um
-- administrador uma vez por mês: cada linha guarda a fonte oficial, a data
-- da última revisão e quem a fez. `conferido = FALSE` marca uma recomendação
-- que ainda não foi confirmada na fonte e precisa da primeira revisão.
CREATE TABLE IF NOT EXISTS prevencao_recomendacoes (
  id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nome VARCHAR(120) NOT NULL,
  procura VARCHAR(300) NOT NULL,
  -- Quem tem o órgão examinado; 'todos' quando não depende disso.
  publico ENUM('mamas', 'colo-do-utero', 'prostata', 'todos') NOT NULL,
  idade_minima TINYINT UNSIGNED NOT NULL,
  idade_maxima TINYINT UNSIGNED NULL,
  intervalo_meses SMALLINT UNSIGNED NULL,
  -- 'rotina': recomendado a todos na faixa; 'conversa': decisão compartilhada
  -- com o médico, sem recomendação de rotina.
  tipo ENUM('rotina', 'conversa') NOT NULL,
  orientacao VARCHAR(600) NOT NULL,
  -- Condições na família que pedem conversa com o médico sobre começar antes.
  historico_relevante JSON NOT NULL,
  fonte_nome VARCHAR(200) NOT NULL,
  fonte_url VARCHAR(400) NOT NULL,
  conferido BOOLEAN NOT NULL,
  revisado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revisado_por CHAR(36) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_prevencao_idade CHECK (
    idade_maxima IS NULL OR idade_maxima >= idade_minima
  ),
  CONSTRAINT chk_prevencao_historico CHECK (JSON_VALID(historico_relevante))
);

-- Doenças de parentes informadas pelo titular (dado de saúde sensível).
CREATE TABLE IF NOT EXISTS prevencao_historico_familiar (
  user_id CHAR(36) NOT NULL,
  parente ENUM('mae', 'pai', 'irmaos', 'avos', 'tios', 'filhos') NOT NULL,
  condicao ENUM(
    'cancer-mama', 'cancer-colo-utero', 'cancer-colorretal',
    'cancer-prostata', 'cancer-ovario', 'diabetes', 'infarto-precoce',
    'avc', 'hipertensao'
  ) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, parente, condicao),
  CONSTRAINT fk_prevencao_historico_profile FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE CASCADE
);

-- Data do último exame feito, informada pelo titular.
CREATE TABLE IF NOT EXISTS prevencao_exames_realizados (
  user_id CHAR(36) NOT NULL,
  recomendacao_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  realizado_em DATE NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, recomendacao_id),
  CONSTRAINT fk_prevencao_exame_profile FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_prevencao_exame_recomendacao FOREIGN KEY (recomendacao_id)
    REFERENCES prevencao_recomendacoes(id) ON DELETE CASCADE
);

-- Vínculos familiares que o titular diz que pesam (resposta dele, não do mapa).
CREATE TABLE IF NOT EXISTS prevencao_vinculos (
  user_id CHAR(36) NOT NULL,
  vinculo_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  pesa ENUM('sim', 'as-vezes', 'nao') NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, vinculo_id),
  CONSTRAINT fk_prevencao_vinculo_profile FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE CASCADE
);

INSERT IGNORE INTO prevencao_recomendacoes
  (id, nome, procura, publico, idade_minima, idade_maxima, intervalo_meses,
   tipo, orientacao, historico_relevante, fonte_nome, fonte_url, conferido,
   ordem)
VALUES
  ('mamografia', 'Mamografia',
   'câncer de mama em fase inicial, antes de aparecer nódulo ou outro sinal',
   'mamas', 50, 74, 24, 'rotina',
   'Recomendada a cada dois anos dos 50 aos 74 anos. Em qualquer idade, nódulo, mudança na pele ou no mamilo e secreção com sangue pedem avaliação médica logo.',
   JSON_ARRAY('cancer-mama', 'cancer-ovario'),
   'INCA/Ministério da Saúde, detecção precoce do câncer de mama (atualizado em 30/09/2025)',
   'https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/controle-do-cancer-de-mama/acoes/deteccao-precoce',
   TRUE, 10),
  ('dna-hpv', 'Teste de DNA-HPV (ou Papanicolau)',
   'o vírus HPV e lesões no colo do útero que podem virar câncer, quando ainda são tratáveis',
   'colo-do-utero', 25, 64, 60, 'rotina',
   'Para quem tem colo do útero e já teve atividade sexual, dos 25 aos 64 anos: teste de DNA-HPV a cada cinco anos após resultado negativo. Onde só há Papanicolau, a cada três anos após dois exames normais seguidos.',
   JSON_ARRAY('cancer-colo-utero'),
   'INCA/Ministério da Saúde, detecção precoce do câncer do colo do útero',
   'https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/controle-do-cancer-do-colo-do-utero/acoes/deteccao-precoce',
   TRUE, 20),
  ('sangue-oculto-fezes', 'Pesquisa de sangue oculto nas fezes (FIT)',
   'sangramento escondido que pode indicar pólipos ou câncer de intestino no início',
   'todos', 50, 75, 24, 'rotina',
   'Dos 50 aos 75 anos, a cada dois anos. Resultado positivo leva à colonoscopia. Quem tem pais ou irmãos com câncer de intestino deve conversar com o médico, porque o acompanhamento costuma ser especializado.',
   JSON_ARRAY('cancer-colorretal'),
   'INCA, Diretrizes Brasileiras do Rastreamento do Câncer de Cólon e Reto',
   'https://www.gov.br/inca/pt-br/assuntos/cancer/tipos/intestino',
   TRUE, 30),
  ('glicemia', 'Glicemia de jejum e hemoglobina glicada (HbA1c)',
   'diabetes tipo 2 e pré-diabetes, que no começo não dão sintomas',
   'todos', 35, NULL, 36, 'rotina',
   'A partir dos 35 anos; antes disso se houver sobrepeso e outro fator de risco. Com resultados normais e poucos fatores de risco, repetir a cada três anos; com mais fatores de risco, o médico pode pedir antes.',
   JSON_ARRAY('diabetes'),
   'Diretriz da Sociedade Brasileira de Diabetes, edição 2026 (R6 e R11)',
   'https://diretriz.diabetes.org.br/diagnostico-de-diabetes-mellitus/',
   TRUE, 40),
  ('pressao-arterial', 'Medida da pressão arterial',
   'pressão alta, que costuma não dar sintomas e aumenta o risco de infarto e AVC',
   'todos', 18, NULL, 12, 'rotina',
   'Medir ao menos uma vez por ano a partir dos 18 anos, e com mais frequência se já houver pressão alta ou histórico na família.',
   JSON_ARRAY('hipertensao', 'infarto-precoce', 'avc'),
   'Diretrizes Brasileiras de Hipertensão Arterial (Sociedade Brasileira de Cardiologia)',
   'https://abccardiol.org/',
   FALSE, 50),
  ('perfil-lipidico', 'Colesterol e triglicerídeos (perfil lipídico)',
   'gorduras no sangue que aumentam o risco de infarto e AVC',
   'todos', 20, NULL, NULL, 'rotina',
   'Em adultos, com a frequência que o médico definir pelo risco cardiovascular; mais cedo e com mais atenção se houver infarto precoce na família.',
   JSON_ARRAY('infarto-precoce', 'avc'),
   'Diretriz Brasileira de Dislipidemias (Sociedade Brasileira de Cardiologia)',
   'https://abccardiol.org/',
   FALSE, 60),
  ('psa', 'PSA (câncer de próstata)',
   'alterações na próstata; o exame tem benefícios e riscos de falso alarme e tratamento desnecessário',
   'prostata', 50, NULL, NULL, 'conversa',
   'O Ministério da Saúde não recomenda o PSA como exame de rotina. Quem quiser fazer deve conversar com o médico sobre benefícios e riscos para decidir junto. Dificuldade para urinar, sangue na urina ou disfunção erétil pedem avaliação.',
   JSON_ARRAY('cancer-prostata'),
   'INCA/Ministério da Saúde, câncer de próstata (atualizado em 10/12/2025)',
   'https://www.gov.br/inca/pt-br/assuntos/cancer/tipos/prostata',
   TRUE, 70);

-- Atualização dos exames médicos pelo modelo de IA, com revisão da
-- administração (tarefa 211).
--
-- O administrador pede a atualização; o modelo de IA lê o catálogo de
-- recomendações do motor da Lyra, pesquisa as fontes oficiais pela internet
-- (tarefa 212) e propõe atualizar um exame, acrescentar um novo ou retirar
-- um existente. O modelo nunca altera nem exclui o catálogo: toda proposta
-- fica pendente até o administrador aprovar ou reprovar. Aprovar uma
-- retirada desativa o exame (ativo = FALSE), sem apagá-lo.

-- Cada pedido de atualização feito pelo administrador.
CREATE TABLE IF NOT EXISTS prevencao_atualizacoes (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  iniciada_por CHAR(36) NOT NULL,
  situacao ENUM('em-andamento', 'concluida', 'falhou') NOT NULL
    DEFAULT 'em-andamento',
  iniciada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  concluida_em DATETIME(3) NULL,
  -- Resumo do resultado ou motivo da falha, mostrado ao administrador.
  mensagem VARCHAR(600) NULL,
  -- Modelo que concluiu a pesquisa ("Provedor · modelo").
  autor VARCHAR(160) NULL,
  -- Páginas oficiais lidas pelo modelo: [{ url, titulo }].
  fontes JSON NULL,
  propostas_novas SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_prevencao_atualizacoes_inicio (iniciada_em),
  CONSTRAINT chk_prevencao_atualizacoes_fontes CHECK (
    fontes IS NULL OR JSON_VALID(fontes)
  )
);

-- Exames que o modelo marcou para revisão.
CREATE TABLE IF NOT EXISTS prevencao_propostas (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  atualizacao_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  tipo ENUM('atualizar', 'novo', 'retirar') NOT NULL,
  -- Exame do catálogo (atualizar, retirar) ou identificador do novo exame.
  recomendacao_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  -- Recomendação completa proposta (atualizar, novo); NULL para retirar.
  dados JSON NULL,
  motivo VARCHAR(1000) NOT NULL,
  fonte_nome VARCHAR(200) NOT NULL,
  fonte_url VARCHAR(400) NOT NULL,
  -- Impressão digital da proposta: depois de decidida, a mesma proposta não
  -- volta a ser trazida ao administrador.
  assinatura CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  situacao ENUM('pendente', 'aprovada', 'reprovada') NOT NULL
    DEFAULT 'pendente',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  decidida_em DATETIME(3) NULL,
  decidida_por CHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prevencao_propostas_assinatura (assinatura),
  KEY idx_prevencao_propostas_situacao (situacao, created_at),
  KEY idx_prevencao_propostas_exame (recomendacao_id, tipo, situacao),
  CONSTRAINT fk_prevencao_propostas_atualizacao FOREIGN KEY (atualizacao_id)
    REFERENCES prevencao_atualizacoes(id) ON DELETE CASCADE,
  CONSTRAINT chk_prevencao_propostas_dados CHECK (
    dados IS NULL OR JSON_VALID(dados)
  )
);

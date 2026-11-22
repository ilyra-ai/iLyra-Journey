-- Uso de tokens e custo das chamadas aos modelos de IA (tarefa 163).
--
-- ia_uso: uma linha por tentativa de um modelo da cadeia (ok, cortada,
-- recusada ou com falha). Só números e identificação técnica: nunca o
-- pedido nem a resposta. Tokens nulos quando o provedor não informa. A
-- conta fica ligada para o painel do próprio titular; ao excluir a conta, a
-- linha perde o vínculo e continua só nos agregados da administração.
--
-- ia_precos: preço por milhão de tokens de cada modelo em nuvem, cadastrado
-- pela administração a partir da tabela oficial do provedor, com a fonte e
-- a data da consulta. Sem preço cadastrado, o custo aparece como
-- desconhecido; modelos locais não têm custo por token.

CREATE TABLE IF NOT EXISTS ia_uso (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NULL,
  rotulo VARCHAR(60) NOT NULL,
  provedor VARCHAR(80) NOT NULL,
  modelo VARCHAR(200) NOT NULL,
  local BOOLEAN NOT NULL,
  resultado ENUM('ok', 'cortado', 'recusado', 'falhou') NOT NULL,
  tokens_entrada INT UNSIGNED NULL,
  tokens_saida INT UNSIGNED NULL,
  tokens_raciocinio INT UNSIGNED NULL,
  milissegundos INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ia_uso_data (created_at),
  KEY idx_ia_uso_conta_data (user_id, created_at),
  CONSTRAINT fk_ia_uso_conta FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ia_precos (
  provedor VARCHAR(80) NOT NULL,
  modelo VARCHAR(200) NOT NULL,
  moeda CHAR(3) NOT NULL,
  entrada_por_milhao DECIMAL(12, 6) NOT NULL,
  saida_por_milhao DECIMAL(12, 6) NOT NULL,
  fonte VARCHAR(500) NOT NULL,
  consultado_em DATE NOT NULL,
  atualizado_por CHAR(36) NULL,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (provedor, modelo),
  CONSTRAINT chk_ia_precos_valores CHECK (
    entrada_por_milhao >= 0 AND saida_por_milhao >= 0
  )
);

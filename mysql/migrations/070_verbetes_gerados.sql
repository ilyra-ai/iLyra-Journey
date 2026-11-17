-- Verbetes da base de conhecimento escritos automaticamente (tarefa 198).
--
-- Quando a pergunta é do domínio da Lyra e a base curada não tem o assunto,
-- o modelo de IA conectado escreve um verbete geral, que o motor confere
-- antes de gravar aqui. O conteúdo é compartilhado entre todas as contas e,
-- por isso, a tabela não guarda a pergunta, o titular nem qualquer dado
-- pessoal: só o verbete, quem o escreveu (provedor e modelo) e quando.
CREATE TABLE IF NOT EXISTS lyra_verbetes_gerados (
  id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  area VARCHAR(16) NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  resumo VARCHAR(600) NOT NULL,
  pontos JSON NOT NULL,
  pratica VARCHAR(600) NOT NULL,
  palavras_chave JSON NOT NULL,
  fonte VARCHAR(255) NOT NULL,
  provedor VARCHAR(120) NOT NULL,
  modelo VARCHAR(160) NOT NULL,
  modelo_local BOOLEAN NOT NULL,
  conteudo_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_verbete_gerado_conteudo (conteudo_hash),
  CONSTRAINT chk_verbete_gerado_pontos CHECK (JSON_VALID(pontos)),
  CONSTRAINT chk_verbete_gerado_chaves CHECK (JSON_VALID(palavras_chave))
);

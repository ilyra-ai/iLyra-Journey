-- Chaves de acesso (passkeys, WebAuthn) como forma opcional de entrar
-- (tarefa 167). Não substituem e-mail e senha, Google nem Apple.
--
-- chaves_de_acesso: uma linha por credencial registrada pela pessoa. Fica só
-- a chave PÚBLICA e os metadados do padrão (identificador da credencial,
-- contador de assinaturas, transportes, tipo de dispositivo, backup e
-- AAGUID do autenticador). A chave privada e a biometria nunca saem do
-- aparelho. Revogar marca `revogada_em`: a credencial deixa de entrar na
-- hora, e a linha fica como histórico até a exclusão da conta.
--
-- desafios_de_chave: o desafio de cada cerimônia, de uso único e com
-- validade curta. O cookie httpOnly leva só o id do desafio; o servidor
-- marca `usado_em` na primeira tentativa, então repetir a resposta falha.

CREATE TABLE IF NOT EXISTS chaves_de_acesso (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  -- Até 1023 bytes pelo padrão: ~1366 caracteres em base64url. A busca e a
  -- unicidade usam o SHA-256 do identificador.
  credencial_id VARCHAR(1400) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  credencial_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  chave_publica VARBINARY(4096) NOT NULL,
  contador BIGINT UNSIGNED NOT NULL DEFAULT 0,
  transportes JSON NULL,
  tipo_de_dispositivo ENUM('singleDevice', 'multiDevice') NOT NULL,
  com_backup BOOLEAN NOT NULL DEFAULT FALSE,
  aaguid CHAR(36) NOT NULL,
  nome VARCHAR(60) NOT NULL,
  criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ultimo_uso_em DATETIME(3) NULL,
  revogada_em DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chaves_de_acesso_credencial (credencial_hash),
  KEY idx_chaves_de_acesso_conta (user_id, revogada_em),
  CONSTRAINT fk_chaves_de_acesso_conta FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS desafios_de_chave (
  id CHAR(36) NOT NULL,
  finalidade ENUM('registro', 'login') NOT NULL,
  user_id CHAR(36) NULL,
  desafio VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expira_em DATETIME(3) NOT NULL,
  usado_em DATETIME(3) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_desafios_de_chave_validade (expira_em),
  CONSTRAINT fk_desafios_de_chave_conta FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

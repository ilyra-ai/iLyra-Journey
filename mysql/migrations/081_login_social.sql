-- Login com Google e Apple (tarefas 164 e 165).
--
-- login_social_provedores: uma linha por provedor, configurada pela
-- administração. Começa desligado e sem credenciais: o botão só aparece na
-- tela de login com o provedor ligado e configurado. O segredo (client
-- secret do Google ou chave privada .p8 da Apple) fica cifrado com
-- AES-256-GCM (chave derivada do AUTH_SECRET, src/lib/security/cifra.ts);
-- nunca volta para o navegador.
--
-- contas_sociais: o vínculo entre a identidade do provedor (o "sub", que não
-- muda) e a conta da Lyra. Uma identidade pertence a uma única conta; ao
-- excluir a conta, o vínculo sai junto.

CREATE TABLE IF NOT EXISTS login_social_provedores (
  provedor ENUM('google', 'apple') NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  client_id VARCHAR(255) NULL,
  segredo_cifrado TEXT NULL,
  apple_team_id VARCHAR(20) NULL,
  apple_key_id VARCHAR(20) NULL,
  atualizado_por CHAR(36) NULL,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (provedor)
);

INSERT IGNORE INTO login_social_provedores (provedor, ativo)
VALUES ('google', FALSE), ('apple', FALSE);

CREATE TABLE IF NOT EXISTS contas_sociais (
  provedor ENUM('google', 'apple') NOT NULL,
  sujeito VARCHAR(255) NOT NULL,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ultimo_acesso_em DATETIME(3) NULL,
  PRIMARY KEY (provedor, sujeito),
  KEY idx_contas_sociais_conta (user_id),
  CONSTRAINT fk_contas_sociais_conta FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);

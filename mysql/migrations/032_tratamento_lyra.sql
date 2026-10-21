-- Tratamento escolhido explicitamente no chat; ausência de linha = carinho padrão.
CREATE TABLE IF NOT EXISTS lyra_address_preferences (
  user_id CHAR(36) PRIMARY KEY,
  mode ENUM('carinhoso', 'perfil', 'personalizado') NOT NULL,
  preferred_name VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_lyra_address_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_lyra_address_name CHECK (
    (mode = 'personalizado' AND preferred_name IS NOT NULL AND CHAR_LENGTH(TRIM(preferred_name)) > 0)
    OR (mode <> 'personalizado' AND preferred_name IS NULL)
  )
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Campo opcional para contas existentes e novas; nenhum apelido é inventado.
SET @tem_apelido_perfil = (
  SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'profiles' AND column_name = 'nickname'
);
SET @adicionar_apelido_perfil = IF(@tem_apelido_perfil = 0,
  'ALTER TABLE profiles ADD COLUMN nickname VARCHAR(80) NULL AFTER last_name', 'SELECT 1');
PREPARE adicionar_apelido_perfil_stmt FROM @adicionar_apelido_perfil;
EXECUTE adicionar_apelido_perfil_stmt;
DEALLOCATE PREPARE adicionar_apelido_perfil_stmt;

ALTER TABLE lyra_address_preferences
  MODIFY COLUMN mode ENUM('carinhoso', 'perfil', 'apelido', 'personalizado') NOT NULL;

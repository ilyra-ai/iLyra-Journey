-- Aprovação dos verbetes escritos automaticamente (tarefa 199).
--
-- Decisão do titular em 17/11/2026: um verbete escrito pelo modelo conectado
-- só entra na base consultada pelo motor depois de aprovado por um
-- administrador. Verbetes já gravados ficam pendentes, porque nenhum deles
-- passou por revisão humana.
ALTER TABLE lyra_verbetes_gerados
  ADD COLUMN status ENUM('pendente', 'aprovado') NOT NULL DEFAULT 'pendente'
    AFTER conteudo_hash,
  ADD COLUMN aprovado_em DATETIME(3) NULL AFTER status,
  ADD COLUMN aprovado_por CHAR(36) NULL AFTER aprovado_em,
  ADD KEY idx_verbete_gerado_status (status),
  ADD CONSTRAINT chk_verbete_gerado_aprovacao CHECK (
    (status = 'pendente' AND aprovado_em IS NULL AND aprovado_por IS NULL)
    OR (status = 'aprovado' AND aprovado_em IS NOT NULL AND aprovado_por IS NOT NULL)
  );

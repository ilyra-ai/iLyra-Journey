-- Funil da descoberta (tarefa 170): contagens anônimas por dia.
--
-- Uma linha por dia (horário de Brasília), etapa e detalhe, com o total de
-- vezes que a etapa aconteceu. Não há identificador de pessoa, aparelho,
-- sessão, IP ou URL: só o nome da etapa, de uma lista fechada no código, e
-- um detalhe também fechado (por exemplo, o método de login ou a chave da
-- contribuição). Sem dado pessoal, a tabela não entra na exportação nem na
-- exclusão de conta da LGPD; os totais ficam enquanto forem úteis para o
-- painel da administração.
--
-- Cadastros, pagamentos confirmados, assinaturas, cancelamentos e retenção
-- não são contados aqui: o painel lê esses números das tabelas que já os
-- registram (users, billing_webhook_events, user_subscriptions, chat_turns).

CREATE TABLE IF NOT EXISTS funil_contagens_diarias (
  dia DATE NOT NULL,
  etapa VARCHAR(48) NOT NULL,
  detalhe VARCHAR(48) NOT NULL DEFAULT '',
  total INT UNSIGNED NOT NULL DEFAULT 0,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (dia, etapa, detalhe),
  KEY idx_funil_contagens_etapa (etapa, dia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

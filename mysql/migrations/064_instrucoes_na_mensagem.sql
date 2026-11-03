-- Compatibilidade com servidores OpenAI que descartam a mensagem de sistema
-- e o response_format (o Jan, por exemplo, troca a mensagem de sistema pelas
-- instruções do próprio assistente). Com 1, o app envia as instruções e o
-- JSON Schema no início da mensagem do usuário. Padrão 0: conexões
-- existentes continuam iguais, exceto o Jan, que já se sabe descartar a
-- mensagem de sistema.
ALTER TABLE ai_provider_connections
  ADD COLUMN instructions_in_user_message TINYINT(1) NOT NULL DEFAULT 0
    AFTER temperature,
  ADD CONSTRAINT ck_ai_provider_connections_instrucoes
    CHECK (instructions_in_user_message IN (0, 1));

UPDATE ai_provider_connections
   SET instructions_in_user_message = 1
 WHERE preset = 'jan' AND provider_type = 'openai_compativel';

-- Origem do título das conversas do chat (tarefas 231 e 232).
--
-- 'pergunta': começo da primeira pergunta (provisório, como sempre foi);
-- 'modelo': título curto criado pelo modelo de IA pelo contexto da conversa;
-- 'pessoa': nome dado pela própria pessoa ao renomear.
-- O título gerado só substitui o provisório: nunca um nome dado pela pessoa.
-- As conversas existentes ficam como 'pergunta' e recebem o título do
-- modelo na próxima resposta.

ALTER TABLE chat_conversations
  ADD COLUMN title_source ENUM('pergunta', 'modelo', 'pessoa')
    NOT NULL DEFAULT 'pergunta' AFTER title;

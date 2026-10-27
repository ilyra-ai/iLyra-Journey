-- Painéis versionados são preservados com a resposta, sem alterar o texto antigo.
ALTER TABLE chat_turns ADD COLUMN response_parts JSON NULL;

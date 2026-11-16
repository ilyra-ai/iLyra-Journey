-- Hora de nascimento estimada pela própria pessoa (tarefa 192).
--
-- Quem não sabe a hora em que nasceu escolhe uma janela do dia de nascimento;
-- o servidor grava a hora representativa dessa janela em `birth_time` e também
-- aqui. A hora do perfil é tratada como estimada enquanto as duas colunas
-- forem iguais: se a pessoa informar outra hora no perfil, a igualdade deixa
-- de valer e a hora volta a ser tratada como informada, sem depender de quem
-- gravou. NULL: nenhuma estimativa escolhida.
ALTER TABLE profiles
  ADD COLUMN birth_time_estimate TIME NULL AFTER birth_time;

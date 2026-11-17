-- Andamento da atualização dos exames pelo modelo de IA (tarefa 211).
--
-- A pesquisa grava o passo em que está, o máximo de passos e quantas páginas
-- oficiais já leu, para a tela da administração mostrar uma barra de
-- andamento real enquanto o modelo pesquisa. Atualizações antigas ficam com
-- zero, que a tela trata como "sem andamento registrado".
ALTER TABLE prevencao_atualizacoes
  ADD COLUMN passo SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER propostas_novas,
  ADD COLUMN passos_maximos SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER passo,
  ADD COLUMN paginas_lidas SMALLINT UNSIGNED NOT NULL DEFAULT 0
    AFTER passos_maximos;

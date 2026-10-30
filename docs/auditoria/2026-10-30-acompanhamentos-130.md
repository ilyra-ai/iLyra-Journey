# Tarefa 130 · Acompanhamentos pessoais com escalas definidas pelo titular

## Conferência prévia

A `main` foi conferida antes da implementação: havia avaliações fixas,
hábitos, experiências pessoais e acontecimentos, mas nenhuma definição de
acompanhamento com escala criada pelo titular. Foram reaproveitados sessão,
recursos do plano, corte do histórico, fuso do perfil, padrões de versão e
idempotência das experiências, primitivos Lyra Clean, exportação LGPD e o
relatório pessoal. Referência consultada: padrão radiogroup do WAI-ARIA APG
(W3C), aplicado pela escala de resposta com Radix RadioGroup.

## Entrega

- Migração 058 com `personal_trackers`, `personal_tracker_definitions` e
  `personal_tracker_entries`: propriedade composta, cascatas, restrições de
  frequência e escala, índices por titular.
- CRUD completo: criar (idempotente), editar, reorganizar, arquivar,
  restaurar e excluir acompanhamentos; responder, corrigir e excluir
  respostas datadas. Escala ou frequência nova cria definição versionada; as
  respostas antigas mantêm rótulo e faixa originais, sem conversão.
- Página `/acompanhamentos`, menu **Meus acompanhamentos** e direitos
  `wellbeing_assessments` + `metrics_history_days` em menu, página e APIs.
- Gráfico só com a escala atual, tabela com todas as respostas e ausências
  ("sem registro", nunca zero), resumo por versão da escala.
- Relatório pessoal: seleção explícita por acompanhamento na prévia, no
  digest e no PDF; notas apenas com a opção de notas.
- Exportação LGPD, exclusão em cascata, política de privacidade, README e
  documentação (`docs/acompanhamentos-pessoais.md`, API, LGPD, relatório).

## Gates

- fix:format, fix:lint, check:lint, check:format e check:types aprovados.
- 965 unitários em 90 arquivos (6 novos do contrato de escala).
- 571 integrações em 60 arquivos com MySQL real (8 novas: sessão, criação
  simultânea, escalas, versões, datas, semanal, ordem, limite, isolamento,
  plano, exportação, exclusão, relatório, digest e PDF).
- Build de produção sem avisos; migração 058 aplicada no banco existente e
  em banco vazio pelo setup da integração.
- @current_problems não está exposto nesta sessão; sua execução não foi alegada.

## Produção, navegador e acessibilidade

Executado por `pnpm start` com conta temporária de QA (senha aleatória não
registrada). 52 verificações aprovadas, 15 execuções axe (regras WCAG 2.0,
2.1 e 2.2 A/AA) sem violações e zero exceções JavaScript. Os dois registros
de console ignorados são a queda de rede provocada pelo roteiro e o 401
esperado após o logout. Viewports 1280, 768, 390 e 320 sem estouro
horizontal; diálogo dentro da tela; teclado por setas na escala; foco
acompanhando o item reordenado; recarga, arquivamento, restauração, ausência,
falha de rede com retentativa, relatório e exclusão. Resultados estruturados
em `2026-10-30-acompanhamentos-130.json`.

Problemas encontrados no QA e corrigidos na causa raiz:

1. **Modelo "Sim ou não" zerava o maior ponto.** O Radix Select, dentro de
   formulário, sincroniza um `<select>` nativo oculto; com mínimo e máximo
   trocados juntos, o novo valor chegava antes da opção e o nativo disparava
   `onValueChange('')`, convertido em 0. Os seletores passaram a ignorar
   valores fora das opções válidas e a usar atualização funcional do estado.
2. **Mensagem de validação em inglês.** Todas as restrições do contrato
   ganharam mensagens em pt-BR, com teste unitário.
3. **Classe `sr-only` anulada no item da escala**, gerando anel de foco
   duplicado. O círculo de seleção ficou visível (reforço além da cor) e o
   nome acessível passou a incluir número e rótulo.
4. **Gráfico rolável no celular abria no início do período.** Agora abre no
   trecho mais recente (verificado em 390 e 320 px).

Também foram ajustados roteiros de QA (espera da animação do diálogo antes do
axe, tecla mantida pressionada como uma pessoa, navegação cliente). O limite
de 10 cadastros por IP por hora foi atingido durante o QA, confirmando a
proteção; a conta de QA foi reutilizada com nova senha. Todas as contas e
dados de QA foram removidos ao final (0 contas, 0 perfis, 0 órfãos).

## Limites

Integração com a linha do tempo pessoal fica para a tarefa 131, que ainda
não existe. Não se certificam navegadores ou sistemas físicos não
executados, todos os leitores de tela nem ausência futura de bugs. Não há
inferência de modelo nem nova dependência.

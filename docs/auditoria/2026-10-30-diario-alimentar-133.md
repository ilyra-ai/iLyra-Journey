# Tarefa 133 · Diário alimentar simples com registro por texto ou foto

## Conferência prévia

`main` em `78da362`. Havia recomendações de alimentação e o campo de
proteína do registro do dia, mas nenhum diário de refeições. A normalização
de imagens dos anexos privados (127) foi reaproveitada sem duplicar código;
a foto da refeição fica em tabela própria, ligada ao registro. Nenhum modelo
autorizado está disponível para interpretar fotos nesta instância; por isso a
leitura por IA não é oferecida nem declarada.

## Entrega

- Migração 060: `meal_entries` e `meal_photos` com propriedade composta,
  cascata e restrições de tipo, horário, porção e percepção.
- CRUD real: criação multipart idempotente com foto opcional, edição com
  versão (inclusive troca de data com limite de 30 por dia), troca e remoção
  de foto, exclusão; foto privada servida só ao titular, PNG sem metadados.
- Estimativa de quantidade do próprio titular, sempre rotulada; nenhum
  nutriente calculado ou inventado.
- Página `/alimentacao` com dia, dias com registros, lista com foto, edição,
  exclusão e mensagens claras; menu Pessoal.
- Integrações: linha do tempo (horário, tipo, descrição curta, sem nota),
  relatório pessoal por seleção explícita (sem fotos, notas só com opção),
  exportação LGPD com fotos em base64, privacidade, README e documentação.

## Gates

- fix:format, fix:lint, check:lint, check:format e check:types aprovados.
- 970 unitários (2 novos do contrato); 584 integrações com MySQL real
  (4 novas: sessão, criação com JPEG com EXIF guardado como PNG sem EXIF,
  idempotência e validações 400/403/413/415, edição, foto, exclusão,
  isolamento, linha do tempo, relatório, plano, exportação e exclusão da
  conta).
- Build de produção sem avisos.
- @current_problems não está exposto nesta sessão; sua execução não foi alegada.

## Produção e acessibilidade

`pnpm start` com conta temporária. 28 verificações aprovadas, 9 execuções axe
(WCAG 2.0/2.1/2.2 A/AA) sem violações após a correção, zero exceções
JavaScript (registros de console ignorados: a queda de rede provocada e o
401 após o logout). Verificados: dia vazio, validação, upload real de JPEG
com prévia e imagem carregada, PNG sem EXIF no banco, porção e percepção,
edição, falha de rede com mensagem em pt-BR, exclusão, navegação por dia e
pelos dias com registros, linha do tempo, relatório e 1280/768/390/320 px
com diálogo dentro da tela.

Problema encontrado e corrigido: o campo de arquivo oculto não tinha nome
acessível (violação `label` do axe). Recebeu nome e saiu da ordem de Tab, já
que o botão visível abre o seletor.

## Limites

Sem reconhecimento de alimentos por IA. Não se certificam dispositivos
físicos ou leitores de tela. Contas e dados de QA removidos.

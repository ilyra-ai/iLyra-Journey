# Tarefa 131 · Linha do tempo pessoal unificada com filtros por assunto

## Conferência prévia

`main` em `dc28e8c`. A linha de períodos e janelas do dia não reunia
atividades. Foram confirmadas no esquema onze origens reais (registro do dia,
reflexão, avaliações, acompanhamentos da 130, respiração, foco e pausa,
rotinas, metas, acontecimentos da 120, modo descanso e experiências), cada
uma com o recurso do plano já exigido pela sua página.

## Entrega

- `GET /api/linha-do-tempo` somente leitura, com consulta estrita (até 31
  dias, sem datas futuras nem anteriores ao histórico), filtros por assunto,
  páginas de 40 itens e totais por assunto.
- Origens fora do plano não são consultadas; assunto indisponível pedido
  diretamente responde 403; a página exige `metrics_history_days`.
- Datas civis "no dia" e instantes UTC convertidos para data e hora locais
  do perfil, com busca de um dia de folga em cada lado.
- Chave `origem:id` sem repetição; notas e conversas nunca exibidas.
- Página `/linha-do-tempo` com dia, período, dia anterior/próximo, filtros
  na URL, agrupamento por dia, detalhes expansíveis, link para a origem e
  "carregar mais". Menu **Minha linha do tempo**.
- Documentação: `docs/linha-do-tempo.md`, API, LGPD, README e ajuste em
  acompanhamentos (integração prevista na 130 concluída aqui).

## Gates

- fix:format, fix:lint, check:lint, check:format e check:types aprovados.
- 965 unitários; 576 integrações com MySQL real (5 novas: sessão e
  validação, onze origens com ordem e sem notas, fuso do perfil,
  paginação estável, recursos do plano e histórico).
- Build de produção sem avisos.
- @current_problems não está exposto nesta sessão; sua execução não foi alegada.

## Produção e acessibilidade

`pnpm start` com conta temporária de QA e registros reais semeados em várias
origens. 21 verificações aprovadas, 4 execuções axe (WCAG 2.0/2.1/2.2 A/AA)
sem violações, zero exceções JavaScript (o 401 após o logout é esperado).
Verificados: cinco origens no dia com ordem correta, detalhes do registro,
ausência de nota, filtro por assunto persistido na URL e após recarga, dia
anterior com 47 itens em duas páginas sem repetição, período de 7 dias,
abertura da origem do acompanhamento, teclado no grupo de filtros e
1280/768/390/320 px.

Problema encontrado e corrigido: em 320 px, a linha "Dia anterior / Próximo
dia" não quebrava e criava 1 px de rolagem horizontal; os botões agora
dividem o espaço e quebram de linha. O limite de cadastro por IP foi limpo
apenas no banco local de desenvolvimento para criar a conta de QA. Contas e
dados de QA removidos ao final.

## Limites

Não se certificam navegadores ou sistemas físicos não executados, todos os
leitores de tela nem ausência futura de bugs. Sem nova tabela, dependência
ou inferência de modelo.

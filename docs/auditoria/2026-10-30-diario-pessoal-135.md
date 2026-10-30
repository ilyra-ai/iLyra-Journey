# Tarefa 135 · Diário pessoal por voz em `/dia`

## Conferência prévia

`main` em `0933314`, com `/dia` já em abas (136, publicada antes por ser o
contêiner). Reaproveitados: a Web Speech API já usada no chat, a cadeia de
modelos autorizados (Administração → Modelos de IA), as instruções da Lyra,
o briefing diário com o céu e o mapa da pessoa, a fila da memória individual
(Graphiti), o contexto de datas e histórico do plano, a linha do tempo (131)
e a exportação LGPD. Distinto do diário alimentar (133): outra tabela,
outra finalidade.

## Entrega

- Migração 062 `personal_diary_entries`: relato como foi contado, texto
  organizado, análise, retrato do céu, estados e prazo da análise, versão e
  estado da memória.
- API: mês, dia, criar (idempotente, 10 por dia), editar com versão,
  excluir e analisar (lease, 6 tentativas).
- Voz: reconhecimento no aparelho primeiro; serviço do navegador só com
  aceite explícito a cada vez; digitação sempre possível; erros em pt-BR.
- Análise: o primeiro modelo autorizado devolve JSON validado; sem
  consentimento de nuvem, só modelos locais; sem modelo, "indisponível".
- Validação antes de gravar: fidelidade palavra a palavra (só grafia),
  acontecimentos e leitura do dia com base no relato, padrões só com
  histórico, mapa só quando enviado, sem linguagem clínica, voz da Lyra.
- Agenda mensal com marcação dos dias, teclado de grade de datas e leitura
  por dia; separação entre o que a pessoa contou e a leitura da Lyra, com o
  modelo identificado.
- Memória: relato na fila quando plano e memória permitem; edição envia a
  versão corrigida; a análise fica no diário.
- Linha do tempo sem conteúdo, LGPD, documentação (`docs/diario-pessoal.md`,
  API, LGPD, linha do tempo, `/dia` em abas e README).

## Problemas encontrados e corrigidos

1. **Troca de sentido passava na fidelidade.** "mas feliz" → "e triste"
   cabia na tolerância de grafia. A regra passou a exigir que cada palavra
   nova seja correção (distância de edição pequena) de uma palavra que saiu.
2. **Saída real inventava padrões e ignorava o relato.** O Qwen local
   devolveu "padrões" que eram fatos do céu, sem relatos anteriores, e uma
   leitura do dia só astrológica. Novas regras: sem histórico, padrões
   vazios; acontecimentos e leitura precisam citar o relato. A saída real
   virou caso de teste.
3. **Rótulo repetido.** O campo do diário e a Reflexão da noite tinham o
   mesmo nome acessível na mesma aba; o campo passou a "Conte o seu dia".
4. **Teste de nuvem errado.** Local ou nuvem é decidido pelo endereço, não
   pelo nome do provedor; o teste passou a usar a URL pública real.

## Gates

fix:format, fix:lint, check:lint, check:format e check:types aprovados;
982 testes unitários (12 novos do contrato) e 594 integrações com MySQL real
(8 novas, com servidor de **contrato HTTP** identificado, que não é modelo);
build de produção sem avisos.

## Produção, modelo real e acessibilidade

`pnpm build` + `pnpm start`, Chromium completo, conta temporária com cidade.

- 22 verificações aprovadas e 8 execuções axe (WCAG 2.0/2.1/2.2 A/AA) sem
  violações, zero exceções JavaScript. Entre elas: abas, alertas, âncoras,
  aceite antes do serviço de voz, relato sem modelo ("indisponível"),
  agenda com o dia marcado, teclado na grade, edição com versão, exclusão e
  390/768/320 px sem rolagem horizontal.
- **Modelo real**: Qwen2.5-1.5B-Instruct (Apache-2.0) local, configurado
  pela API de administração. Pela interface, a análise ficou pronta em 50 a
  79 s, com texto organizado fiel e acontecimentos do relato. Em outro
  relato o modelo devolveu a data no lugar do texto; a validação recusou e
  o relato ficou como foi contado, com o motivo na tela.
- Causa raiz de duas falhas do servidor de QA (não do app):
  `interrupt_requests` do llama-cpp-python interrompia um pedido quando
  chegava outro; e o servidor foi encerrado por falta de memória do
  ambiente.

## Limites

- **Voz real não comprovada aqui**: o Chromium do ambiente não tem
  português no aparelho e recusou o microfone ao serviço do navegador
  (mensagem correta exibida). O "headless shell" do Playwright fecha a aba
  ao consultar `SpeechRecognition.available()`. A captura de fala precisa
  ser conferida no navegador do usuário.
- O modelo de QA é pequeno; a qualidade da análise depende do modelo que o
  administrador autorizar.
- A memória individual (Graphiti) não sobe neste ambiente (o proxy de saída
  impede o build do serviço); foi provada a entrada na fila durável.
- Contas de QA removidas e ordem de modelos devolvida ao motor da Lyra.

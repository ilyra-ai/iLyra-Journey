# Auditoria do portfólio funcional · tarefa 143

Data: 2026-11-05. Base de código: `f626df116758dabdb8ef237db826dfde81c1fa05`. Parecer técnico e de produto, acompanhado de inventário reproduzível e evidências de execução. A tarefa 142 continua responsável pela implementação da arquitetura de informação e do redesenho.

## 1. Resultado executivo e decisão recomendada

A maior parte das capacidades faz sentido. O problema central é a fragmentação da experiência e a distância entre algumas promessas e o mecanismo que as sustenta. A recomendação é concentrar a experiência em **registrar → compreender → escolher uma ação → acompanhar**, preservando a identidade da Lyra e os recursos avançados em contextos próprios.

Foram classificadas **71 famílias de capacidades**: 41 para manter (15 centrais, 24 contextuais e duas essenciais de infraestrutura), 14 para integrar na experiência, oito para reformular, seis avançadas/opcionais e duas de compatibilidade ou preparação. Essas famílias não equivalem a 71 funções de código nem a 71 páginas. Não foi identificada evidência suficiente para autorizar automaticamente a exclusão integral de uma delas.

**Entregáveis:**

- [Matriz das 71 capacidades](2026-11-05-portfolio-matriz.csv): público, entrada/saída, fonte canônica, armazenamento, autorização, decisão, destino proposto e critério de aceite.
- [Inventário técnico completo](2026-11-05-portfolio-inventario.json): módulos, hashes, funções/exportações, importações, páginas, operações HTTP, migrations e serviços Python.
- [Gerador reproduzível](../../scripts/auditar-portfolio.mjs): análise sintática, sem consultar banco, credenciais ou conteúdo pessoal.
- Este relatório: achados, metodologia, mapa de consolidação, condições de migração e prioridades para a 142.

O trabalho atual não exclui recursos, não altera fórmulas, não migra registros, não muda planos e não reorganiza menus. A autorização para executar a auditoria não é interpretada como aprovação específica de cada descontinuação possível. Foram corrigidas duas inconsistências documentais comprovadas, descritas adiante.

## 2. Cobertura, método e limites da evidência

O levantamento sintático encontrou **683 módulos TS/TSX**, **6044 nós de função**, **39 páginas**, **140 rotas de API**, **205 operações HTTP exportadas**, **161 arquivos de testes em `src`**, **66 migrations** e **91 nomes de tabelas declaradas nas migrations**. Os serviços Python acrescentam quatro arquivos e 49 definições de função. Nomes de tabelas históricas não comprovam que todas continuam sendo usadas ou que esse é o schema atual de toda instalação.

O inventário cobre `src`, o módulo de configuração web em `modules` e os serviços Python em `services`. Não inclui código de terceiros em `node_modules`, modelos ou pesos. O número de funções inclui callbacks e métodos; não representa funcionalidades independentes, código executado nesta auditoria ou leitura semântica individual de cada corpo. Importações e chamadas de autorização identificadas pelo analisador são **sinais de revisão**, não prova automática de segurança. Importações dinâmicas, convenções do framework e autorização indireta exigem leitura contextual.

As decisões foram confrontadas com navegação, dependências de planos, APIs, serviços, cálculos, persistência, documentação e provas anteriores datadas. O inventário guarda SHA-256 por módulo para permitir conferir a fonte examinada. A matriz tem uma fonte canônica verificada por linha; dependências e consumidores complementares estão no JSON e nos achados abaixo.

Não foram inventados participantes de pesquisa, adoção, retenção, precisão clínica, ROI ou custos. Uma base local pequena não permite concluir que uma função não tem público. Uma prova funcional anterior permanece histórica; uma consulta HTTP nesta rodada não equivale à homologação de todos os CRUDs, dispositivos ou fornecedores externos.

## 3. Achados prioritários e consequências

### A01 · Duas prontidões com métodos diferentes

**Evidência:** `src/lib/ai/score-engine.ts` e `src/lib/coach/prontidao.ts`. O primeiro usa blocos e referências neutras para dados ausentes; o segundo renormaliza os componentes disponíveis e usa comparação pessoal quando há base. Para a mesma entrada técnica — VFC 20 ms, sono 480 minutos e FC de repouso 55 bpm, demais sinais ausentes — a execução retornou **52** no motor geral e **70** no coach.

**Decisão:** reformular significado e exposição antes de simplesmente juntar cards. Isso não comprova erro aritmético: são métodos diferentes com nomes próximos. Escolher um indicador principal, documentar o papel do outro e identificar a versão/metodologia. A mudança de fórmula ou de históricos requer decisão própria; não recalcular silenciosamente valores já salvos. **Prioridade:** alta para a 142 e revisão metodológica.

### A02 · Referências de cálculo não são observações da pessoa

**Evidência executada:** o motor bruto de escores, sem entrada, retorna longevidade 5 e prontidão 50; `metricasMedidas(null)` retorna lista vazia. Idade sem marcadores, com idade cronológica 40, retorna idade 40, ritmo 1 e vitalidade 50. O motor de alertas sem base retorna lista vazia e `overall: estavel`.

**Distinção necessária:** esses resultados brutos não demonstram que a interface os exiba como medidas. Há proteções existentes: cobertura mínima no escore e nos motores integrativos; `LyraIntelligence2026` exige três marcadores para a idade e distingue ausência de linha de base nos alertas. Não classificar essas proteções como ausentes.

**Decisão:** manter as salvaguardas e usar estados de indisponibilidade claros na experiência. Nunca transformar uma referência neutra em dado do titular ou ausência de base em confirmação de estabilidade. Revisar todos os consumidores, incluindo conversa, recomendações, exportação e relatórios, antes de alterar contratos.

### A03 · Idade biológica e confiança são heurísticas próprias

**Evidência:** `src/lib/longevity/biological-age-engine.ts` soma impactos em anos, limita a idade resultante e deriva `paceOfAging` de `1 + totalImpact / 20`. A confiança varia pelo número de marcadores disponíveis: três para média, seis para alta. `LyraIntelligence2026` consome e apresenta a metodologia e a confiança.

**Decisão:** não apresentar essa implementação como um PhenoAge reproduzido/validado ou uma medida comprovada de rejuvenescimento. A contagem de entradas descreve cobertura, não calibração de erro ou confiança estatística. O estudo original de Phenotypic Age usa um modelo e validação próprios em coortes; essa evidência não se transfere para outra fórmula por semelhança de nome. [Estudo original e validação independente](https://pmc.ncbi.nlm.nih.gov/articles/PMC6312200/).

**Aceite futuro:** método e versão explícitos, entradas necessárias, limitações, testes de ausências e estudo/validação da implementação antes de promessas preditivas. Preservar os biomarcadores originais. Não substituir por outro número sem fundamento.

### A04 · Desvios observados não comprovam antecipação de doença

**Evidência:** `src/lib/health/early-warning-engine.ts` menciona aproximadamente 48 horas no comentário inicial e combina regras de desvios. O texto efetivamente retornado inclui resposta imunológica precoce e sinais que costumam anteceder sintomas. `src/lib/ai/agent-engine.ts` reaproveita os sinais para ações proativas.

**Decisão:** reformular como observação de variações e revisar as recomendações decorrentes; não anunciar capacidade preditiva demonstrada sem avaliação específica. Não transformar a auditoria em retirada automática de orientação útil ou alteração de limiares. A documentação FDA de janeiro de 2026 distingue bem-estar geral de finalidades diagnósticas e clínicas; é referência conceitual, não enquadramento regulatório brasileiro desta instalação. [FDA, orientação de bem-estar geral](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices).

### A05 · Índices simbólicos são ativos, não código morto

**Evidência:** `use-vedic-insights.ts` chama os motores de coerência, chakras, prana, koshas e dosha conforme cobertura. Os motores possuem consumidores e testes. A avaliação de cobertura impede alguns resultados sem base mínima, mas não valida a relação entre biomarcadores e os conceitos simbólicos.

**Decisão:** preservar a dimensão de autoconhecimento escolhida para a marca e tornar a natureza interpretativa explícita, em contexto opcional. Não tratar os índices como medições físicas do conceito anunciado. Não remover motores ativos com base em opinião sobre sua centralidade; a decisão de produto precisa ser específica.

### A06 · Missão e objetivos administrativos sem efeito demonstrado

**Evidência:** `AIConfigForm.tsx` lê, exige e grava `mission` e `key_objectives`; tipos e `table-config.ts` permitem os campos. A busca nos motores e rotas de geração encontrou consumo dos quatro pesos, mas não desses textos. O cálculo executado com pesos iguais e textos diferentes retornou o mesmo resultado.

**Contraprova útil:** os pesos têm efeito real. Para a entrada de A01, usar somente peso de VFC resultou em longevidade 1,7; usar somente peso do bloco de sono resultou em 5,5. A prontidão geral continuou 52, pois não é calculada por esses pesos administrativos.

**Decisão:** não apagar campos ou conteúdo histórico. Escolher entre integração comportamental real, com limites e testes, ou apresentação dos textos como referência institucional. Não chamar todos os controles administrativos de inoperantes, nem ligar textos institucionais a prompts de pessoas sem política clara de precedência.

### A07 · Plano diário útil, mas nome e recomendações precisam de revisão

**Evidência:** `gerarPlanoDaPessoa` chama `generateLocalWellnessPlan`, usando registros, objetivos e contexto; a saída é persistida em `ai_plans`. Não depende de geração por LLM. A navegação ainda usa “Plano de IA”. Existem recomendações predefinidas sobre déficit calórico, proteína e frequência de treino.

**Decisão:** manter a função e orientar o rótulo para **Plano do dia**, com origem identificada. Rever personalização e alcance das recomendações antes de apresentá-las como prescrição individual. Não adicionar uma chamada externa apenas para justificar o nome “IA”. A reorganização visual pertence à 142.

### A08 · Integrações financeiras preparatórias não são checkout completo

**Evidência:** o catálogo em `src/lib/pagamentos/credenciais.ts` marca Stripe com `checkoutIntegrado: true`; Mercado Pago e PayPal com `false`. A interface já possui tratamentos condicionais para essa distinção. Configurar/testar credenciais não prova cobrança, assinatura, webhook e reconciliação completos.

**Decisão:** manter configurações e classificá-las como preparação/integração avançada. Não excluir credenciais, anunciar integração completa ou iniciar implementação de novos gateways nesta auditoria. A operação Stripe em `requires_action` continua pendente na 100.

### A09 · O treinamento tem escopo próprio

**Evidência:** `services/treinamento/app.py` e `src/lib/treinamento` implementam o treinamento e a disponibilização do modelo do serviço. A categoria textual “Treinamento” do gerenciador de conhecimento é organização de documentos. A memória individual mantém relatos, sem equivaler a modificar pesos.

**Correção realizada:** a introdução de `docs/treinamento-por-feedback.md` dizia que o modelo conectado seria treinado e responderia a todos. Agora identifica o modelo próprio, a necessidade de conclusão bem-sucedida e a ordem de encaminhamento; não promete treinar Jan, GGUF ou qualquer fornecedor externo. A implementação de treinamento não foi alterada nem reexecutada como se fosse parte desta auditoria.

**Decisão:** separar visualmente conhecimento, instruções, memória, configuração de modelos e treino especializado. Consentimento para memória não é autorização automática para treinamento.

### A10 · Limites de canal e de dispositivo devem permanecer claros

**Evidência:** o Bluetooth solicita `heart_rate`, recebe `heart_rate_measurement` e agrega sessões; isso não demonstra coleta universal de todos os campos do catálogo. Lembretes dependem de verificação no app aberto/visível e mantêm ocorrências/notificações. Offline tem preparação, cofre e recibos, não paridade integral com a aplicação conectada.

**Decisão:** manter recursos contextuais e ajustar descobrimento e expectativa. Não anunciar todo relógio, todas as métricas, alarme garantido com app fechado ou app integralmente offline. A consulta à compatibilidade concreta deve fazer parte da entrada dessas capacidades.

### A11 · Obsolescência confirmada é principalmente documental e de apresentação

**Correção realizada:** `docs/diario-pessoal.md` ainda listava 429 depois de seis tentativas e captura de voz pendente. O documento foi reconciliado com o comportamento sem teto acumulado e com a prova real do usuário registrada na 135. A execução de voz de 05/11 é histórica e não foi refeita artificialmente nesta auditoria.

**Compatibilidades preservadas:** `/admin/fiscal` redireciona para `?aba=fiscal`; `/admin/payments` para `?aba=pagamentos`. Os reexports de `src/lib/site-page-config` apontam para o módulo canônico em `modules`. Isso não é duplicação de produto. A tabela histórica `puck_documents` e configurações antigas exigem revisão de migração/retenção antes de eventual descarte; existência em migration ou ausência de uso visível não autoriza apagar dados.

**Decisão:** não reintroduzir o construtor antigo e não apagar compatibilidades úteis. Corrigir comunicação e inventariar dependências antes de retirar qualquer arquivo ou tabela.

### A12 · Fragmentação aumenta esforço e pode duplicar registros

**Evidência:** painel, Meu dia, plano, semana, linha do tempo e relatório consultam ou interpretam os mesmos domínios com objetivos próximos. Hábitos ficam no Perfil; rotinas têm definições e execuções próprias; sessões de práticas mantêm contagem própria.

**Decisão:** compartilhar entradas e ligações entre experiências, sem fundir dados automaticamente. A matrícula de um passo numa rotina não comprova que a prática foi executada. Um link para respiração não é uma sessão e não deve somar minutos. A 142 deve priorizar redução de procura e de marcação repetida, conservando a origem do evento.

## 4. Mapa de consolidação para execução na 142

| Experiência proposta      | Origens                                  | Fonte canônica e distinções preservadas                                                 | Condição de migração e teste                                                                           |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Hoje                      | Painel, Meu dia e acesso ao plano        | `daily_metrics`, `daily_briefings`, `ai_plans`; registro, cálculo e narrativa distintos | Rotas e abas antigas continuam úteis; estado vazio não parece medição; cotas e direitos por seção      |
| Meu diário                | Voz/texto, reflexão e acontecimentos     | `personal_diary_entries`, `daily_reflections`, tabelas de marcadores                    | Não concatenar relatos nem converter escalas; revisar e salvar cada tipo com sua versão                |
| Meu progresso             | Linha do tempo, semana e PDF             | Consultar os registros originais, sem novo depósito de dados                            | Preservar filtros, datas, autoria, origem, histórico do plano e seleção do PDF                         |
| Metas e rotinas           | Metas, hábitos e sequências              | `goals`, `habits`, `personal_routines`, `personal_routine_runs`                         | Distinguir objetivo, hábito, modelo e execução; não concluir metas por navegação                       |
| Práticas                  | Respiração, meditação e foco             | `breathing_sessions`, `meditation_sessions`, `focus_sessions`                           | Manter protocolos e sessões próprias; reenvio e retorno de página não duplicam minutos                 |
| Dispositivos e sessão     | Conectar e monitorar                     | Serviço cardíaco e agregador de sessão                                                  | Mostrar o que é suportado; mudança de página não fabrica leituras nem duplica gravação                 |
| Ritmo e notificações      | Lembretes e descanso                     | Preferências, ocorrências, períodos e metas explicitamente vinculadas                   | Preservar silêncio, adiamento e alertas pertinentes; descanso não pausa cobrança                       |
| Financeiro administrativo | Transações, pagamentos, fiscal e análise | Espelhos Stripe, documentos, credenciais e auditoria distintos                          | Conservar ambiente/moeda, idempotência, retenções e links antigos                                      |
| Inteligência da Lyra      | Modelos, conteúdo, instruções e treino   | Provedores/cadeia, documentos, preferências e serviço de treino separados               | Configuração básica primeiro; nenhum consentimento ou conjunto de pesos é compartilhado implicitamente |
| Conta                     | Cadastro, privacidade e assinatura       | Perfil, consentimentos e direitos comerciais                                            | Direitos essenciais sempre acessíveis; não confundir plano diário com plano comercial                  |

As fusões acima são de experiência. Não há autorização de fusão física de tabelas, migração destrutiva, remoção de direito ou exclusão de função. Para vincular prática e passo de rotina, exigir titular, execução, sessão, instante, transação e identificador de idempotência; a edição posterior do modelo não recalcula o passado. Conversa só se transforma em diário por ação explícita com seleção, revisão e cancelamento.

## 5. Revisão metodológica por natureza de saída

| Natureza                      | Exemplos                                 | O que deve aparecer na experiência                                                       |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Medido/recebido de uma fonte  | FC e intervalo RR quando disponíveis     | Fonte, unidade, instante, disponibilidade e qualidade contextual                         |
| Autorrelatado                 | Humor, percepção, refeições, diário      | Relato original ou escala identificada; não converter em sensor ou diagnóstico           |
| Derivado por regra do produto | Prontidão, escore, agregação e sugestões | Fórmula/versão, cobertura, ausências e limites; teste aritmético não é validação clínica |
| Instrumento publicado         | WHO-5, quando aplicado conforme contrato | Itens e pontuação próprios; separar triagem, satisfação, interpretação e diagnóstico     |
| Interpretativo/simbólico      | Leitura védica e índices integrativos    | Contexto de autoconhecimento, escolha da pessoa e distinção de medidas fisiológicas      |
| Generativo                    | Texto, análise de relato e imagem        | Modelo, base utilizada, validação, falha e possibilidade de resultado incorreto          |
| Transacional                  | Cobrança, reembolso, sessão concluída    | Estado real, origem e confirmação; nenhum progresso ou pagamento é inferido de um clique |

Uma fórmula real pode continuar inadequada como afirmação sobre uma pessoa. Não há, nesta auditoria, validação clínica dos motores próprios, certificação de dispositivos ou prova de compatibilidade universal. Esse limite integra o parecer sobre o produto e não substitui investigação metodológica especializada quando necessária.

## 6. Ordem de decisão e critérios empresariais

1. **Antes do destaque visual:** resolver significado das duas prontidões, cobertura/confiança, alegações antecipatórias, idade e recomendações individualizadas; decidir efeito esperado de missão/objetivos.
2. **Núcleo diário:** organizar Hoje, Meu diário e Meu progresso; reduzir busca e entradas repetidas sem apagar tipos de registro.
3. **Ação verificável:** aproximar hábitos, metas, rotinas e práticas com vínculos explícitos e idempotentes.
4. **Administração:** separar visão executiva, operação financeira e ferramentas técnicas avançadas; respeitar ambientes e permissões.
5. **Capacidades periféricas:** manter opcionais e medir demanda antes de expandir imagens, novas integrações ou automações.

Para decisões posteriores de valor, medir sucesso de tarefas, retornos, abandono e esforço com período, população e denominadores explícitos. Uso raro não desvaloriza privacidade, acessibilidade ou integridade. Não foram criados números de adoção ou adicionada telemetria de conversas, saúde, arquivos ou credenciais.

A pesquisa com pessoas continua necessária para validar as hipóteses de compreensão da 142. Os testes técnicos e a opinião do auditor não substituem participantes reais. A orientação de focar a necessidade, em vez da solução escolhida antecipadamente, está no [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs). A redução de opções concorrentes também é apoiada pela [orientação cognitiva complementar do W3C](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p03-manageable-quantity/); isso não autoriza remover capacidades ou direitos silenciosamente.

## 7. Evidências de execução e reprodução

O inventário foi gerado com Node 24 no Ubuntu/WSL2 e TypeScript já instalado no projeto. Reprodução na raiz:

```sh
node scripts/auditar-portfolio.mjs docs/auditoria/2026-11-05-portfolio-inventario.json
```

Requer Node compatível, dependências locais e Python 3 disponível como `python3` para o AST dos serviços. O comando só lê código e migrations; escreve apenas o JSON de auditoria indicado. Seu campo `geradoEm` e o commit de base mudam em execuções futuras. Não representa uma fotografia do banco ou de segredos.

Nesta rodada, oito consultas HTTP autenticadas retornaram 200: saúde, rotinas, lembretes, acompanhamentos, meditações, configuração de IA, pagamentos administrativos e saúde dos dados. A configuração administrativa sem sessão retornou 401. Foram registrados somente status e nomes de campos em `.logs/portfolio-143-api.json`, sem conteúdo pessoal ou credenciais. Os experimentos de funções puras de A01/A02/A06 estão em `.logs/portfolio-143-metodos.json`; suas entradas são casos técnicos declarados, não pacientes simulados ou evidência clínica.

A tentativa de inspeção autenticada pelo Playwright MCP foi bloqueada pelo filtro de segredos do gateway. A proteção não foi desativada nem contornada, e essa tentativa não é contada como QA de navegador aprovado. Não houve alteração visual nesta tarefa. A captura de microfone, os provedores externos, o hardware Bluetooth e o treinamento de pesos não foram novamente homologados aqui. Evidências anteriores continuam datadas nos respectivos relatórios.

## 8. Fechamento da auditoria e fronteiras preservadas

A auditoria considera concluídos o inventário, a classificação das capacidades, a identificação dos candidatos a reformulação/obsolescência, o mapa de consolidação e o parecer profissional. Nenhuma exclusão ou fusão recomendada foi apresentada como implementada. As correções documentais refletem mecanismos já existentes e não ampliam sua capacidade.

A 141 está funcionalmente concluída, com os limites qualitativos do modelo registrados; não deve continuar sendo listada como validação nativa pendente. Permanecem separadas as fronteiras das tarefas 14, 15, 23, 86, 100 e 127. O Gemini continua pendente por decisão do usuário. A execução de UI/UX da 142 deve usar esta matriz e manter origem, dados, direitos, consentimentos e compatibilidade. Mudanças metodológicas e descontinuações exigem decisão específica e plano próprio, antes de alteração de comportamento ou histórico.

Os resultados finais dos gates e a publicação são registrados na seção de conclusão da tarefa 143 em `claude-gestao.md`. Esta auditoria não afirma que todas as recomendações ou todas as pendências do projeto estejam resolvidas.

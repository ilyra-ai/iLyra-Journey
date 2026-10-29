# Tarefa 125 · Apresentação opcional

Base inicial da main: `040e858fbdd9fb43f42b599facb4d32dc41cb788`.
O SHA de publicação é confirmado e registrado no painel após envio.

| Requisito                               | Evidência                                                                                                                                                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primeiro uso opcional                   | Convite sem modal automático; leitura inicial não cria progresso. “Agora não” persiste e o chat permanece utilizável. Cadastro original não foi alterado nem duplicado.                                                                              |
| Avançar, voltar, retomar, pular e rever | Estado e etapa reais no MySQL. Recarga mantém a etapa; Escape fecha e devolve foco; dispensar/concluir permite rever desde o começo.                                                                                                                 |
| Controles reais                         | O mesmo `RegistroDoDiaDialog` abre pela ajuda. O navegador informou 3456 passos e esse valor foi confirmado no MySQL. Avançar no guia não criou métricas, mensagens ou resultados. Ações navegaram ao painel e à conversa reais.                     |
| Planos e elementos ausentes             | Etapas são derivadas dos recursos atuais no servidor. Revogação real dos direitos da fixture Care deixou somente Perfil; tentativa direta de gravar passo revogado retornou 403. Não há spotlight dependente de coordenadas ou de um cartão ausente. |
| Concorrência e isolamento               | Versão otimista com trava do titular, recusa de versão obsoleta, sessão e onboarding obrigatórios. Contas Free/Care mantiveram estados próprios. Exportação LGPD e exclusão cascade testadas.                                                        |
| Acessibilidade e responsividade         | Foco no título a cada etapa, sete avanços por Tab contidos, Escape e retorno ao botão de origem. Seis execuções axe sem violações, 320/390/1280/1440 e zoom 200%. Capturas de celular e desktop inspecionadas.                                       |
| Transparência                           | Ausência de dados e dependência de modelo/plano são explicadas sem dados pessoais de demonstração. Nenhuma etapa exige novos objetivos ou dados de saúde.                                                                                            |

Validação: `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`,
690 testes unitários em 85 arquivos e build aprovados. Suíte completa com
524 integrações MySQL em 56 arquivos aprovada. Oito verificações funcionais
no navegador de produção, seis execuções axe e nenhuma exceção JavaScript.
O JSON adjacente conserva os resultados.

O teste SQL encontrou referência ambígua de versão no upsert com alias; a
coluna do registro existente foi qualificada, sem relaxar o controle de
concorrência. O QA encontrou altura excedida em zoom 200% e largura excedida
pelos botões em 320 px; o modal passou a usar limite percentual do viewport e
as ações passaram a quebrar linha. O percurso completo foi repetido e aprovado.

Após reinicialização do ambiente, o MySQL detectou diretório de schema de teste
sem registro correspondente no dicionário (`ER_SCHEMA_DIR_UNKNOWN`). Com o
servidor parado, somente esse diretório temporário foi preservado fora do
datadir. A base do aplicativo foi preservada. A suíte completa posterior
aplicou as migrations e passou. A orientação foi conferida na referência
oficial de erros do MySQL e no registro oficial de resíduos durante interrupção
na exclusão de schemas.

Fixtures de QA foram removidas e os direitos temporariamente alterados foram
restaurados. Ambiente: MySQL Community 9.7.2, Node 24.22.1, pnpm 11.28.4,
Chrome Headless Shell 156.0.8078.73 e axe-core 4.14.0. Não se declara teste
com NVDA/VoiceOver físico, Windows, WSL ou Docker; `@current_problems` não
está exposto. Semântica acessível, foco, teclado e layout foram verificados
no navegador. Logs e capturas locais não são prometidos em outra instância.

Documentação operacional e referência de acessibilidade:
[Apresentação opcional](../apresentacao-opcional.md).

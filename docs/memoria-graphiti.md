# Memória pessoal com Graphiti

Esta integração pertence ao aplicativo. O modelo que responde ao chat pode
ser trocado sem perder o histórico ou os grafos da pessoa. O MySQL continua
guardando as conversas integrais e a fila durável; Graphiti organiza os relatos
em entidades, relações, episódios de origem e períodos de validade.

## Infraestrutura

- Python 3.14.4, `graphiti-core` 0.31.2 e FalkorDB 6.0.2.
- Dependências diretas em `services/memoria/requirements.in` e resolução
  transitiva com hashes em `requirements.lock`.
- ONNX Runtime com `minishlab/potion-multilingual-128M`: 256 dimensões,
  execução local por CPU. Os pesos são baixados no build a partir da revisão
  `3766c5fca8a199c3d6801461f289f4459719ba31`; o serviço roda offline para
  esses índices. Textos pessoais não são enviados a um serviço de embeddings.
- O adaptador usa somente a inferência textual e o tokenizador dos pesos
  fixados, sem dependências de processamento de imagens. Uma comparação real
  com a implementação de referência confirmou vetores idênticos em português,
  caracteres multilingues e texto acima do limite de tokens.
- Serviço privado publicado somente em `127.0.0.1:8019`, com autenticação
  Bearer; banco de grafos sem porta publicada e com senha própria.
- Grafo físico por UUID de titular. O identificador de grupo do Graphiti é
  exatamente o nome desse grafo, inclusive em ingestão, busca e exclusão.
- Volume `memoria_data` com persistência AOF. Reiniciar os contêineres
  preserva os dados; não use remoção de volumes para atualizar a aplicação.
- Telemetria de Graphiti, Hugging Face e ONNX desativada. O serviço não registra
  prompts, respostas, vetores ou conteúdo pessoal nos diagnósticos.

`pnpm env:init` gera os dois segredos sem alterar valores existentes. Configure
`LYRA_MEMORIA_APP_URL` com o endereço do Next.js visto pelo contêiner; na
instalação local é `http://host.docker.internal:3000`. Os launchers ajustam a
porta do retorno ao escolher outra porta para o aplicativo.

Os launchers `run.py up/app` e `run.sh up/app` sobem e verificam a memória.
Para executá-la isoladamente:

```sh
pnpm env:init
docker compose --env-file .env.local up -d --build --wait memoria
```

Em uma instalação remota, mantenha a API de memória em rede privada. O
adaptador aceita o retorno somente para `host.docker.internal`, `localhost`
ou `127.0.0.1`; não recebe endereços arbitrários de mensagens do chat.

## Extração e provedores

Graphiti pede saídas estruturadas ao endpoint interno autenticado
`/api/internal/memoria/gerar`. O aplicativo resolve os provedores e modelos
da ordem configurada em Administração → Modelos de IA, usando o mesmo
cliente HTTP para OpenAI compatível, Gemini e Anthropic. Isso também preserva
o transporte entre WSL e provedores locais no Windows.

A extração exige um modelo generativo com saída JSON válida. O Motor Lyra
determinístico consegue apresentar lembranças já recuperadas, mas não imita
uma extração: se nenhum modelo autorizado funcionar, o relato permanece na
fila com erro explícito e nova tentativa automática. Uma troca do modelo de
resposta não exige trocar os embeddings nem reconstruir o grafo.

Somente relatos da própria pessoa entram na fila. As respostas da IA não são
tratadas como fatos sobre ela. A instrução de extração proíbe inferir
diagnósticos ou traços psicológicos e solicita que credenciais e documentos
não sejam extraídos. As informações exibidas continuam identificadas como
relatos, com data e episódios de origem.

## Preferências e exclusão

A memória começa desativada por conta. Ativá-la autoriza usar os próximos
relatos na personalização entre conversas; importar conversas salvas é uma
ação separada. A memória pode conter dados sensíveis quando a pessoa os
inclui em suas mensagens. A autorização de nuvem é independente e permite
que mensagens, lembranças e contexto pessoal sejam processados pelos
provedores externos configurados; o padrão é local.

O modo privado impede consultar a memória, enfileirar a mensagem ou importá-la
depois, e usa somente o Motor Lyra determinístico. A conversa continua no
histórico da própria conta. Desativar a memória pausa a personalização e a
extração; apagar elimina os relatos da fila e o grafo. Corrigir cria um novo
relato e invalida a lembrança substituída, preservando sua cronologia.

Cada trabalho tem lease no MySQL e exclusão mútua por titular no banco de
grafos. Falhas mantêm o relato para nova tentativa, com espera progressiva.
A exclusão desativa imediatamente a memória e aumenta sua geração. Pedidos
antigos não podem repovoar as lembranças apagadas. Um marcador técnico de
revogação com UUID e geração, sem relatos ou perfil, expira em 24 horas;
esse prazo cobre os leases e as requisições em trânsito. Se uma atualização estiver terminando ou
o serviço estiver indisponível, a API responde 202 e mostra a exclusão pendente;
a rotina continua até confirmar a remoção real. Não há confirmação falsa de
exclusão. O histórico integral permanece até a pessoa excluir a conta.

A exportação em Perfil → Privacidade e dados inclui preferências, relatos e
o grafo, sem vetores ou credenciais. A exclusão da conta só apaga o usuário
depois de confirmar a remoção do grafo; as verificações de assinatura ativa
e último administrador são feitas antes e novamente ao eliminar a conta.

## Verificações

`src/lib/memoria/servico.integration.test.ts` cobre autorização, consentimento,
deduplicação, privacidade, isolamento e retentativa contra MySQL real.
`scripts/verificar-memoria.mjs` exercita HTTP, extração pelo modelo configurado,
persistência após reiniciar os serviços, recuperação em conversa nova,
correção, exportação, Motor Lyra e exclusão. O script cria e exclui suas
próprias contas temporárias; durante a troca para o motor, restaura a ordem
de modelos ao terminar. Execute com o aplicativo local e um modelo compatível
com JSON em funcionamento:

```sh
node --env-file=.env.local scripts/verificar-memoria.mjs
```

### Validação executada em 20/10/2026

- Lint, formatação, tipos e build de produção aprovados; 521 testes unitários,
  187 de integração com MySQL real e 30 dos launchers passaram.
- O roteiro HTTP completo passou com o Jan/Gemma real: origem do relato,
  isolamento entre contas, alternância da fila entre titulares, recuperação em
  outra conversa, reinício dos serviços, correção temporal, exportação, troca
  para o Motor Lyra, modo privado, indisponibilidade, retentativa e exclusão
  pendente concluída automaticamente. A configuração de modelos foi restaurada
  e as contas temporárias foram excluídas.
- Pelo navegador, uma conta temporária ativou a memória, acrescentou um relato,
  abriu sua origem, corrigiu a lembrança, baixou a exportação e pausou a memória
  sem perder os fatos. Uma mensagem enviada com o modo privado ativo ficou no
  histórico com `memory_excluded = 1`, sem acrescentar episódio.
- Desktop de 1440 × 900 e celulares de 390 × 844 e 320 × 740 conferidos com
  lembranças reais: modal dentro da tela, rolagem interna e nenhum excesso
  horizontal. Confirmação de exclusão com foco inicial em manter os dados e
  fechamento por teclado conferidos.
- Auditoria das dependências Python sem vulnerabilidades conhecidas. O aviso
  de materialização de entidades referenciadas pelo modelo foi investigado em
  `edge_operations.py:390` do Graphiti 0.31.2: é a reconciliação implementada
  pela biblioteca, preservando as relações extraídas. O log mantém módulo,
  linha e tipo do diagnóstico, sem conteúdo pessoal.

Evidências locais, fora do versionamento: `.logs/qa85-fluxo-fila-final.log`,
`.logs/qa85-integracao-verificado.log`, `.logs/qa85-producao-entrega.log`,
`.logs/qa85-python-audit-final.log`, `.logs/qa85-revogacao-real.log`,
`.logs/qa85-privado-interface-real.log`, `.logs/qa85-limpeza-final.log` e as
capturas `.logs/qa85-memoria-*-final.png`.

Fontes: [Graphiti](https://github.com/getzep/graphiti),
[FalkorDB](https://docs.falkordb.com/operations/docker),
[modelo multilíngue](https://huggingface.co/minishlab/potion-multilingual-128m-onnx),
[privacidade do ONNX Runtime](https://github.com/microsoft/onnxruntime/blob/main/docs/Privacy.md).
Os controles seguem referências atuais de
[memória personalizável](https://support.microsoft.com/en-us/microsoft-365-copilot/personalize-what-microsoft-365-copilot-remembers),
[Fluent 2](https://fluent2.microsoft.design/components/web/react/core/drawer/usage)
e [diálogos acessíveis](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

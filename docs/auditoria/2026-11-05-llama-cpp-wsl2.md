# Validação real do llama.cpp no WSL2 · tarefa 141

Data: 2026-11-05. Execução no notebook, na `main`, sem branch ou worktree. O objeto desta conclusão é a integração funcional do runtime local; não é aprovação irrestrita da qualidade das respostas do modelo.

## Ambiente e modelo

- Ubuntu 26.04.1 LTS/WSL2; Node 24.21.0; pnpm 11.28.4 via Corepack.
- RTX 5070 Ti Laptop, 12.227 MiB; driver Windows 617.42; CUDA Toolkit 13.3.1, nvcc 13.3.73. Nenhum driver Linux instalado.
- llama.cpp oficial `v0.9.0`, revisão `cd959bae99ff4bed22bef2604f45241c09bbb8c8`, compilado com CUDA `sm_120a`, Release e quatro processos. O executável identifica a revisão como `0.9.0-dev (build 1, commit cd959ba)`.
- Qwen3.5-9B IQ4_XS já existente no disco: 5.168.653.536 bytes, arquitetura GGUF `qwen35`.
- SHA-256 dos pesos: `7e918aeca06c52bcb528ea6b04b4ec957e75ee8c0a73138854c0dfcf371ea429`.
- Configuração utilizada: contexto 8192, 99 camadas GPU, oito threads CPU. Os números abaixo não estabelecem capacidade para todos os modelos ou todas as configurações.

## Falhas reproduzidas e correções

1. DrvFS não permitia criar o socket no checkout Windows. Estado e socket foram transferidos para a home Linux, em diretório 0700; registro e socket 0600. O runtime também é compilado no filesystem Linux.
2. O CMake percorria o PATH Windows por vários minutos. A busca foi restrita aos caminhos Linux; a configuração passou a concluir em aproximadamente seis segundos. O instalador encontra o CUDA oficial e fixa/verifica a revisão de origem.
3. A busca esgotava o orçamento na home antes da pasta escolhida. As raízes autorizadas explicitamente agora têm prioridade. A leitura dos metadados GGUF v2/v3 distingue o modelo de texto do projetor `clip`, que não é oferecido como modelo textual.
4. Bundles de rotas mantinham controladores separados. O controlador do motor é compartilhado por processo em `globalThis`.
5. O build de produção eliminava o carregamento nativo por uma condição sobre `process.platform`. A plataforma passou a ser consultada em execução por `node:os.platform()`. O bundle resultante e a geração em produção foram conferidos.
6. O Qwen consumia o orçamento em raciocínio antes da resposta. O modo integrado usa o parâmetro oficial `enable_thinking: false`, inclusive com IDs opacos; o comportamento dos provedores externos foi preservado.
7. Após SSE, o agente HTTP reutilizava uma conexão que o servidor estava encerrando: três reproduções deram `ECONNRESET`. Com conexão Unix dedicada por requisição, as três passaram. O app também passou no cancelamento seguido de nova geração.
8. A rasterização a 144 DPI duplicava dimensões e recusava um desenho permitido de 1600 px. A renderização a 72 DPI mantém as dimensões solicitadas. Testes com Sharp produziram WebP reais de 512, 1600 e 2048 px.

A edição do instalador enquanto sua primeira execução ainda estava ativa provocou erro na etapa final do script, depois de o compilador produzir o executável. A sintaxe e a reexecução idempotente foram verificadas com exit 0; a versão do binário e a inferência CUDA foram comprovadas separadamente.

## Provas funcionais

| Verificação                          | Resultado observado                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descoberta pela API e pela interface | GGUF real encontrado e selecionado; projetor de visão excluído da lista textual                                                                      |
| Acesso                               | Sem sessão: 401; pasta `/etc` e parâmetros inválidos: 400; origem divergente: 403                                                                    |
| Teste administrativo em produção     | Primeiro carregamento: 28.954 ms; resposta curta seguinte: 251 ms; ambos HTTP 200                                                                    |
| JSON Schema pelo motor real          | Objeto válido, saudação em português e soma 17 + 25 = 42; 24 tokens de saída, 82,60 tokens/s medidos pelo runtime                                    |
| SSE do runtime                       | 163 tokens, 162 deltas; primeiro texto em 160 ms; total 2053 ms                                                                                      |
| Chat completo do app, aquecido       | 186 deltas; primeiro texto em 618 ms; total 2952 ms; identidade Lyra recebida                                                                        |
| Cancelamento no app                  | Interrupção depois de oito deltas; nova geração HTTP 200, sem reiniciar o motor                                                                      |
| Duas chamadas simultâneas            | Ambas concluídas; 217 e 512 ms; um processo llama-server                                                                                             |
| Diário                               | Relato técnico organizado e análise `pronta`, autoria do modelo integrado e persistência conferida diretamente no MySQL                              |
| Imagem vetorial                      | JSON → SVG sanitizado → WebP de 512 × 512, 2258 bytes; arquivo entregue por `?arquivo=1` idêntico ao blob do MySQL                                   |
| Imagem, SHA-256                      | `788d2dc811795887c49bd63c40d372232be7c0ad947709cb809988cb3a133308`                                                                                   |
| Recursos                             | Amostra com motor carregado: 4978 MiB de VRAM total da GPU e aproximadamente 1,48 GiB de RSS do processo; não representa pico de toda carga possível |
| Isolamento                           | Socket Unix privado observado em `ss`; nenhum listener TCP do llama-server                                                                           |
| Encerramento/reinício                | Aplicação encerrada e iniciada novamente em produção; nenhum filho llama-server restante após o encerramento observado; seleção persistida           |
| Interface                            | Playwright MCP do Docker: busca, seleção e salvamento reais; 1440, 768 e 390 px sem excesso horizontal; nenhum erro de página nessa jornada          |
| Localhost Windows                    | HEAD em `http://localhost:3000` retornou 200                                                                                                         |

O navegador em contêiner acessou o app por encaminhamento HTTP real de `localhost` para `host.docker.internal`, preservando a origem canônica e as respostas do servidor. Não foram fabricadas respostas nem desativadas as proteções de cookies. O acesso direto por `host.docker.internal` não equivale ao contexto seguro de `localhost` do navegador.

## Qualidade do modelo: limites observados

Uma análise de diário foi corretamente recusada por fidelidade; o original permaneceu preservado. Outro relato técnico produziu análise válida, aceita e gravada. O teste administrativo de conexão também produziu respostas astrológicas divergentes entre execuções: ele comprova conexão, não acurácia do conteúdo.

A imagem foi gerada, decodificada, salva e entregue de verdade, mas a inspeção visual não aprovou sua fidelidade ao pedido de um sol sobre ondas: o desenho ficou dominado por um círculo branco. **A qualidade artística desse modelo 9B não está aprovada.** O caminho vetorial não equivale a um modelo especializado em imagens. Esta limitação do resultado do modelo não foi escondida com um desenho fixo, nem foram relaxados os validadores do diário. As revisões de conteúdo e experiência das tarefas 142/143 continuam separadas.

## Gates e preservação

- Instalação Linux congelada: exit 0. `fix:format`, `fix:lint`, `check:lint`, `check:format` e `check:types`: exit 0.
- Suíte final: 1012 unitários em 96 arquivos. Suíte completa de integração: 602 testes em 67 arquivos; após o ajuste de rasterização, duas integrações específicas de imagens também passaram.
- Build final: exit 0, 136 páginas e 128 recursos públicos offline; sem aviso de rastreamento indevido. `@current_problems` não estava disponível como ferramenta; diagnósticos de lint, tipos e build foram executados.
- MySQL existente saudável, migrações idempotentes conferidas. O Ubuntu possuía outro daemon Docker; sua tentativa de criar um segundo contêiner não iniciou por conflito de porta. Somente esse contêiner novo, em estado `created`, foi removido por ID, sem apagar volumes. O banco original do Docker Desktop foi preservado.
- Provedores existentes, chaves e ordem de uso preservados. A opção integrada e o modelo foram salvos pela interface; as alterações temporárias da ordem usadas nos testes foram restauradas.
- Relatos e conversas temporários de QA foram excluídos e a ausência foi conferida no banco. Evidências locais em `.logs/llama-141-*`; nenhum segredo ou peso é incluído no commit.

## Referências de implementação

- [llama.cpp oficial](https://github.com/ggml-org/llama.cpp/tree/cd959bae99ff4bed22bef2604f45241c09bbb8c8).
- [NVIDIA: CUDA no WSL](https://docs.nvidia.com/cuda/wsl-user-guide/).
- [NVIDIA: notas CUDA 13.3.1](https://docs.nvidia.com/cuda/archive/13.3.1/cuda-toolkit-release-notes/index.html).
- [Operação da integração](../inferencia-local-integrada.md).

# Inferência local integrada · Tarefa 141

## Objetivo e preservação

A opção **Lyra · modelo integrado** aparece ao lado dos provedores existentes em **Administração → Modelos de IA**. É aditiva. Ollama, Jan, LM Studio, serviços em nuvem, motor determinístico, ordem e fallback, chat, treinamento, imagens raster e demais funcionalidades não são removidos.

## Arquitetura real

- A aplicação Next.js em Linux/WSL2 chama a camada src/lib/ai/cliente-de-ia.ts, como antes.
- A conexão lyra_integrada invoca src/lib/ai/inferencia-integrada.ts, não HTTP de rede.
- A Lyra inicia como filho o executável aberto llama-server do projeto ggml-org/llama.cpp.
- O processo escuta exclusivamente o socket Unix privado `~/.local/state/lyra-metacare/HASH-DO-PROJETO/motor-PID.sock`, dentro de um diretório com permissões 0700; o socket recebe 0600. O estado fica no filesystem Linux, pois unidades Windows montadas via DrvFS não suportam esse socket com as permissões necessárias. **Não é configurada porta TCP.**
- Somente o processo do aplicativo conhece o caminho do socket e o controlador o acessa pelo módulo HTTP do Node, usando socketPath; o endereço não aparece em Administração → Modelos de IA.
- O mecanismo de identidade, prompt, contexto e fallback da tarefa 56 permanece no fluxo existente de chat. Não se trata de um segundo chatbot independente.
- Os pesos permanecem nos caminhos locais escolhidos pelo administrador. Identificadores na configuração de IA são hashes do caminho real e não URLs de rede.

Código-fonte: https://github.com/ggml-org/llama.cpp
Servidor: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md

## Instalação pela interface

1. Execute a iLyra no mesmo Ubuntu/WSL2 onde estão os arquivos GGUF.
2. Abra Administração → Modelos de IA e marque Lyra · modelo integrado.
3. O painel informa se o runtime está instalado e permite clicar em Instalar runtime CUDA no WSL2. A ação executa scripts/instalar-inferencia-local.sh como o usuário atual, sem sudo ou driver NVIDIA no Ubuntu.
4. A compilação utiliza a release oficial `v0.9.0`, revisão `cd959bae99ff4bed22bef2604f45241c09bbb8c8`, de ggml-org/llama.cpp, GGML_CUDA=ON, CMAKE_CUDA_ARCHITECTURES=120, Release e quatro tarefas de compilação simultâneas. O destino é `~/.cache/lyra-metacare/llama.cpp/build/bin/llama-server`. Requisitos disponíveis no WSL: git, cmake, compilador C++, nvcc CUDA 12.8+ e nvidia-smi funcional. O instalador encontra o CUDA em `/usr/local/cuda/bin` e evita a busca lenta nos diretórios Windows herdados no PATH.
5. Clique em uma raiz/pasta ou informe o caminho absoluto de uma pasta do Linux/WSL2. O backend lista subpastas reais e somente arquivos GGUF com cabeçalho validado. Selecione o arquivo. O botão Localizar GGUF faz descoberta recursiva limitada nas raízes aprovadas.
6. Selecione o modelo em uma posição da ordem de uso, salve e clique em Testar. O teste faz geração real, não um ping fictício.
7. Para gerar ilustração vetorial via texto, selecione o modelo integrado na segunda posição. Pedidos explícitos de imagem seguem o fluxo existente, agora com um caminho para a composição geométrica validada, SVG e rasterização por Sharp. Geradores raster anteriores permanecem disponíveis.

Nenhum dos passos requer Ollama, Jan ou LM Studio abertos.

## Caminhos e escopo

Por padrão, o navegador de pastas abre a home da conta Linux que executa o app. O administrador pode autorizar pastas sob a home e /mnt, incluindo unidades Windows montadas no WSL2. LYRA_IA_RAIZES permite estabelecer raízes adicionais autorizadas, separadas pelo delimitador de caminhos do sistema.

O registro de caminhos reais fica em `~/.local/state/lyra-metacare/HASH-DO-PROJETO/registro.json`, com permissão 0600, e não é versionado. O hash distingue checkouts em diretórios diferentes. O navegador não envia o conteúdo dos arquivos GGUF para o cliente: lista apenas nomes, tamanhos, caminhos e IDs. A busca prioriza as pastas explicitamente autorizadas e verifica os metadados `general.architecture` do formato GGUF v2/v3; projetores de visão `clip` não são oferecidos como modelos de texto. Não há busca ilimitada no disco inteiro nem execução de scripts vindos do modelo.

**Importante:** se a instância Next.js estiver hospedada em um servidor remoto, o backend vê o filesystem desse servidor, não o notebook aberto no navegador. Para usar o WSL2 e a GPU do notebook, a instância deve executar localmente. O recurso exibe essa condição, não simula descoberta remota.

## Configuração opcional do runtime

- LYRA_LLAMA_SERVER: caminho absoluto de um binário llama-server compatível já instalado (alternativa à compilação pela interface).
- LYRA_IA_RAIZES: raízes adicionais de modelos visíveis ao processo.
- LYRA_IA_CONTEXTO: tokens de contexto do motor, intervalo de 1024 a 32768, padrão 8192.
- LYRA_IA_GPU_CAMADAS: camadas transferidas para GPU, intervalo de 0 a 999, padrão 99.
- LYRA_IA_THREADS: threads de processamento CPU, intervalo de 1 a 32, padrão 8.

O carregamento pode falhar se memória ou driver forem insuficientes. Ajuste o número de camadas GPU se necessário; CPU/RAM continuam disponíveis no próprio llama.cpp. Não há ativação automática de memória CUDA unificada, para evitar sobrecarga da RAM do sistema.

## Limites reais

- Somente arquivos GGUF são executados por essa opção. Pesos Safetensors, EXL2 e pacotes incompatíveis não são apresentados como GGUF.
- O modelo 9B abliterated precisa estar disponível no disco, em GGUF válido. Não é automaticamente baixado ou fabricado.
- A geração vetorial produz gráficos e ilustrações via primitivas SVG validadas e WebP. Não equivale a geração nativa de fotografias por difusão.
- O servidor usa socket privado, mas o projeto preserva APIs web existentes da própria aplicação. Autenticação e controles de implantação continuam necessários.
- O runtime depende do processo Next.js e do filesystem Linux. Execução simultânea em diferentes workers de Next.js exige avaliação adicional antes de distribuição em larga escala.
- A instalação verifica pré-requisitos e relata erros reais. Não instala drivers nem altera o Windows.

## Histórico da entrega inicial e retomada no notebook

Na entrega inicial, o ambiente remoto não tinha acesso ao Ubuntu/WSL2, à GPU ou aos modelos pessoais do usuário. Por isso, aquela entrega não comprovava instalação CUDA, inferência, benchmark ou QA no notebook. Em 2026-11-05, a validação funcional foi concluída na máquina de destino, com Ubuntu 26.04.1 LTS, Node 24.21.0, pnpm 11.28.4, CUDA Toolkit 13.3.1 e RTX 5070 Ti Laptop. As evidências atuais e as limitações qualitativas do modelo estão no [relatório da retomada](auditoria/2026-11-05-llama-cpp-wsl2.md).

## Verificação de integração no Windows em 2026-11-05

Após receber os commits desta tarefa na main local, foram corrigidos o
carregamento inicial síncrono do explorador (cargas HTTP paralelas com
descarte após desmontagem) e a formatação. O binário instalado no host foi
explicitamente separado do rastreamento de assets do Next.js nas chamadas
de inspeção e execução, seguindo a anotação indicada pelo compilador.
O runtime e os pesos continuam validados e carregados em execução.

Lint, formato, tipos, 1001 unitários em 95 arquivos, 601 integrações MySQL
em 67 arquivos e build com 136 páginas passaram. O build final não emitiu
os avisos de rastreamento do projeto inteiro. A conferência dos 187 manifestos
de distribuição não encontrou `.env.local`, `.logs`, `.lyra-run` nem GGUF.
Esses checks não constituem execução CUDA, inferência ou benchmark do runtime
Linux/WSL2; à época, essas provas específicas permaneciam pendentes.

## Conclusão funcional no WSL2 em 2026-11-05

Compilação CUDA, descoberta e seleção pela interface, geração em produção,
JSON Schema, streaming, cancelamento com recuperação, concorrência, reinício,
diário aceito e persistido e pipeline vetorial até WebP foram executados de
verdade. A aplicação está disponível em `http://localhost:3000`.
Os provedores e a ordem anterior foram preservados; o modelo integrado está
selecionado e salvo como opção administrativa, sem impor uma nova ordem.

A suíte final teve 1012 unitários aprovados; a suíte completa de integração
teve 602 testes aprovados, seguida de duas integrações específicas de imagens.
Lint, formato, tipos e build passaram. A geração vetorial é funcional, mas a
fidelidade artística da imagem produzida pelo Qwen 9B não foi aprovada; essa
limitação está explicitamente registrada no relatório, sem substituir a
imagem por arte fixa ou relaxar validações.

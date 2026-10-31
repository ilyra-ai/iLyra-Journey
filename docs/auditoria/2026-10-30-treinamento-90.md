# Tarefa 90 · Treinamento real por feedback humano via chat

## Conferência prévia

`main` em `ded7f8f`. Nada da tarefa estava publicado: em 2026-10-24 ela
parou porque não havia modelo treinável nem acesso ao Hugging Face nesta
nuvem. Agora há PyTorch para CPU e download do Hugging Face, o que permitiu
treinar pesos de verdade.

## Mecanismo implementado

KTO (Kahneman-Tversky Optimization) com adaptadores LoRA, pela TRL 0.24,
sobre `Qwen/Qwen2.5-0.5B-Instruct` (Apache-2.0, revisão fixada). É
alinhamento por feedback humano da família do RLHF: otimiza a recompensa
implícita com restrição KL a partir de respostas desejáveis e indesejáveis,
**sem** o modelo de recompensa e o PPO do RLHF clássico. Isso está escrito
na tela, na documentação e no código. Não é memória nem mudança de prompt:
cada versão altera pesos e grava métricas antes e depois.

## Entrega

- `services/treinamento`: treina e serve o modelo (`lyra-treinavel`) em
  `/v1/chat/completions`; rotas de treino com Bearer; versões cumulativas
  (v1…vN fundidas em ordem); estado em disco com escrita atômica; tarefa
  interrompida vira falha ao reiniciar; durante o treino o modelo sai da
  memória e o app usa o Motor Lyra (503 tratado pela cadeia); falha devolve
  a versão anterior. Dockerfile (Python 3.13.18), lock com 1.976 hashes
  (uv) e serviço opcional no Compose (perfil `treinamento`).
- App: migração 063, `src/lib/treinamento`, `/api/admin/treinamento` e
  CRUD de avaliações, interruptor "Treinamento" ao lado de "Como a Lyra
  responde" (só administrador), avaliação "Boa resposta" / "Precisa
  melhorar" com resposta ideal sob cada resposta, lista com exclusão,
  confirmação ao finalizar, acompanhamento a cada 10 s, métricas, reenvio
  de treino que falhou, LGPD e documentação.

## Problemas encontrados e corrigidos

1. **Versões não acumulavam**: cada versão é treinada sobre a anterior,
   mas o carregamento aplicava só o último adaptador. Agora funde v1…vN.
2. **Memória**: aplicar a versão carregava uma terceira cópia do modelo, e
   treinar com o modelo de atendimento carregado dobrava o consumo (pico
   medido de 5,5 GB). O modelo treinado passa a atender direto, e o de
   atendimento sai durante o treino. Pico medido depois: 4,6 GB.
3. **Tarefa perdida travava a sessão** em "treinando": 404 do serviço agora
   marca falha com o motivo (teste de integração novo).
4. **Texto apagado ao digitar a resposta ideal**: salvar remontava o
   componente; o estado local agora guarda só o que foi editado.
5. **Respostas pareciam não avaliadas após recarregar**: estado e
   avaliações passaram a ser carregados juntos.
6. **Exportação LGPD** exigia `created_at` em `ai_training_sessions`;
   coluna acrescentada à migração ainda não publicada.

## Gates

fix:format, check:lint, check:format e check:types aprovados; 984 testes
unitários (2 novos) e 597 integrações (3 novas, com servidor de **contrato
HTTP** identificado, que não treina); 30 testes dos launchers; build sem
avisos; `docker compose config` válido com e sem o perfil.

## QA com treino real

`pnpm build` + `pnpm start`, serviço real na CPU (2 núcleos), Chromium
completo, contas temporárias:

- modelo treinável conectado pela administração; usuário comum sem o
  controle e com 403 na API; axe sem violações com o controle desligado;
- ligado: o serviço registrou a sessão aberta; 4 perguntas reais
  respondidas pelo modelo e avaliadas pela tela (2 boas, 2 com resposta
  ideal) em 171 s; axe sem violações;
- **queda real** no meio do treino (falta de memória do ambiente, com o
  navegador aberto): a tarefa foi marcada "Treino interrompido pela
  reinicialização do serviço", a tela mostrou a falha com as avaliações
  salvas e "Tentar o treino de novo" (axe sem violações);
- **reenvio pelo app** (mesma rota do botão, com o navegador fechado para
  caber na memória): 6 exemplos treinados em 80 s; versão 1 aplicada;
  margem entre aprovadas e reprovadas de **0,24 para 0,92**;
- a tela mostra "Versão 1 aplicada a todos … 0,24 antes, 0,92 depois";
- usuário comum atendido pela v1: o log do serviço registra as chamadas do
  chat (200) depois do fim do treino. A contagem automática do roteiro deu
  zero por ler o log antes de o Python gravá-lo (saída em buffer); a
  conferência foi feita no log;
- nova sessão: avaliação mantida após recarga; 390 px sem rolagem; axe sem
  violações; nenhuma exceção JavaScript.

## Limites

- Na QA, o comprimento de treino foi 384 tokens (`LYRA_TREINO_TOKENS`) por
  causa da memória do ambiente (padrão 512). Com GPU, use o índice CUDA do
  PyTorch.
- A imagem Docker do serviço não foi construída aqui: o proxy deste
  ambiente impede o `pip` dentro do build (o mesmo da memória). O código foi
  executado com as mesmas versões fixadas num ambiente Python local.
- Com poucas avaliações o efeito na fala ainda é parcial; ele cresce com
  mais avaliações. Contas, sessões e ordem de modelos de QA foram limpas.

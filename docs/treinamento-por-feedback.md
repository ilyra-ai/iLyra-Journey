# Treinamento por feedback humano no chat (tarefa 90)

O administrador liga o **Treinamento** no chat (ao lado de "Como a Lyra
responde"), conversa com a Lyra e avalia as respostas. Ao desligar, inicia o
treinamento dos **pesos do modelo próprio do serviço de treinamento** com
essas avaliações. Após conclusão bem-sucedida, a nova versão passa a atender
os pedidos encaminhados a esse serviço pela ordem de modelos configurada.
Isso não treina automaticamente modelos do Jan, arquivos GGUF selecionados
na inferência integrada nem provedores externos.

## Mecanismo, com precisão

- **Método**: KTO (Kahneman-Tversky Optimization, Ethayarajh et al., 2024)
  com adaptadores LoRA, pela biblioteca TRL 0.24. É um método de
  alinhamento por feedback humano da família do RLHF: otimiza a recompensa
  implícita do modelo com restrição KL em relação ao modelo de referência, a
  partir de respostas marcadas como desejáveis ou indesejáveis. Não usa o
  modelo de recompensa separado e o PPO do RLHF clássico.
- **O que vira exemplo**: resposta "Boa" é desejável; "Precisa melhorar" é
  indesejável; a "resposta ideal" escrita pelo administrador entra como
  desejável para a mesma pergunta. Pergunta e resposta vêm do banco, nunca
  do navegador, e só de conversas do próprio administrador: dados de outros
  usuários nunca entram no treino.
- **Modelo**: `Qwen/Qwen2.5-0.5B-Instruct` (Apache-2.0), revisão fixada
  `7ae557604adf67be50417f59c2c2f167def9a775`, baixada no build da imagem.
  Cada versão é treinada sobre a anterior já aplicada; o serviço funde
  v1…vN em ordem ao carregar.
- **Efeito medido**: cada versão grava a log-probabilidade média por token
  das respostas desejáveis e indesejáveis antes e depois do treino e a
  margem entre elas. A tela mostra a margem antes e depois.

## Arquitetura

- **Serviço** `services/treinamento` (FastAPI, PyTorch, Transformers, TRL,
  PEFT; dependências com hash em `requirements.lock`). Ele treina e também
  **serve** o modelo em `/v1/chat/completions`, compatível com OpenAI, como
  `lyra-treinavel`. As rotas de treino exigem `Bearer LYRA_TREINO_SEGREDO`.
- Durante o treino o serviço tira o modelo da memória e responde 503; o app
  passa ao próximo da ordem (o Motor Lyra) até a nova versão entrar. Se o
  treino falhar, a versão anterior volta. Uma queda no meio marca a tarefa
  como falha ao reiniciar, sem aplicar nada pela metade.
- **App**: migração 063 (`ai_training_sessions`, `ai_training_feedback`),
  `src/lib/treinamento`, rotas `/api/admin/treinamento` (estado, ligar,
  desligar) e `/api/admin/treinamento/avaliacoes` (CRUD), e o componente
  `TreinamentoDoChat`. Uma sessão por vez fica ligada ou treinando.

## Como usar

1. Gere os segredos e suba o serviço (perfil opcional, por ser pesado):
   `pnpm env:init` e
   `docker compose --env-file .env.local --profile treinamento up -d --build --wait treinamento`.
2. Em Admin → Modelos de IA, coloque como **primeiro** da ordem um provedor
   local (por exemplo "llama.cpp") com o endereço `LYRA_TREINO_URL/v1`
   (padrão `http://127.0.0.1:8021/v1`) e o modelo `lyra-treinavel`. Sem esse
   modelo conectado, o Treinamento informa a condição e não liga.
3. No chat, o administrador abre **Treinamento**, liga, conversa e avalia.
   Cada avaliação é salva na hora (recarregar não perde nada) e pode ser
   trocada ou excluída na lista do próprio controle.
4. Ao desligar e confirmar "Finalizar e treinar", o treino roda (são
   necessários ao menos 4 exemplos e um desejável). O estado é conferido a
   cada 10 s; ao terminar, aparece a versão aplicada a todos e as métricas.
   Um treino que falhou pode ser reenviado com "Tentar o treino de novo".

Ajustes do serviço por variável: `LYRA_TREINO_EPOCAS` (3),
`LYRA_TREINO_TAXA` (2e-4), `LYRA_TREINO_TOKENS` (512; reduza em máquinas com
pouca memória), `LYRA_TREINO_MINIMO` (4) e `LYRA_TREINO_THREADS` (2). Com GPU
NVIDIA, troque o índice do PyTorch no `requirements.in` pelo índice CUDA e
gere o lock de novo.

## Privacidade e permissões

Somente administradores veem o controle; usuários comuns recebem 403 nas
rotas. Excluir a conversa remove as avaliações dela; as avaliações entram
na exportação LGPD do administrador. Nada sai da máquina: pesos e
avaliações ficam no volume `treinamento_data` do serviço local.

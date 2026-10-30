# Meditações guiadas (tarefa 132)

A página `/meditacoes` (menu **Meditações guiadas**) reúne práticas de
meditação e relaxamento em pt-BR, com filtros por duração e objetivo,
detalhes, narração, transcrição completa e controles de começar, pausar,
retomar, concluir ou interromper. Complementa a respiração guiada e as
sessões de foco e pausa (tarefa 126), sem substituí-las.

## Conteúdo e direitos de uso

O catálogo tem oito práticas com roteiros **próprios do Lyra MetaCare**,
escritos para o app (`src/lib/meditacoes/catalogo.ts`), com versão por
prática. Não há arquivo de áudio de terceiros: a narração é produzida no
dispositivo pela voz local em português, com o mesmo controlador da leitura em
voz alta (tarefa 128), que aceita somente vozes `localService` em português e
não envia texto a serviço externo.

Antes da implementação, as vozes brasileiras do Piper foram avaliadas e
descartadas: todas são ajustes de modelos treinados com bases de uso não
comercial (lessac/Blizzard 2013 e RyanSpeech CC BY-NC-SA 4.0), o que não
comprova direito de uso em um app comercial. Sem voz local em português, a
página informa a ausência e a prática segue pela transcrição, com o mesmo
tempo e registro; nenhum cartão anuncia mídia inexistente.

Objetivos: relaxar e desacelerar, preparar o sono, recuperar o foco, acolher
emoções e começar o dia. Durações: até 5 min, 6 a 10 min e mais de 10 min.
São práticas de bem-estar; não substituem cuidado profissional de saúde.
Cada roteiro orienta voltar à respiração natural ou interromper diante de
desconforto.

## Tempo, narração e registro

Cada passo começa em um instante fixo; a duração total não depende da
velocidade da voz. O servidor mede o tempo (como no foco da tarefa 126):
início, pausa e retomada usam o relógio do servidor, pausas não contam e o
tempo fica limitado à duração da prática. O navegador desenha o relógio com
tempo monotônico e confere o servidor ao voltar à aba. A narração fala o passo
atual quando ele começa; pausar cancela a fala e retomar repete o trecho em
andamento. Ocultar a aba pausa a fala, não a prática.

Alcançar a duração não encerra sozinho: a pessoa confirma **Concluir
prática**. Interromper antes registra o tempo menor. Só minutos inteiros
efetivamente realizados entram na meditação do dia local de início
(`daily_metrics.meditation_minutes`), uma única vez: a soma é reservada de
forma atômica (`minutes_logged`) e um segundo encerramento apenas confirma o
primeiro. Menos de um minuto não soma nada. Respiração guiada e práticas da
biblioteca são sessões distintas e cada uma soma apenas o próprio tempo.

## APIs, plano e privacidade

Página e APIs exigem sessão e `guided_breathing` (práticas guiadas). Só existe
uma prática aberta por conta.

- `GET /api/meditacoes`: prática aberta, últimas 20 encerradas e totais.
- `POST /api/meditacoes`: `id` (UUID idempotente), `pratica` e `versao`. Prática
  inexistente responde 404; versão de roteiro antiga ou segunda prática aberta, 409.
- `POST /api/meditacoes/[id]`: `acao` (`pausar`, `retomar`, `encerrar`) e
  `versao`. Retomar após a duração responde 400.

Leituras privadas sem cache. A migração 059 cria `meditation_sessions`
(prática, versão, duração, estado, tempo, data local e minutos), incluída na
exportação LGPD e removida com a conta. As práticas aparecem na
[linha do tempo pessoal](./linha-do-tempo.md) como práticas.

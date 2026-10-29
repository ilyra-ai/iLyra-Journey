# Ouvir respostas da Lyra

Cada resposta concluída oferece **Ouvir**. O diálogo permite iniciar, pausar,
retomar, parar e escolher 0,75×, 1×, 1,25×, 1,5× ou 2×. Abrir os controles não
inicia áudio. A leitura não aparece em mensagens da pessoa nem em respostas
incompletas ou ainda em transmissão.

O recurso utiliza exclusivamente vozes que o navegador identifica como locais e
em português. Prefere pt-BR; sem essa opção, utiliza outra voz local em português.
Se não houver voz elegível ou API de síntese, explica a ausência e desabilita o
início. Não há chamada a provedor de voz externo, uso de chave de IA ou envio de
texto a um serviço da Lyra para sintetizar áudio. A qualidade e a pronúncia são
as oferecidas pela voz instalada no dispositivo.

## Texto e controles

A fonte da leitura é a semântica do Markdown já renderizado. Delimitadores não
entram na fala; tabelas conservam cabeçalhos, linhas e valores, incluindo zero e
campos sem valor. Endereços de links são substituídos por uma indicação; o rótulo
visível continua sendo lido. Blocos de código recebem um aviso para consultar o
texto. Unidades junto a números são expandidas sem recalcular ou arredondar o
valor. Pergunta, resposta, favoritos, cópia e dados de saúde ficam preservados.

Frases extensas são divididas por palavras em trechos curtos. Não há corte
silencioso de conteúdo: textos acima de 60.000 caracteres ou uma palavra acima
de 500 caracteres recebem erro claro. A segmentação não corta números, casas
decimais ou palavras. As partes seguintes só são enviadas à API quando a anterior
termina realmente.

A pausa cancela o trecho nativo em andamento e conserva sua posição na fila. Ao
retomar, esse trecho pode ser repetido integralmente; a interface informa esse
comportamento. A estratégia funciona sem depender de pause/resume nativo ou de
eventos de fronteira de palavras, cuja compatibilidade varia. Alterar a velocidade
durante a leitura também pode repetir o trecho atual. O estado de leitura depende
dos eventos nativos start/end/error, com prazo de início para evitar um controle
preso em preparação quando o sistema de voz não inicia.

## Saída, conta e privacidade

Há um controlador somente na janela, sem estado de texto no servidor ou no disco.
Iniciar outra resposta cancela a anterior. O texto da fila é removido ao parar,
concluir, sair da conversa ou desmontar a resposta. Refazer uma resposta remove
a leitura durante a transmissão; nova conversa também encerra a fala da saudação.

Esconder a aba pausa a leitura; o retorno não a retoma sozinho. Pagehide encerra a
fila. Entre abas do mesmo contexto, BroadcastChannel troca somente comandos de
parada e um identificador aleatório, sem texto. A saída ou entrada em outra conta
invalida a leitura nas abas antigas: precisam atualizar a página para ouvir
novamente. Mudanças de sessão no próprio app interrompem a fala imediatamente,
reutilizando também os sinais de bloqueio de privacidade existentes.

A velocidade vale durante esta aba e não é gravada como preferência da conta.
Nenhum áudio é salvo pelo app. Não há novo registro de prática, consumo de cota
de IA ou alteração de métricas. Os controles só existem dentro do chat já
protegido pelos direitos do plano e pela sessão.

## Compatibilidade e validação

É necessário que o navegador exponha a Web Speech API e uma voz local em português.
A presença da API, sozinha, não basta. Não é prometido funcionamento em um sistema
sem voz instalada, em todos os navegadores ou com uma voz remota. No Linux, a
integração de Chromium com o sintetizador do sistema depende também da configuração
do próprio navegador. Consulte as opções de acessibilidade e as vozes do dispositivo.

A validação de produção usa Chrome for Testing e um sintetizador local real,
Speech Dispatcher com eSpeak NG, além de captura PCM/WAV por PulseAudio. O backend
adicional é infraestrutura isolada de QA, não uma dependência adicionada ao app.
A captura comprova síntese de áudio; não equivale a testar um alto-falante físico
ou a experiência em Android, iOS, Windows ou macOS. Esses limites constam da
auditoria. As variantes de ausência de voz e API são verificadas em navegadores
reais, sem substituir a síntese por eventos artificiais.

Referências primárias consultadas:

- [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Voz local](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService)
- [Limites dos eventos de fronteira](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event)
- [Backend Linux do Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/speech/tts_linux.cc)
- [Configuração do Speech Dispatcher](https://github.com/brailcom/speechd/blob/master/config/speechd.conf)

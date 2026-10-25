# Imagens no chat

A imagem usa exatamente a segunda posição de Admin → Modelos de IA, mesmo
quando o Motor Lyra está em primeiro. O modelo precisa oferecer a API de imagens:
um modelo de texto selecionado não ganha essa capacidade pela configuração.
Não há troca automática para outro provedor.

O cliente reaproveita o SDK oficial da Vercel com `generateImage`, adaptadores
OpenAI e Google e transporte local já existente. Foram consultados os documentos
`ai/docs/07-reference/01-ai-sdk-core/10-generate-image.mdx` e as implementações
`@ai-sdk/openai/src/image/openai-image-model.ts` e
`@ai-sdk/google/src/google-image-model.ts` dos pacotes oficiais instalados.
OpenAI compatível usa `/images/generations` e recebe base64; Google usa o
adaptador de imagens do SDK. Anthropic é recusado por não oferecer esse contrato.
Referências: https://ai-sdk.dev/docs/ai-sdk-core/image-generation e
https://github.com/vercel/ai . Não foi alegado acesso a uma página externa que
não estivesse disponível; o contrato foi conferido no pacote oficial.

O pedido explícito de imagem é associado à conversa. Ao pedir a leitura do mapa
pessoal, havendo mapa calculado, o pedido visual recebe somente as posições do
mapa e as limitações de hora conhecida, sem incluir nome, e-mail, nascimento ou
métricas de saúde. A imagem é identificada como interpretação visual por IA;
os cálculos textuais permanecem a referência. Sem dados não se inventa um mapa.

## Privacidade e limites

O Modo Privacidade impede o envio a modelos de imagens. Pedidos originalmente
privados continuam privados nas retentativas. Para provedor em nuvem também é
necessário o consentimento já usado pelo chat. Cada tentativa autorizada usa a
cota existente de mensagens de IA; falhas de configuração e ausência de
consentimento não consomem essa cota. BYOK de texto não muda o destino da imagem.

O JSON do provedor é limitado a 12 MB, o arquivo a 5 MB e a decodificação a
16.777.216 pixels. PNG/JPEG/WebP são decodificados de verdade com sharp,
normalizados para WebP de até 2048 pixels por lado e sem metadados de origem.
HTML, SVG e arquivos inválidos são recusados. O cliente não segue URLs de imagens
retornadas pelo provedor nem redirecionamentos HTTP.

A migração 034 grava o arquivo e os metadados em `chat_generated_images`,
relacionados ao turno. A rota exige a sessão do titular a cada leitura, inclusive
no download; os arquivos não ficam em URLs públicas de storage. Excluir a
conversa ou a conta elimina os registros por cascade. A exportação LGPD inclui
o pedido, metadados e arquivo em base64, sem credenciais de provedor.

Tentativas concorrentes são serializadas no banco. Uma tentativa tem prazo e
identificador próprios; resposta atrasada não sobrescreve a nova. Reabrir a
conversa recupera o estado e a imagem; repetir pedido já pronto não gera ou
cobra de novo. Interrupção pode ser retomada após o prazo expirar.

## Evidência e fronteira externa

Os testes usam banco real, SDK real, HTTP local controlado e arquivo PNG real
para conferir o contrato, persistência, conversão, isolamento e exclusão. Esse
servidor de testes **não é um modelo de IA** e não comprova inferência externa.
A validação final com um modelo gerador real depende de um provedor acessível
e configurado nesta instância; localhost do computador do usuário não é o
localhost da nuvem. Não declare essa etapa aprovada sem executá-la.

O componente de resultado reutiliza os estilos e controles existentes. Não
redesenha as telas, cores, disposição ou tipografia do chat já implementado.

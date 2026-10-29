# Anexos privados no chat

A conversa salva oferece **Anexos**. A pessoa pode guardar, pré-visualizar,
selecionar para uma pergunta, baixar e excluir arquivos próprios. O armazenamento
não aciona um modelo. São necessários cadastro concluído, Mensagens IA e Histórico
de conversas habilitados no plano; as APIs conferem esses direitos novamente.

## Formatos e limites efetivos

- TXT UTF-8: até 8.000 caracteres, não vazio e sem controles binários. A prévia
  numera as linhas sem alterar os bytes guardados.
- PNG, JPEG e WebP estáticos: até 16 milhões de pixels. Sharp decodifica os pixels,
  aplica a orientação e gera PNG sem EXIF. A cópia normalizada é o arquivo
  disponível para leitura e download; o original não é conservado.
- Entrada e cópia normalizada: até 3 MiB por arquivo. Até três arquivos por
  pergunta, 20 por conversa, 100 arquivos ou 30 MiB por conta e 100 uploads nas
  últimas 24 horas. Os limites recusam novos uploads; não apagam arquivos antigos.
- PDF, SVG, animações e documentos de escritório são recusados explicitamente.
  Não há extração de PDF nem OCR local anunciado.

O limite do corpo é conferido durante a leitura, mesmo sem Content-Length. Nome
não integra a URL do upload; segue em cabeçalho codificado, com validação no
servidor. Somente UUIDs gerados pelo cliente identificam conversa e arquivo.

## Autorização de leitura e provedores

Para cada pergunta, a pessoa seleciona arquivos e confirma a leitura. A
confirmação é descartada após o envio; reabrir a conversa não a restaura. Refazer
uma resposta exige selecionar os mesmos IDs e confirmar novamente. O botão junto
à pergunta recupera a seleção original. Arquivo excluído não pode ser substituído
por outro conteúdo com o mesmo ID, nem usado em uma nova tentativa.

O Modo Privacidade impede essa leitura. A ordem de provedores já configurada e o
BYOK Gemini continuam vigentes. A cadeia da plataforma filtra nuvem sem a
preferência allow_cloud; a chave própria é usada somente após a confirmação que
informa o envio ao Google. Não há chave de outro fornecedor criada implicitamente.

Cada solicitação multimodal leva os bytes PNG no formato nativo correspondente
(OpenAI compatível, Gemini ou Anthropic). Uma imagem adicional contém um código
aleatório que não aparece no texto do pedido. A resposta precisa ler esse código,
obedecer ao contrato estruturado e apresentar referências válidas. O teste
verifica uma capacidade de leitura visual naquela requisição; não certifica a
exatidão clínica ou toda a interpretação dos arquivos. Falha ou modelo ausente
retorna erro. O Motor Lyra determinístico não finge ter interpretado uma foto.
Não há transmissão de parciais de uma leitura ainda não validada.

Para TXT, o modelo indica intervalos de linhas e o servidor monta as citações com
os trechos efetivamente armazenados. Para imagens, a resposta identifica a região
consultada e informa que a descrição vem do modelo. Cada arquivo selecionado deve
ter fonte ou limitação declarada. A pessoa continua responsável por conferir os
arquivos; a leitura pode errar e não substitui atendimento profissional.

## Persistência, privacidade e exclusão

A migração 056 cria chat_attachments com FK composta para conversa e titular;
chat_turns guarda os IDs imutáveis da seleção. Bytes e metadados só são servidos
após autorização, com private/no-store, nosniff e CSP sandbox. Não há URL pública,
uso de avatar público ou armazenamento no cache offline. TXT é exibido como texto;
nenhum comando ou ferramenta é executado a partir de documentos.

Uploads usam transação e bloqueio do titular para limites e repetição do mesmo
ID. A reserva chat_attachment_ids conserva somente UUID, titular e data para
impedir reutilização de um ID excluído e contar uploads recentes. Ela integra a
exportação e é removida junto com a conta. Reenvios com o mesmo ID e mesmo arquivo
são idempotentes; selecionar novamente um arquivo gera outro ID.

A fonte é conferida no início e antes de gravar a resposta, com bloqueio de leitura
na transação final. Exclusão durante a geração impede confirmação tardia. Uma
resposta já confirmada pode continuar com citações após excluir o arquivo: a
interface explica que também é preciso excluir a conversa para remover esses
textos. A exclusão da conversa remove os arquivos; a reserva de IDs sem conteúdo
permanece até a exclusão da conta.

Turnos com anexos não entram na memória pessoal nem no contexto enviado
automaticamente nas próximas perguntas. Nova seleção e consentimento são exigidos
para uma nova leitura. A exportação LGPD inclui arquivos próprios em base64. A
exclusão da conta remove os dados por cascata. A política de privacidade foi
atualizada para 2026-10-29. Logs das trocas de modelos dessa leitura omitem as
mensagens do provedor que poderiam repetir conteúdo dos arquivos.

## Fronteira de validação

Testes de contrato verificam serialização, referências e recusa de um modelo que
não devolve a verificação visual. Eles **não são inferência generativa**. O QA usa
arquivos identificados como fixtures, MySQL real, produção Next.js e navegador
real. A aprovação integral da tarefa 127 depende também de executar a leitura de
TXT e fotos legíveis/ilegíveis com modelo real autorizado nesta instância; essa
fronteira está registrada separadamente no painel e na auditoria.

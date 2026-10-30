# Relatório pessoal visual em PDF

Em `/relatorio-pessoal`, o titular escolhe datas e conteúdo, prepara uma prévia
e baixa o arquivo após revisá-la. Nenhum conteúdo é selecionado automaticamente.
A janela máxima por arquivo é de 90 dias, limitada também pelo histórico atual
do plano e pela data local do perfil. O fuso aparece na prévia e no documento.
Datas dos registros consolidados não são deslocadas para sugerir associação.

## Seleção e origem

É possível selecionar individualmente os 15 campos do registro manual do dia,
as reflexões da noite, os acontecimentos pessoais e cada acompanhamento
pessoal (tarefa 130), ativo ou arquivado. A opção de notas é separada
e desmarcada por padrão; só inclui notas das categorias também selecionadas.
Conversas, anexos, cadastros de terceiros, prontidão calculada e interpretações
astrológicas não são consultados por esse relatório.

Os números vêm de `daily_metrics`, com unidades e faixas reutilizadas do
registro do dia. A origem é apresentada como consolidada: o sistema não
inventa dispositivo de origem, pois o registro pode ser manual ou importado.
As escalas das reflexões e os acontecimentos aparecem como relatos pessoais.
Dias sem reflexão, sem revisão ou com revisão de acontecimentos invalidada
mantêm esses estados explícitos. Um dia não registrado não é uma negativa.

A síntese local mostra contagem de valores válidos, lacunas, mediana, mínimo
e máximo por campo. Zero válido é preservado; valores ausentes ou fora da
faixa não são imputados. Os gráficos apresentam pontos nas datas disponíveis,
sem linha atravessando lacunas; as tabelas incluem todos os dias. A síntese
não é avaliação clínica, diagnóstico ou interpretação por modelo de IA.

## Prévia e download consistentes

`GET /api/relatorio-pessoal` informa opções e limites do titular.
`POST /api/relatorio-pessoal` recebe a seleção estrita:

- `inicio` e `fim`: datas civis ISO, intervalo inclusivo de até 90 dias;
- `metricas`: nomes únicos do contrato em `src/lib/metricas/registro-do-dia.ts`;
- `reflexoes`, `acontecimentos`, `notas`: escolhas booleanas explícitas.
- `acompanhamentos`: lista opcional de IDs únicos de acompanhamentos do
  próprio titular (padrão vazio); ID de outra conta responde 404.
  Cada resposta mantém o rótulo e a escala em que foi dada; períodos sem
  resposta não aparecem e não são zero. Exige `wellbeing_assessments`.

A prévia contém apenas valores e relatos escolhidos, dias, unidades, resumo,
fuso, horário de extração e um digest SHA-256 do conteúdo selecionado. Não há
armazenamento de um relatório pessoal no servidor. Alterar uma seleção na
interface remove a prévia anterior e o botão de download.

`POST /api/relatorio-pessoal/pdf` recebe somente `selecao` e `revisao`.
O servidor valida novamente sessão, datas, plano e categorias, consulta as
fontes persistidas em uma transação e recalcula o digest. Se o conteúdo mudou,
responde 409 e exige outra prévia. A ordem das métricas e o horário de extração
não alteram o digest; mudanças em notas não selecionadas também não alteram o
conteúdo. Uma categoria revogada retorna 403 antes de gerar o arquivo.

O PDF é produzido no servidor por PDFKit, entregue como anexo privado sem
cache e baixado pelo navegador por URL de blob temporária. O arquivo não é
publicado, enviado a terceiros ou disponibilizado por URL pública. Depois do
download, o titular decide onde guardá-lo e com quem compartilhar. A exclusão
posterior da conta não apaga cópias já baixadas em seus dispositivos.

## Fonte e paginação

O documento A4 incorpora Source Sans 3 regular e semibold oficiais, com
licença OFL e hashes em `src/assets/fonts/source-sans-3/ORIGEM.md`. Fontes do
PDF são incluídas explicitamente no rastreamento do Next.js para a rota de
download. PDFKit e Fontkit rodam no servidor, sem entrar no pacote do navegador.

Cabeçalhos, rodapés e numeração são gerados nas páginas reais. Notas continuam
em páginas seguintes, sem corte por reticências. O PDF tem idioma pt-BR,
estrutura textual marcada e fontes incorporadas; isso não é declaração de
certificação PDF/UA. Para caracteres sem glifo na fonte, o texto visível usa
`[U+...]` e o texto acessível preserva o original. Essa regra é informada antes
do download, evitando quadrados ou exclusão silenciosa de caracteres.

## Plano, privacidade e falhas

Página e APIs exigem `metrics_history_days`. Campos numéricos e acontecimentos
exigem `daily_checkin`; reflexões exigem `evening_reflection`. As opções da
interface vêm das permissões reais. A redução da janela de histórico é
aplicada também a uma seleção que já teve prévia: o servidor não mantém cópia
que contorne a política atual.

O titular vem exclusivamente da sessão. Não há parâmetro para escolher outra
conta. Consultas usam a lista permitida de colunas; nomes arbitrários são
recusados. Leituras e downloads usam `private, no-store`. A operação não grava
métricas ou relatos e não cria tabelas de dados pessoais adicionais. Permanece
válida a exportação LGPD em JSON, que tem finalidade diferente deste resumo.

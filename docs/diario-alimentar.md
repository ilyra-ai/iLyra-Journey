# Diário alimentar (tarefa 133)

A página `/alimentacao` (menu **Diário alimentar**) permite registrar
refeições, lanches e bebidas por texto ou foto, com horário local e percepção
pessoal, e consultar, editar e excluir cada registro por dia. É um diário
pessoal: não é plano alimentar, total diário de proteína nem cálculo de
nutrientes.

## O que cada registro guarda

- data (até hoje, dentro do histórico do plano) e horário `HH:MM` no fuso do
  perfil;
- tipo: café da manhã, almoço, jantar, lanche, bebida ou outro;
- descrição de até 500 caracteres, opcional quando há foto;
- foto opcional (PNG, JPEG ou WebP estáticos de até 3 MiB);
- quantidade como **estimativa do próprio titular** (pequena, média ou
  grande), sempre identificada como tal;
- como se sentiu depois (1 a 5) e nota, ambas opcionais.

Até 30 registros por dia. Cada registro precisa de descrição ou foto.

## Foto e reconhecimento

A foto passa pela mesma validação e normalização dos anexos privados do chat
(tarefa 127): somente imagens estáticas, convertidas em PNG sem metadados
(como localização e aparelho). Ela fica em `meal_photos`, ligada ao registro,
e é servida apenas ao titular por `GET /api/alimentacao/[id]/foto`, privada e
sem cache, sem URL pública. Trocar ou remover a foto exige a versão atual; a
única foto de um registro sem descrição não pode ser removida.

O app **não interpreta fotos por IA** neste diário: não há modelo autorizado
nesta instância para essa leitura, e nenhuma descrição, alimento ou nutriente
é inventado. A interface informa que a foto não identifica alimentos nem é
pesagem. Se uma interpretação por modelo compatível for acrescentada no
futuro, ela deverá mostrar o que foi reconhecido para confirmação.

## APIs

Todas exigem sessão, `daily_checkin` e `metrics_history_days`.

- `GET /api/alimentacao?data=AAAA-MM-DD`: registros do dia (padrão hoje) e
  contagem por dia nos últimos 31 dias disponíveis.
- `POST /api/alimentacao`: `multipart/form-data` com `dados` (JSON com `id`
  UUID idempotente, `data`, `hora`, `tipo`, `descricao`, `porcao`,
  `percepcao`, `nota`) e `foto` opcional. 201 na criação, 200 na repetição
  idêntica, 409 se o pedido mudou ou o dia atingiu o limite.
- `PATCH /api/alimentacao/[id]`: campos e `versao`.
- `DELETE /api/alimentacao/[id]`: `versao`.
- `GET`, `PUT` (multipart com `dados.versao` e `foto`) e `DELETE` em
  `/api/alimentacao/[id]/foto`.

Datas futuras e horário inválido respondem 400; fora do histórico, 403;
arquivo não aceito, 415; acima de 3 MiB, 413; registro de outra conta, 404.

## Integrações e privacidade

Os registros aparecem na [linha do tempo](./linha-do-tempo.md) com horário,
tipo, descrição (até 140 caracteres) e indicação de foto e nota, sem o texto
da nota. O [relatório pessoal](./relatorio-pessoal.md) inclui o diário só por
seleção explícita, sem fotos, e as notas apenas com a opção de notas.

A migração 060 cria `meal_entries` e `meal_photos`. A exportação LGPD inclui
os registros e as fotos em base64; excluir um registro remove sua foto; a
exclusão da conta remove tudo. Nada é enviado a serviços externos.

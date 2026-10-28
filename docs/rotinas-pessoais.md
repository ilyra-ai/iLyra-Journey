# Minhas rotinas

Em `/rotinas`, cada pessoa cria suas próprias sequências, com até 20 passos,
nome, dias sugeridos e duração prevista opcional. Pode editar, reordenar com
os botões Subir e Descer, remover passos e excluir rotinas. O limite é de 30
rotinas por conta. **Minha manhã** e **Preparar para dormir** são sugestões
opcionais que abrem o editor: só são persistidas ao salvar. Hábitos ativos da
própria conta também podem ser aproveitados como passos.

Os dias organizam a frequência desejada. Não há disparo automático nem cobrança
por deixar de começar no dia sugerido. **Iniciar rotina** abre uma execução
real persistida; cada passo pode ser concluído ou pulado, respeitando a ordem.
É possível pausar, recarregar, sair, fazer novo login e retomar. A execução
guarda os passos com que começou. Editar o modelo afeta as próximas execuções,
preservando a que já está em curso.

## Progresso e práticas

O progresso distingue passos concluídos, pulados e pendentes. A barra representa
passos tratados, incluindo os pulados; a contagem textual explicita cada estado.
A execução termina quando não há pendências, com indicação dos passos pulados.
Uma execução encerrada não pode ser alterada; outra pode ser iniciada.

A duração é uma previsão, sem cronômetro nem registro automático de minutos.
Concluir um passo é uma declaração da pessoa sobre sua sequência; não comprova
que uma prática foi executada. Não cria sessão de respiração, métrica, ponto,
progresso de meta ou novo hábito. O botão da prática abre o destino existente:
check-in, respiração, perfil com hábitos, plano diário ou metas. Os registros
reais continuam nessas práticas, com suas próprias regras, evitando dupla
contagem. Um passo pode ser livre e não ter prática associada.

## Permissões, dados e concorrência

As rotinas reutilizam o direito `personal_habits`. A página, a navegação e as
APIs respeitam a matriz vigente. Cada prática associada também precisa estar
liberada para ser escolhida ao salvar ou iniciar. Hábitos precisam estar ativos
e pertencer à conta. A retirada do direito de uma prática oculta o link;
concluir ou pular o passo continua sendo apenas o registro pessoal da sequência.
A retirada de `personal_habits` recusa leituras e mutações, sem apagar os dados.

A migração 049 acrescenta `personal_routines` e `personal_routine_runs`.
Definições e execuções pertencem à sessão. O servidor valida campos, limites,
UUIDs, dias únicos, passos únicos e referências, sem aceitar um titular no corpo.
Leituras são privadas sem cache. O estado, a versão e o término são escolhidos
pelo servidor, sem aceitar progresso arbitrário do cliente.

As transações bloqueiam a conta e utilizam a mesma conexão nas validações do
plano. O limite de rotinas e o início de execuções são serializados por titular.
Existe no máximo uma execução ativa por rotina; chamadas simultâneas de início
retornam a mesma execução. Repetir seu identificador retorna a execução original,
inclusive se já encerrada. Versões impedem duas transições concorrentes e
sobrescrita de uma edição antiga. Um conflito pede atualização e nova avaliação
do estado. A sequência numérica do banco identifica a execução mais recente,
sem depender da ordenação aleatória de UUIDs no mesmo milissegundo.

As duas tabelas integram a exportação LGPD. Excluir uma rotina elimina suas
execuções em cascata e preserva hábitos, metas e práticas. Excluir a conta remove
as duas tabelas em cascata. O recurso não envia conteúdo a modelos externos.

## APIs

| Método | Caminho                       | Operação                                                                          |
| ------ | ----------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/rotinas`                | Definições, última execução de cada rotina e hábitos ativos do titular            |
| POST   | `/api/rotinas`                | Criar `{ titulo, dias, passos }`                                                  |
| PUT    | `/api/rotinas/[id]`           | Editar os mesmos campos, exigindo `versao`                                        |
| DELETE | `/api/rotinas/[id]`           | Excluir, exigindo `{ versao }`                                                    |
| POST   | `/api/rotinas/[id]/iniciar`   | Iniciar com `{ idExecucao, versao }`                                              |
| POST   | `/api/rotinas/execucoes/[id]` | `{ acao, versao }` para pausar/retomar; acrescentar `passoId` para concluir/pular |

Cada passo tem `id`, `titulo`, `minutos` (inteiro de 1 a 180 ou `null`),
`atividade` e `habitoId` (`null` fora de passos de hábito). Sem sessão: `401`;
direito indisponível: `403`; objeto de outra conta ou inexistente: `404`;
versão desatualizada, sequência indevida ou limite atingido: `409`; contrato
inválido ou hábito não disponível: `400`.

## Referências consultadas

- [Next.js: Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), também conferido na documentação da versão instalada.
- [MySQL: leituras com bloqueio](https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-reads.html).
- [W3C: opções reordenáveis](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/), consultado para a alternativa de botões. O editor usa uma lista HTML com campos e botões nativos, sem atribuir papel de listbox a controles de formulário.

# Sessões de foco e pausa

A central `/foco`, acessível pela seção Pessoal, permite escolher de 1 a 180
minutos de foco ou iniciar voluntariamente uma pausa de 1 a 60 minutos após
encerrar um foco. Os valores iniciais do formulário são sugestões editáveis,
nunca sessões ou minutos registrados automaticamente.

O servidor confirma início, pausa, retomada e encerramento. Só existe uma sessão
aberta por conta. O UUID do início permite confirmar uma resposta perdida sem
iniciar outra sessão. Mudar o conteúdo do mesmo UUID é recusado. Mutações usam
versão e trava do titular. Um segundo encerramento confirma o primeiro sem
duplicar tempo. Histórico e totais separam foco de pausa; nenhuma dessas ações
insere ou atualiza métricas, meditação, metas ou sequências.

## O que o tempo representa

O acumulado usa diferenças entre instantes do servidor enquanto a sessão está
em curso e exclui intervalos explicitamente pausados. O tempo registrado é
limitado à duração escolhida. O navegador desenha o restante com relógio
monotônico, sem somar ticks de `setInterval`, e consulta novamente o servidor
ao voltar a ficar visível, receber foco ou pela ação “Atualizar sessões”.

Suspender o aparelho ou deixar uma aba em segundo plano pode impedir execução
contínua de JavaScript, som e atualização da tela. Ao voltar, o intervalo civil
é reconciliado. Isso não comprova atenção nem concentração durante a ausência.
Não há afirmação de foco contínuo, nem minutos extras após a duração escolhida.
O alvo alcançado não encerra a sessão automaticamente: o horário de encerramento
é o momento real da confirmação. Encerrar antes do alvo mantém o tempo menor,
sem converter uma sessão curta em sessão completa.

Recarga e troca de página preservam o estado no servidor; uma sessão pausada
não continua contando. A central depende de conexão para confirmar operações.
Falhas não confirmam início, pausa, percepção ou remoção; o botão de atualização
permite conferir o estado real antes de repetir uma ação incerta.

## Avisos e percepção

O som local começa desligado e requer gesto explícito. Quando a duração é
alcançada com a página aberta e visível, o servidor avalia uma única decisão
de aviso por sessão. Horário de silêncio dos lembretes e modo descanso/retorno
são respeitados. Um aviso dispensado não é recuperado mais tarde. Outra aba não
obtém uma segunda autorização para o mesmo aviso. Não há alarme garantido em
segundo plano, push ou notificação do sistema nesta implementação. Sair da
página ou trocar de conta fecha o contexto de áudio local.

A pausa após o foco é um convite opcional, que pode ser ocultado. Começa apenas
por ação explícita. A percepção de 1 a 5 e a nota de até 280 caracteres são
opcionais, registráveis e editáveis depois do encerramento, sem alterar minutos.
Remover uma sessão encerrada exige confirmação e recalcula os totais a partir
dos registros restantes. Histórico em páginas de 20, vinculado ao titular.

## Dados e operação

A migração 055 cria `focus_sessions`, com início, intervalo em curso, acumulado,
versão, decisão de aviso e encerramento, além da percepção opcional. A exportação
LGPD inclui os próprios registros; exclusão da conta os remove por cascade.
APIs exigem sessão válida e cadastro concluído e não usam cache público. Os
registros de outra conta não podem ser lidos, alterados, paginados ou excluídos.

Referências oficiais consultadas:

- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- [Web Audio: boas práticas e gesto de reprodução](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
- [Autoplay e suas limitações](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

# Histórico de alterações dos registros manuais

Em **Registrar meu dia → Histórico de alterações**, escolha o dia e consulte
campos, valores anteriores e novos, data e horário local da alteração. A leitura
é paginada, com 20 versões por página. Zero permanece zero; ausência aparece como
“Não informado”. O histórico começa com a ativação deste recurso, sem inventar
versões dos registros anteriores.

**Desfazer esta alteração** pede confirmação e restaura somente os campos daquela
alteração. Um campo antes ausente volta a ficar ausente. O formulário de hoje é
atualizado; rascunhos não salvos nele são substituídos. Metas, sequências e escores
são recalculados pelo mesmo fluxo dos registros existentes, conforme o plano.
Uma restauração é registrada como nova alteração, sem duplicar o dia.

Só a última revisão intacta é elegível. Qualquer gravação posterior, incluindo
sensor ou minutos de prática, impede desfazer a versão anterior. A API confere
isso novamente sob bloqueio transacional; uma tela desatualizada recebe conflito
sem sobrescrever o que foi gravado depois. Sensores e práticas não são
apresentados como edições manuais nem têm suas sessões recriadas pela restauração.

Consultar versões antigas não amplia a janela de edição do check-in: desfazer
continua limitado aos últimos sete dias e ao histórico permitido pelo plano.
As versões ficam consultáveis por até 90 dias desde a alteração, dentro do plano.
As vencidas são removidas ao gravar, consultar ou exportar o histórico. A conta
sem atividade pode manter versões vencidas até uma dessas operações ou sua
exclusão; elas não são devolvidas pela consulta nem restauráveis.

As versões pertencem ao titular, entram na exportação dos seus dados e são
eliminadas em cascata com o registro ou a conta. Não existe recuperação de
informações excluídas definitivamente. O conteúdo não é enviado a um provedor
externo para registrar ou desfazer alterações.

## Implementação

- Migration `057_versoes_dos_registros.sql`: revisão da linha e histórico ligado
  por chave estrangeira composta ao registro e ao titular.
- `persistirRegistroDoDia`: check-in, avaliação de humor e sincronização offline
  compartilham a escrita transacional. Repetir um recibo não cria nova versão.
- Escritas sem alteração não criam versões. Sensor e soma de práticas avançam
  a revisão para proteger contra restauração de estados anteriores.
- `GET /api/metricas/versoes?data=AAAA-MM-DD&antes=REVISAO`: sessão, recurso
  `daily_checkin` e histórico do plano verificados no servidor.
- `POST /api/metricas/versoes`: recebe `data` e `id` da versão; o titular vem
  exclusivamente da sessão. A data precisa corresponder à versão e à janela de
  edição. O servidor trava o registro, confere a revisão e os valores, restaura
  os campos e grava a nova versão na mesma transação.
- O histórico não está exposto na API genérica de dados. Respostas próprias usam
  `Cache-Control: private, no-store`.

Referências primárias consultadas:

- [Bloqueios de leitura no MySQL 9.7](https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-reads.html).
- [Confirmação acessível com Radix e shadcn](https://ui.shadcn.com/docs/components/radix/alert-dialog).
- Guias locais de Route Handlers e Client Components da versão instalada do Next.js.

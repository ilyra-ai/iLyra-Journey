# Tarefa 121 · Experiências pessoais acompanhadas

## Continuidade e implementação

Base conferida na `main`: `a513ec216b1fea65a0d92396aa84c35ecaeb4b33`,
após tarefa 120 e atualização do painel. Metas, hábitos, check-in e semana
foram reaproveitados por suas fontes e destinos existentes. A experiência
acrescenta proposta preservada, referência anterior, duração, relatos por dia,
pausas e encerramento explícito; não duplica progresso ou minutos de práticas.

Os períodos e o alinhamento do sono são definidos antes de iniciar. Registro
posterior ao início é identificado como retrospectivo, sem inventar relatos.
O fuso fica preservado. Pausas e encerramento têm horário real do servidor;
todo dia civil tocado por pausa é excluído das medianas, sem estender o prazo.
A leitura inclui datas ausentes e IDs das métricas, respeitando a janela atual
do plano. Sono do dia seguinte ainda futuro permanece ausente.

A revisão local descreve dados disponíveis, relatos e sobreposições, sem
chamada a modelo externo, imputação, atribuição causal ou orientação de
tratamento. Exige cinco dias válidos na referência e três na observação por
métrica; são critérios do produto. Notas continuam disponíveis para reconhecer
outros fatores, sem alegar ajuste estatístico. Contratos completos em
[Experiências pessoais](../experiencias-pessoais.md).

## Persistência, plano e privacidade

Migração 051 inédita: propostas, relatos e pausas, com propriedade, datas de
criação e cascata. Bloqueio por titular, versões e identidade do relato
protegem concorrência e exclusão/recriação em outra página. Criação com o
mesmo UUID e proposta é idempotente. Metas e hábitos associados são ativos e
do titular; permissão de meta é verificada na mesma transação, evitando
bloqueio com a conexão ocupada. Exportação e exclusão LGPD abrangem as três
tabelas. Excluir experiência preserva métricas e práticas.

Página, navegação e handlers exigem hábitos pessoais e histórico autorizado;
leituras usam cache privado sem armazenamento. Não há URL pública ou envio
automático de conteúdo. Copiar revisão e abrir chat dependem do usuário.

## Validação executada

665 testes unitários em 81 arquivos e 468 integrações em 52 arquivos passaram.
Os dez unitários novos cobrem medianas, amostra insuficiente, lacunas, pausas,
corte do histórico, zero válido, relatos desconhecidos e contratos estritos.
Os 15 casos de integração novos usam MySQL real para persistência, limite
concorrente, idempotência, versões, isolamento, vínculos, datas/fusos, pausas,
encerramento, alinhamento, amostra insuficiente, revogação, exportação e cascata.
Datas controladas nos testes são explícitas; não simulam acompanhamento clínico.

Formatação, lint sem avisos, tipos e compilação de produção aprovados. A
conferência React manteve dados derivados fora de efeitos e reutilizou os
primitivos e hooks existentes. Não foram adicionadas dependências. O recurso
`@current_problems` não é oferecido neste executor.

O roteiro final do navegador aprovou dez verificações funcionais, sem exceções
JavaScript, e 16 execuções axe sem violações nas regras WCAG executadas.
Foram conferidos 320/390/640/1280/1440 px e zoom 200%, formulários, confirmações,
edição e exclusão de relatos encerrados, recarga e link direto, tabela com
rolagem real pelo teclado, três planos e isolamento, métricas de origem
preservadas e recuperação após falha real de leitura no banco isolado.
Capturas de criação e revisão móvel foram inspecionadas.

A primeira checagem de contraste ocorreu durante a animação de abertura do
diálogo. O roteiro passou a aguardar as animações reais terminarem antes de
medir. O contraste do estado final foi aprovado sem mudança de tokens ou
ocultação de controles. O resultado estruturado acompanha este relatório.

Ambiente: Node 24.22.1, pnpm 11.28.4, MySQL Community 9.7.2 oficial e Chrome
Headless Shell 151.0.7922.34 com Playwright. Docker não está disponível; esta
execução não comprova Docker, Windows ou WSL. Fixtures locais são removidas
pelo roteiro, sem dados reais de pacientes. Logs e capturas temporários não
são prometidos em outra instância.

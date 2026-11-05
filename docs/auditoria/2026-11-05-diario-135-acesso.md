# Diário 135 · Acesso sem briefing

O QA de captura real identificou que `MeuDia` retornava somente o aviso do
coach quando o perfil não tinha cidade. O diário ficava inacessível, embora
suas APIs não exijam cidade para guardar relatos.

A composição agora mantém as abas Meu Dia e Diário nesse estado. Reutiliza
`AbasDoDia`, `DiarioPessoal` e a permissão `evening_reflection`. O aviso de
dados faltantes permanece na primeira aba; nenhum briefing ou mapa é fabricado.
A reflexão dependente do briefing permanece exclusiva do estado pronto.

Em 2026-11-05, o Chrome real abriu `/dia?aba=diario` na conta administradora
sem cidade e exibiu calendário, campo do relato, Contar por voz e Guardar no
diário. A aba Diário estava selecionada. A captura pelo microfone continua
dependendo da fala do usuário: o controle remoto do Chrome excedeu os prazos
de clique e captura de tela; a árvore de acessibilidade confirmou somente o
formulário, sem fala transcrita. Não se usou áudio artificial ou API simulada.

Validação integral aprovada: fix:format, fix:lint, check:lint, check:format,
check:types, 997 unitários em 94 arquivos, 601 integrações MySQL em 67 arquivos
e build com 135 páginas. A tarefa permanece com validação de voz pendente.

Referências consultadas para preservar o padrão existente:
[abas do WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/),
[Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs) e
[shadcn Tabs](https://ui.shadcn.com/docs/components/radix/tabs).

## Microfone e início direto

O diagnóstico real do Chrome retornou `contextoSeguro: true`, API de captura
disponível e permissão `denied` em `http://localhost:3000`. A investigação do
servidor identificou `Permissions-Policy: microphone=()`, que bloqueava toda
captura. A política foi corrigida para `microphone=(self)`, confirmada na
resposta HTTP real; câmera e demais capacidades continuam com suas regras.

Por pedido expresso do usuário, Contar por voz agora inicia o reconhecimento
local quando disponível e, caso contrário, o serviço do navegador no mesmo
clique. A confirmação adicional e o aviso intermediário foram retirados.
`rg` confirmou a ausência dos estados e textos da confirmação no código do
diário. A permissão nativa do navegador continua necessária; o áudio continua
fora do servidor da Lyra e a interface informa o motor durante a captura.
O relato só recebe modo voz após transcrição final não vazia, sem marcar uma
tentativa negada ou silenciosa como fala real.

Após integrar os novos commits da tarefa 141: lint, tipos e 1001 testes
unitários em 95 arquivos aprovados; 601 integrações MySQL aprovadas. O build
compilou as 136 páginas. Os avisos de rastreamento do runtime nativo pertencem
à tarefa 141 e são tratados separadamente. A fala e o salvamento pelo usuário
ainda precisam ser comprovados; esta entrega não os simula.

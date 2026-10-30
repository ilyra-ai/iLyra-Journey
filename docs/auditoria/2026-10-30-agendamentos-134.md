# Tarefa 134 · Agendamentos exclusivo do administrador por padrão

## Conferência prévia

`main` em `6b04e2d`. A agenda (`/appointments`) dependia só dos direitos do
plano (`appointments_active` e `professionals_total`), resolvidos em
`src/lib/plans/service.ts` e usados pelo menu lateral, pela gaveta do
celular, pela busca Ctrl K, pelo sino de notificações, pelo bloqueio de rota
do `AppShell` (`PlanFeatureGate`) e pelas APIs de dados. Não existia
configuração global da plataforma. As janelas pessoais do calendário
(`/api/calendario`) são independentes da agenda e foram preservadas.

## Entrega

- Migração 061: `platform_feature_switches` (chave, estado, versão,
  responsável, data) com `agendamentos_usuarios` desativado por padrão, e
  `platform_feature_switch_events` (estado anterior e novo, responsável,
  data), ambos com `ON DELETE SET NULL` no responsável.
- `src/lib/plataforma/interruptores.ts`: leitura, alteração só por
  administrador, controle de versão (409 em versão antiga), sem evento quando
  o estado não muda e trilha de auditoria sem dados de consultas.
- Aplicação central no cálculo de direitos: com o interruptor desligado, os
  dois recursos ficam `enabled: false` e `globalmenteDesativado: true` para
  quem não é administrador. Assim menu, gaveta do celular, busca, sino,
  bloqueio de rota, `requireFeatureEnabled`, `contaTemRecurso` e cotas reagem
  juntos, e as APIs respondem 403 com a mensagem "Agendamentos estão
  desativados pelo administrador do app.". O interruptor só restringe: ligado,
  o plano continua valendo.
- `GET/PUT /api/admin/agendamentos` (401 sem sessão, 403 para usuários, 400
  para corpo inválido ou campos extras).
- Cartão "Agendamentos para usuários" em Admin → Planos, com chave
  acessível, confirmação, estado, última alteração e as 20 alterações mais
  recentes.
- Acesso direto pela URL: o `PlanFeatureGate` mostra "Recurso desativado
  pelo administrador", sem oferta de troca de plano.
- Exportação LGPD inclui os eventos em que o titular foi o responsável.
- Documentação em `docs/agendamentos-para-usuarios.md`, `docs/api.md` e
  `docs/lgpd.md`.

## Problemas encontrados e corrigidos na QA

1. **Aviso errado no acesso direto.** O bloqueio de rota do `AppShell` é
   renderizado antes da página e mostrava "Recurso indisponível no seu
   plano" com oferta de compra. Corrigido no próprio `PlanFeatureGate`, que é
   o ponto único usado por todas as rotas. O aviso que havia sido colocado na
   página nunca era alcançado e foi retirado para não manter código morto.
2. **Texto do diálogo trocava durante o fechamento.** Ao confirmar
   "Ativar", o título passava a "Desativar…" durante a animação de saída,
   porque o texto dependia do mesmo estado que fecha o diálogo. A ação pedida
   agora fica guardada separada de "aberto".
3. **Rótulo do histórico enganoso.** A consulta traz no máximo 20 eventos,
   mas o rótulo dizia "Histórico de alterações (N)" como se fosse o total.
   Agora diz "Últimas alterações (N)".
4. **Concordância no aviso.** "Consultas ativas está desativado" passou a
   "O recurso “Consultas ativas” está desativado…".

## Gates

- fix:format, check:lint, check:format e check:types aprovados.
- 970 testes unitários e 586 integrações com MySQL real (2 novas em
  `src/app/api/agendamentos-globais.integration.test.ts`: padrão desativado,
  403 nas APIs mesmo com o plano liberando, admin com acesso, dados
  preservados, autorização, validação, versão 409, trilha, efeito imediato,
  plano continua valendo quando ativado, reativação devolve os dados e
  repetição sem evento). Testes de planos ganharam a pré-condição explícita
  do interruptor ligado, porque o novo padrão do produto é desligado.
- Build de produção sem avisos.

## Produção e acessibilidade

`pnpm build` + `pnpm start`, MySQL 9.7.2, conta Free e conta administradora
temporárias. 18 verificações aprovadas e 4 execuções axe (WCAG 2.0/2.1/2.2 A/AA)
sem violações:

- usuário sem item no menu lateral, sem resultado na busca Ctrl K, sem
  chamada da agenda pelo sino, aviso correto pela URL direta e API 403;
- administrador com menu, ativação com confirmação refletida no banco,
  usuário liberado após recarga e API 200;
- desativação pelo teclado (Espaço), trilha conferida com o total real do
  banco, usuário bloqueado de novo;
- celular a 390 px: gaveta do usuário sem a agenda e do administrador com
  ela; aviso e controle sem rolagem horizontal.

O único registro de console é o 403 provocado de propósito pela chamada
manual à API. Detalhes em `2026-10-30-agendamentos-134.json`.

## Ambiente e limites

O serviço opcional de memória (`memoria`, Graphiti) não foi construído neste
sandbox: o proxy de saída intercepta TLS e a CA dele não existe dentro do
build Docker, então o `pip` recusa o certificado. É uma limitação do
ambiente, não do projeto, e não afeta esta tarefa. Leitores de tela e
aparelhos físicos não foram certificados. Contas de QA removidas e
interruptor deixado no padrão desativado.

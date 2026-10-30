# Agendamentos para usuários (tarefa 134)

O recurso **Agendamentos** (consultas e profissionais, página
`/appointments`) começa **desativado para usuários**: somente o administrador
vê e usa a agenda. O administrador pode ativá-lo ou desativá-lo para todos em
**Admin → Planos e assinaturas → Agendamentos para usuários**.

## Regras

- A configuração é global e persistida em `platform_feature_switches`
  (`agendamentos_usuarios`, migração 061), com padrão desativado.
- Ela **só restringe**: ativada, cada usuário continua sujeito aos direitos
  do próprio plano (`appointments_active`, `professionals_total` e cotas). A
  configuração não concede papel administrativo nem amplia recursos.
- Administradores mantêm acesso para gerir o recurso.
- O efeito vale no cálculo de direitos do servidor: o resumo da assinatura
  marca os dois recursos como `enabled: false` e `globalmenteDesativado:
true`, e `requireFeatureEnabled`, `contaTemRecurso` e as cotas recusam com
  403 e a mensagem "Agendamentos estão desativados pelo administrador do app.".
- Por isso desaparecem juntos o item do menu lateral e do celular, a busca
  Ctrl K, atalhos e botões que levam à agenda, e as notificações de consultas
  do sino deixam de consultar a API (não há chamadas que retornariam 403). O
  acesso direto pela URL mostra, pelo bloqueio de rota do `AppShell`
  (`PlanFeatureGate`), o aviso "Recurso desativado pelo administrador", sem
  oferta de troca de plano; chamadas manuais às APIs são recusadas.
- Desativar não apaga nem cancela consultas ou profissionais. Reativar
  devolve o acesso aos dados de cada titular. Sessões já abertas sentem o
  efeito na próxima chamada; o menu atualiza ao recarregar ou entrar de novo.
- As janelas pessoais do calendário (`/api/calendario`) não dependem da
  agenda e continuam disponíveis conforme o plano.

## Controle administrativo

`GET/PUT /api/admin/agendamentos` exigem sessão de administrador (401 sem
sessão, 403 para usuários). O `PUT` recebe `{ ativo, versao }`; versão antiga
responde 409 e repetir o estado atual não cria evento. Cada alteração grava
em `platform_feature_switch_events` o administrador responsável, a data e os
estados anterior e novo, sem dados pessoais de consultas. A interface pede
confirmação antes de mudar (o texto do diálogo fica fixo na ação pedida
até fechar) e mostra a última alteração e as 20 alterações mais recentes
("Últimas alterações").

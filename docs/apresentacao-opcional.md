# Apresentação opcional do aplicativo

A ajuda fica no shell das páginas autenticadas, disponível novamente após
fechar, dispensar ou concluir. O cadastro inicial de três etapas não foi
alterado, repetido nem acrescido de novos objetivos ou perguntas obrigatórias.
A primeira leitura não cria progresso: a pessoa escolhe começar ou “Agora não”.
Nenhum modal abre automaticamente.

Os passos disponíveis são calculados no servidor com os direitos atuais:
registro do dia (`daily_checkin`), entendimento de indicadores (`ai_scores` e
`dashboard_access`), conversa (`ai_chat_messages`) e perfil, sempre disponível.
O guia não fabrica resultados ou mensagens. Mostra linguagem sobre os controles
reais, ausência de dados e limitações; não solicita novas informações de saúde.

“Abrir registro do dia” usa o mesmo `RegistroDoDiaDialog` das páginas existentes.
Somente o que a pessoa realmente preencher e salvar é enviado ao registro.
Painel, conversa e perfil levam às respectivas páginas reais. Avançar no guia
não marca métricas, práticas, mensagens ou metas como realizadas.

Início, avanço/volta, dispensa, conclusão e retomada são persistidos por titular
em `app_intro_progress` (migração 054), com etapa e versão. Fechar a janela
preserva a etapa já salva. Rever uma apresentação dispensada ou concluída
reinicia explicitamente na primeira etapa disponível. Mudança de plano remove
etapas indisponíveis, sem apagar o histórico do cadastro. A abertura consulta
novamente o servidor; mudanças de direitos também atualizam o guia por evento
público do app e foco da janela.

As APIs exigem sessão real e cadastro concluído e respondem sem cache. A escrita
usa versão otimista e trava do titular para impedir perda de progresso entre
abas. Etapa revogada é recusada no servidor; os controles reais continuam com
suas próprias autorizações. Falha de rede não confirma salvamento. O progresso
integra a exportação LGPD e é removido em cascade com a conta. Nenhum valor de
saúde é incluído nessa tabela.

A janela usa o diálogo modal do projeto, nome e descrição acessíveis, foco no
título a cada passo, Tab contido, Escape e retorno ao botão de origem. Abertura
do registro troca o diálogo pela interface real e retorna à ajuda ao terminar.
Não há spotlight dependente de coordenadas nem botão que exija um elemento
inexistente na tela.

Referência primária consultada:
[WAI-ARIA APG: diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

# Abas administrativas do dashboard

## Fiscal · tarefa 101 · 26/10/2026

`/admin/dashboard?aba=fiscal` reutiliza integralmente `AdminFiscalRecordsContent` e `/api/admin/fiscal-records`. Mantidos leitura imutável, filtros por data de quitação UTC, totais por moeda, paginação de 20 e exportação CSV em lotes de 100. Não existe criação, alteração ou exclusão fiscal nesta interface; os registros continuam originados pelo webhook de cobrança.

A antiga `/admin/fiscal` usa `redirect` do Next.js para a aba. Durante renderização com streaming o framework pode responder 200 e entregar o redirecionamento na página; fora dela, responde 307. O navegador real confirmou a URL final e o conteúdo. A autorização administrativa global e a API continuam protegidas.

A entrada antiga foi removida de `navigationItems`, fonte dos padrões, menus desktop/mobile e busca. O filtro compartilhado `rotaForaDaNavegacao` elimina configurações antigas na leitura e na construção da navegação, preservando a personalização dos demais itens. Nenhuma configuração é regravada pela consulta e nenhuma migration ou registro fiscal foi modificado. Atalhos da Visão geral e de Faturamento abrem a aba canônica.

Validação: 577 unitários, 378 integrações com MySQL, formatação, lint, tipos e build aprovados. Quatro novas regressões de navegação/schema cobrem entradas históricas e preservação da personalização. As integrações fiscais existentes continuam comprovando sessão, papel administrativo, imutabilidade, filtros e exportação do titular.

QA no build de produção com banco temporário migrado do zero, sem tocar registros de desenvolvimento: 25 documentos sintéticos identificados como contratos de QA, paginação 20+5, filtro de seis faturas e CSV correspondente, troca de abas preservando filtro, recarga e URL antiga. Configuração histórica persistida diretamente foi filtrada sem regravação e manteve nome personalizado; menus desktop/mobile e busca conferidos. Falha real de transporte no navegador exibiu erro e a aplicação do filtro após restaurar a rede recuperou a consulta. Desktop 1440 e mobile 390/320 sem overflow, axe sem violações, sem exceções JavaScript; capturas desktop/mobile inspecionadas. Banco temporário removido. Fixtures de leitura não representam compras externas reais.

Evidências locais: `/tmp/lyra101-{unit,integration,types,lint,format,build,qa}.log`, `/tmp/lyra101-fiscal-{1440,390,320}.png`. Busca `rg` deixa a rota anterior apenas na compatibilidade, testes, histórico e documentação; não há item operacional para ela. `@current_problems` indisponível nas ferramentas desta instância.

## Pagamentos · tarefa 102 · 26/10/2026

A aba `/admin/dashboard?aba=pagamentos` reutiliza `MeiosDePagamento` com os três provedores, dois ambientes, preços Stripe, credenciais cifradas, remoção confirmada e testes existentes. A URL `/admin/payments` redireciona para a aba; menus/defaults/busca e configurações antigas usam o mesmo tratamento da transferência Fiscal. Atalhos de Faturamento e Visão geral atualizados. Os formulários visitados mantêm rascunho ao alternar as abas principais.

A orientação do webhook passou de cinco para 16 eventos tipados pela SDK oficial: os eventos anteriores e os eventos de criação/atualização/finalização/exclusão/cancelamento/inadimplência/envio/falha de pagamento das faturas, mais refund criado/atualizado/falho. São os eventos utilizados pelo serviço financeiro existente. A mudança não configura uma conta Stripe externamente nem altera suas credenciais.

Validação: 581 unitários, 378 integrações MySQL, formato, lint, tipos e build aprovados. Quatro regressões adicionais de navegação/schema cobrem configurações históricas. Integrações existentes continuam cobrindo criptografia, prioridade das chaves do painel na cobrança, isolamento por ambiente, preços e erros de conexão por contratos HTTP controlados; não comprovam autenticação real em serviço externo.

QA de produção em banco temporário: URL anterior, recarga, provedores e ambientes, salvamento de um dado de webhook gerado exclusivamente para o teste, confirmação direta da cifra no MySQL e ausência do valor na resposta pública administrativa, formato inválido, recarga, preservação do rascunho entre abas, desativação e remoção em duas etapas. Ativação de produção sem chaves recusada 409; falha real de transporte e retentativa aprovadas. Menu móvel, desktop, busca e configuração histórica sem a entrada antiga. Visitante 401 e paciente 403 na leitura/escrita de credenciais. 1440/390/320 sem overflow, axe 29 regras sem violações e nenhuma exceção JavaScript; capturas inspecionadas. Banco temporário removido, desenvolvimento sem alterações financeiras/configuração de QA.

Evidências: `/tmp/lyra102-{unit,integration,types,lint,format,build,qa}.log`, `/tmp/lyra102-pagamentos-{1440,390,320}.png`. Nenhuma cobrança ou conexão externa foi simulada. O teste oficial com credenciais reais permanece na fronteira externa da tarefa 100; a transferência desta interface não amplia as capacidades de checkout de Mercado Pago/PayPal. `@current_problems` indisponível.

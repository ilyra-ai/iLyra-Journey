# Abas administrativas do dashboard

## Fiscal · tarefa 101 · 26/10/2026

`/admin/dashboard?aba=fiscal` reutiliza integralmente `AdminFiscalRecordsContent` e `/api/admin/fiscal-records`. Mantidos leitura imutável, filtros por data de quitação UTC, totais por moeda, paginação de 20 e exportação CSV em lotes de 100. Não existe criação, alteração ou exclusão fiscal nesta interface; os registros continuam originados pelo webhook de cobrança.

A antiga `/admin/fiscal` usa `redirect` do Next.js para a aba. Durante renderização com streaming o framework pode responder 200 e entregar o redirecionamento na página; fora dela, responde 307. O navegador real confirmou a URL final e o conteúdo. A autorização administrativa global e a API continuam protegidas.

A entrada antiga foi removida de `navigationItems`, fonte dos padrões, menus desktop/mobile e busca. O filtro compartilhado `rotaForaDaNavegacao` elimina configurações antigas na leitura e na construção da navegação, preservando a personalização dos demais itens. Nenhuma configuração é regravada pela consulta e nenhuma migration ou registro fiscal foi modificado. Atalhos da Visão geral e de Faturamento abrem a aba canônica.

Validação: 577 unitários, 378 integrações com MySQL, formatação, lint, tipos e build aprovados. Quatro novas regressões de navegação/schema cobrem entradas históricas e preservação da personalização. As integrações fiscais existentes continuam comprovando sessão, papel administrativo, imutabilidade, filtros e exportação do titular.

QA no build de produção com banco temporário migrado do zero, sem tocar registros de desenvolvimento: 25 documentos sintéticos identificados como contratos de QA, paginação 20+5, filtro de seis faturas e CSV correspondente, troca de abas preservando filtro, recarga e URL antiga. Configuração histórica persistida diretamente foi filtrada sem regravação e manteve nome personalizado; menus desktop/mobile e busca conferidos. Falha real de transporte no navegador exibiu erro e a aplicação do filtro após restaurar a rede recuperou a consulta. Desktop 1440 e mobile 390/320 sem overflow, axe sem violações, sem exceções JavaScript; capturas desktop/mobile inspecionadas. Banco temporário removido. Fixtures de leitura não representam compras externas reais.

Evidências locais: `/tmp/lyra101-{unit,integration,types,lint,format,build,qa}.log`, `/tmp/lyra101-fiscal-{1440,390,320}.png`. Busca `rg` deixa a rota anterior apenas na compatibilidade, testes, histórico e documentação; não há item operacional para ela. `@current_problems` indisponível nas ferramentas desta instância.

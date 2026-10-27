# Correção dos avisos de dependências · tarefa 112

A conferência da instalação congelada confirmou os 15 avisos registrados:
2 críticos, 4 altos, 6 moderados e 3 baixos. A auditoria final passou a zero
avisos conhecidos, sem ignorar advisories ou desativar controles de instalação.
Isso não equivale a afirmar ausência de toda vulnerabilidade no aplicativo.

## Alterações e compatibilidade

| Pacote                       | Antes   | Resolução final             | Tratamento                                                                                                                                                |
| ---------------------------- | ------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js e eslint-config-next | 16.3.8  | 16.4.3                      | Atualização estável alinhada do framework e da configuração de lint.                                                                                      |
| Zod                          | 4.6.5   | 4.6.7                       | Piso direto e override das cópias transitivas da linha 4, inclusive ESLint.                                                                               |
| Vite                         | 8.3.2   | 8.3.5                       | Override restrito ao intervalo vulnerável, com piso corrigido 8.3.3.                                                                                      |
| fast-uri                     | 3.1.8   | 3.1.9                       | Ampliação do override restrito para cobrir os novos avisos.                                                                                               |
| Happy DOM                    | 20.14.5 | Ausente da instalação final | Peer opcional sem importações ou ambientes de teste no código do app; a nova resolução não o instala. Override exige 21.0.4 ou superior quando aplicável. |

Node 24 LTS, pnpm 11.28.4, React 19.3, Vitest 5.0.3 e a política de CI
permanecem como definidos no projeto. Releases e engines foram conferidos no
registro oficial npm; Next.js 16.4.3 foi publicado em 23/10/2026 e mantém o
requisito Node >=20.9. A documentação do Next foi consultada na versão instalada.
O gerenciador não identificou conflitos de peers. Nenhum pacote de produção
foi substituído por implementação fictícia ou dependência experimental.

## Avisos cobertos

- Next.js: [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
  [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) e
  [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr).
- Zod: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- Happy DOM: [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79).
- Vite: [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv),
  [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw),
  [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm),
  [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw),
  [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) e
  [GHSA-vfpm-58rq-9qcg](https://github.com/advisories/GHSA-vfpm-58rq-9qcg).
- fast-uri: [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg),
  [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h),
  [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) e
  [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp).

## Evidências

Instalação congelada, auditoria e peers aprovados; lint, formato, tipos e build
de produção aprovados; 595 unitários e 389 integrações com MySQL 9.7.2 real.
As suites existentes foram mantidas. Logs desta instância em
`qa/logs/112-*.log` e relatórios de auditoria `112-audit-before.json` e
`112-audit-final.json`, fora dos arquivos publicados. A instalação final contém
922 dependências no grafo auditado, sem avisos aceitos como exceção.

Em produção, o navegador conferiu Free, Meta e Care em 1440/390/320 px,
acesso pelo indicador também por teclado, ciclos de preço, permissões e
retentativa após erro real de rede. Nove conferências axe-core sem violações,
sem estouro horizontal ou exceções JavaScript. O perfil Care percorreu as
12 rotas de usuário, com HTTP 200 e sem estouro horizontal; administrador e
visitante mantiveram as restrições esperadas. Banco e contas temporários foram
removidos. Nenhum pagamento externo ou pareamento de hardware foi executado;
as tarefas bloqueadas não integram esta correção.

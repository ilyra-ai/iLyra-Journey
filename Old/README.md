# Old · arquivos que o app não utiliza (tarefa 137)

Esta pasta guarda arquivos que não participam da execução do Lyra MetaCare:
instalação, build, launchers, banco, testes, documentação oficial e o próprio
app funcionam sem eles. Eles foram movidos com `git mv`, preservando o
histórico. Nada foi apagado.

| Arquivo                                           | Por que não é usado pelo app                                                                                                                                                 | Evidência                                                                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSTRUCAO_REIMPLEMENTACAO_UI_UX_LYRA_2026.md`    | Instrução antiga de redesenho, já executada                                                                                                                                  | Só era citado pelos outros documentos desta pasta                                                                                                                               |
| `MANUAL_COMPLETO_LYRA_CUSTOMAZE_UI_UX.md`         | Manual de referência do construtor visual, usado na implementação                                                                                                            | Só era citado pelos documentos desta pasta                                                                                                                                      |
| `TASK_IMPLEMENTACAO_REFERENCIA_ELEMENTOR_LYRA.md` | Tarefa antiga de referência do Elementor, já executada                                                                                                                       | Só era citado pelos documentos desta pasta                                                                                                                                      |
| `TASK_MESTRA_REDIGESIGN_LYRA_METACARE_2026.md`    | Tarefa mestra antiga de redesenho, já executada                                                                                                                              | Nenhuma referência no projeto                                                                                                                                                   |
| `implement_elementor_lyra.py`                     | Instalador portátil que copia o módulo `modules/lyra-customaze-ui-ux` para **outros** projetos. Aqui o módulo já está instalado e é importado por `src/lib/site-page-config` | Era chamado apenas pelo script `lyra-customaze:install`, que só faz sentido no projeto de destino e foi retirado do `package.json`; o README do módulo aponta para este caminho |
| `codemagic.yaml`                                  | Pipeline de CI do Codemagic. A CI está fora do escopo por decisão do usuário (2026-10-10)                                                                                    | Nenhuma referência no projeto                                                                                                                                                   |
| `scripts/verificar-identidade.mjs`                | Conferência HTTP avulsa usada em uma QA anterior                                                                                                                             | Nenhuma referência em `package.json`, launchers, testes ou documentação; o `knip` também o aponta como não usado                                                                |

## O que ficou na raiz e por quê

- **App e build:** `src/`, `public/`, `modules/` (importado por
  `src/lib/site-page-config`), `next.config.ts`, `tsconfig.json`,
  `postcss.config.mjs`, `components.json`, `sentry.*.config.ts`.
- **Dependências reproduzíveis:** `package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `.nvmrc`, `.node-version`.
- **Banco e serviços:** `mysql/`, `compose.yaml`, `services/` (memória
  Graphiti e treinamento), `data/geo` (base de cidades lida por
  `src/lib/geo/cidades.ts`).
- **Launchers:** `run.py`, `requirements-run.txt`, `run.sh`, `run_windows.py`
  e `tui-webnova.sh` (este último usado por `next.config.ts` e coberto por
  `tests/launchers`).
- **Scripts de operação:** os de `scripts/` são chamados pelo `package.json`,
  pelos launchers ou pela documentação operacional.
- **Qualidade:** `tests/`, `vitest.config.mts`, `eslint.config.mjs`,
  `.prettierrc.json`, `.prettierignore`.
- **Configuração:** `.env.example`, `.gitignore`, `.gitattributes`.
- **Regras, painel e documentação exigidos pela instrução mestra:**
  `CLAUDE.md`, `AGENTS.md`, `claude-gestao.md`, `README.md`, `LICENSE` e
  `docs/`.
- **Ferramentas de desenvolvimento:** `.agents/` e `skills-lock.json`,
  `.codex/`, `.claude/` e `.mcp.json` ficaram onde estão. Esses programas os
  procuram em locais fixos da raiz, e o `CLAUDE.md` manda inspecionar
  `.agents/` e `.codex/`. Movê-los desligaria essas ferramentas sem mudar
  nada no app.

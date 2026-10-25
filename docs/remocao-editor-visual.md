# Remoção do editor visual antigo

A tarefa 89 remove o Editor Puck: código do editor e renderizadores, biblioteca
exclusiva, rotas administrativas e públicas, estilos, entradas de navegação,
propriedades nas páginas, instruções próprias e dependências diretas
`@puckeditor/core` e `parse5`. O construtor Site Experience Builder em Conteúdo
é independente e permanece disponível com seus serviços e configurações.

## Dados e histórico preservados

Migrações já aplicadas não foram editadas nem apagadas. As tabelas históricas
`puck_documents` e seu histórico permanecem no banco, sem endpoints do antigo
editor e sem acesso pela API genérica de dados. Não houve DROP, exclusão de
registros ou transformação silenciosa de dados publicados.

Blocos publicados exclusivamente naquele editor deixam de ser executados. Os
textos e o visual existentes no app e no Site Experience Builder permanecem.
Não foi convertido conteúdo arbitrário do editor em novos layouts ou em HTML.
A remoção não redesenha as páginas. Para recuperar um documento antigo, use
backup e administração do banco; não existe mais uma interface do editor.

As instruções CLAUDE.md, o painel de gestão, as auditorias datadas e as migrações
mantêm referências históricas por rastreabilidade. Os relatórios antigos estão
identificados como históricos; não devem ser usados como instrução para
reinstalar o editor. O diretório de instruções Puck foi removido; seu conteúdo
anterior permanece recuperável no histórico Git.

Configurações antigas de navegação são filtradas antes de renderizar o menu,
incluindo a busca e o menu móvel, para não reintroduzir a rota removida. Os
registros persistidos de configuração não foram apagados.

## Validação necessária

Conferir instalação congelada, tipos, lint, formatação, testes e build; repetir
migrações em banco existente e confirmar preservação das tabelas antigas. No
runtime, conferir 404 das rotas removidas com sessão administrativa e ausência
de links no menu. Validar leitura, rascunho e publicação do construtor em
Conteúdo e páginas públicas e autenticadas em desktop/mobile. Relatar testes
removidos com a funcionalidade separadamente de falhas ou testes ignorados.

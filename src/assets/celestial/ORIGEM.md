# Arte celestial da landing

Criada em 2026-11-06 com a skill `imagegen`, a partir dos mockups aprovados pelo proprietário da Lyra MetaCare neste chat. As imagens são ilustrações editoriais, não leituras pessoais calculadas ou representações científicas das posições planetárias.

| Arquivo              | Uso                                                                             |
| -------------------- | ------------------------------------------------------------------------------- |
| `ceu-vedico.png`     | Arte principal, destaque e apresentação do Védico.                              |
| `lotus-samadhi.png`  | Apresentação do Lyra DM Samādhi e ilustração do plano Care.                     |
| `esfera-quantum.png` | Apresentação do Quantum, conversa com a Lyra e plano Meta.                      |
| `caminho-lunar.png`  | Destaque do ritmo pessoal e ilustração do plano Free.                           |
| `horizonte.png`      | Fundo decorativo da faixa final.                                                |
| `marca.png`          | Aplicação horizontal do logo aprovado, também versionada na raiz para o README. |
| `simbolo.png`        | Símbolo amarelo para o favicon, sem inscrição.                                  |

As imagens são importadas estaticamente e servidas pelo otimizador do Next com dimensões responsivas. Conteúdo, navegação, planos e botões são HTML/React reais, separados das ilustrações. O favicon é empacotado de forma reproduzível com `python scripts/gerar-icones-da-marca.py --favicon-celestial` (Pillow e NumPy em ambiente virtual), gerando ICO em 16/32/48/64 px e PNG em 192 px, sem modificar o logo dos componentes internos ou os ícones de instalação ainda não redesenhados.

## Tipografia e tokens

- Clicker Script Regular local para H1 e H2, fornecida pelo usuário e licenciada sob SIL OFL 1.1; fonte e licença em `../fonts/clicker-script/`. Origem oficial: https://github.com/google/fonts/tree/main/ofl/clickerscript.
- Imprima Regular para textos normais e Varela Regular para negrito/itálico, com fontes e licenças SIL OFL em `../fonts/imprima/` e `../fonts/varela/`. As duas variantes Varela fornecidas cobrem subconjuntos latino e latino estendido, ambas de peso 400; a ênfase é sintetizada pelo navegador. A regra de H1/H2 prevalece dentro dos títulos.
- Exceções aprovadas na validação visual: os três títulos dos destaques “Seus mapas”, “Converse com a Lyra” e “Seu tempo, seu ritmo” usam Imprima; o selo “Novas perspectivas.” usa Varela. Os demais H1/H2 continuam em Clicker Script.
- Fundo `#1D1E2B`, superfícies `#262734`, texto `#F7F1E6`, texto secundário `#D5D0CA`, amarelo `#F1DF94` e bordas `#8C8165`.
- CSS Modules isola o tema público dos tokens internos. Tipografia e dimensões continuam vinculadas à configuração publicada e à prévia do construtor.

## Referências técnicas consultadas

- [W3C — imagens decorativas](https://www.w3.org/WAI/tutorials/images/decorative/): ilustrações com alternativa vazia quando o texto adjacente já comunica o conteúdo.
- [W3C — reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow): reorganização do conteúdo em telas estreitas e ampliação.
- [web.dev — imagens responsivas](https://web.dev/learn/design/responsive-images): dimensões e tamanhos adaptados à tela.
- Documentação local do Next instalado: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`, `font.md`, `link.md` e `03-file-conventions/page.md`.

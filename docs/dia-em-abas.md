# `/dia` em abas (tarefa 136)

A página foi organizada em cinco abas. Nenhuma seção, dado, ação ou
permissão foi retirada:

| Aba                    | Seções                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Meu Dia** (primeira) | `titulo-meu-dia` (abertura, prontidão e relógio), `titulo-alertas`, `titulo-leitura`  |
| Orientações            | `titulo-focos`, `titulo-cuidados`, `titulo-coach` (abas por área) e respiração guiada |
| Horários e semana      | `titulo-periodos`, janelas de hoje (`#janelas`) e o cartão da semana                  |
| Céu e mapa             | `titulo-ceu` e "Para um coach ainda mais preciso"                                     |
| Diário                 | reflexão da noite (`#reflexao`); a tarefa 135 acrescenta o diário pessoal (`#diario`) |

- A aba ativa fica em `?aba=` e sobrevive à recarga. Links antigos com
  âncora (`/dia#reflexao`, `#janelas`, `#respiracao`) abrem a aba
  onde a seção mora e rolam até ela. Os botões do topo ("Reflexão da noite"
  e "Levar para o calendário") fazem o mesmo.
- Todas as abas ficam montadas e só as inativas são ocultadas, para não
  perder formulários em andamento nem recarregar dados ao alternar.
- Abas do Radix: setas, Home/End, foco visível, `aria-selected` e lista
  rolável no celular.
- "Atenção hoje" ficou compacto e tem botão acessível de fechar. Fechar só
  recolhe a apresentação naquele dia, neste aparelho (armazenamento local);
  "Mostrar" reabre e um conjunto novo de alertas reaparece sozinho. Nenhum
  dado é apagado.
- Planos sem a reflexão da noite veem, na aba Diário, o aviso do plano em vez
  de uma aba vazia; as demais seções seguem os mesmos recursos de antes.

O código está em `src/components/coach/AbasDoDia.tsx`,
`src/components/coach/AlertasDoDia.tsx` e `src/components/coach/MeuDia.tsx`.

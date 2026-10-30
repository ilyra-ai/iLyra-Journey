# Diário pessoal por voz (tarefa 135)

O diário mora na aba **Diário** de `/dia`; a organização da página em abas
está em [`/dia` em abas](./dia-em-abas.md).

## Diário pessoal (135)

Na aba **Diário**, a pessoa conta por voz ou por escrito como foi o dia,
quantas vezes quiser (até 10 relatos por dia), e consulta os relatos numa
agenda mensal.

### Voz

- Web Speech API, sempre começando pelo reconhecimento **no aparelho**
  (`SpeechRecognition.available({ processLocally: true })`). Se o pacote de
  português puder ser baixado, a tela oferece o download (`install`).
- Sem português no aparelho, o serviço de voz do navegador (que processa o
  áudio fora do aparelho; no Chrome, pelo Google) só é usado depois de um
  aceite explícito, a cada vez. Digitar continua sempre disponível.
- O áudio nunca chega ao servidor da Lyra. O relato registra se veio por voz
  no aparelho, por voz no navegador ou digitado.
- Microfone negado, sem fala, sem rede ou navegador sem suporte geram
  mensagens em pt-BR, e o texto já ditado continua no campo.

### Texto organizado e análise

- O relato é guardado **exatamente como foi contado**. Em seguida, o
  primeiro modelo autorizado da ordem de uso (Administração → Modelos de IA)
  devolve, num JSON validado:
  - `textoOrganizado`: o mesmo relato só com ortografia, acentos,
    pontuação e maiúsculas corrigidos;
  - acontecimentos, percepções, como o dia se mostrou, relação com o mapa e
    padrões ao longo dos dias.
- **Validação antes de gravar** (`src/lib/diario-pessoal/esquema.ts`):
  - fidelidade: cada palavra nova precisa ser correção de grafia (distância
    de edição pequena) de uma palavra que saiu; trocas de sentido, fatos
    acrescentados, cortes e mudanças de tamanho são recusados;
  - cada acontecimento e a leitura do dia precisam citar algo do relato;
  - sem relatos anteriores, a lista de padrões precisa vir vazia;
  - a relação com o mapa só existe quando o céu do dia foi enviado;
  - linguagem clínica (diagnóstico, transtorno, medicamento…) é recusada e
    a voz da Lyra é conferida.
    Resposta recusada passa ao próximo modelo; se nenhum entregar, o relato
    fica como foi contado e a tela mostra o motivo, com "Tentar de novo".
- **Mapa pessoal**: entram os fatos do céu do dia e do mapa da própria pessoa
  guardados no briefing daquela data (Lua, clima do dia, estrela pessoal do
  dia e período de vida). Eles são gravados junto da análise, para ela
  continuar explicável depois que o briefing expirar (90 dias). Sem briefing
  da data, a análise não fala de mapa.
- **Histórico**: até 6 análises anteriores (acontecimentos e leitura) e, com
  a memória ligada, lembranças recuperadas da memória individual.
- **Privacidade dos modelos**: sem o consentimento de nuvem da memória, só
  modelos locais recebem o relato. Sem modelo, a análise fica
  "indisponível" com o motivo; nada é simulado.
- A tela separa o que a pessoa contou da leitura da Lyra e informa o modelo,
  se local ou em nuvem. Não é avaliação de saúde.

### Memória individual

Com o plano e a memória ligados (Lyra AI → Memória), cada relato entra na
fila da memória individual (Graphiti) como "Relato do diário pessoal de
AAAA-MM-DD: …"; a edição envia a versão corrigida. A memória guarda o que a
pessoa contou; a análise, por ser interpretação da Lyra, fica no diário.
Excluir um relato não apaga lembranças já extraídas, que se corrigem ou
apagam na página Memória.

### Dados, plano e integrações

- Tabela `personal_diary_entries` (migração 062), com versão para edição
  concorrente, estados da análise, prazo de geração e retrato do céu.
- Recurso do plano: `evening_reflection` (o mesmo da reflexão da noite) e o
  histórico do plano para datas antigas.
- Linha do tempo: origem "Diário pessoal" mostra só o momento, a forma e o
  estado da análise, nunca o conteúdo, com link para `/dia?aba=diario`.
- Exportação LGPD inclui os relatos; a exclusão da conta os remove.

### API

| Método | Rota                                  | Uso                                                       |
| ------ | ------------------------------------- | --------------------------------------------------------- |
| GET    | `/api/diario-pessoal?mes=AAAA-MM`     | dias do mês com relatos (sem parâmetro: mês de hoje)      |
| GET    | `/api/diario-pessoal?data=AAAA-MM-DD` | relatos do dia                                            |
| POST   | `/api/diario-pessoal`                 | `{ id, data, texto, modo, motor }`, idempotente pelo `id` |
| PATCH  | `/api/diario-pessoal/[id]`            | `{ versao, texto }`; descarta organização e análise       |
| DELETE | `/api/diario-pessoal/[id]`            | `{ versao }`                                              |
| POST   | `/api/diario-pessoal/[id]/analise`    | `{ versao }`; organiza e analisa com o modelo autorizado  |

Respostas: 401 sem sessão, 403 sem o recurso do plano ou fora do histórico,
404 relato de outra conta, 409 versão antiga, identificador reutilizado,
análise em andamento ou já feita e limite diário, 429 após 6 tentativas de
análise por relato.

## Limites conhecidos

- O reconhecimento de voz depende do navegador. O Chromium de testes deste
  ambiente não tem português no aparelho e recusou o microfone ao serviço do
  navegador; a captura real de fala precisa ser conferida no navegador do
  usuário. O "headless shell" do Playwright fecha a aba ao consultar
  `SpeechRecognition.available()`; o Chromium completo responde normalmente.
- Modelos pequenos erram com frequência: a validação recusa e o relato fica
  guardado como foi contado. Prefira modelos maiores na ordem de uso.

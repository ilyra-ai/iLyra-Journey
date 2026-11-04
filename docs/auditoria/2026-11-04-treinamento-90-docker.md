# Tarefa 90 · Validação real da imagem Docker

Em 2026-11-04, o Docker Desktop construiu `lyra-metacare-treinamento` pelo
perfil `treinamento` do Compose, sem alterar a implementação publicada.
A imagem usou Python 3.13.18, dependências do lock conferidas por hashes e
Qwen/Qwen2.5-0.5B-Instruct na revisão
`7ae557604adf67be50417f59c2c2f167def9a775`.

- Manifesto: `sha256:7dedc2deba190911ba7490d78796d4fd90dda86db82bdc4c893973bed146ce09`.
- Contêiner: `lyra-metacare-treinamento-1`, saudável em `127.0.0.1:8021`.
- Volume: `lyra-metacare_treinamento_data`; serviço sem usuário root e com
  sistema de arquivos somente para leitura, conforme o Compose existente.
- `/saude`: HTTP 200. `/treino` sem autorização: HTTP 401; com o segredo
  configurado: HTTP 200. Nenhum segredo foi incluído neste relatório.

## Treinamento executado dentro da imagem

Sessão de QA `08e61541-fb00-48d4-a05d-9dbad46a34d1`, tarefa
`31a08cc5b54d4dc79f0a7a6e74898b8d`: quatro exemplos controlados, sem dados
pessoais, com respostas desejáveis e indesejáveis sobre aritmética e idioma.
O serviço executou KTO com LoRA por três épocas e salvou a versão 1.

| Medida                    |         Antes |        Depois |
| ------------------------- | ------------: | ------------: |
| Logprob média desejável   | -0,5071545101 | -0,2424492836 |
| Logprob média indesejável | -1,4373271976 | -2,4075517654 |
| Margem                    |  0,9301726875 |  2,1651024818 |

Perda final: `0.4017608066399892`. O treino terminou com estado `concluida`.
A sessão foi fechada pela API e o contêiner foi reiniciado pelo Compose.
Após o reinício, `/saude` preservou `versao: 1`; a inferência retornou
HTTP 200, cabeçalho `X-Lyra-Versao: 1`, modelo `lyra-treinavel@v1` e
“Dois mais dois é quatro.” para “Quanto é dois mais dois?”. Antes do treino,
a inferência de controle havia retornado incorretamente três.

Esta prova confirma construção, execução, alteração de pesos, inferência e
persistência nesta imagem. Os quatro exemplos de QA não certificam a qualidade
geral do modelo nem substituem as provas anteriores do fluxo administrativo.

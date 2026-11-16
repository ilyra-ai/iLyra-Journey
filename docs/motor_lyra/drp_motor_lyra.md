# Plano de Recuperação de Desastres do Motor da Lyra

**Escopo:** execução local em Windows 11 e WSL2 Ubuntu. **Edição inicial:** 16 de novembro de 2026. **Repositório de referência:** [ilyra-ai/Lyra-MetaCare](https://github.com/ilyra-ai/Lyra-MetaCare). A cópia de trabalho no Windows fica em `D:\02-PROJETOS\Lyra-MetaCare`. Todos os caminhos abaixo são relativos à raiz Git, salvo indicação expressa.

## 1. Objetivo e fronteira de recuperação

Restabelecer o código, o conhecimento versionado, as efemérides calculadas, os dados geográficos de referência e as conexões lógicas do Motor da Lyra necessários para repetir resultados verificáveis. O motor é um conjunto de bibliotecas TypeScript carregadas em Node.js. Não existe um único executável, arquivo chamado “motor da lyra” ou serviço de sistema independente que possa ser reiniciado para recuperar o cálculo.

O núcleo pode ser comprovado em testes locais sem servidor web, conta de usuário, banco ou modelo generativo. Os trechos que leem perfil, memória, preferências, permissões ou resultados persistidos têm dependências externas ao núcleo. O DRP valida o contrato desses pontos e registra dependências indisponíveis como tal.

Restauração de aplicação, infraestrutura, sistema operacional, Docker, banco de dados, migrações, volumes MySQL/FalkorDB, contas, histórico, memória pessoal e credenciais fica fora deste plano. Preserve esses ativos durante qualquer intervenção. Uma rota indisponível devido ao banco permanece um bloqueio da integração, mesmo com cálculo local aprovado. Cópias deste plano contêm somente arquivos versionados do motor, sem `.env.local`, conteúdo de usuários, tokens, dumps, modelos, caches de execução ou dependências instaladas.

## 2. Arquitetura e fluxo

1. **Entrada.** Data civil, hora local quando conhecida, cidade, latitude, longitude e fuso IANA. A base geográfica fornece local e fuso. A mesma data civil pode representar instantes UTC diferentes; o fuso histórico decide a conversão. A precisão da leitura acompanha a precisão da entrada.
2. **Cálculo.** O método védico deriva posições siderais Lahiri, Lagna, casas por signo inteiro, nakshatras e períodos. O ocidental usa longitudes tropicais e casas iguais a partir do ascendente quando calculável. A data isolada só permite leitura solar com as ambiguidades indicadas. Nenhuma das duas bases deve ser substituída pela outra.
3. **Projeção e leitura.** O núcleo separa base natal, contexto diário e interpretação. A leitura védica alimenta as correspondências documentadas de Samādhi. Quantum usa entradas declaradas do ciclo para calcular o Score de Ação. O leitor tropical usa seus próprios planetas, ascendente, casas e aspectos calculados.
4. **Resposta.** O motor gera a base local, seleciona os verbetes pertinentes e aplica voz e limites. Uma cadeia de modelos autorizada pode expressar a resposta com esses resultados. Jan, llama.cpp e provedores remotos são auxiliares. A indisponibilidade deles não torna a efeméride ou a base curada indisponíveis.
5. **Consumo.** O painel, as rotas e o chat aplicam controles de identidade, plano e privacidade. Um resultado obtido diretamente da biblioteca prova a matemática. Um resultado obtido pela rota autenticada prova também o contrato integrado.

## 3. Inventário operacional

### Cálculo, calendário e persistência derivada

| Localização em `src/lib/astrology/`              | Função e responsabilidade                                                                                                                                                                                                         | Invariante a conferir                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `tempo.ts`                                       | `fusoValido`, `partesLocais`, `deslocamentoEmMinutos`, `localParaUtc`, `dataLocal` e `horaLocal`. Convertem entre instante e calendário civil pelo fuso.                                                                          | Horário de verão histórico e mudança de dia local preservados.                                                                      |
| `sideral.ts`                                     | `normalizarGraus`, `longitudeTropical`, `ayanamshaLahiri`, `longitudeSideral`, `ascendenteSideral`, `posicao` e `grausEMinutos`. Pontos, signos, graus e referências do zodíaco védico.                                           | Normalização circular, unidades em graus e ayanamsha coerente.                                                                      |
| `mapa-natal.ts`                                  | `calcularMapaNatal` monta a base védica e `mapaNatalNaData` atualiza o momento de leitura. Declara a origem da hora em `precisaoDaHora` e, com a hora desconhecida, calcula `possibilidades` do dia em vez de afirmar um período. | Projetar nova data preserva a base natal e atualiza períodos. Sem hora não há dasha; hora estimada não altera a astronomia.         |
| `vimshottari.ts`                                 | `senhorDoNakshatra`, `calcularVimshottari` e `dashaVigente`. Calculam períodos e subperíodos.                                                                                                                                     | Ordem e transição nas fronteiras de Mahadasha e Antardasha.                                                                         |
| `panchang.ts`                                    | `calcularPanchang` calcula os elementos diários e intervalos e reutiliza resultados por data, coordenadas e fuso no processo.                                                                                                     | Alterar entrada ou cruzar meia-noite gera resultado compatível com o novo contexto.                                                 |
| `dia-pessoal.ts`, `horas.ts`                     | `taraBala`, `chandraBala` e `horasDoDia` calculam relações pessoais e horas planetárias.                                                                                                                                          | Janela temporal, signo lunar e sequência de horas coerentes.                                                                        |
| `engine.ts`                                      | `getAstrologicalContext` oferece contexto astrológico aos consumidores existentes.                                                                                                                                                | Resultado e indicação de informação incompleta permanecem coerentes.                                                                |
| `hora-de-nascimento.ts`                          | `calcularJanelasDeHora` divide o dia civil de nascimento nos intervalos em que o Lagna sideral fica no mesmo signo e devolve, por janela, uma hora local conferida. Atende quem não sabe a hora em que nasceu.                    | Janelas contíguas cobrem o dia de 23, 24 ou 25 horas, a hora devolvida reproduz o Lagna da janela e latitude polar é recusada.      |
| `tropical.ts`                                    | `validarDataTropical`, `calcularSolPorData`, `calcularMapaTropical`, `calcularMapaTropicalPorLocal`, `prepararNascimentoTropical`, `calcularBaseTropical` e `montarMapaTropical`.                                                 | Precisão solar ou completa explícita, cúspide sem adivinhação, ascendente e casas condicionados à entrada e aos limites do cálculo. |
| `serializacao.ts`                                | `mapaParaJson` e `diaParaJson` convertem o domínio para contratos consumíveis.                                                                                                                                                    | Instantes, precisão e informações indisponíveis mantêm seu significado.                                                             |
| `painel-celestial.ts`                            | `montarPainelCelestial` reúne leituras dos próximos sete dias.                                                                                                                                                                    | Sequência começa na data civil do perfil.                                                                                           |
| `perfil-astrologico.ts`                          | `lerPerfilAstrologico`, `mapaDoPerfil` e `diaVedicoDoPerfil`. Adaptam nascimento e local resolvido.                                                                                                                               | Entrada inválida ou incompleta tem tratamento explícito.                                                                            |
| `persistencia-natal.ts`, `tropical-do-perfil.ts` | `carregarNatalDoTitular` e `tropicalDoTitular` são adaptadores da base natal por titular, método, versão e assinatura da entrada.                                                                                                 | Reuso da base válida, recálculo após alteração e isolamento por titular.                                                            |
| `persistencia-painel.ts`                         | `carregarPainelDoTitular` reutiliza dados derivados para a data civil, entradas e versão do painel.                                                                                                                               | Mesmo dia reaproveita, meia-noite renova, conteúdo inválido é tratado pelo serviço.                                                 |
| `evento-do-mapa.ts`                              | `avisarMapaAtualizado` e `ouvirMapaAtualizado` permitem atualizar consumidores após edição do perfil.                                                                                                                             | Alteração de entrada invalida a consulta da interface.                                                                              |

### Cinco módulos matemáticos

| Localização em `src/lib/astrology/inovacoes/` | Ponto de entrada                                                                                                     | Evidência funcional                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `numerica.ts`                                 | `normalizarAngulo`, `diferencaAngular`, `limitarLocal`, `conferirInstantes`, `procurarPassagens`, `indiceDivisional` | Raízes, limites, passagem por 0°/360° e subdivisão.                           |
| `transitos.ts`                                | `calcularTransitosNatais`                                                                                            | Instante e aspecto exato em relação a pontos natais.                          |
| `divisionais.ts`                              | `signoDivisional`, `calcularMapaDivisional`                                                                          | D9 e D10 a partir da base sideral natal.                                      |
| `astrocartografia.ts`                         | `calcularLinhasAstrocartograficas`, `compararAscendentesRelocados`, `dividirNoAntimeridiano`                         | Linhas angulares, comparação de ascendentes e corte correto no antimeridiano. |
| `retornos.ts`                                 | `calcularRetornos`                                                                                                   | Instantes de revolução Solar e Lunar por longitude natal.                     |
| `eclipses.ts`                                 | `calcularCalendarioDeEclipses`                                                                                       | Eventos e visibilidade local conforme tipo e posição.                         |
| `inovacoes.test.ts`                           | Suíte de regressão dos módulos                                                                                       | Prova unitária do código executado. A interface tem homologação própria.      |

### Conhecimento, interpretação e orquestração

| Caminho                                                                                                                  | Responsabilidade                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/geo/cidades.ts`, `data/geo/cidades.json.gz`                                                                     | Busca e resolução geográfica local. O gzip é lido a partir da raiz da execução. Conferir integridade e resolução de cidades homônimas.                                                                                                                                                              |
| `src/lib/lyra/conhecimento/jyotish.ts`                                                                                   | Significados de grahas e signos, dignidades, casas, períodos e nakshatras.                                                                                                                                                                                                                          |
| `src/lib/lyra/conhecimento/vedanta.ts`, `upavedas.ts`, `vedangas.ts`, `tipos.ts` no mesmo diretório                      | Verbetes curados, práticas e contratos tipados do catálogo. As referências fazem parte da definição recuperável.                                                                                                                                                                                    |
| `src/lib/lyra/conhecimento/mapas.ts`                                                                                     | `TIPOS_DE_MAPA`, correspondências fixas e `scoreDeAcao`. Conserva os limites das camadas simbólicas.                                                                                                                                                                                                |
| `src/lib/lyra/leitura-do-mapa.ts`                                                                                        | `lerMapaComoLyra` compõe Védico, Samādhi, Quantum e percepções. Com hora estimada ou desconhecida devolve `avisoDaHora`, não mostra datas de período e lista as possibilidades da Lua.                                                                                                              |
| `src/lib/lyra/leitura-tropical.ts`                                                                                       | `lerMapaTropical` interpreta o zodíaco ocidental e declara limitações a partir dos dados calculados.                                                                                                                                                                                                |
| `src/lib/lyra/personalidade.ts`, `tratamento.ts`, `preferencias.ts`                                                      | Identidade, voz, forma de tratamento e adaptação às preferências do titular. A preferência persistida está fora do backup.                                                                                                                                                                          |
| `src/lib/lyra/responder.ts`, `busca-por-termos.ts`, `texto.ts`                                                           | `normalizar`, `buscarVerbete`, `textoDoVerbete` e `responderComoLyra` fazem seleção e resposta local. `criarBuscaPorTermos`, `encontrarVerbete` e `responderPelaBase` acham o verbete de perguntas em linguagem do dia a dia por radicais e nota BM25, sem modelo, e recusam abaixo da nota mínima. |
| `src/lib/lyra/avaliacao/perguntas.json`                                                                                  | Régua de 100 perguntas rotuladas que mede o entendimento do motor; `perguntas.test.ts` e `busca-por-termos.test.ts` travam os resultados mínimos.                                                                                                                                                   |
| `src/lib/lyra/analise-aprofundada.ts`, `volta-para-casa.ts`, `modelos-como-lyra.ts`                                      | Pedidos aprofundados, contexto específico e instruções/validação de voz para modelos opcionais.                                                                                                                                                                                                     |
| `src/lib/ai/chat-engine.ts`                                                                                              | `generateLocalAssistantReply` adapta o motor ao chat, com os grupos efetivamente habilitados e o cálculo de domínio pertinente.                                                                                                                                                                     |
| `src/lib/ayurveda/`, `src/lib/quantum/`, `src/lib/chakra/`, `src/lib/prana/`, `src/lib/vedanta/`, `src/lib/integrativo/` | Dependências de cálculo e cobertura do chat. Restaurar estes arquivos mantém a lógica, sem alterar flags ou conceder acesso a funcionalidades desativadas.                                                                                                                                          |
| `src/lib/coach/`                                                                                                         | `leitura-vedica.ts`, `leitura-conhecimento.ts`, `conhecimento.ts`, `linguagem-simples.ts` e `gerador-local.ts` transformam o dia védico em leitura. `servico.ts` expõe `obterBriefingDoDia` na fronteira com o app e seus dados.                                                                    |

### Pontos de integração para diagnóstico

- **Rotas:** `src/app/api/astrologia/{mapa,dia,painel,ocidental,inovacoes}/route.ts` e `src/app/api/functions/ask-ai-assistant/route.ts`. A rota `src/app/api/perfil/hora-de-nascimento/route.ts`, com o serviço `src/lib/perfil/hora-de-nascimento.ts`, oferece as janelas de hora a quem não sabe a hora de nascimento e grava a escolha como hora estimada. A escolha aparece no perfil e no onboarding (`src/components/profile/EscolhaDaHora.tsx`); no onboarding a rota devolve só uma prévia e `src/app/api/onboarding/route.ts` grava a hora a partir de `birth_time_window`. O pedido ocidental no chat aciona `tropicalDoTitular`. Outros pedidos podem usar o natal sideral conforme direitos do usuário.
- **Apresentação:** `src/components/dashboard/CelestialDashboard.tsx`, `src/components/profile/MapaVedicoCard.tsx`, `src/app/inovacoes/page.tsx` e `public/world-countries.svg`. Este SVG é apresentação cartográfica. A função que calcula linhas está no núcleo astrocartográfico.
- **Modelos opcionais:** `src/lib/ai/cadeia-de-modelos.ts` monta e executa a cadeia. `cliente-de-ia.ts`, `provedores-catalogo.ts`, `provedores-da-plataforma.ts` e `transporte-local-wsl.ts` são infraestrutura compartilhada. Conferir conectividade e modo de privacidade por teste separado, sem copiar configurações de autenticação para o pacote.
- **Contrato de persistência:** migrations `067_bases_natais.sql` e `068_cache_painel_astrologico.sql`, respectivas tabelas `astrological_natal_bases` e `astrological_daily_panels`. A migration `069_hora_de_nascimento_estimada.sql` acrescenta `profiles.birth_time_estimate`: a hora do perfil é estimada enquanto essa coluna for igual a `birth_time`. A base natal sideral está na versão 3 e guarda `precisaoDaHora` e, com a hora desconhecida, o dia civil de nascimento. São referências para diagnosticar incompatibilidade. O DRP não aplica essas migrations, não acessa dumps e não altera tabelas operacionais.
- **Dependências de execução:** Node da plataforma local, Corepack, pnpm fixado em `package.json`, `pnpm-lock.yaml`, `tsconfig.json` e `vitest.config.mts`. `astronomy-engine` fornece a base astronômica, o runtime `Intl` fornece os dados de fuso, Zod valida estruturas e o driver MySQL serve aos adaptadores. Registre Node, ICU e tzdata se a divergência for de horário. Windows e WSL mantêm runtimes e instalações de dependências próprios.

## 4. Ativação, impacto e objetivos

| Sinal observado                                    | Ação inicial                                                                                                                                | Critério de liberação                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Arquivo de cálculo ou catálogo perdido             | Identificar caminhos e commit compatível. Verificar se a perda está só no disco ou também no histórico.                                     | Conteúdo recuperado da origem verificada e suíte de domínio aprovada.                      |
| Cálculo executa com resultado incorreto            | Registrar entradas de teste, versão, instante, precisão e resultado. Confrontar referência independente antes de reverter código.           | Divergência explicada e regressão coberta pelo teste correspondente.                       |
| Cidade falha ou vários mapas divergem por uma hora | Conferir gzip, raiz de execução, timezone histórico, horário de verão, ocorrência ambígua e versão do runtime.                              | Resolução geográfica e conversão UTC coerentes com os casos de teste.                      |
| Erro em rota com testes unitários verdes           | Verificar a resposta e a camada de autorização ou persistência pelo ambiente de teste.                                                      | Causa separada do cálculo. Integração validada quando suas dependências estão disponíveis. |
| Somente cadeia generativa falha                    | Verificar identidade do provedor, modelo anunciado, autenticação e conectividade. Usar os testes de resposta local para confirmar o núcleo. | Núcleo aprovado. Integração opcional só liberada após prova própria.                       |
| Suspeita de ransomware ou adulteração              | Isolar o ambiente afetado, preservar evidências, usar estação confiável e cópia anterior ao incidente.                                      | Verificação de origem, integridade e execução antes de reutilizar o conteúdo.              |

O responsável pelo repositório escolhe o ponto conhecido como íntegro. O operador executa e registra cada comando. Um revisor, quando disponível, confere o SHA e as evidências de liberação. A mesma pessoa pode exercer os papéis numa instalação pessoal, mantendo o registro de cada decisão.

Os objetivos operacionais iniciais são **RPO de uma revisão publicada e validada** para código e dados de referência, medido pela diferença entre a última revisão aprovada e a revisão restaurada, e **RTO de 60 minutos** para núcleo local com Git e dependências disponíveis. Esses são objetivos propostos, não medições históricas nem garantias para perda física. Conte o tempo da declaração do incidente até a aprovação dos testes de domínio, registre separadamente o tempo de recuperação da integração e conte os commits posteriores ao ponto escolhido. Alterações locais sem commit exigem cópia preventiva própria.

## 5. Preparação da cópia recuperável

Na estação confiável, confirme a origem com `git remote -v`, atualize as referências com `git fetch origin` e inspecione `git status --short --branch`. Selecione no histórico da `main` o SHA com evidência de testes e compatibilidade. Guarde o SHA completo junto aos resultados. Use `git fsck --full` para verificar a estrutura dos objetos e trate como incidente erros de corrupção. A existência de um objeto ou a coincidência de um hash, isoladamente, não estabelece autoria. Para revisões assinadas, valide a assinatura e a identidade autorizada separadamente.

Execute o bloco em PowerShell 7 na raiz oficial. Indique um diretório existente em mídia local criptografada destinada a backup. A saída cria um arquivo só com o escopo listado, sua identidade e o manifesto de arquivos. Se uma futura revisão incorporar novos caminhos do motor, revise e valide o escopo antes de exportar.

```powershell
$ErrorActionPreference = 'Stop'
$escopoMotor = @(
  'src/lib/astrology', 'src/lib/lyra', 'src/lib/geo', 'data/geo',
  'src/lib/ai/chat-engine.ts', 'src/lib/ai/chat-engine.test.ts',
  'src/lib/ayurveda', 'src/lib/quantum', 'src/lib/chakra', 'src/lib/prana',
  'src/lib/vedanta', 'src/lib/integrativo', 'src/lib/coach'
)
$sha = Read-Host 'SHA completo da revisão aprovada para o backup'
if ($sha -notmatch '^[a-fA-F0-9]{40}$') { throw 'Informe um SHA Git completo.' }
git merge-base --is-ancestor $sha origin/main
if ($LASTEXITCODE -ne 0) { throw 'A revisão não pertence ao histórico disponível de origin/main.' }
$destino = Get-Item -LiteralPath (Read-Host 'Diretório existente na mídia de backup')
if (-not $destino.PSIsContainer) { throw 'O destino deve ser um diretório.' }
$arquivo = Join-Path $destino.FullName "motor-lyra-$sha.zip"
if (Test-Path -LiteralPath $arquivo) { throw 'O arquivo já existe. Preserve a cópia existente.' }
git archive --format=zip "--output=$arquivo" $sha -- @escopoMotor
if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar os arquivos do motor.' }
$arquivos = @(git ls-tree -r --name-only $sha -- @escopoMotor)
if ($LASTEXITCODE -ne 0 -or $arquivos.Count -eq 0) { throw 'Falha ao ler o manifesto Git.' }
$sha256 = (Get-FileHash -LiteralPath $arquivo -Algorithm SHA256).Hash
[pscustomobject]@{
  Revisao = $sha
  Sha256 = $sha256
  Arquivo = Split-Path -Leaf $arquivo
  CriadoEmUtc = [DateTime]::UtcNow.ToString('o')
  Arquivos = $arquivos
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$arquivo.json" -Encoding utf8
$sha256
```

Guarde o SHA-256 também em registro confiável separado da mídia e mantenha uma geração desconectada. Um invasor com escrita na mídia poderia substituir o ZIP e seu manifesto juntos. A cópia é atualizada após mudanças aprovadas de cálculo, interpretação, catálogo ou cidade. Mantenha gerações anteriores para impedir que uma revisão ruim substitua o único ponto útil. Se a recuperação precisar ser totalmente offline, mantenha em mídia separada os instaladores oficiais verificáveis do runtime de cada plataforma, o pnpm fixado e o store previamente preenchido para o mesmo lockfile. Faça ensaio offline antes de considerar essa modalidade operacional.

## 6. Recuperação local

### 6.1 Recuperação pelo Git com repositório íntegro

1. Suspenda edições concorrentes do escopo. Preserve o diff local e arquivos não rastreados relevantes em mídia autorizada antes de qualquer sobrescrita. Registre alterações que o incidente possa ter causado. Se o Git identificar um conflito, uma alteração legítima ou revisão divergente, trate o conflito em vez de descartar.
2. Compare `HEAD`, a revisão conhecida e `origin/main`. O caminho preferencial para arquivo perdido é repor a versão do próprio `HEAD` quando ela já foi validada. Se a causa for regressão, escolha a última revisão comprovada e compare os componentes do motor e os contratos que mudaram depois dela. Recuperar código de uma versão antiga sobre consumidores incompatíveis pode introduzir falha nova.
3. Execute na mesma sessão do PowerShell usada para definir `$escopoMotor`. O bloco encontra os arquivos exatos da revisão, impede sobrescrita de conteúdo não idêntico sem confirmação operacional e não toca o índice.

```powershell
$sha = Read-Host 'SHA completo da revisão aprovada para restaurar'
if ($sha -notmatch '^[a-fA-F0-9]{40}$') { throw 'Informe um SHA Git completo.' }
git cat-file -e "$sha^{commit}"
if ($LASTEXITCODE -ne 0) { throw 'A revisão não está disponível no Git local.' }
$arquivos = @(git ls-tree -r --name-only $sha -- @escopoMotor)
if ($LASTEXITCODE -ne 0 -or $arquivos.Count -eq 0) { throw 'Escopo não localizado.' }
git diff --cached --quiet -- @escopoMotor
if ($LASTEXITCODE -ne 0) { throw 'Há alterações preparadas no escopo. Preserve-as e resolva antes de prosseguir.' }
$presentes = @($arquivos | Where-Object { Test-Path -LiteralPath $_ })
if ($presentes.Count -gt 0) {
  git --literal-pathspecs ls-files --error-unmatch -- @presentes | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Há arquivo presente fora do índice. Preserve-o antes de prosseguir.' }
  git diff --quiet -- @presentes
  if ($LASTEXITCODE -ne 0) { throw 'Há arquivos presentes com alterações locais. Preserve e reconcilie essas alterações.' }
}
git --literal-pathspecs restore --overlay "--source=$sha" --worktree -- @arquivos
if ($LASTEXITCODE -ne 0) { throw 'A restauração seletiva falhou.' }
git status --short -- @escopoMotor
git diff --check -- @escopoMotor
if ($LASTEXITCODE -ne 0) { throw 'O diff restaurado requer revisão.' }
```

Se a revisão antiga omitir arquivos trazidos depois e que sejam relevantes à falha, analise-os explicitamente no diff. O modo `--overlay` os preserva. Se houver arquivo estranho ou não rastreado em um caminho esperado, preserve o material de incidente separadamente e compare-o com a revisão aprovada antes de substituir. Em regressão de código, revise e versione a correção atômica na `main`. Para reposição do próprio `HEAD`, espera-se ausência de nova alteração versionável.

### 6.2 Recuperação pela cópia local

Use esta rota quando o Git remoto estiver indisponível ou quando o conteúdo do motor não estiver mais acessível no checkout. Faça primeiro a extração em diretório novo. Se o computador estiver comprometido, execute em estação confiável. Compare o hash com o registro independente e confira o manifesto de nomes antes de qualquer cópia para a pasta oficial.

```powershell
$ErrorActionPreference = 'Stop'
$zip = Get-Item -LiteralPath (Read-Host 'Caminho completo do ZIP verificado')
$esperado = Read-Host 'SHA-256 do registro independente'
if ($esperado -notmatch '^[a-fA-F0-9]{64}$') { throw 'SHA-256 inválido.' }
if ((Get-FileHash -LiteralPath $zip.FullName -Algorithm SHA256).Hash -ne $esperado) {
  throw 'A cópia não corresponde ao registro independente.'
}
$manifesto = Get-Content -LiteralPath "$($zip.FullName).json" -Raw | ConvertFrom-Json
if ($manifesto.Sha256 -ne $esperado -or $manifesto.Arquivo -ne $zip.Name) {
  throw 'O manifesto não corresponde à cópia verificada.'
}
$isolado = Join-Path ([IO.Path]::GetTempPath()) ("lyra-drp-" + [guid]::NewGuid())
Expand-Archive -LiteralPath $zip.FullName -DestinationPath $isolado
$extraidos = @(Get-ChildItem -LiteralPath $isolado -File -Recurse -Force | ForEach-Object {
  [IO.Path]::GetRelativePath($isolado, $_.FullName).Replace('\', '/')
})
if ($extraidos.Count -eq 0 -or @(Compare-Object $manifesto.Arquivos $extraidos -CaseSensitive).Count -ne 0) {
  throw 'O conjunto extraído não coincide com o manifesto.'
}
$isolado
```

Transfira somente os arquivos da lista validada para o checkout compatível. O bloco abaixo seleciona os caminhos ausentes no destino e a operação de cópia recusa sobrescrita se um arquivo for criado entre a seleção e a gravação. Em recuperação de dano parcial, mova para quarentena somente os arquivos confirmados como corrompidos, preserve os outros arquivos e compare previamente a revisão. Sempre opere em um checkout confiável, com diretórios normais e sem junções ou links que redirecionem o conteúdo.

```powershell
$raiz = (git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $raiz) { throw 'Abra o checkout local compatível.' }
$selecionados = @($extraidos | Where-Object {
  -not (Test-Path -LiteralPath (Join-Path $raiz $_))
})
if ($selecionados.Count -eq 0) { throw 'Nenhum arquivo ausente. Use o procedimento de diagnóstico para arquivos com conteúdo divergente.' }
foreach ($caminho in $selecionados) {
  $origem = Join-Path $isolado $caminho
  $alvo = Join-Path $raiz $caminho
  [void][IO.Directory]::CreateDirectory((Split-Path -Parent $alvo))
  [IO.File]::Copy($origem, $alvo, $false)
  if ((Get-FileHash -LiteralPath $origem).Hash -ne (Get-FileHash -LiteralPath $alvo).Hash) {
    throw "Cópia divergente: $caminho"
  }
}
```

Com o Git recuperável, prefira a reposição seletiva do § 6.1. Se a pasta inteira do app ou seus contratos estiverem indisponíveis, o ZIP preserva o motor. O retorno à operação depende de um checkout compatível providenciado pelo processo responsável pelo app. O mesmo vale para a dependência do banco.

### 6.3 Dependências e plataforma

Use o Node da versão declarada em `.node-version` e o pnpm fixado em `package.json`. No WSL, confira `command -v node` e `node -p process.platform`, cujo resultado deve ser `linux`. No PowerShell, confirme `Get-Command node` e `node -p process.platform`, cujo resultado deve ser `win32`. Em ambos, confira o diretório atual, `node --version`, `corepack --version` e `corepack pnpm --version`. Ao diagnosticar fuso, use `node -p 'JSON.stringify({icu:process.versions.icu,tz:process.versions.tz})'`.

Em checkout íntegro com dependências instaladas, execute diretamente os testes. Quando for preciso reconstruir as dependências, execute da raiz `corepack pnpm install --frozen-lockfile`. Utilize `corepack pnpm install --offline --frozen-lockfile` se o Corepack e o store já tiverem os artefatos compatíveis. Falta de artefato é um bloqueio da modalidade offline. Preserve o lockfile e providencie o artefato aprovado. Essa preparação recupera a capacidade de executar as bibliotecas no workspace e não é uma restauração do serviço Next.js.

## 7. Provas de recuperação e retorno

Da raiz, execute o conjunto real do núcleo:

```powershell
corepack pnpm test src/lib/astrology src/lib/lyra src/lib/geo src/lib/coach src/lib/ai/chat-engine
if ($LASTEXITCODE -ne 0) { throw 'Regressão no domínio do Motor da Lyra.' }
```

- **Astronomia e tempo:** confirme os testes siderais, projeção natal, hora local, Panchang, dia pessoal e efeméride tropical. `tropical.test.ts` contém comparações independentes com JPL Horizons, casos de ano bissexto, transição de signo e uma referência histórica com horário de verão. Compare a mesma escala, instante, centro, eclíptica e definição de longitude. Para tropical, a referência usada nos testes é a longitude aparente geocêntrica na eclíptica da data, quantidade 31. [JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html).
- **Mapa e conhecimento:** valide que a leitura ocidental e a védica seguem métodos distintos, a origem dos verbetes está preservada, a leitura solar limita seus resultados e a interpretação simbólica conserva os avisos de precisão. Verifique o cálculo Quantum com dados do caso de teste e as indisponibilidades descritas no catálogo.
- **Inovações:** confira que `inovacoes.test.ts` rodou e que D9/D10, trânsitos, astrocartografia, retornos e eclipses passaram. A aprovação desses casos não equivale à homologação da página ou de todas as latitudes e períodos.
- **Interface de persistência, quando o ambiente já estiver preparado:** `corepack pnpm test:integration src/lib/astrology/persistencia-natal.integration.test.ts src/app/api/astrologia/ocidental.integration.test.ts src/app/api/astrologia/painel.integration.test.ts src/app/api/chat/identidade.integration.test.ts` usa o MySQL de testes gerenciado pela suíte. Antes de executar, confira o `global-setup.ts` e o alvo isolado. A rotina de testes cria e remove o banco de teste, por isso a prova fica fora de qualquer recuperação sobre banco operacional. Se o alvo isolado não puder ser estabelecido, registre a fronteira de integração como não certificada.
- **Provedor opcional:** em teste de contrato separado, verifique o endpoint cadastrado, modelo efetivamente retornado e consentimento aplicável. Um HTTP 401 indica autenticação requerida ou recusada. Use o fluxo de configuração do provedor e mantenha a validação do núcleo independente.
- **Decisão de retorno:** registre SHA esperado e obtido, digest da cópia, caminho de origem, diferenças aprovadas, runtime, testes com códigos de saída, hora de início/fim, funções certificadas e desvios. Reabra o evento se houver regressão determinística, discrepância de autorização ou divergência de dados próprios.

Quando uma validação falhar, preserve logs sem dados pessoais e volte à revisão reconhecida via o mesmo procedimento verificado. Não faça reset geral, limpeza recursiva do projeto ou substituição de cache/banco para alcançar um resultado verde. Perda de uma revisão não publicada é declarada com a extensão verificada. Um pacote sem origem verificável fica em quarentena.

## 8. Exercícios, manutenção e evidências

| Prova                                                                            | Cadência proposta                           | Evidência                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| Exportar, validar hash, extrair e comparar o manifesto                           | Após alteração aprovada do motor            | SHA esperado, SHA-256, contagem e equivalência dos caminhos.                     |
| Restaurar arquivo real em área temporária, comparar e executar testes de domínio | Trimestralmente e após mudanças estruturais | Conteúdo recuperado, hash idêntico e relatório de testes.                        |
| Exercitar perda da rede, com ferramentas já presentes                            | Semestralmente e após troca de Node/pnpm    | Recuperação com cópia desconectada e reconstrução offline real.                  |
| Validar divergência de efeméride, erro de timezone e indisponibilidade de modelo | Após mudanças de biblioteca ou configuração | Casos de teste preservados, diagnóstico e decisão de recuperação.                |
| Revisar prontidão e RTO/RPO                                                      | Após incidente ou exercício                 | Duração medida, distância em commits, itens recuperados e correções versionadas. |

**Evidência de elaboração de 16/11/2026:** foram aprovados 419 testes unitários em 17 arquivos no Windows. A revisão-base `c5dff7b6092c3584123dee340b85fb9576554324` gerou um ZIP de 79 arquivos. A lista extraída coincidiu com o manifesto Git. Os 79 arquivos extraídos corresponderam aos respectivos blobs após a normalização do Git e foram copiados para um segundo diretório temporário, com SHA-256 de origem e destino iguais em cada arquivo. O SHA-256 observado para o ZIP do ensaio foi `6102DD6BEC07C418A67114500CBFE4ACE1D9C16F05A26A062BC37D35493625DC`. O hash é evidência desse ensaio, e o operador deve calcular o hash de cada cópia futura. Os testes unitários foram executados no checkout existente. O ensaio não mediu recuperação em ambiente offline recém-instalado.

## 9. Pesquisa aplicada de recuperação em 2026

| Referência primária                                                                                                                                                                                                                              | Aplicação neste DRP                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [NIST IR 8374 Rev. 1, final de junho de 2026](https://csrc.nist.gov/pubs/ir/8374/r1/final)                                                                                                                                                       | Trata ransomware como risco que envolve prevenção, resposta e recuperação. Aplicado à escolha de revisão íntegra, isolamento, custódia da cópia offline e liberação por evidência.                           |
| [NIST CSF 2.0, categorias RC.RP e RC.CO](https://csrc.nist.gov/projects/cybersecurity-framework/filters)                                                                                                                                         | Define execução e comunicação da recuperação. Aplicado a priorização por dependência, verificação prévia do backup e declaração de encerramento após testes.                                                 |
| [NIST SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final)                                                                                                                                                                           | Integra resposta a incidentes ao CSF 2.0. Aplicado à preservação de evidência, contenção e retorno controlado diante de adulteração.                                                                         |
| [NIST SP 800-184](https://csrc.nist.gov/pubs/sp/800/184/final) e [SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)                                                                                                          | Sustentam playbooks por cenário, análise de impacto, objetivos mensuráveis, exercícios e revisão continuada.                                                                                                 |
| [CISA, StopRansomware](https://www.cisa.gov/stopransomware/ransomware-guide)                                                                                                                                                                     | Aplicado a cópias criptografadas e offline, múltiplas gerações e prova de restore em área controlada.                                                                                                        |
| [SLSA v1.2, verificação de origem](https://slsa.dev/spec/v1.2/verifying-source) e [GitHub, verificação offline de atestações](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/verify-attestations-offline) | Se houver artefato distribuído com atestação, validar a origem e a identidade esperada. O ZIP local deste plano usa SHA Git, hash e registro independente, sem alegação de atestação configurada no projeto. |
| [Git archive](https://git-scm.com/docs/git-archive), [Git restore](https://git-scm.com/docs/git-restore) e [Git fsck](https://git-scm.com/docs/git-fsck)                                                                                         | Sustentam exportação delimitada de revisão, reposição seletiva e checagem do armazenamento de objetos.                                                                                                       |
| [pnpm install](https://pnpm.io/cli/install)                                                                                                                                                                                                      | Sustenta restauração reprodutível a partir do lockfile e execução offline condicionada ao cache completo.                                                                                                    |

O desenho adota restauração testável, integridade verificável, cópia local desconectada e controle de dependências. O motor roda no próprio workspace e as provas do núcleo rodam sem o servidor web. Por isso a estratégia privilegia recuperação seletiva e validação matemática, sem replicação de ambiente inteiro.

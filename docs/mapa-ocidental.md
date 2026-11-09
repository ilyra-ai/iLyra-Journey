# Motor do mapa ocidental

O cálculo usa o zodíaco tropical, longitudes geocêntricas na eclíptica verdadeira da data e Astronomy Engine. A função sideral existente apenas passa a exportar a longitude tropical que já utilizava; o cálculo Lahiri permanece separado.

## Dados e precisão

- Somente data: considera todos os instantes compatíveis com o dia civil entre UTC−12 e UTC+14. Entrega somente o signo solar quando ele permanece o mesmo em toda essa janela. Na fronteira de signos, devolve os candidatos sem escolher um nascimento fictício.
- Data, hora e cidade: converte o fuso IANA histórico, recusa horários inexistentes e exige ocorrência anterior/posterior quando o relógio local se repete. Calcula dez corpos, ascendente, casas iguais e aspectos maiores.
- Casas iguais: primeira cúspide no grau do ascendente; demais cúspides em incrementos de 30°. Não são casas por signo inteiro nem Placidus. Esta implementação conserva indisponibilidade explícita do ascendente e das casas a partir de latitude absoluta 66,56°, sem fabricar posições.
- Aspectos: conjunção, quadratura, trígono e oposição com orbe máximo de 6°; sextil com 4°. São parâmetros declarados do método, não medições de efeitos pessoais.
- Datas suportadas: a partir de 1900, sem nascimento futuro.

## Leitura própria

`leitura-tropical.ts` interpreta as posições tropicais, casas e aspectos efetivamente calculados. O vocabulário editorial de signos, planetas e casas é uma base simbólica explícita. Não incorpora nakshatras, dashas, doshas, correspondências Samādhi ou Score de Ação Quantum. A leitura natal não é apresentada como previsão individual do dia.

## Consulta privada

`GET /api/astrologia/ocidental` exige a sessão existente e lê apenas o perfil do titular. Não recebe identificador de outra conta nem salva novos dados. Usa `Cache-Control: private, no-store`. O parâmetro opcional `ocorrencia=anterior|posterior` resolve horários repetidos. Dados locais inválidos retornam 422; ausência de data retorna mapa e leitura nulos.

Essa rota não é a experiência anônima da tarefa 157. A integração das quatro abas, das instruções dos modelos e do fluxo público continua pertencendo às tarefas em execução; este documento não declara a 156 integralmente concluída.

## Fontes técnicas

- [Astronomy Engine — documentação JavaScript](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md): vetores geocêntricos, coordenadas eclípticas e tempo sideral.
- [JPL Horizons — sistema de efemérides](https://ssd.jpl.nasa.gov/horizons/manual.html): referência independente das posições geocêntricas dos testes.
- [Astrodienst — sistemas de casas](https://www.astro.com/faq/fq_fh_owhouse_e.htm): casas iguais de 30° a partir do ascendente e distinção dos demais sistemas.

Os testes numéricos registram suas configurações de referência: JPL DE441 geocêntrico, longitude aparente da data, tolerância 0,02°; ascendente comparado com referência Swiss com tolerância 0,05°. As referências são amostras de teste, não substituem o cálculo em tempo de execução.

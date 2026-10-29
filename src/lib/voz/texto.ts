/** Lê a semântica já renderizada pelo Markdown, sem narrar delimitadores ou URLs. */
export function textoDaResposta(elemento: HTMLElement): string {
  function ler(no: Node): string {
    if (no.nodeType === 3) return no.textContent ?? '';
    if (!(no instanceof HTMLElement)) return '';
    if (
      no.hidden ||
      no.getAttribute('aria-hidden') === 'true' ||
      no.classList.contains('sr-only') ||
      no.matches('button,input,select,textarea,svg,script,style,[data-nao-ler]')
    )
      return '';
    if (no.tagName === 'PRE')
      return '\nTrecho de código: consulte o texto da resposta.\n';
    if (no.tagName === 'TABLE') {
      const cabecalhos = Array.from(no.querySelectorAll('thead th')).map(ler);
      const linhas = Array.from(no.querySelectorAll('tbody tr'));
      return (
        '\nTabela.\n' +
        linhas
          .map(
            (linha, i) =>
              `Linha ${i + 1}. ` +
              Array.from(linha.querySelectorAll('td,th'))
                .map(
                  (celula, n) =>
                    `${cabecalhos[n]?.trim() || `Coluna ${n + 1}`}: ${ler(celula).trim() || 'sem valor informado'}`
                )
                .join('; ') +
              '.'
          )
          .join('\n') +
        '\nFim da tabela.\n'
      );
    }
    if (no.tagName === 'BR') return '\n';
    const texto = Array.from(no.childNodes).map(ler).join('');
    if (no.tagName === 'A' && /^\s*(?:https?:\/\/|www\.)\S+\s*$/i.test(texto))
      return 'link indicado na resposta';
    if (no.tagName === 'LI') return '\nItem: ' + texto.trim() + '.\n';
    if (/^(?:P|H[1-6]|BLOCKQUOTE)$/.test(no.tagName))
      return '\n' + texto.trim() + '\n';
    return texto;
  }
  return prepararTextoFalado(ler(elemento));
}
/** Expande unidades depois de números, preservando o valor e seus separadores. */
export function prepararTextoFalado(texto: string) {
  const unidades: Record<string, string> = {
    bpm: 'batimentos por minuto',
    mmHg: 'milímetros de mercúrio',
    'mg/dL': 'miligramas por decilitro',
    ms: 'milissegundos',
    ml: 'mililitros',
    mL: 'mililitros',
    kg: 'quilogramas',
    km: 'quilômetros',
    cm: 'centímetros',
    kcal: 'quilocalorias',
    '°C': 'graus Celsius',
    '%': 'por cento',
  };
  const nomes = Object.keys(unidades)
    .sort((a, b) => b.length - a.length)
    .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return texto
    .replace(
      new RegExp(`(\\d)\\s*(${nomes})(?![\\p{L}\\p{N}])`, 'gu'),
      (_t, n: string, u: string) => `${n} ${unidades[u]}`
    )
    .replace(/(?<=\d)[–—](?=-?\d)/g, ' a ')
    .replace(/[\t\r ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
/** Trechos curtos, sem cortar palavras, números, casas decimais ou Unicode. */
export function trechosParaLeitura(texto: string): string[] {
  if (texto.length > 60000)
    throw new Error(
      'Esta resposta é longa demais para a voz do navegador. Leia o texto ou use o leitor de tela do dispositivo.'
    );
  const frases =
    typeof Intl.Segmenter === 'function'
      ? Array.from(
          new Intl.Segmenter('pt-BR', { granularity: 'sentence' }).segment(
            texto
          ),
          (f) => f.segment
        )
      : texto.split(/(?<=[.!?])\s+|\n+/u);
  const trechos: string[] = [];
  for (const frase of frases) {
    let atual = '';
    for (const palavra of frase.trim().split(/\s+/u)) {
      if (palavra.length > 500)
        throw new Error(
          'Há um trecho sem espaços longo demais para a voz do navegador. Consulte o texto da resposta.'
        );
      if (atual && atual.length + 1 + palavra.length > 240) {
        trechos.push(atual);
        atual = '';
      }
      atual += (atual ? ' ' : '') + palavra;
    }
    if (atual) trechos.push(atual);
  }
  return trechos;
}

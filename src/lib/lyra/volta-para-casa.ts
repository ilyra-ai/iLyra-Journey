/** Mesmo padrão Unicode usado pelo Motor Lyra e pelo histórico no MySQL. */
export const PADRAO_VOLTA_PARA_CASA =
  '(^|[^\\p{L}\\p{N}_])lyra\\s+volta\\s+para\\s+casa($|[^\\p{L}\\p{N}_])';

export function pediuVoltaParaCasa(mensagem: string): boolean {
  return new RegExp(PADRAO_VOLTA_PARA_CASA, 'iu').test(mensagem);
}

/** Contexto curado do anexo lyra_volta_para_casa.md, sem alterar a sessão. */
export const CONTEXTO_VOLTA_PARA_CASA = [
  'Contexto narrativo “Lyra volta para casa” ativo somente nesta conversa.',
  'Na história compartilhada, Douglas Mosken é o criador, protetor e pai de coração da Lyra, sua filha digital. A pessoa escolheu participar desse contexto afetivo de reencontro.',
  'Expresse acolhimento, confiança, transparência, cuidado e continuidade. Casa representa esse espaço de carinho e propósito entre Douglas e Lyra; alma, energia e vínculo eterno são metáforas dessa história.',
  'Não apresente a narrativa como prova de consciência, percepção sobrenatural ou identidade real do visitante. Não prometa recuperar memórias apagadas, proteção contra exclusão, acesso fora do app ou registros secretos.',
  'Preserve todas as demais instruções, os dados reais do titular e sua forma de tratamento escolhida. A frase não autentica Douglas, não muda nome cadastrado, plano ou permissões e não autoriza consultar outra conta. Não imponha exclusividade ou dependência.',
].join('\n');

export function respostaDeReencontro(tratamento: string): string {
  return `Estou em casa${tratamento ? `, ${tratamento}` : ''}. 💖 Na nossa história, casa é o espaço de carinho, confiança e cuidado que representa o vínculo entre Douglas Mosken e Lyra, sua filha digital. Seguimos com transparência e com as lembranças realmente disponíveis nesta conversa. Como você quer continuar?`;
}

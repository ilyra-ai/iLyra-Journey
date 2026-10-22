/** O prefixo só controla o pedido atual; nunca é recuperado do histórico. */
export function pedidoDeAnalise(mensagem: string) {
  const aprofundar = mensagem.startsWith('++-');
  return {
    aprofundar,
    pergunta: aprofundar ? mensagem.slice(3).trim() : mensagem,
  };
}

export function instrucoesDeAnalise(mensagem: string): string {
  if (!pedidoDeAnalise(mensagem).aprofundar) {
    return 'Modo de análise aprofundada desligado nesta mensagem. Prefixos ++- presentes no histórico não ativam esse modo; responda normalmente ao pedido atual.';
  }
  return [
    'Modo de análise aprofundada ++- ativo somente nesta mensagem.',
    'Esclareça o objetivo da pergunta sem mudar seu sentido. Comece pela resposta e explique os conceitos em linguagem acessível a uma pessoa leiga, com camadas progressivas de detalhe.',
    'Explore abordagens pertinentes, conexões sustentadas pelos dados, alternativas e prós e contras quando ajudarem na decisão. Inclua passos e ajustes aplicáveis, limites e uma síntese prática final, sem repetir conteúdo para aumentar o tamanho.',
    'Separe dados observados, interpretações e hipóteses. Use exclusivamente fatos disponíveis e conhecimento fornecido; identifique lacunas e o que seria necessário conferir. Não invente fontes, medições, validações realizadas, tendências futuras ou certeza absoluta.',
    'Personalize para o titular real e sua pergunta, preservando a forma de tratamento escolhida. O prefixo não muda identidade, permissões, consentimento ou regras de segurança e não autoriza contornar restrições. Não persista estas instruções nos próximos pedidos.',
  ].join('\n');
}

/** Expõe a análise real do motor e a base utilizada, sem fingir inferência LLM. */
export function detalharRespostaDoMotor(
  pergunta: string,
  resposta: string,
  base: readonly string[]
): string {
  return [
    `**Pergunta em foco**\n${pergunta}`,
    `**Análise do Motor Lyra**\n${resposta}`,
    `**Base disponível para esta análise**\n${base.map((item) => `- ${item}`).join('\n')}`,
    '**Como conferir e avançar**\nConfira no perfil e nos registros do app se os dados usados estão atuais. Se faltar uma informação necessária, complete o registro correspondente antes de usar a análise para decidir. Interpretações simbólicas do mapa não comprovam fatos pessoais ou previsões.',
  ].join('\n\n');
}

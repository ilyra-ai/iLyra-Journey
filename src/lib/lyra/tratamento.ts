/** Preferência explícita de como a pessoa deseja ser chamada; não é identidade civil. */
export type PreferenciaDeTratamento =
  | { modo: 'carinhoso' | 'perfil' | 'apelido'; nome: null }
  | { modo: 'personalizado'; nome: string };

/** Reconhece pedidos diretos, sem interpretar citações ou relatos como comandos. */
export function pedidoDeTratamento(
  pergunta: string
): PreferenciaDeTratamento | null {
  const texto = pergunta.trim().replace(/^lyra[,!:]?\s*/iu, '');
  const normalizado = texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  if (
    !/^(?:(?:por favor|agora|entao|a partir de agora)[, ]+)?(?:nao |pare |para |pode |poderia |prefiro |quero |gostaria |volte |volta |me |chame|chama|use|utilize)/u.test(
      normalizado
    )
  )
    return null;
  if (
    /\b(?:me cham(?:e|a|ar)|cham(?:e|a|ar) me|me trat(?:e|a|ar)|trat(?:e|a|ar) me)\b/u.test(
      normalizado
    ) === false &&
    !/\b(?:use|utilize) (?:o )?nome\b/u.test(normalizado)
  )
    return null;

  const nomeExplicito =
    /(?:me\s+cham(?:e|a|ar)|cham(?:e|a|ar)[-\s]+me)\s+(?:só\s+|somente\s+|apenas\s+)?de\s+(.+?)(?:[,;]\s*(?:por favor|obrigad[oa]).*)?[.!?]*$/iu.exec(
      texto
    );
  const negativa =
    /\b(?:nao|pare de|para de|parar de|deixe de|deixar de)\b/u.test(
      normalizado
    );
  const pedidoPositivo = nomeExplicito && !negativa;
  // Em “não me chame de xuxu, me chame de Ana”, a última solicitação prevalece.
  const trechos = [
    ...texto.matchAll(
      /(?:me\s+cham(?:e|a|ar)|cham(?:e|a|ar)[-\s]+me)\s+(?:só\s+|somente\s+|apenas\s+)?de\s+([^,;.!?]+?)(?=$|[,;.!?]|\s+e\s+(?:me\s+cham|cham))/giu
    ),
  ];
  const escolhido =
    trechos.length > 1
      ? trechos.at(-1)?.[1]
      : pedidoPositivo
        ? nomeExplicito[1]
        : null;
  if (escolhido) {
    const nome = escolhido
      .trim()
      .replace(/^["“”']+|["“”']+$/gu, '')
      .replace(/[.!?]+$/u, '')
      .trim();
    const simples = nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (simples === 'xuxu') return { modo: 'carinhoso', nome: null };
    if (simples === 'xuxuzinho')
      return { modo: 'personalizado', nome: 'xuxuzinho' };
    if (/^(?:meu nome|o meu nome|nome do perfil)$/u.test(simples))
      return { modo: 'perfil', nome: null };
    if (/^(?:meu apelido|o meu apelido|apelido do perfil)$/u.test(simples))
      return { modo: 'apelido', nome: null };
    if (
      nome.length > 0 &&
      nome.length <= 80 &&
      !/[\p{Cc}\p{Cf}<>\n\r]/u.test(nome) &&
      !/\b(?:e |mas |porque |quando |por favor)/iu.test(nome)
    )
      return { modo: 'personalizado', nome };
  }
  if (/\b(?:pelo|por|com) (?:o )?(?:meu )?nome\b/u.test(normalizado))
    return { modo: 'perfil', nome: null };
  if (
    /\b(?:pelo|por|com) (?:o )?(?:meu )?apelido\b/u.test(normalizado) ||
    (negativa &&
      /\b(?:xuxu|xuxuzinho|assim|apelido|apelidos)\b/u.test(normalizado))
  )
    return { modo: 'apelido', nome: null };
  return null;
}

export function nomeDeTratamento(
  preferencia: PreferenciaDeTratamento | null,
  nomeDoPerfil: string | null | undefined,
  apelido?: string | null
): string {
  if (!preferencia || preferencia.modo === 'carinhoso') return 'xuxu';
  return preferencia.modo === 'personalizado'
    ? preferencia.nome
    : preferencia.modo === 'apelido'
      ? apelido?.trim() || nomeDoPerfil?.trim() || 'você'
      : nomeDoPerfil?.trim() || apelido?.trim() || 'você';
}

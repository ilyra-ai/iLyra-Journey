import { SIGNOS } from '@/lib/astrology/sideral';
import {
  SIGNOS_OCIDENTAIS,
  type Signo,
} from '@/lib/lyra/conhecimento/signos-ocidentais';

/**
 * Cartão compartilhável da descoberta gratuita (tarefa 168).
 *
 * O cartão só carrega o signo solar que a própria pessoa escolheu mostrar:
 * nada de data de nascimento, nome, local, chat ou perfil. Nas datas de
 * troca de signo (resultado incerto), o cartão não nomeia signo nenhum.
 * Como o conteúdo depende só do signo, a imagem é genérica e pode ir para
 * cache público.
 */

export const IDENTIFICADORES_DOS_CARTOES = {
  Áries: 'aries',
  Touro: 'touro',
  Gêmeos: 'gemeos',
  Câncer: 'cancer',
  Leão: 'leao',
  Virgem: 'virgem',
  Libra: 'libra',
  Escorpião: 'escorpiao',
  Sagitário: 'sagitario',
  Capricórnio: 'capricornio',
  Aquário: 'aquario',
  Peixes: 'peixes',
} as const satisfies Record<Signo, string>;

/** Cartão sem signo, para o resultado incerto nas datas de troca. */
export const CARTAO_SEM_SIGNO = 'ocidental';

export type IdentificadorDoCartao =
  (typeof IDENTIFICADORES_DOS_CARTOES)[Signo] | typeof CARTAO_SEM_SIGNO;

export const FORMATOS_DO_CARTAO = {
  /** Retrato 4:5: feed do Instagram, WhatsApp e a maioria das redes. */
  retrato: { largura: 1080, altura: 1350 },
  /** 9:16: Stories e Status. */
  stories: { largura: 1080, altura: 1920 },
} as const;

export type FormatoDoCartao = keyof typeof FORMATOS_DO_CARTAO;

/** Chamadas aprovadas na copy da tarefa 168. */
export const CHAMADA_DO_CARTAO = 'Descubra algo novo sobre você';
export const CHAMADA_DO_COMPARTILHAMENTO =
  'Que tal conhecer a sua história sob outro olhar?';

/** Caminho público da jornada gratuita: genérico, sem dado pessoal. */
export const CAMINHO_DA_JORNADA = '/?experimente=1';

export interface ConteudoDoCartao {
  identificador: IdentificadorDoCartao;
  signo: Signo | null;
  simbolo: string | null;
  titulo: string;
  linha: string;
  destaque: string;
  chamada: string;
}

export function identificadorDoSigno(
  signo: Signo | null
): IdentificadorDoCartao {
  return signo ? IDENTIFICADORES_DOS_CARTOES[signo] : CARTAO_SEM_SIGNO;
}

export function signoDoIdentificador(identificador: string): Signo | null {
  return (
    SIGNOS.find((s) => IDENTIFICADORES_DOS_CARTOES[s] === identificador) ?? null
  );
}

export function identificadorValido(
  identificador: string
): identificador is IdentificadorDoCartao {
  return (
    identificador === CARTAO_SEM_SIGNO ||
    signoDoIdentificador(identificador) !== null
  );
}

export function formatoDoCartao(valor: string | null): FormatoDoCartao {
  return valor === 'stories' ? 'stories' : 'retrato';
}

/** Primeira letra maiúscula, para começar a frase do destaque. */
function maiuscula(texto: string) {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

export function conteudoDoCartao(signo: Signo | null): ConteudoDoCartao {
  if (!signo) {
    return {
      identificador: CARTAO_SEM_SIGNO,
      signo: null,
      simbolo: null,
      titulo: 'Meu céu ocidental',
      linha: 'Nasci numa data de troca de signo',
      destaque:
        'Algumas histórias pedem um olhar mais atento: o Sol estava mudando de signo.',
      chamada: CHAMADA_DO_CARTAO,
    };
  }
  const dados = SIGNOS_OCIDENTAIS[signo];
  return {
    identificador: IDENTIFICADORES_DOS_CARTOES[signo],
    signo,
    simbolo: dados.simbolo,
    titulo: `Sol em ${signo}`,
    linha: `Signo de ${dados.elemento} · ${dados.modalidade} · regente ${dados.regente}`,
    destaque: `${maiuscula(dados.forcas[0])}.`,
    chamada: CHAMADA_DO_CARTAO,
  };
}

/** Texto que acompanha o link no compartilhamento nativo. */
export function textoDoCompartilhamento(signo: Signo | null) {
  const inicio = signo
    ? `Descobri o meu Sol em ${signo} ${SIGNOS_OCIDENTAIS[signo].simbolo} na Lyra.`
    : 'Descobri um pouco do meu céu ocidental na Lyra.';
  return `${inicio} ${CHAMADA_DO_COMPARTILHAMENTO}`;
}

export function caminhoDaImagem(
  identificador: IdentificadorDoCartao,
  formato: FormatoDoCartao
) {
  return `/api/public/cartao/${identificador}${formato === 'stories' ? '?formato=stories' : ''}`;
}

export function nomeDoArquivo(
  identificador: IdentificadorDoCartao,
  formato: FormatoDoCartao
) {
  return `lyra-${identificador}-${formato}.png`;
}

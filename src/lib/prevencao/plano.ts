import type { IdDoVinculo } from '@/lib/lyra/vinculos-familiares';
import { NOMES_DOS_VINCULOS } from '@/lib/lyra/vinculos-familiares';

/**
 * Plano de prevenção do titular (tarefa 209), calculado pelo motor da Lyra a
 * partir do catálogo de recomendações revisado mensalmente pela
 * administração, da idade, do corpo (quem tem mamas, colo do útero ou
 * próstata), do histórico de saúde da família, das datas dos exames e dos
 * vínculos familiares que a própria pessoa diz que pesam.
 *
 * O plano não diagnostica e não estima risco individual: aplica as
 * recomendações oficiais de rastreamento, aponta o que está pendente ou
 * vencido e sugere conversa com o médico quando o histórico da família pede.
 * O mapa astrológico não entra no cálculo.
 */

export const PARENTES = [
  'mae',
  'pai',
  'irmaos',
  'avos',
  'tios',
  'filhos',
] as const;
export type Parente = (typeof PARENTES)[number];

export const CONDICOES = [
  'cancer-mama',
  'cancer-ovario',
  'cancer-colo-utero',
  'cancer-colorretal',
  'cancer-prostata',
  'diabetes',
  'hipertensao',
  'infarto-precoce',
  'avc',
] as const;
export type Condicao = (typeof CONDICOES)[number];

export const NOME_DO_PARENTE: Record<Parente, string> = {
  mae: 'Mãe',
  pai: 'Pai',
  irmaos: 'Irmãos',
  avos: 'Avós',
  tios: 'Tios',
  filhos: 'Filhos',
};

export const NOME_DA_CONDICAO: Record<Condicao, string> = {
  'cancer-mama': 'Câncer de mama',
  'cancer-ovario': 'Câncer de ovário',
  'cancer-colo-utero': 'Câncer do colo do útero',
  'cancer-colorretal': 'Câncer de intestino',
  'cancer-prostata': 'Câncer de próstata',
  diabetes: 'Diabetes',
  hipertensao: 'Pressão alta',
  'infarto-precoce': 'Infarto antes dos 55 (homens) ou 65 anos (mulheres)',
  avc: 'AVC (derrame)',
};

export type Publico = 'mamas' | 'colo-do-utero' | 'prostata' | 'todos';

export interface Recomendacao {
  id: string;
  nome: string;
  procura: string;
  publico: Publico;
  idadeMinima: number;
  idadeMaxima: number | null;
  intervaloMeses: number | null;
  tipo: 'rotina' | 'conversa';
  orientacao: string;
  historicoRelevante: Condicao[];
  fonteNome: string;
  fonteUrl: string;
  conferido: boolean;
  revisadoEm: string;
  ordem: number;
}

export type Genero = 'male' | 'female' | 'other' | 'prefer_not-to-say' | null;

export type SituacaoDoExame = 'em-dia' | 'pendente' | 'vencido' | 'conversar';

export interface ItemDoPlano {
  id: string;
  nome: string;
  procura: string;
  orientacao: string;
  situacao: SituacaoDoExame;
  /** Frase curta que explica a situação. */
  motivo: string;
  /** "AAAA-MM-DD" do último exame informado. */
  ultimoEm: string | null;
  /** "AAAA-MM-DD" em que o exame volta a ser indicado. */
  proximoEm: string | null;
  /** Parentes com condição ligada a este exame ("Mãe: câncer de mama"). */
  historicoNaFamilia: string[];
  /** Para quem vale, quando o corpo não é conhecido ("se você tem mamas"). */
  paraQuem: string | null;
  fonte: { nome: string; url: string };
  conferido: boolean;
}

export interface EstresseDosVinculos {
  vinculos: string[];
  texto: string;
  exames: string[];
}

export interface PlanoDePrevencao {
  idade: number | null;
  itens: ItemDoPlano[];
  emDia: number;
  /** Exames de rotina considerados no total (sem as conversas). */
  total: number;
  estresse: EstresseDosVinculos | null;
  faltando: Array<'idade'>;
  aviso: string;
}

export const AVISO_DA_PREVENCAO =
  'Estas recomendações seguem as orientações oficiais de rastreamento para pessoas sem sintomas. Não substituem a consulta: sintomas, como nódulo, sangramento ou dor no peito, pedem avaliação médica em qualquer idade, mesmo com os exames em dia.';

const PARA_QUEM: Record<Exclude<Publico, 'todos'>, string> = {
  mamas: 'Para quem tem mamas.',
  'colo-do-utero': 'Para quem tem colo do útero e já teve atividade sexual.',
  prostata: 'Para quem tem próstata.',
};

/** Quem a recomendação alcança, pelo gênero informado no perfil. */
function alcanca(publico: Publico, genero: Genero) {
  if (publico === 'todos') return { vale: true, paraQuem: null };
  if (genero === 'female')
    return { vale: publico !== 'prostata', paraQuem: null };
  if (genero === 'male')
    return { vale: publico === 'prostata', paraQuem: null };
  // Gênero não informado, outro ou preferiu não dizer: a recomendação depende
  // do corpo, não do gênero (INCA inclui homens trans e pessoas não binárias).
  return { vale: true, paraQuem: PARA_QUEM[publico] };
}

function somarMeses(data: string, meses: number) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDia = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)
  ).getUTCDate();
  alvo.setUTCDate(Math.min(dia, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

/** Idade completa em `hoje` ("AAAA-MM-DD"). */
export function idadeEm(nascimento: string, hoje: string) {
  const [an, mn, dn] = nascimento.split('-').map(Number);
  const [ah, mh, dh] = hoje.split('-').map(Number);
  return ah - an - Number(mh < mn || (mh === mn && dh < dn));
}

const EXAMES_DO_ESTRESSE = ['pressao-arterial', 'glicemia', 'perfil-lipidico'];

export function montarPlanoDePrevencao(entrada: {
  nascimento: string | null;
  genero: Genero;
  catalogo: readonly Recomendacao[];
  exames: Readonly<Record<string, string>>;
  historico: ReadonlyArray<{ parente: Parente; condicao: Condicao }>;
  vinculos: ReadonlyArray<{
    vinculoId: string;
    pesa: 'sim' | 'as-vezes' | 'nao';
  }>;
  hoje: string;
}): PlanoDePrevencao {
  const idade = entrada.nascimento
    ? idadeEm(entrada.nascimento, entrada.hoje)
    : null;
  const itens: ItemDoPlano[] = [];

  if (idade !== null) {
    for (const recomendacao of [...entrada.catalogo].sort(
      (a, b) => a.ordem - b.ordem
    )) {
      const { vale, paraQuem } = alcanca(recomendacao.publico, entrada.genero);
      if (!vale) continue;
      const naFamilia = entrada.historico
        .filter((h) => recomendacao.historicoRelevante.includes(h.condicao))
        .map(
          (h) =>
            `${NOME_DO_PARENTE[h.parente]}: ${NOME_DA_CONDICAO[h.condicao].toLowerCase()}`
        );
      const naFaixa =
        idade >= recomendacao.idadeMinima &&
        (recomendacao.idadeMaxima === null ||
          idade <= recomendacao.idadeMaxima);
      const antesDaFaixa = idade < recomendacao.idadeMinima && idade >= 18;
      const ultimoEm = entrada.exames[recomendacao.id] ?? null;
      const base = {
        id: recomendacao.id,
        nome: recomendacao.nome,
        procura: recomendacao.procura,
        orientacao: recomendacao.orientacao,
        ultimoEm,
        historicoNaFamilia: naFamilia,
        paraQuem,
        fonte: { nome: recomendacao.fonteNome, url: recomendacao.fonteUrl },
        conferido: recomendacao.conferido,
      };

      if (!naFaixa) {
        // Fora da faixa só entra quando o histórico da família pede conversa
        // com o médico sobre começar antes.
        if (antesDaFaixa && naFamilia.length > 0) {
          itens.push({
            ...base,
            situacao: 'conversar',
            motivo: `Pelo histórico na família, converse com o médico sobre começar antes dos ${recomendacao.idadeMinima} anos.`,
            proximoEm: null,
          });
        }
        continue;
      }
      if (recomendacao.tipo === 'conversa') {
        itens.push({
          ...base,
          situacao: 'conversar',
          motivo:
            naFamilia.length > 0
              ? 'Não é exame de rotina; com o histórico na família, vale decidir junto com o médico.'
              : 'Não é exame de rotina; se quiser fazer, decida junto com o médico.',
          proximoEm: null,
        });
        continue;
      }
      if (!ultimoEm) {
        itens.push({
          ...base,
          situacao: 'pendente',
          motivo:
            naFamilia.length > 0
              ? 'Indicado para você agora, e o histórico na família reforça. Ainda não há registro deste exame.'
              : 'Indicado para você agora. Ainda não há registro deste exame.',
          proximoEm: null,
        });
        continue;
      }
      if (recomendacao.intervaloMeses === null) {
        itens.push({
          ...base,
          situacao: 'em-dia',
          motivo:
            'Registrado. A frequência de repetição é definida pelo médico, conforme o seu risco.',
          proximoEm: null,
        });
        continue;
      }
      const proximoEm = somarMeses(ultimoEm, recomendacao.intervaloMeses);
      itens.push({
        ...base,
        situacao: proximoEm <= entrada.hoje ? 'vencido' : 'em-dia',
        motivo:
          proximoEm <= entrada.hoje
            ? 'O intervalo recomendado já passou: é hora de repetir.'
            : 'Em dia pelo intervalo recomendado.',
        proximoEm,
      });
    }
  }

  const pesam = entrada.vinculos
    .filter((v) => v.pesa !== 'nao' && v.vinculoId in NOMES_DOS_VINCULOS)
    .map((v) => NOMES_DOS_VINCULOS[v.vinculoId as IdDoVinculo]);
  const estresse: EstresseDosVinculos | null =
    pesam.length > 0
      ? {
          vinculos: pesam,
          texto:
            'Quando um vínculo pesa por muito tempo, o corpo sente. O estresse prolongado está associado a pressão alta, alteração da glicose e do colesterol, sono pior e mais risco de ansiedade e depressão. Cuidar do vínculo e acompanhar estes exames é uma forma concreta de prevenção; se o peso se mantém, conversar com um psicólogo ajuda.',
          exames: itens
            .filter((item) => EXAMES_DO_ESTRESSE.includes(item.id))
            .map((item) => item.id),
        }
      : null;

  const rotina = itens.filter((item) => item.situacao !== 'conversar');
  return {
    idade,
    itens,
    emDia: rotina.filter((item) => item.situacao === 'em-dia').length,
    total: rotina.length,
    estresse,
    faltando: idade === null ? ['idade'] : [],
    aviso: AVISO_DA_PREVENCAO,
  };
}

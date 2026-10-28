import { mediana } from '@/lib/acontecimentos/analise';
import type {
  ResumoDaExperiencia,
  LinhaDaRevisao,
  Experiencia,
  NotaDaExperiencia,
} from './esquema';
export const CRITERIOS_DA_EXPERIENCIA = {
  referencia: 5,
  observacao: 3,
} as const;
export function compararPeriodos(
  linhas: LinhaDaRevisao[]
): ResumoDaExperiencia['comparacoes'] {
  return (['sono', 'energia'] as const).map((m) => {
    const anteriores = linhas
        .filter(
          (l) => l.fase === 'referencia' && !l.foraDoHistorico && l[m] !== null
        )
        .map((l) => l[m]!),
      observadas = linhas
        .filter(
          (l) =>
            l.fase === 'observacao' &&
            !l.pausado &&
            !l.foraDoHistorico &&
            l[m] !== null
        )
        .map((l) => l[m]!),
      apta =
        anteriores.length >= CRITERIOS_DA_EXPERIENCIA.referencia &&
        observadas.length >= CRITERIOS_DA_EXPERIENCIA.observacao,
      ref = apta ? mediana(anteriores) : null,
      obs = apta ? mediana(observadas) : null;
    return {
      metrica: m,
      nome: m === 'sono' ? 'Sono da última noite' : 'Energia percebida',
      unidade: m === 'sono' ? 'min' : '1–5',
      nReferencia: anteriores.length,
      nObservacao: observadas.length,
      medianaReferencia: ref,
      medianaObservacao: obs,
      diferenca: apta ? obs! - ref! : null,
      apta,
    };
  });
}
export function revisaoLocal(
  e: Experiencia,
  linhas: LinhaDaRevisao[],
  notas: NotaDaExperiencia[],
  comparacoes: ResumoDaExperiencia['comparacoes'],
  sobrepostas: number
) {
  const observados = linhas.filter((l) => l.fase === 'observacao'),
    pausados = observados.filter((l) => l.pausado).length,
    comRelato = observados.filter((l) => l.nota).length,
    semRelato = observados.length - comRelato;
  const revisao = [
    `Esta é uma revisão local e descritiva da experiência “${e.titulo}”, usando somente seus registros disponíveis. Não houve chamada a um modelo externo.`,
    `${comRelato} de ${observados.length} dias observados têm relato; ${semRelato} permanecem sem acompanhamento informado. ${pausados} dias foram pausados e não entram na comparação das métricas.`,
  ];
  const sim = notas.filter((n) => n.seguiu === 'sim').length,
    parcial = notas.filter((n) => n.seguiu === 'parcial').length,
    nao = notas.filter((n) => n.seguiu === 'nao').length;
  revisao.push(
    `Nos relatos: ${sim} dias com a mudança informada como seguida, ${parcial} parcialmente e ${nao} não seguida. A falta de relato não é contada como “não”.`
  );
  const percepcoes = notas.filter((n) => n.percepcao !== null);
  revisao.push(
    `${percepcoes.length} relatos informam como você se sentiu em relação à mudança, em sua escala pessoal de 1 a 5. As notas individuais permanecem disponíveis para a revisão.`
  );
  for (const c of comparacoes)
    revisao.push(
      c.apta
        ? `${c.nome}: mediana de ${new Intl.NumberFormat('pt-BR').format(c.medianaReferencia!)} ${c.unidade} na referência (${c.nReferencia} dias) e ${new Intl.NumberFormat('pt-BR').format(c.medianaObservacao!)} ${c.unidade} na observação (${c.nObservacao} dias). A diferença é descritiva, não efeito comprovado da mudança.`
        : `${c.nome}: há ${c.nReferencia} dias válidos na referência e ${c.nObservacao} na observação. São necessários ao menos ${CRITERIOS_DA_EXPERIENCIA.referencia} e ${CRITERIOS_DA_EXPERIENCIA.observacao}, respectivamente, para apresentar medianas comparativas.`
    );
  if (sobrepostas)
    revisao.push(
      `Há ${sobrepostas} outra(s) experiência(s) com período sobreposto. Mudanças simultâneas podem confundir a leitura.`
    );
  revisao.push(
    'Sono, rotina, outros acontecimentos, diferenças de registro e acaso podem influenciar o recorte. Esta experiência pessoal não é um ensaio clínico e não permite concluir causalidade ou orientar mudança de tratamento.'
  );
  return revisao;
}

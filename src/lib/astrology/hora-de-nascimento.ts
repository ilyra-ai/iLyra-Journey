import { ascendenteSideral } from './sideral';
import { dataLocal, fusoValido, horaLocal, localParaUtc } from './tempo';

/**
 * Janelas de hora do dia de nascimento para quem não sabe a hora em que
 * nasceu. Ao longo do dia civil o Ascendente (Lagna) percorre os doze signos,
 * cerca de duas horas em cada um; cada janela é o intervalo em que o Lagna
 * sideral fica no mesmo signo, naquele dia e naquele lugar.
 *
 * O motor só calcula os intervalos. A escolha de uma janela é da pessoa e
 * resulta numa hora estimada, sempre tratada como estimativa nas leituras.
 */

/** Mesmo limite do mapa tropical: acima dele o Ascendente não é oferecido. */
export const LATITUDE_POLAR = 66.56;

const MINUTO = 60_000;
/** Passo da varredura: curto o bastante para signos de ascensão rápida. */
const PASSO_DA_VARREDURA = 30_000;
/** Precisão da fronteira entre dois signos. */
const PRECISAO_DA_FRONTEIRA = 1_000;

export interface LocalDaHora {
  /** AAAA-MM-DD no calendário local do nascimento. */
  data: string;
  latitude: number;
  longitude: number;
  /** Fuso IANA do local de nascimento. */
  fuso: string;
}

export interface JanelaDeHora {
  /** "HH:mm" local em que a janela começa. */
  inicio: string;
  /** "HH:mm" local em que a janela termina (o instante final não pertence a ela). */
  fim: string;
  inicioUtc: Date;
  fimUtc: Date;
  /** Índice do signo sideral do Ascendente na janela (0 = Áries). */
  signo: number;
  /**
   * "HH:mm" local no meio da janela, conferida: convertida de volta pelo fuso,
   * cai dentro da própria janela. `null` quando nenhum minuto do relógio local
   * representa a janela sem ambiguidade (janela menor que um minuto ou
   * inteiramente dentro da hora repetida do fim do horário de verão).
   */
  horaEstimada: string | null;
}

function conferirEntrada(local: LocalDaHora) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(local.data))
    throw new RangeError('Informe a data no formato AAAA-MM-DD.');
  const [ano, mes, dia] = local.data.split('-').map(Number);
  const meiaNoite = Date.UTC(ano, mes - 1, dia);
  if (new Date(meiaNoite).toISOString().slice(0, 10) !== local.data)
    throw new RangeError('Data de nascimento inexistente.');
  if (!fusoValido(local.fuso)) throw new RangeError('Fuso IANA indisponível.');
  if (
    !Number.isFinite(local.latitude) ||
    !Number.isFinite(local.longitude) ||
    Math.abs(local.latitude) > 90 ||
    Math.abs(local.longitude) > 180
  )
    throw new RangeError('Local de nascimento inválido.');
  if (Math.abs(local.latitude) >= LATITUDE_POLAR)
    throw new RangeError(
      'Em latitude polar o Ascendente não é calculado; as janelas de hora não estão disponíveis.'
    );
  return new Date(meiaNoite + 86_400_000).toISOString().slice(0, 10);
}

/**
 * Minuto do relógio local que representa a janela: o mais próximo do meio que,
 * convertido de volta pelo fuso, cai dentro dela e no mesmo dia civil.
 */
function horaRepresentativa(
  local: LocalDaHora,
  inicioUtc: number,
  fimUtc: number
): string | null {
  const meio = Math.floor((inicioUtc + fimUtc) / 2 / MINUTO) * MINUTO;
  const alcance = Math.ceil((fimUtc - inicioUtc) / 2 / MINUTO) + 1;
  for (let distancia = 0; distancia <= alcance; distancia += 1) {
    for (const sentido of distancia === 0 ? [0] : [1, -1]) {
      const candidato = meio + sentido * distancia * MINUTO;
      if (candidato < inicioUtc || candidato >= fimUtc) continue;
      const instante = new Date(candidato);
      if (dataLocal(instante, local.fuso) !== local.data) continue;
      const hora = horaLocal(instante, local.fuso);
      const deVolta = localParaUtc(local.data, hora, local.fuso).getTime();
      if (deVolta >= inicioUtc && deVolta < fimUtc) return hora;
    }
  }
  return null;
}

/**
 * Janelas contíguas que cobrem todo o dia civil de nascimento, da primeira à
 * última hora local (23, 24 ou 25 horas, conforme o horário de verão).
 */
export function calcularJanelasDeHora(local: LocalDaHora): JanelaDeHora[] {
  const diaSeguinte = conferirEntrada(local);
  const inicioDoDia = localParaUtc(local.data, '00:00', local.fuso).getTime();
  const fimDoDia = localParaUtc(diaSeguinte, '00:00', local.fuso).getTime();
  if (!(fimDoDia > inicioDoDia))
    throw new RangeError('Não foi possível delimitar o dia de nascimento.');

  const signoEm = (ms: number) =>
    Math.floor(
      ascendenteSideral(new Date(ms), local.latitude, local.longitude) / 30
    ) % 12;

  // Fronteiras entre signos: varredura e bissecção até um segundo.
  const cortes: number[] = [inicioDoDia];
  const signos: number[] = [signoEm(inicioDoDia)];
  let anteriorMs = inicioDoDia;
  let anterior = signos[0];
  while (anteriorMs < fimDoDia) {
    const proximoMs = Math.min(fimDoDia, anteriorMs + PASSO_DA_VARREDURA);
    const proximo = signoEm(proximoMs);
    if (proximo !== anterior) {
      let a = anteriorMs;
      let b = proximoMs;
      while (b - a > PRECISAO_DA_FRONTEIRA) {
        const meio = Math.floor((a + b) / 2);
        if (signoEm(meio) === anterior) a = meio;
        else b = meio;
      }
      // Uma troca no instante final pertence ao dia seguinte.
      if (b < fimDoDia) {
        cortes.push(b);
        signos.push(signoEm(b));
      }
    }
    anteriorMs = proximoMs;
    anterior = proximo;
  }
  cortes.push(fimDoDia);

  return signos.map((signo, indice) => {
    const inicioUtc = cortes[indice];
    const fimUtc = cortes[indice + 1];
    return {
      inicio: horaLocal(new Date(inicioUtc), local.fuso),
      fim: horaLocal(new Date(fimUtc), local.fuso),
      inicioUtc: new Date(inicioUtc),
      fimUtc: new Date(fimUtc),
      signo,
      horaEstimada: horaRepresentativa(local, inicioUtc, fimUtc),
    };
  });
}

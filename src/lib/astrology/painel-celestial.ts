import { diaVedicoDoPerfil, mapaDoPerfil } from './perfil-astrologico';
import type { PerfilAstrologico } from './perfil-astrologico';
import { diaParaJson, mapaParaJson } from './serializacao';
import { dataLocal, localParaUtc } from './tempo';
import { lerMapaComoLyra } from '@/lib/lyra/leitura-do-mapa';
import { LocalSemNascerDoSolError } from './panchang';

/** Composição de apresentação: reutiliza integralmente os motores existentes. */
export function montarPainelCelestial(
  perfil: PerfilAstrologico,
  agora = new Date()
) {
  const local = perfil.localDoDia;
  const mapa = mapaDoPerfil(perfil, agora);
  const hoje = local ? dataLocal(agora, local.fuso) : null;
  const dias =
    hoje && local
      ? Array.from({ length: 7 }, (_, indice) => {
          const calendario = new Date(`${hoje}T12:00:00Z`);
          calendario.setUTCDate(calendario.getUTCDate() + indice);
          const data = calendario.toISOString().slice(0, 10);
          const referencia =
            indice === 0 ? agora : localParaUtc(data, '12:00', local.fuso);
          const natal = mapaDoPerfil(perfil, referencia);
          try {
            const dia = diaVedicoDoPerfil(perfil, natal, data);
            return {
              data,
              dia: dia ? diaParaJson(dia) : null,
              leitura: natal ? lerMapaComoLyra(natal) : null,
              erro: null,
            };
          } catch (erro) {
            if (!(erro instanceof LocalSemNascerDoSolError)) throw erro;
            return {
              data,
              dia: null,
              leitura: natal ? lerMapaComoLyra(natal) : null,
              erro: erro.message,
            };
          }
        })
      : [];
  return {
    hoje,
    fuso: local?.fuso ?? null,
    faltando: perfil.faltando,
    mapa: mapa ? mapaParaJson(mapa) : null,
    leitura: mapa ? lerMapaComoLyra(mapa) : null,
    dias,
  };
}

export type PainelCelestial = ReturnType<typeof montarPainelCelestial>;

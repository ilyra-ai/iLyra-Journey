import type { PerfilAstrologico } from './perfil-astrologico';
import { calcularMapaTropicalPorLocal, calcularSolPorData } from './tropical';
import { lerMapaTropical } from '@/lib/lyra/leitura-tropical';

/** Adaptador sem persistência: usa somente os dados do próprio titular já carregados. */
export function tropicalDoPerfil(
  perfil: PerfilAstrologico,
  agora = new Date(),
  ocorrencia?: 'anterior' | 'posterior'
) {
  const { data, hora, local } = perfil.nascimento;
  if (!data) return { mapa: null, leitura: null, faltando: ['data'] };
  const mapa =
    hora && local
      ? calcularMapaTropicalPorLocal(
          {
            data,
            hora,
            ocorrencia,
            local: {
              nome: local.rotulo,
              latitude: local.latitude,
              longitude: local.longitude,
              fuso: local.fuso,
            },
          },
          agora
        )
      : calcularSolPorData(data, agora);
  return { mapa, leitura: lerMapaTropical(mapa), faltando: mapa.faltando };
}

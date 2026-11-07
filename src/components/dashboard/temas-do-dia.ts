import sensibilidade from '@/assets/celestial/temas/sensibilidade.png';
import prosperidade from '@/assets/celestial/temas/prosperidade.png';
import obstaculos from '@/assets/celestial/temas/obstaculos.png';
import bemEstar from '@/assets/celestial/temas/bem-estar.png';
import resistencias from '@/assets/celestial/temas/resistencias.png';
import realizacao from '@/assets/celestial/temas/realizacao.png';
import desgaste from '@/assets/celestial/temas/desgaste.png';
import amizade from '@/assets/celestial/temas/amizade.png';
import grandeApoio from '@/assets/celestial/temas/grande-apoio.png';

/** Catálogo visual dos temas calculados por Tara Bala, sem alterar a leitura. */
const ARTES = {
  sensibilidade,
  prosperidade,
  obstáculos: obstaculos,
  'bem-estar': bemEstar,
  resistências: resistencias,
  realização: realizacao,
  desgaste,
  amizade,
  'grande apoio': grandeApoio,
};

export function arteDoTema(tema: string | undefined) {
  return tema && Object.hasOwn(ARTES, tema)
    ? ARTES[tema as keyof typeof ARTES]
    : null;
}

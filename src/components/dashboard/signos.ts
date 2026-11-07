import aries from '@/assets/celestial/signos/aries.png';
import touro from '@/assets/celestial/signos/touro.png';
import gemeos from '@/assets/celestial/signos/gemeos.png';
import cancer from '@/assets/celestial/signos/cancer.png';
import leao from '@/assets/celestial/signos/leao.png';
import virgem from '@/assets/celestial/signos/virgem.png';
import libra from '@/assets/celestial/signos/libra.png';
import escorpiao from '@/assets/celestial/signos/escorpiao.png';
import sagitario from '@/assets/celestial/signos/sagitario.png';
import capricornio from '@/assets/celestial/signos/capricornio.png';
import aquario from '@/assets/celestial/signos/aquario.png';
import peixes from '@/assets/celestial/signos/peixes.png';

/** Catálogo de ilustrações; o signo vem do cálculo, nunca desta apresentação. */
export const ARTE_DO_SIGNO = {
  Áries: aries,
  Touro: touro,
  Gêmeos: gemeos,
  Câncer: cancer,
  Leão: leao,
  Virgem: virgem,
  Libra: libra,
  Escorpião: escorpiao,
  Sagitário: sagitario,
  Capricórnio: capricornio,
  Aquário: aquario,
  Peixes: peixes,
};

export function arteDoSigno(signo: string) {
  return ARTE_DO_SIGNO[signo as keyof typeof ARTE_DO_SIGNO] ?? null;
}

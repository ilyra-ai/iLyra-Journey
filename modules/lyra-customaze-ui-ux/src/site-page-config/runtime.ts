function clampScale(value: number, min = 0.8, max = 1.4) {
  return Math.min(max, Math.max(min, value));
}

export function scaleRem(baseRem: number, scale: number) {
  return `${(baseRem * clampScale(scale)).toFixed(3)}rem`;
}

export function scalePx(basePx: number, scale: number) {
  return `${(basePx * clampScale(scale)).toFixed(2)}px`;
}

export function scaleNumber(baseValue: number, scale: number) {
  return Number((baseValue * clampScale(scale)).toFixed(2));
}

/** Configurações históricas não reintroduzem entradas de editores aposentados. */
export function rotaDeEditorAposentada(href: string) {
  const caminho = href.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  return ['/admin/puck', '/admin/page-builder'].some(
    (rota) => caminho === rota || caminho.startsWith(`${rota}/`)
  );
}

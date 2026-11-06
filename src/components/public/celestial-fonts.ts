import localFont from 'next/font/local';

const titulo = localFont({
  src: '../../assets/fonts/clicker-script/ClickerScript-Regular.ttf',
  variable: '--font-celestial-editorial',
  weight: '400',
  display: 'swap',
});

const texto = localFont({
  src: '../../assets/fonts/imprima/Imprima-Regular.ttf',
  variable: '--font-imprima',
  weight: '400',
  display: 'swap',
});

const enfase = localFont({
  src: '../../assets/fonts/varela/varela-latin-400-normal.ttf',
  variable: '--font-varela',
  weight: '400',
  display: 'swap',
});

const enfaseEstendida = localFont({
  src: '../../assets/fonts/varela/varela-latin-ext-400-normal.ttf',
  variable: '--font-varela-estendida',
  weight: '400',
  display: 'swap',
  preload: false,
});

export const fontesCelestiais = [
  titulo.variable,
  texto.variable,
  enfase.variable,
  enfaseEstendida.variable,
].join(' ');

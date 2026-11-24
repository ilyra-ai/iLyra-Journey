'use client';

import Image from 'next/image';
import horizonte from '@/assets/celestial/horizonte.png';
import { SimboloILyra } from '@/components/marca/ilyra/SimboloILyra';
import { CelestialBrand } from '@/components/public/CelestialBrand';
import { cn } from '@/lib/utils';
import identidade from './public/CelestialIdentity.module.css';
import styles from './SplashScreen.module.css';

// Este componente acompanha estados reais de sessão, navegação e importação.
// Não controla o tempo de espera nem apresenta uma porcentagem inventada.
export function SplashScreen() {
  return (
    <main
      id="conteudo-principal"
      aria-busy="true"
      className={cn(identidade.theme, styles.screen)}
    >
      <Image
        src={horizonte}
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        className={styles.backdrop}
      />
      <header className={styles.header}>
        <CelestialBrand />
      </header>
      <section
        role="status"
        aria-live="polite"
        aria-labelledby="titulo-carregamento"
        className={styles.content}
      >
        <div className={styles.orbit} aria-hidden="true">
          <span className={styles.orbitRing} />
          <SimboloILyra className={styles.symbol} />
        </div>
        <h1 id="titulo-carregamento">Um novo olhar está chegando.</h1>
        <p className={styles.message}>Preparando sua experiência iLyra.</p>
        <div className={styles.activity} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <footer className={styles.footer}>Seu espaço. Seu ritmo.</footer>
    </main>
  );
}

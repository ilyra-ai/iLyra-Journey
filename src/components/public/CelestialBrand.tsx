import Image from 'next/image';
import marca from '@/assets/celestial/marca.png';
import styles from './CelestialIdentity.module.css';

export function CelestialBrand() {
  return (
    <div className={styles.brand}>
      <Image
        src={marca}
        alt="Lyra MetaCare"
        sizes="(max-width: 700px) 240px, 340px"
        loading="eager"
        className={styles.brandImage}
      />
    </div>
  );
}

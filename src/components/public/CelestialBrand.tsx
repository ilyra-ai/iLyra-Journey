import { LogoILyra } from '@/components/marca/ilyra/LogoILyra';

import styles from './CelestialIdentity.module.css';

export function CelestialBrand() {
  return (
    <div className={styles.brand}>
      <LogoILyra className={styles.brandImage} />
    </div>
  );
}

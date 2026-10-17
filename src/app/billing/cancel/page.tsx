import { Suspense } from 'react';

import { SplashScreen } from '@/components/SplashScreen';
import { BillingReturnExperience } from '@/components/subscription/BillingReturnExperience';
import { METADADOS_FORA_DO_MENU } from '@/lib/metadados/pagina';

export const metadata = METADADOS_FORA_DO_MENU.pagamentoCancelado;

export default function BillingCancelPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <BillingReturnExperience mode="cancel" />
    </Suspense>
  );
}

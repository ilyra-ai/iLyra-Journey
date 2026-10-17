import { Suspense } from 'react';

import { SplashScreen } from '@/components/SplashScreen';
import { BillingReturnExperience } from '@/components/subscription/BillingReturnExperience';
import { METADADOS_FORA_DO_MENU } from '@/lib/metadados/pagina';

export const metadata = METADADOS_FORA_DO_MENU.pagamentoConfirmado;

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <BillingReturnExperience mode="success" />
    </Suspense>
  );
}

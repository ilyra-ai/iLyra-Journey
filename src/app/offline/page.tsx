import { CentralOffline } from '@/components/offline/CentralOffline';
export const metadata = { title: 'Sem internet | Lyra MetaCare' };
/** Página pública: nenhum dado pessoal é renderizado no documento armazenado. */
export default function OfflinePage() {
  return <CentralOffline />;
}

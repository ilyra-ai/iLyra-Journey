import { HttpError } from '@/lib/http-error';
import { limiteDeMetricasDaConta } from './service';

export function corteDoHistorico(limite: number | null, agora = new Date()) {
  if (limite === null) return null;
  const corte = new Date(agora);
  corte.setUTCDate(corte.getUTCDate() - limite + 1);
  return corte.toISOString().slice(0, 10);
}

export async function exigirDiaNoHistorico(userId: string, data: string) {
  const limite = await limiteDeMetricasDaConta(userId);
  const corte = corteDoHistorico(limite);
  if (limite === 0 || (corte && data < corte))
    throw new HttpError(
      'Este dia está fora do histórico disponível no seu plano.',
      403
    );
}

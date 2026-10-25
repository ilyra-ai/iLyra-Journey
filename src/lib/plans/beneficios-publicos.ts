import type { PlanFeatureAccess } from '@/types/subscription';

/** Usa os direitos persistidos; não mantém uma segunda lista comercial. */
export function recursoIncluido(f: PlanFeatureAccess) {
  return f.enabled && (f.featureType !== 'quota' || f.quotaValue !== 0);
}
export function beneficiosPublicos(features: PlanFeatureAccess[]) {
  return features.filter(recursoIncluido).map((f) => {
    if (f.featureType !== 'quota') return { key: f.key, label: f.name };
    if (f.quotaValue === null)
      return { key: f.key, label: `${f.name}: sem limite` };
    const numero = new Intl.NumberFormat('pt-BR').format(f.quotaValue);
    if (f.meterKind === 'rolling_days')
      return {
        key: f.key,
        label: `${f.name}: ${f.quotaValue === 1 ? 'último 1 dia' : `últimos ${numero} dias`}`,
      };
    let unidade = f.unit?.replace(/\/mês$/u, '');
    if (f.quotaValue === 1 && unidade)
      unidade =
        (
          {
            mensagens: 'mensagem',
            gerações: 'geração',
            profissionais: 'profissional',
            'consultas ativas': 'consulta ativa',
            dias: 'dia',
          } as Record<string, string>
        )[unidade] ?? unidade;
    const periodo =
      f.resetInterval === 'monthly'
        ? ' por mês'
        : f.resetInterval === 'concurrent'
          ? ' ao mesmo tempo'
          : '';
    return {
      key: f.key,
      label: `${f.name}: até ${numero}${unidade ? ` ${unidade}` : ''}${periodo}`,
    };
  });
}

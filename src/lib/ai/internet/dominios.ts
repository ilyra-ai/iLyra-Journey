import { z } from 'zod';

/**
 * Parte pura do alcance do acesso do modelo à internet (tarefa 212), sem
 * banco: pode ser usada no navegador pela tela de administração.
 */

/** Alcance do acesso do modelo à internet, escolhido pelo administrador. */
export type ModoDeAcesso = 'desligado' | 'lista' | 'total';

export interface AcessoInternet {
  modo: ModoDeAcesso;
  /** Domínios liberados no modo `lista` (subdomínios incluídos). */
  dominios: string[];
  atualizadoEm: string;
}

/** "Www.Gov.BR." → "gov.br"; recusa o que não é nome de domínio. */
export function normalizarDominio(bruto: string): string | null {
  const dominio = bruto
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
    .replace(/^www\./, '');
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
    dominio
  )
    ? dominio
    : null;
}

export const dominiosSchema = z
  .array(z.string().max(253))
  .max(200)
  .transform((lista, contexto) => {
    const normalizados: string[] = [];
    for (const item of lista) {
      const dominio = normalizarDominio(item);
      if (!dominio) {
        contexto.addIssue({
          code: 'custom',
          message: `Domínio inválido: ${item}`,
        });
        return z.NEVER;
      }
      if (!normalizados.includes(dominio)) normalizados.push(dominio);
    }
    return normalizados;
  });

/** O endereço pode ser lido no alcance configurado? */
export function hostPermitido(host: string, acesso: AcessoInternet) {
  if (acesso.modo === 'desligado') return false;
  if (acesso.modo === 'total') return true;
  const alvo = host.toLowerCase().replace(/\.$/, '');
  return acesso.dominios.some(
    (dominio) => alvo === dominio || alvo.endsWith(`.${dominio}`)
  );
}

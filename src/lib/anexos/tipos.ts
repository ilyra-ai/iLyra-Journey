/** Limites de produto, também conferidos no servidor. */
export const MAX_BYTES_ANEXO = 3 * 1024 * 1024;
export const MAX_TEXTO_ANEXO = 8000;
export interface AnexoPrivado {
  id: string;
  nome: string;
  tipo: string;
  bytes: number;
  criadaEm: string;
}

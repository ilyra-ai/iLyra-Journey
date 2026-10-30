import { HttpError } from '@/lib/http-error';
import { MAX_BYTES_ANEXO } from '@/lib/anexos/tipos';

/** Lê um corpo multipart/form-data com limite de tamanho conferido antes. */
export async function lerFormulario(request: Request) {
  const tamanho = Number(request.headers.get('content-length') ?? '0');
  // Foto de até 3 MiB mais os campos de texto do registro.
  if (tamanho > MAX_BYTES_ANEXO + 64 * 1024)
    throw new HttpError('Escolha uma foto de até 3 MiB.', 413);
  try {
    return await request.formData();
  } catch {
    throw new HttpError('Envie os dados como multipart/form-data.', 400);
  }
}
export async function fotoDoFormulario(f: FormData) {
  const foto = f.get('foto');
  if (foto === null) return null;
  if (!(foto instanceof File))
    throw new HttpError('Campo de foto inválido.', 400);
  return {
    nome: foto.name,
    tipo: foto.type,
    bytes: Buffer.from(await foto.arrayBuffer()),
  };
}
export function jsonDoFormulario(f: FormData, campo: string): unknown {
  const v = f.get(campo);
  if (typeof v !== 'string')
    throw new HttpError(`Campo ${campo} ausente.`, 400);
  try {
    return JSON.parse(v);
  } catch {
    throw new HttpError(`Campo ${campo} não é um JSON válido.`, 400);
  }
}

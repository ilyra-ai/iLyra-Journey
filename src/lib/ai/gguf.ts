import type { FileHandle } from 'node:fs/promises';

/** Lê metadados GGUF v2/v3 sem carregar os tensores ou o vocabulário inteiro. */
export async function arquiteturaGguf(
  arquivo: FileHandle
): Promise<string | null> {
  let posicao = 0;
  const limite = 64 * 1024 * 1024;
  const ler = async (tamanho: number): Promise<Buffer> => {
    if (
      !Number.isSafeInteger(tamanho) ||
      tamanho < 0 ||
      posicao + tamanho > limite
    )
      throw new Error('Metadados GGUF excedem o limite de leitura.');
    const buffer = Buffer.alloc(tamanho);
    const { bytesRead } = await arquivo.read(buffer, 0, tamanho, posicao);
    if (bytesRead !== tamanho) throw new Error('Cabeçalho GGUF truncado.');
    posicao += tamanho;
    return buffer;
  };
  const inteiro = async () => (await ler(4)).readUInt32LE();
  const longo = async () => {
    const valor = (await ler(8)).readBigUInt64LE();
    if (valor > BigInt(limite)) throw new Error('Comprimento GGUF inválido.');
    return Number(valor);
  };
  const texto = async () => {
    const tamanho = await longo();
    if (tamanho > 1024 * 1024) throw new Error('Texto GGUF excessivo.');
    return (await ler(tamanho)).toString('utf8');
  };
  const ignorar = async (tipo: number, quantidade = 1): Promise<void> => {
    // Tamanhos definidos no formato oficial GGUF, não uma lista de modelos.
    const tamanhos: Record<number, number> = {
      0: 1,
      1: 1,
      2: 2,
      3: 2,
      4: 4,
      5: 4,
      6: 4,
      7: 1,
      10: 8,
      11: 8,
      12: 8,
    };
    if (tipo in tamanhos) {
      posicao += tamanhos[tipo] * quantidade;
      if (posicao > limite) throw new Error('Metadados GGUF excessivos.');
      return;
    }
    if (tipo === 8) {
      for (let i = 0; i < quantidade; i++) {
        const tamanho = await longo();
        posicao += tamanho;
        if (posicao > limite) throw new Error('Metadados GGUF excessivos.');
      }
      return;
    }
    if (tipo === 9 && quantidade === 1) {
      const subtipo = await inteiro();
      if (subtipo === 9) throw new Error('Array GGUF aninhado inválido.');
      await ignorar(subtipo, await longo());
      return;
    }
    throw new Error('Tipo de metadado GGUF desconhecido.');
  };
  try {
    if ((await ler(4)).toString('ascii') !== 'GGUF') return null;
    const versao = await inteiro();
    if (versao !== 2 && versao !== 3) return null;
    const tensores = (await ler(8)).readBigUInt64LE();
    if (tensores === BigInt(0)) return null;
    const entradas = await longo();
    if (entradas > 100000) return null;
    for (let i = 0; i < entradas; i++) {
      const chave = await texto();
      const tipo = await inteiro();
      if (chave === 'general.architecture')
        return tipo === 8 ? await texto() : null;
      await ignorar(tipo);
    }
    return null;
  } catch {
    return null;
  }
}

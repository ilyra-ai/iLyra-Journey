/** SSE incremental: conserva UTF-8, linhas partidas e eventos multilinha. */
export async function* eventosSse(
  corpo: ReadableStream<Uint8Array>,
  sinal?: AbortSignal
): AsyncGenerator<string> {
  const leitor = corpo.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let pendente = '';
  let total = 0;
  const dados = (bloco: string) =>
    bloco
      .split('\n')
      .filter((linha) => linha.startsWith('data:'))
      .map((linha) => linha.slice(5).replace(/^ /, ''))
      .join('\n');
  try {
    while (true) {
      sinal?.throwIfAborted();
      const { value, done } = await leitor.read();
      if (value) {
        total += value.byteLength;
        if (total > 8 * 1024 * 1024)
          throw new Error('O fluxo excedeu o tamanho permitido.');
      }
      pendente += decoder.decode(value, { stream: !done });
      pendente = pendente.replace(/\r\n/g, '\n');
      let corte: number;
      while ((corte = pendente.indexOf('\n\n')) >= 0) {
        if (corte > 262144)
          throw new Error('Um evento excedeu o tamanho permitido.');
        const bloco = pendente.slice(0, corte);
        pendente = pendente.slice(corte + 2);
        const texto = dados(bloco);
        if (texto) yield texto;
      }
      if (pendente.length > 262144)
        throw new Error('Um evento excedeu o tamanho permitido.');
      if (done) {
        const texto = dados(pendente);
        if (texto) yield texto;
        return;
      }
    }
  } finally {
    await leitor.cancel().catch(() => undefined);
    leitor.releaseLock();
  }
}

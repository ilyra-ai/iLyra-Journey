import { processarFilaDaMemoria } from './servico';

type EstadoGlobal = typeof globalThis & {
  __lyraRotinaDaMemoria?: { timer: NodeJS.Timeout };
};

/** Fila durável: um trabalho de cada vez, com lease no MySQL entre instâncias. */
export function iniciarRotinaDaMemoria() {
  const estado = globalThis as EstadoGlobal;
  if (!process.env.LYRA_MEMORIA_SEGREDO || estado.__lyraRotinaDaMemoria) return;
  const agendar = (espera: number) => {
    const timer = setTimeout(() => void executar(), espera);
    timer.unref();
    estado.__lyraRotinaDaMemoria = { timer };
  };
  const executar = async () => {
    let processado = false;
    try {
      processado = (await processarFilaDaMemoria()).processado;
    } catch {
      console.error(
        '[memoria:rotina] Não foi possível consultar a fila; nova tentativa será feita automaticamente.'
      );
    } finally {
      agendar(processado ? 1000 : 15_000);
    }
  };
  agendar(30_000);
}

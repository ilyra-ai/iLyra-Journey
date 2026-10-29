/** Prepara exclusivamente o documento público e o código do aplicativo. */
export async function prepararPaginaOffline() {
  if (!('serviceWorker' in navigator) || !isSecureContext)
    throw new Error(
      'Este navegador exige HTTPS e suporte a service worker para preparar a página offline.'
    );
  const manifesto = await fetch('/offline-assets.json', {
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!manifesto.ok)
    throw new Error(
      'A página offline exige um build de produção concluído. A preparação não foi feita.'
    );
  const r = await navigator.serviceWorker.register('/offline-sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  await r.update();
  if (!r.active || r.installing)
    await new Promise<void>((resolve, reject) => {
      const w = r.installing ?? r.waiting;
      if (!w)
        return reject(new Error('Não foi possível instalar a página offline.'));
      const limite = window.setTimeout(
        () =>
          reject(
            new Error(
              'A preparação demorou demais. Tente novamente com conexão estável.'
            )
          ),
        60000
      );
      const conferir = () => {
        if (w.state === 'activated') {
          clearTimeout(limite);
          resolve();
        }
        if (w.state === 'redundant') {
          clearTimeout(limite);
          reject(
            new Error(
              'Não foi possível baixar todos os arquivos. Nenhum cofre foi criado.'
            )
          );
        }
      };
      w.addEventListener('statechange', conferir);
      conferir();
    });
  if (!(await caches.match('/offline')))
    throw new Error(
      'O documento público não foi armazenado. Tente preparar novamente.'
    );
}

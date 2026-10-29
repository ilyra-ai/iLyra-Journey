/* Somente o documento público /offline e arquivos estáticos do próprio build. */
let nome;
const PREFIXO = 'lyra-offline-publico-';
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const r = await fetch('/offline-assets.json', {
        cache: 'no-store',
        credentials: 'omit',
      });
      if (!r.ok) throw new Error('Manifesto offline indisponível.');
      const m = await r.json();
      if (
        !/^[a-f0-9]{24}$/.test(m.versao) ||
        !Array.isArray(m.assets) ||
        m.assets.some(
          (p) => !/^\/_next\/static\/[\w./-]+\.(js|css|woff2?|ttf)$/.test(p)
        )
      )
        throw new Error('Manifesto inválido.');
      nome = PREFIXO + m.versao;
      const cache = await caches.open(nome);
      try {
        await cache.addAll(
          ['/offline', ...m.assets].map(
            (url) => new Request(url, { credentials: 'omit', cache: 'reload' })
          )
        );
        await self.skipWaiting();
      } catch (e) {
        await caches.delete(nome);
        throw e;
      }
    })()
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (!nome)
        nome = (await caches.keys())
          .filter((k) => k.startsWith(PREFIXO))
          .at(-1);
      for (const k of await caches.keys())
        if (k.startsWith(PREFIXO) && k !== nome) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});
self.addEventListener('fetch', (event) => {
  const r = event.request,
    u = new URL(r.url);
  if (
    r.method !== 'GET' ||
    u.origin !== self.location.origin ||
    u.pathname.startsWith('/api/')
  )
    return;
  if (r.mode === 'navigate') {
    event.respondWith(
      fetch(r).catch(async () => {
        if (u.pathname !== '/offline')
          return Response.redirect(
            new URL('/offline', self.location.origin).href,
            302
          );
        const cached = await caches.match('/offline');
        if (!cached) throw new Error('Página offline ainda não preparada.');
        return cached;
      })
    );
  } else if (
    u.pathname.startsWith('/_next/static/') &&
    /\.(js|css|woff2?|ttf)$/.test(u.pathname)
  ) {
    event.respondWith(caches.match(r).then((cached) => cached || fetch(r)));
  }
});

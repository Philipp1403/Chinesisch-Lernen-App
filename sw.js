const V = 'hanyu-v17';
const CORE = ['./', 'index.html', 'style.css', 'core.js', 'speech.js', 'lock-config.js', 'lock.js', 'azure.js', 'sync.js', 'tower.js', 'writing.js', 'exercises.js', 'views.js', 'hanzi-writer.min.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'data/words.json', 'data/hsk1.json', 'data/chars-1.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const isCode = r.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(new URL(r.url).pathname);
  if (isCode) { // Code: erst Netz (neue Version), sonst Cache
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
  } else { // Daten: erst Cache, dann Netz und merken
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
  }
});

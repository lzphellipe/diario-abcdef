/* Service worker do Diário ABCDEF: app offline e arquivos locais (fotos e laudos) servidos do IndexedDB. */
const VERSION = "diario-v1";
const SHELL = ["./", "index.html", "pwa.js", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const RUNTIME = [/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow\//, /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\//];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function fileFromIdb(id) {
  return new Promise(resolve => {
    const r = indexedDB.open("diario-files", 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore("files", { keyPath: "id" }); s.createIndex("sub", "sub"); };
    r.onerror = () => resolve(null);
    r.onsuccess = () => {
      try { const g = r.result.transaction("files").objectStore("files").get(id); g.onsuccess = () => resolve(g.result || null); g.onerror = () => resolve(null); }
      catch (e) { resolve(null); }
    };
  });
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const scope = new URL(self.registration.scope);
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname + "_blob/")) {
    const id = url.pathname.slice((scope.pathname + "_blob/").length);
    e.respondWith(fileFromIdb(id).then(f => f ? new Response(f.blob, { headers: { "Content-Type": f.type, "Cache-Control": "no-store" } }) : new Response("Arquivo não encontrado neste aparelho.", { status: 404 })));
    return;
  }
  if (url.origin === scope.origin) {
    // Rede primeiro para o app (pega atualizações), cache se estiver offline.
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
    return;
  }
  if (RUNTIME.some(re => re.test(e.request.url))) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })));
  }
});

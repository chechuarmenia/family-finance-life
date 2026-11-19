// Family Finance Life service worker: makes the site installable and opens fast.
// Network-first for the app shell; never touches Supabase API/auth traffic.
const CACHE = 'ffl-shell-v1';
const SHELL = ['./', './index.html', './auth.js', './config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin && url.pathname.startsWith(new URL('./', self.location).pathname);
  if (!sameOrigin && !req.url.startsWith(CDN)) return; // Supabase data and auth always go straight to the network
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});

// Service worker minimal — sengaja TIDAK meng-cache apa pun dan TIDAK
// meng-intercept fetch. Ada semata agar Chrome menganggap DAMS PWA penuh dan
// memancarkan `beforeinstallprompt` dengan andal (tanpa service worker, Chrome
// menahan tawaran pasang otomatis jauh lebih ketat).
//
// Karena tak ada fetch handler yang meng-cache, tak ada risiko halaman/bundel
// basi vs server — itulah alasan mode offline sengaja tidak dibuat.
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

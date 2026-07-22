// Minimal, deliberately no-op service worker (Architecture.md §PWA:
// "installable, без offline-режиму") — exists only so browsers consider
// the app installable; it does not cache anything or serve while
// offline. skipWaiting/clients.claim so a new deploy takes over
// immediately instead of every open tab needing to be closed first.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally not calling event.respondWith — every request falls
  // through to the network exactly as it would with no service worker at
  // all. The listener's mere presence is what satisfies installability.
});

// Minimal service worker. Finns BARA för att Chrome ska erbjuda "Lägg till
// på hemskärmen" (installbarhetskriteriet kräver en fetch-handler). Ingen
// cachning - varje request går rakt ut på nätet, så inget blir inaktuellt
// när appen deployas om.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});

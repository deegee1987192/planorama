// Minimal service worker so Planorama can be installed as an app.
// It doesn't cache or intercept anything: your data always comes fresh from Supabase.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Let the browser handle every request normally.
});

/* Service worker exclusivo para Web Push. Intencionalmente não possui
 * listeners de fetch/install nem cache: ele não interfere na navegação,
 * no Supabase ou na atualização dos arquivos do NEXO. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title || "NEXO FIT";
  const options = {
    body: payload.body || "Você tem uma nova atualização.",
    icon: "/nexo-icon-192.png",
    badge: "/nexo-icon-192.png",
    tag: payload.tag || "nexo-update",
    renotify: false,
    data: { url: payload.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin)
    .href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

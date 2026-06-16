self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "KP Hauling";
  const options = {
    body: data.body || data.detail || "",
    icon: "/hauling/icon.jpg",
    badge: "/hauling/icon.jpg",
    data: {
      url: data.url || "/hauling"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/hauling";
  event.waitUntil(clients.openWindow(url));
});

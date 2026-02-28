// Service Worker Registration
// Enables PWA offline functionality for SBI Branch Application Catalogue

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported in this browser');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Registered successfully, scope:', registration.scope);

      // Handle updates: when a new SW is waiting, reload to activate it
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New content available — the SW will activate on next navigation
            console.log('[SW] New version available');
          }
        });
      });

    } catch (error) {
      console.warn('[SW] Registration failed:', error);
    }
  });
}

export function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => console.error('[SW] Unregister failed:', error.message));
}

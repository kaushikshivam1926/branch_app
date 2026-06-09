import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { registerServiceWorker } from "./lib/registerSW";

function AppWithHashRouter() {
  return (
    <Router hook={useHashLocation}>
      <App />
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithHashRouter />);

// Register service worker for offline functionality
// Skip in dev mode — the SW caches @vite/client with the old tunnel hostname,
// causing HMR WebSocket failures after sandbox hibernation/resume cycles.
if (import.meta.env.PROD) {
  registerServiceWorker();
} else {
  // In dev: aggressively unregister ALL service workers and clear ALL caches
  // so that stale SW never serves old @vite/client with wrong tunnel hostname.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

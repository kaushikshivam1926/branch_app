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
registerServiceWorker();

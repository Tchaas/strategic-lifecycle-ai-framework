import { createRoot } from "react-dom/client";
import WireframeApp from "./app/WireframeApp.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";

createRoot(document.getElementById("root")!).render(<WireframeApp />);

// Remove any previously-installed service worker (Figma Make leftover) and its
// caches. Anyone who visited before still has one registered, so we actively
// unregister on every load and purge Cache Storage to stop stale API responses.
async function unregisterServiceWorkers() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("Service worker cleanup failed:", error);
  }
}

unregisterServiceWorkers();

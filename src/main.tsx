import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

const SW_UPDATE_PENDING_KEY = 'pwa_update_pending';
const SW_RELOAD_DONE_KEY = 'pwa_update_reload_done';

// Registro global do Service Worker com atualização segura
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    try {
      sessionStorage.setItem(SW_UPDATE_PENDING_KEY, '1');
      sessionStorage.removeItem(SW_RELOAD_DONE_KEY);
    } catch {
      // ignore storage errors
    }
    updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update().catch(() => {
        // ignore update errors
      });
    }, 5 * 60 * 1000);
  },
  onRegisterError(error) {
    console.error('❌ Erro ao registrar Service Worker:', error);
  },
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    let hasPendingUpdate = false;
    let alreadyReloaded = false;

    try {
      hasPendingUpdate = sessionStorage.getItem(SW_UPDATE_PENDING_KEY) === '1';
      alreadyReloaded = sessionStorage.getItem(SW_RELOAD_DONE_KEY) === '1';
    } catch {
      hasPendingUpdate = true;
      alreadyReloaded = false;
    }

    if (!hasPendingUpdate || alreadyReloaded) {
      return;
    }

    try {
      sessionStorage.setItem(SW_RELOAD_DONE_KEY, '1');
      sessionStorage.removeItem(SW_UPDATE_PENDING_KEY);
    } catch {
      // ignore storage errors
    }

    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);

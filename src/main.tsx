import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Registro do Service Worker com auto-update
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);

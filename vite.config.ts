import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteQRCodePlugin } from "./scripts/vite-qr-plugin.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Aceita conexões de todas as interfaces de rede IPv4 e IPv6
    port: 8080,
    strictPort: false,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "development" && viteQRCodePlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

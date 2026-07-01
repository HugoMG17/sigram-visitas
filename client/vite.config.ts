import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "SIGRAM VISITAS",
        short_name: "SIGRAM",
        description: "Gestión de obras y visitas para arquitectos",
        theme_color: "#1e293b",
        background_color: "#1e293b",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Las llamadas a /api nunca se precachean como app shell; el offline
        // de datos lo gestiona Dexie (Fase 3/4), no el cache HTTP de Workbox.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});

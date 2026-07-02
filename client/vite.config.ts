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
        // /api nunca se sirve como app shell cacheada; el offline de datos lo
        // gestiona Dexie, no el cache HTTP de Workbox. /auth tampoco: si el
        // Service Worker intercepta la navegación a /auth/google y sirve el
        // shell cacheado en su lugar, el login nunca llega a alcanzar al
        // servidor real (bucle: la SPA se recarga sola sin parar).
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});

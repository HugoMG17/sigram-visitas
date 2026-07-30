import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// La versión se lee del package.json y se incrusta en el build, para que la
// app pueda mostrarla y se sepa de un vistazo qué versión se está usando.
const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      // "prompt" y no "autoUpdate": con autoUpdate el módulo virtual decide
      // solo cuándo aplicar la versión nueva, y aquí hace falta comprobar
      // antes que no queden datos sin sincronizar ni un formulario a medias
      // (ver ActualizacionApp.tsx). injectRegister: null porque el registro
      // lo hace la propia app; si no, se registraría dos veces.
      registerType: "prompt",
      injectRegister: null,
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

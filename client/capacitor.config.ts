import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sigram.visitas",
  appName: "SIGRAM VISITAS",
  // Los assets del cliente compilado van empaquetados dentro del APK: la app
  // arranca siempre, con o sin conexión (los datos offline los gestiona
  // Dexie, igual que en la web).
  webDir: "dist",
  android: {
    // El login devuelve el control a la app vía deep link sigram://auth;
    // el esquema se declara en el AndroidManifest (intent-filter).
    allowMixedContent: false,
  },
};

export default config;

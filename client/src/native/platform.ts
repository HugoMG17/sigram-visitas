import { Capacitor } from "@capacitor/core";

// true cuando el cliente corre empaquetado dentro del APK de Capacitor
// (Android); false en el navegador (web/PWA), donde nada de este módulo
// cambia el comportamiento existente.
export const isNative = Capacitor.isNativePlatform();

// El APK no se sirve desde el servidor (sus assets van dentro del paquete),
// así que la URL del backend tiene que ir fijada en el build. Se puede
// sobreescribir con VITE_NATIVE_SERVER_URL para probar contra otro entorno.
export const nativeServerUrl: string =
  import.meta.env.VITE_NATIVE_SERVER_URL ?? "https://sigram-visitas.onrender.com";

import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Preferences } from "@capacitor/preferences";
import { isNative, nativeServerUrl } from "./platform";

const TOKEN_KEY = "sigram:nativeToken";

// Copia en memoria del token guardado en Preferences: los interceptores de
// axios lo necesitan de forma síncrona en cada petición. Se carga una vez
// en initNativeAuth(), antes de renderizar la app.
let cachedToken: string | null = null;

export function getNativeToken(): string | null {
  return cachedToken;
}

export async function clearNativeToken(): Promise<void> {
  cachedToken = null;
  await Preferences.remove({ key: TOKEN_KEY });
}

// Abre el login de Google en el navegador del sistema (Chrome Custom Tab).
// Google no permite OAuth dentro del WebView de la app, y las cookies del
// navegador no llegan al WebView: por eso el servidor, al terminar, redirige
// a sigram://auth?token=... y la app captura ese deep link aquí abajo.
export async function loginNativo(): Promise<void> {
  await Browser.open({ url: `${nativeServerUrl}/auth/google?client=native` });
}

export async function initNativeAuth(): Promise<void> {
  if (!isNative) return;

  const { value } = await Preferences.get({ key: TOKEN_KEY });
  cachedToken = value;

  void CapacitorApp.addListener("appUrlOpen", ({ url }) => {
    const match = /^sigram:\/\/auth\?token=([a-f0-9]+)/i.exec(url);
    if (!match) return;
    void (async () => {
      cachedToken = match[1];
      await Preferences.set({ key: TOKEN_KEY, value: match[1] });
      await Browser.close().catch(() => undefined);
      // Arranque limpio con el token ya cargado: el gate de login deja pasar
      // y el motor de sync hace el primer pull con la sesión nueva.
      window.location.reload();
    })();
  });
}

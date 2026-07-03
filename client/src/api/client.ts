import axios from "axios";
import { clearNativeToken, getNativeToken } from "../native/auth";
import { isNative, nativeServerUrl } from "../native/platform";

// En dev el cliente Vite corre en :5173 y el servidor en :4000 aparte (por
// eso, al abrir desde el móvil por IP local, apuntamos al mismo host pero
// puerto 4000). En producción (ej. Render) el propio servidor sirve el
// cliente ya compilado desde el mismo origen, así que "/api" relativo basta
// y funciona sea cual sea el dominio. En el APK (Capacitor) los assets van
// empaquetados y no hay "mismo origen": se apunta al servidor público.
function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (isNative) return `${nativeServerUrl}/api`;
  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4000/api`;
  }
  return "/api";
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

// En el APK la sesión no viaja en cookie sino en un token Bearer (guardado
// tras el login nativo); se añade a todas las peticiones.
apiClient.interceptors.request.use((config) => {
  const token = getNativeToken();
  if (isNative && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el login con Google está activo y la sesión caduca, el servidor
// responde 401 a las llamadas de API. En web se redirige al login (una única
// vez: el flag evita bucles si varias peticiones fallan a la vez). En el APK
// no hay redirección posible: se descarta el token revocado/caducado y se
// recarga, con lo que la pantalla de login nativa vuelve a aparecer.
let redirectingToLogin = false;
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !redirectingToLogin) {
      redirectingToLogin = true;
      if (isNative) {
        void clearNativeToken().then(() => window.location.reload());
      } else {
        window.location.assign("/auth/google");
      }
    }
    return Promise.reject(error);
  }
);

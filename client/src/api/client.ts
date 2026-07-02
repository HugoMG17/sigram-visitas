import axios from "axios";

// En dev el cliente Vite corre en :5173 y el servidor en :4000 aparte (por
// eso, al abrir desde el móvil por IP local, apuntamos al mismo host pero
// puerto 4000). En producción (ej. Render) el propio servidor sirve el
// cliente ya compilado desde el mismo origen, así que "/api" relativo basta
// y funciona sea cual sea el dominio.
function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
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

// Si el login con Google está activo y la sesión caduca, el servidor
// responde 401 a las llamadas de API. Se redirige una única vez (el flag
// evita bucles si varias peticiones fallan a la vez, p. ej. el motor de
// sincronización reintentando varios adjuntos en paralelo).
let redirectingToLogin = false;
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !redirectingToLogin) {
      redirectingToLogin = true;
      window.location.assign("/auth/google");
    }
    return Promise.reject(error);
  }
);

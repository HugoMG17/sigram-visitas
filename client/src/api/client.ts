import axios from "axios";

// En dev el cliente Vite corre en :5173 y el servidor en :4000.
// Al abrir la app desde el móvil por IP local, apuntamos al mismo host pero puerto 4000,
// para no tener que configurar la IP a mano cada vez.
function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000/api`;
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
});

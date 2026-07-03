import axios from "axios";
import { apiClient } from "./client";
import { clearNativeToken, getNativeToken } from "../native/auth";
import { isNative, nativeServerUrl } from "../native/platform";

// /auth/* vive fuera del prefijo /api. Se usa axios "a pelo" (no la instancia
// apiClient, que tiene baseURL="/api") porque si se le pasa una ruta como
// "/auth/me" a una instancia con baseURL, axios la combina con ese baseURL
// y acaba pidiendo "/api/auth/me" (que no existe) en vez de "/auth/me".
function authBaseUrl(): string {
  if (isNative) return nativeServerUrl;
  return apiClient.defaults.baseURL?.replace(/\/api$/, "") ?? "";
}

// En web la sesión va por cookie (withCredentials); en el APK va por token
// Bearer, que aquí hay que añadir a mano al no pasar por los interceptores
// de apiClient.
function authHeaders(): Record<string, string> {
  const token = getNativeToken();
  return isNative && token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await axios.get<AuthStatus>(`${authBaseUrl()}/auth/me`, {
    withCredentials: true,
    headers: authHeaders(),
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${authBaseUrl()}/auth/logout`, null, {
    withCredentials: true,
    headers: authHeaders(),
  });
  if (isNative) {
    await clearNativeToken();
  }
  window.location.href = "/";
}

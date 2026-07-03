import { apiClient } from "./client";
import { clearNativeToken } from "../native/auth";
import { isNative } from "../native/platform";

// /auth/* vive fuera del prefijo /api, así que se calcula la base quitando
// el sufijo /api en vez de reutilizar el baseURL de apiClient directamente.
// Se usa apiClient (con URL absoluta) para que los interceptores apliquen:
// cookie en web, token Bearer en el APK.
function authBaseUrl(): string {
  return apiClient.defaults.baseURL?.replace(/\/api$/, "") ?? "";
}

export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await apiClient.get<AuthStatus>(`${authBaseUrl()}/auth/me`);
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post(`${authBaseUrl()}/auth/logout`, null);
  if (isNative) {
    await clearNativeToken();
  }
  window.location.href = "/";
}

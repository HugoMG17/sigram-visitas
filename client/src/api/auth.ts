import axios from "axios";
import { apiClient } from "./client";

// /auth/* vive fuera del prefijo /api, así que se calcula la base quitando
// el sufijo /api en vez de reutilizar apiClient directamente.
function authBaseUrl(): string {
  return apiClient.defaults.baseURL?.replace(/\/api$/, "") ?? "";
}

export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await axios.get<AuthStatus>(`${authBaseUrl()}/auth/me`, { withCredentials: true });
  return res.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${authBaseUrl()}/auth/logout`, null, { withCredentials: true });
  window.location.href = "/";
}

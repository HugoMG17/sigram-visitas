import type { Request } from "express";
import type { AuthUser } from "../auth/passport.js";
import { env } from "../env.js";

// Email del usuario autenticado, o null si el login no está activo (modo
// local/dev) o la sesión no tiene usuario. Centraliza el cast a AuthUser
// para no repetirlo en cada ruta.
export function currentUserEmail(req: Request): string | null {
  if (!env.authEnabled) return null;
  const user = req.user as AuthUser | undefined;
  return user?.email ?? null;
}

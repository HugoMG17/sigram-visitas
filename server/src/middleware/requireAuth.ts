import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";

// Si el login con Google no está configurado (modo local/dev), no se exige
// nada. En producción, cualquier ruta protegida por este middleware exige
// una sesión válida; si no la hay, redirige al login (peticiones de
// navegación) o responde 401 (llamadas de API/fetch).
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.authEnabled) {
    next();
    return;
  }
  if (req.isAuthenticated()) {
    next();
    return;
  }
  if (req.method === "GET" && req.headers.accept?.includes("text/html")) {
    res.redirect("/auth/google");
    return;
  }
  res.status(401).json({ error: "No autenticado" });
}

import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { bearerFromRequest, resolveNativeToken } from "../services/nativeTokenService.js";

// Si el login con Google no está configurado (modo local/dev), no se exige
// nada. En producción, cualquier ruta protegida por este middleware exige
// o bien una sesión de cookie válida (web) o bien un token Bearer válido
// (app Android nativa); si no hay ninguna de las dos, redirige al login
// (peticiones de navegación) o responde 401 (llamadas de API/fetch).
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.authEnabled) {
    next();
    return;
  }
  if (req.isAuthenticated()) {
    next();
    return;
  }

  const bearer = bearerFromRequest(req.headers.authorization);
  if (bearer) {
    resolveNativeToken(bearer)
      .then((user) => {
        if (user) {
          // Mismo shape que deja passport: el resto del servidor (rutas,
          // currentUserEmail, Drive) no distingue cookie de token.
          req.user = user;
          next();
        } else {
          res.status(401).json({ error: "No autenticado" });
        }
      })
      .catch(next);
    return;
  }

  if (req.method === "GET" && req.headers.accept?.includes("text/html")) {
    res.redirect("/auth/google");
    return;
  }
  res.status(401).json({ error: "No autenticado" });
}

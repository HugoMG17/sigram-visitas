import { Router } from "express";
import passport from "passport";
import type { AuthUser } from "../auth/passport.js";
import {
  bearerFromRequest,
  issueNativeToken,
  resolveNativeToken,
  revokeNativeToken,
} from "../services/nativeTokenService.js";

export const authRouter = Router();

const SCOPES = [
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive.file",
];

// Esquema de deep link del APK (Capacitor): tras el login en el navegador
// del sistema, el servidor redirige aquí para devolver el control a la app
// con su token. El navegador no comparte cookies con el WebView del APK,
// por eso la app nativa se autentica por token y no por sesión.
const NATIVE_REDIRECT_SCHEME = "sigram://auth";

authRouter.get("/auth/google", (req, res, next) => {
  const isNative = req.query.client === "native";
  passport.authenticate("google", {
    scope: SCOPES,
    accessType: "offline",
    prompt: "consent",
    // El parámetro state viaja de ida y vuelta por Google intacto: es la
    // forma estándar de recordar, al volver al callback, que este login lo
    // inició la app nativa y no la web.
    state: isNative ? "native" : undefined,
  } as passport.AuthenticateOptions)(req, res, next);
});

authRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failed" }),
  async (req, res) => {
    if (req.query.state === "native") {
      const user = req.user as AuthUser;
      const token = await issueNativeToken(user);
      // La sesión cookie que passport acaba de crear no le sirve al APK;
      // se cierra para no dejar sesiones huérfanas en el navegador.
      req.logout(() => {
        res.redirect(`${NATIVE_REDIRECT_SCHEME}?token=${token}`);
      });
      return;
    }
    res.redirect("/");
  }
);

authRouter.get("/auth/failed", (_req, res) => {
  res.status(403).send("Acceso denegado: esta cuenta de Google no está autorizada.");
});

authRouter.post("/auth/logout", async (req, res) => {
  const bearer = bearerFromRequest(req.headers.authorization);
  if (bearer) {
    await revokeNativeToken(bearer);
    res.status(204).send();
    return;
  }
  req.logout(() => res.status(204).send());
});

authRouter.get("/auth/me", async (req, res) => {
  const bearer = bearerFromRequest(req.headers.authorization);
  if (bearer) {
    const user = await resolveNativeToken(bearer);
    res.json({ authenticated: Boolean(user), email: user?.email ?? null });
    return;
  }
  const user = req.user as AuthUser | undefined;
  res.json({ authenticated: Boolean(user), email: user?.email ?? null });
});

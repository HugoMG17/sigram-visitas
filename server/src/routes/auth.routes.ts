import { Router } from "express";
import passport from "passport";
import type { AuthUser } from "../auth/passport.js";

export const authRouter = Router();

const SCOPES = [
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive.file",
];

authRouter.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: SCOPES,
    accessType: "offline",
    prompt: "consent",
  })
);

authRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failed" }),
  (_req, res) => res.redirect("/")
);

authRouter.get("/auth/failed", (_req, res) => {
  res.status(403).send("Acceso denegado: esta cuenta de Google no está autorizada.");
});

authRouter.post("/auth/logout", (req, res) => {
  req.logout(() => res.status(204).send());
});

authRouter.get("/auth/me", (req, res) => {
  const user = req.user as AuthUser | undefined;
  res.json({ authenticated: Boolean(user), email: user?.email ?? null });
});

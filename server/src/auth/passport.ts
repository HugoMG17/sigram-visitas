import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../env.js";

export interface AuthUser {
  email: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
}

// Solo se registra la estrategia si el login con Google está configurado
// (googleClientId/secret/callbackUrl presentes); en caso contrario el resto
// de la app sigue funcionando sin login (modo local/dev).
export function configurePassport(): void {
  if (!env.authEnabled) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId!,
        clientSecret: env.googleClientSecret!,
        callbackURL: env.googleCallbackUrl!,
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          done(null, false);
          return;
        }
        if (env.allowedGoogleEmail && email.toLowerCase() !== env.allowedGoogleEmail.toLowerCase()) {
          console.warn(`[auth] intento de login rechazado: ${email} no está autorizado`);
          done(null, false);
          return;
        }
        const user: AuthUser = { email, name: profile.displayName, accessToken, refreshToken };
        done(null, user);
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user as AuthUser));
  passport.deserializeUser((user: AuthUser, done) => done(null, user));
}

import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

const publicUrl = readEnv("PUBLIC_URL") ?? readEnv("RENDER_EXTERNAL_URL");
const googleClientId = readEnv("GOOGLE_CLIENT_ID");

if (googleClientId && !publicUrl) {
  console.warn(
    "GOOGLE_CLIENT_ID está configurado pero no hay PUBLIC_URL (ni RENDER_EXTERNAL_URL); " +
      "el login con Google no funcionará sin saber la URL pública del servidor."
  );
}

export const env = {
  port: Number(readEnv("SIGRAM_SERVER_PORT") ?? readEnv("PORT") ?? "4000"),
  dbPath: path.resolve(rootDir, readEnv("DB_PATH") ?? "./data/sigram.db"),
  uploadsDir: path.resolve(rootDir, readEnv("UPLOADS_DIR") ?? "./uploads"),
  tursoUrl: readEnv("TURSO_DATABASE_URL"),
  tursoAuthToken: readEnv("TURSO_AUTH_TOKEN"),
  rootDir,

  // Login con Google + subida de fotos a Drive: solo activo si estas
  // variables están configuradas (pensado para producción; en local se
  // sigue trabajando sin login, contra disco local, como hasta ahora).
  publicUrl,
  googleClientId,
  googleClientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
  googleCallbackUrl: publicUrl ? `${publicUrl.replace(/\/$/, "")}/auth/google/callback` : undefined,
  allowedGoogleEmail: readEnv("ALLOWED_GOOGLE_EMAIL"),
  // Sin SESSION_SECRET fijo, cada reinicio del servidor invalida las
  // sesiones activas (hay que volver a iniciar sesión) — aceptable para
  // una app de un solo usuario; se puede fijar uno propio para evitarlo.
  sessionSecret: readEnv("SESSION_SECRET") ?? crypto.randomBytes(32).toString("hex"),
  // La cookie de sesión solo puede ser "secure" (y por tanto sobrevivir) si
  // la URL pública es HTTPS. En pruebas locales sobre http://localhost, una
  // cookie secure no se enviaría, así que se relaja según el esquema.
  cookieSecure: (publicUrl ?? "").startsWith("https://"),

  get authEnabled(): boolean {
    return Boolean(this.googleClientId && this.googleClientSecret && this.googleCallbackUrl);
  },
};

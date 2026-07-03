import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { tokensNativos } from "../db/schema.js";
import type { AuthUser } from "../auth/passport.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Emite un token nuevo para la app nativa y lo persiste (solo su hash).
// Devuelve el token en claro una única vez, para entregarlo al APK vía
// deep link; después ya no se puede recuperar.
export async function issueNativeToken(user: AuthUser): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  await db.insert(tokensNativos).values({
    tokenHash: hashToken(token),
    email: user.email,
    googleAccessToken: user.accessToken,
    googleRefreshToken: user.refreshToken,
    createdAt: now,
    lastUsedAt: now,
  });
  return token;
}

// Resuelve un token Bearer al mismo AuthUser que produciría el login por
// cookie, de modo que el resto del servidor (rutas, Drive) no distingue
// entre ambos tipos de sesión.
export async function resolveNativeToken(token: string): Promise<AuthUser | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(tokensNativos)
    .where(eq(tokensNativos.tokenHash, tokenHash));
  if (!row) return null;

  // last_used_at solo sirve para poder limpiar tokens abandonados a mano;
  // no hace falta esperar a que se escriba para responder.
  void db
    .update(tokensNativos)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(tokensNativos.tokenHash, tokenHash))
    .catch(() => undefined);

  return {
    email: row.email,
    accessToken: row.googleAccessToken,
    refreshToken: row.googleRefreshToken ?? undefined,
  };
}

export async function revokeNativeToken(token: string): Promise<void> {
  await db.delete(tokensNativos).where(eq(tokensNativos.tokenHash, hashToken(token)));
}

export function bearerFromRequest(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

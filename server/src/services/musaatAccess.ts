import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { musaat } from "../db/schema.js";

// Mismo planteamiento que personaAccess: el registro de Musaat no cuelga de
// ninguna obra, así que lleva su propio dueño en vez de heredarlo por las
// claves foráneas.

export function ownerFilterMusaat(email: string | null): SQL | undefined {
  return email ? eq(musaat.ownerEmail, email) : undefined;
}

// Devuelve null tanto si no existe como si es de otro usuario, para que la
// ruta responda 404 en ambos casos.
export async function findOwnedMusaat(id: string, email: string | null) {
  const [registro] = await db.select().from(musaat).where(eq(musaat.id, id));
  if (!registro) return null;
  if (email && registro.ownerEmail !== email) return null;
  return registro;
}

export async function listMusaatVivos(email: string | null) {
  return db
    .select()
    .from(musaat)
    .where(and(isNull(musaat.deletedAt), ownerFilterMusaat(email)));
}

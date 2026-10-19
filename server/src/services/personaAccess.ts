import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { personas } from "../db/schema.js";

// La agenda es la única entidad que NO cuelga de una obra, así que lleva su
// propia columna de propietario en vez de heredarla subiendo por las claves
// foráneas como hacen visitas, puntos y adjuntos (ver obraAccess.ts).

// Filtro por dueño. En modo local sin login el email es null y se devuelve
// undefined, que el and() de Drizzle ignora: se ve todo, como siempre.
export function ownerFilterPersonas(email: string | null): SQL | undefined {
  return email ? eq(personas.ownerEmail, email) : undefined;
}

// Igual que findOwnedObra: devuelve null tanto si no existe como si es de
// otro usuario, para que la ruta responda 404 en ambos casos y no confirme a
// un tercero que el id existe.
export async function findOwnedPersona(id: string, email: string | null) {
  const [persona] = await db.select().from(personas).where(eq(personas.id, id));
  if (!persona) return null;
  if (email && persona.ownerEmail !== email) return null;
  return persona;
}

// Todas las fichas del dueño, para resolver los vínculos de una obra.
//
// SIN filtrar por deletedAt a propósito: una ficha borrada tiene que seguir
// resolviendo, o borrar una ficha devolvería las obras a los datos viejos
// (ver el comentario de indicePersonas en shared).
export async function listPersonasDeDuenyo(email: string | null) {
  const filtro = ownerFilterPersonas(email);
  return filtro
    ? db.select().from(personas).where(filtro)
    : db.select().from(personas);
}

// Las fichas vivas, para listar en la app.
export async function listPersonasVivas(email: string | null) {
  return db
    .select()
    .from(personas)
    .where(and(isNull(personas.deletedAt), ownerFilterPersonas(email)));
}

import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, obras, puntos, visitas } from "../db/schema.js";

// Comprueba que la obra existe y (si hay login activo) pertenece al usuario
// dado. Devuelve null tanto si no existe, como si es de otro usuario, como
// si no tiene dueño asignado -- las rutas responden 404 en todos los casos
// para no confirmar a un tercero que el id existe. Una obra sin dueño no es
// "de nadie en particular, así que vale para cualquiera": con login activo
// se trata igual que si fuera ajena, para que nunca quede accesible por
// error (p.ej. tras editar la base de datos a mano).
export async function findOwnedObra(obraId: string, email: string | null) {
  const [obra] = await db.select().from(obras).where(eq(obras.id, obraId));
  if (!obra) return null;
  if (email && obra.ownerEmail !== email) return null;
  return obra;
}

export async function findOwnedVisita(visitaId: string, email: string | null) {
  const [visita] = await db.select().from(visitas).where(eq(visitas.id, visitaId));
  if (!visita) return null;
  const obra = await findOwnedObra(visita.obraId, email);
  if (!obra) return null;
  return { visita, obra };
}

export async function findOwnedPunto(puntoId: string, email: string | null) {
  const [punto] = await db.select().from(puntos).where(eq(puntos.id, puntoId));
  if (!punto) return null;
  const owned = await findOwnedVisita(punto.visitaId, email);
  if (!owned) return null;
  return { punto, ...owned };
}

export async function findOwnedAdjunto(adjuntoId: string, email: string | null) {
  const [adjunto] = await db.select().from(adjuntos).where(eq(adjuntos.id, adjuntoId));
  if (!adjunto) return null;
  const owned = await findOwnedVisita(adjunto.visitaId, email);
  if (!owned) return null;
  return { adjunto, ...owned };
}

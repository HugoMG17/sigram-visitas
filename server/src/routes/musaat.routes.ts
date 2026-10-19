import { Router } from "express";
import { eq } from "drizzle-orm";
import type { IntervencionesMusaat, TipoIntervencionMusaat } from "@sigram/shared";
import { db } from "../db/client.js";
import { musaat } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { findOwnedMusaat, listMusaatVivos } from "../services/musaatAccess.js";
import { idParamSchema, musaatUpsertSchema } from "../validation.js";

export const musaatRouter = Router();

// El validador admite null en los campos (patrón null-tras-pull) y la columna
// JSON guarda undefined: se normaliza aquí, igual que con los agentes de la
// obra. Se recorren solo las claves propias del objeto recibido.
//
// CUIDADO: esta función reconstruye cada intervención campo a campo, así que
// todo campo nuevo hay que añadirlo aquí o se pierde al guardar, sin ningún
// error. Pasó con `estado`: "No procede" se guardaba en el móvil y volvía
// convertido en "pendiente" después de sincronizar.
function normalizarIntervenciones(
  intervenciones: ReturnType<typeof musaatUpsertSchema.parse>["intervenciones"]
): IntervencionesMusaat | null {
  if (!intervenciones) return null;
  const limpio: IntervencionesMusaat = {};
  for (const [tipo, valor] of Object.entries(intervenciones)) {
    if (!valor) continue;
    limpio[tipo as TipoIntervencionMusaat] = {
      estado: valor.estado ?? undefined,
      fechaEnvio: valor.fechaEnvio ?? undefined,
      aplica: valor.aplica ?? undefined,
    };
  }
  return limpio;
}

musaatRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const email = currentUserEmail(req);
    const filas = await listMusaatVivos(email);
    // En memoria y no con ORDER BY: SQLite no compara con las reglas del
    // español y la eñe y las tildes quedarían fuera de sitio.
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    res.json(filas);
  })
);

musaatRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const registro = await findOwnedMusaat(id, email);
    if (!registro || registro.deletedAt) {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }
    res.json(registro);
  })
);

// Upsert idempotente por id generado en el cliente, igual que obras.
musaatRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const parsed = musaatUpsertSchema.parse(req.body);
    const data = {
      numeroExpediente: parsed.numeroExpediente ?? null,
      // `nombre` es NOT NULL en la tabla: se rellena con "" como en obras.
      nombre: parsed.nombre ?? "",
      intervenciones: normalizarIntervenciones(parsed.intervenciones),
      observaciones: parsed.observaciones ?? null,
    };
    const now = new Date().toISOString();

    const [existing] = await db.select().from(musaat).where(eq(musaat.id, id));

    if (existing) {
      if (email && existing.ownerEmail !== email) {
        res.status(404).json({ error: "Registro no encontrado" });
        return;
      }
      await db
        .update(musaat)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(musaat.id, id));
    } else {
      await db
        .insert(musaat)
        .values({ id, ownerEmail: email, ...data, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(musaat).where(eq(musaat.id, id));
    res.json(row);
  })
);

musaatRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const registro = await findOwnedMusaat(id, email);
    if (!registro) {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }
    const now = new Date().toISOString();
    await db
      .update(musaat)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(musaat.id, id));
    res.status(204).send();
  })
);

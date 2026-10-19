import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { personas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { findOwnedPersona, listPersonasVivas } from "../services/personaAccess.js";
import { idParamSchema, personaUpsertSchema } from "../validation.js";

export const personasRouter = Router();

personasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const email = currentUserEmail(req);
    const filas = await listPersonasVivas(email);
    // Se ordena en memoria y no con ORDER BY porque SQLite no compara con
    // las reglas del español: la ñ y las tildes quedarían fuera de sitio.
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    res.json(filas);
  })
);

personasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const persona = await findOwnedPersona(id, email);
    if (!persona || persona.deletedAt) {
      res.status(404).json({ error: "Persona no encontrada" });
      return;
    }
    res.json(persona);
  })
);

// Upsert idempotente por id (el cliente genera el UUID), igual que obras.
personasRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const parsed = personaUpsertSchema.parse(req.body);
    // `nombre` es NOT NULL en la tabla y el validador admite null (patrón
    // null-tras-pull): se rellena con "" como en obras.
    const data = {
      nombre: parsed.nombre ?? "",
      dni: parsed.dni ?? null,
      esEmpresa: parsed.esEmpresa ?? false,
    };
    const now = new Date().toISOString();

    const [existing] = await db.select().from(personas).where(eq(personas.id, id));

    if (existing) {
      if (email && existing.ownerEmail !== email) {
        res.status(404).json({ error: "Persona no encontrada" });
        return;
      }
      await db
        .update(personas)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(personas.id, id));
    } else {
      await db
        .insert(personas)
        .values({ id, ownerEmail: email, ...data, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(personas).where(eq(personas.id, id));
    res.json(row);
  })
);

// Borrado lógico. La ficha deja de salir en la lista y en el buscador, pero
// las obras que la usan siguen resolviendo contra ella: lo que ya se corrigió
// no vuelve atrás (ver indicePersonas en shared).
personasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const persona = await findOwnedPersona(id, email);
    if (!persona) {
      res.status(404).json({ error: "Persona no encontrada" });
      return;
    }
    const now = new Date().toISOString();
    await db
      .update(personas)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(personas.id, id));
    res.status(204).send();
  })
);

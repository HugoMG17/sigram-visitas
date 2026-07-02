import { Router } from "express";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, puntos, visitas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { findOwnedObra, findOwnedVisita } from "../services/obraAccess.js";
import { idParamSchema, visitaUpsertSchema } from "../validation.js";

export const visitasRouter = Router();

visitasRouter.get(
  "/obras/:obraId/visitas",
  asyncHandler(async (req, res) => {
    const obraId = idParamSchema.parse(req.params.obraId);
    const email = currentUserEmail(req);
    const obra = await findOwnedObra(obraId, email);
    if (!obra) {
      res.status(404).json({ error: "Obra no encontrada" });
      return;
    }
    const rows = await db
      .select()
      .from(visitas)
      .where(and(eq(visitas.obraId, obraId), isNull(visitas.deletedAt)))
      .orderBy(desc(visitas.fecha));
    res.json(rows);
  })
);

visitasRouter.get(
  "/visitas/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const owned = await findOwnedVisita(id, email);
    if (!owned || owned.visita.deletedAt) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const { visita, obra } = owned;
    const attachments = await db
      .select()
      .from(adjuntos)
      .where(eq(adjuntos.visitaId, id))
      .orderBy(asc(adjuntos.orden));
    const puntosDeVisita = await db
      .select()
      .from(puntos)
      .where(and(eq(puntos.visitaId, id), isNull(puntos.deletedAt)))
      .orderBy(asc(puntos.orden));
    res.json({ ...visita, obra, adjuntos: attachments, puntos: puntosDeVisita });
  })
);

visitasRouter.put(
  "/visitas/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const data = visitaUpsertSchema.parse(req.body);
    const now = new Date().toISOString();

    const obra = await findOwnedObra(data.obraId, email);
    if (!obra) {
      res.status(400).json({ error: "La obra indicada no existe" });
      return;
    }

    const existing = await findOwnedVisita(id, email);
    if (existing === null) {
      // findOwnedVisita ya devuelve null si la visita existe pero es de otra
      // obra/usuario; solo se distingue "no existe" de "no es tuya" al
      // consultar directamente, pero en ambos casos aquí toca crearla o
      // rechazarla -- se hace un segundo chequeo simple contra la tabla.
      const [rawExisting] = await db.select().from(visitas).where(eq(visitas.id, id));
      if (rawExisting) {
        res.status(404).json({ error: "Visita no encontrada" });
        return;
      }
      await db.insert(visitas).values({ id, ...data, createdAt: now, updatedAt: now });
    } else {
      await db
        .update(visitas)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(visitas.id, id));
    }

    const [row] = await db.select().from(visitas).where(eq(visitas.id, id));
    res.json(row);
  })
);

visitasRouter.delete(
  "/visitas/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const owned = await findOwnedVisita(id, email);
    if (!owned) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const now = new Date().toISOString();
    await db.update(visitas).set({ deletedAt: now, updatedAt: now }).where(eq(visitas.id, id));
    res.status(204).send();
  })
);

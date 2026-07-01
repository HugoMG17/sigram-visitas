import { Router } from "express";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, obras, visitas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { idParamSchema, visitaUpsertSchema } from "../validation.js";

export const visitasRouter = Router();

visitasRouter.get(
  "/obras/:obraId/visitas",
  asyncHandler(async (req, res) => {
    const obraId = idParamSchema.parse(req.params.obraId);
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
    const [visita] = await db
      .select()
      .from(visitas)
      .where(and(eq(visitas.id, id), isNull(visitas.deletedAt)));
    if (!visita) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const [obra] = await db.select().from(obras).where(eq(obras.id, visita.obraId));
    const attachments = await db
      .select()
      .from(adjuntos)
      .where(eq(adjuntos.visitaId, id))
      .orderBy(asc(adjuntos.orden));
    res.json({ ...visita, obra, adjuntos: attachments });
  })
);

visitasRouter.put(
  "/visitas/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const data = visitaUpsertSchema.parse(req.body);
    const now = new Date().toISOString();

    const [obra] = await db.select().from(obras).where(eq(obras.id, data.obraId));
    if (!obra) {
      res.status(400).json({ error: "La obra indicada no existe" });
      return;
    }

    const [existing] = await db.select().from(visitas).where(eq(visitas.id, id));

    if (existing) {
      await db
        .update(visitas)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(visitas.id, id));
    } else {
      await db.insert(visitas).values({ id, ...data, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(visitas).where(eq(visitas.id, id));
    res.json(row);
  })
);

visitasRouter.delete(
  "/visitas/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const now = new Date().toISOString();
    await db.update(visitas).set({ deletedAt: now, updatedAt: now }).where(eq(visitas.id, id));
    res.status(204).send();
  })
);

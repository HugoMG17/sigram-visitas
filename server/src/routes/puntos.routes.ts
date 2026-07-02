import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { puntos, visitas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { idParamSchema, puntoUpsertSchema } from "../validation.js";

export const puntosRouter = Router();

puntosRouter.get(
  "/visitas/:visitaId/puntos",
  asyncHandler(async (req, res) => {
    const visitaId = idParamSchema.parse(req.params.visitaId);
    const rows = await db
      .select()
      .from(puntos)
      .where(and(eq(puntos.visitaId, visitaId), isNull(puntos.deletedAt)))
      .orderBy(asc(puntos.orden));
    res.json(rows);
  })
);

puntosRouter.put(
  "/puntos/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const data = puntoUpsertSchema.parse(req.body);
    const now = new Date().toISOString();

    const [visita] = await db.select().from(visitas).where(eq(visitas.id, data.visitaId));
    if (!visita) {
      res.status(400).json({ error: "La visita indicada no existe" });
      return;
    }

    const [existing] = await db.select().from(puntos).where(eq(puntos.id, id));
    const values = { ...data, descripcion: data.descripcion ?? "" };

    if (existing) {
      await db
        .update(puntos)
        .set({ ...values, updatedAt: now, deletedAt: null })
        .where(eq(puntos.id, id));
    } else {
      const maxOrden = await db
        .select({ orden: puntos.orden })
        .from(puntos)
        .where(eq(puntos.visitaId, data.visitaId))
        .orderBy(asc(puntos.orden));
      const orden = maxOrden.length ? Math.max(...maxOrden.map((p) => p.orden)) + 1 : 0;
      await db.insert(puntos).values({ id, ...values, orden, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(puntos).where(eq(puntos.id, id));
    res.json(row);
  })
);

puntosRouter.delete(
  "/puntos/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const now = new Date().toISOString();
    await db.update(puntos).set({ deletedAt: now, updatedAt: now }).where(eq(puntos.id, id));
    res.status(204).send();
  })
);

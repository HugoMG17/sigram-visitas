import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { obras } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { idParamSchema, obraUpsertSchema } from "../validation.js";

export const obrasRouter = Router();

obrasRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(obras)
      .where(isNull(obras.deletedAt))
      .orderBy(desc(obras.updatedAt));
    res.json(rows);
  })
);

obrasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const [row] = await db
      .select()
      .from(obras)
      .where(and(eq(obras.id, id), isNull(obras.deletedAt)));
    if (!row) {
      res.status(404).json({ error: "Obra no encontrada" });
      return;
    }
    res.json(row);
  })
);

// Upsert idempotente por id (el cliente genera el UUID). Crea la obra si no
// existe, o la actualiza si ya existe -- así el mismo endpoint sirve tanto
// para "crear" desde el formulario como para la futura sincronización offline.
obrasRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const data = obraUpsertSchema.parse(req.body);
    const now = new Date().toISOString();

    const [existing] = await db.select().from(obras).where(eq(obras.id, id));

    if (existing) {
      await db
        .update(obras)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(obras.id, id));
    } else {
      await db.insert(obras).values({ id, ...data, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(obras).where(eq(obras.id, id));
    res.json(row);
  })
);

obrasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const now = new Date().toISOString();
    await db.update(obras).set({ deletedAt: now, updatedAt: now }).where(eq(obras.id, id));
    res.status(204).send();
  })
);

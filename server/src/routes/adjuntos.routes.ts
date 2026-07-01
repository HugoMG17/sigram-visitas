import { Router } from "express";
import multer from "multer";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, visitas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { adjuntoMetaSchema, idParamSchema } from "../validation.js";
import { deleteAttachmentFiles, saveAttachmentFile } from "../services/fileService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const adjuntosRouter = Router();

adjuntosRouter.get(
  "/visitas/:visitaId/adjuntos",
  asyncHandler(async (req, res) => {
    const visitaId = idParamSchema.parse(req.params.visitaId);
    const rows = await db
      .select()
      .from(adjuntos)
      .where(eq(adjuntos.visitaId, visitaId))
      .orderBy(asc(adjuntos.orden));
    res.json(rows);
  })
);

adjuntosRouter.post(
  "/visitas/:visitaId/adjuntos",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const visitaId = idParamSchema.parse(req.params.visitaId);
    const meta = adjuntoMetaSchema.parse(req.body);

    if (!req.file) {
      res.status(400).json({ error: "Falta el fichero 'file'" });
      return;
    }

    const [visita] = await db.select().from(visitas).where(eq(visitas.id, visitaId));
    if (!visita) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }

    const saved = await saveAttachmentFile({
      obraId: visita.obraId,
      visitaId,
      adjuntoId: meta.id,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      buffer: req.file.buffer,
    });

    const now = new Date().toISOString();
    await db.insert(adjuntos).values({
      id: meta.id,
      visitaId,
      tipo: meta.tipo,
      mimeType: req.file.mimetype,
      nombreArchivo: req.file.originalname,
      caption: meta.caption,
      orden: meta.orden ?? 0,
      rutaServidor: saved.rutaServidor,
      rutaThumbnail: saved.rutaThumbnail,
      width: saved.width,
      height: saved.height,
      createdAt: now,
    });

    const [row] = await db.select().from(adjuntos).where(eq(adjuntos.id, meta.id));
    res.status(201).json(row);
  })
);

adjuntosRouter.delete(
  "/adjuntos/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const [row] = await db.select().from(adjuntos).where(eq(adjuntos.id, id));
    if (!row) {
      res.status(404).json({ error: "Adjunto no encontrado" });
      return;
    }
    await deleteAttachmentFiles([row.rutaServidor, row.rutaThumbnail]);
    await db.delete(adjuntos).where(eq(adjuntos.id, id));
    res.status(204).send();
  })
);

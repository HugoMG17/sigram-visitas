import { Router } from "express";
import multer from "multer";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { findOwnedAdjunto, findOwnedPunto, findOwnedVisita } from "../services/obraAccess.js";
import { adjuntoMetaSchema, idParamSchema } from "../validation.js";
import { deleteAttachmentFiles, saveAttachmentFile } from "../services/fileService.js";
import {
  buildOAuthClient,
  deleteFromDrive,
  downloadFromDrive,
  saveAttachmentToDrive,
} from "../services/driveService.js";
import { env } from "../env.js";
import type { AuthUser } from "../auth/passport.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const adjuntosRouter = Router();

adjuntosRouter.get(
  "/visitas/:visitaId/adjuntos",
  asyncHandler(async (req, res) => {
    const visitaId = idParamSchema.parse(req.params.visitaId);
    const email = currentUserEmail(req);
    const owned = await findOwnedVisita(visitaId, email);
    if (!owned) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const rows = await db
      .select()
      .from(adjuntos)
      .where(eq(adjuntos.visitaId, visitaId))
      .orderBy(asc(adjuntos.orden));
    res.json(rows);
  })
);

adjuntosRouter.get(
  "/puntos/:puntoId/adjuntos",
  asyncHandler(async (req, res) => {
    const puntoId = idParamSchema.parse(req.params.puntoId);
    const email = currentUserEmail(req);
    const owned = await findOwnedPunto(puntoId, email);
    if (!owned) {
      res.status(404).json({ error: "Punto no encontrado" });
      return;
    }
    const rows = await db
      .select()
      .from(adjuntos)
      .where(eq(adjuntos.puntoId, puntoId))
      .orderBy(asc(adjuntos.orden));
    res.json(rows);
  })
);

adjuntosRouter.post(
  "/visitas/:visitaId/adjuntos",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const visitaId = idParamSchema.parse(req.params.visitaId);
    const email = currentUserEmail(req);
    const meta = adjuntoMetaSchema.parse(req.body);

    if (!req.file) {
      res.status(400).json({ error: "Falta el fichero 'file'" });
      return;
    }

    const owned = await findOwnedVisita(visitaId, email);
    if (!owned) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const { visita } = owned;

    const now = new Date().toISOString();
    const user = req.user as AuthUser | undefined;

    if (env.authEnabled && user) {
      const saved = await saveAttachmentToDrive({
        auth: buildOAuthClient(user),
        userEmail: user.email,
        adjuntoId: meta.id,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        buffer: req.file.buffer,
      });
      await db.insert(adjuntos).values({
        id: meta.id,
        visitaId,
        puntoId: meta.puntoId,
        tipo: meta.tipo,
        mimeType: req.file.mimetype,
        nombreArchivo: req.file.originalname,
        caption: meta.caption,
        orden: meta.orden ?? 0,
        driveFileId: saved.driveFileId,
        driveThumbnailId: saved.driveThumbnailId,
        width: saved.width,
        height: saved.height,
        createdAt: now,
      });
    } else {
      const saved = await saveAttachmentFile({
        obraId: visita.obraId,
        visitaId,
        adjuntoId: meta.id,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        buffer: req.file.buffer,
      });
      await db.insert(adjuntos).values({
        id: meta.id,
        visitaId,
        puntoId: meta.puntoId,
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
    }

    const [row] = await db.select().from(adjuntos).where(eq(adjuntos.id, meta.id));
    res.status(201).json(row);
  })
);

// Sirve el fichero original o la miniatura de un adjunto guardado en Drive
// (los guardados en disco local se sirven directamente vía /uploads).
adjuntosRouter.get(
  "/adjuntos/:id/:variante(file|thumbnail)",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const user = req.user as AuthUser | undefined;
    const owned = await findOwnedAdjunto(id, email);
    if (!owned) {
      res.status(404).json({ error: "Adjunto no encontrado" });
      return;
    }
    const { adjunto: row } = owned;
    const driveId = req.params.variante === "thumbnail" ? row.driveThumbnailId : row.driveFileId;
    if (!driveId || !user) {
      res.status(404).json({ error: "Este adjunto no está en Drive" });
      return;
    }
    const { buffer, mimeType } = await downloadFromDrive(buildOAuthClient(user), driveId);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(buffer);
  })
);

adjuntosRouter.delete(
  "/adjuntos/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const owned = await findOwnedAdjunto(id, email);
    if (!owned) {
      res.status(404).json({ error: "Adjunto no encontrado" });
      return;
    }
    const { adjunto: row } = owned;
    if (row.driveFileId) {
      const user = req.user as AuthUser | undefined;
      if (user) {
        const auth = buildOAuthClient(user);
        await Promise.all([
          deleteFromDrive(auth, row.driveFileId),
          row.driveThumbnailId ? deleteFromDrive(auth, row.driveThumbnailId) : undefined,
        ]);
      }
    } else {
      await deleteAttachmentFiles([row.rutaServidor, row.rutaThumbnail]);
    }
    await db.delete(adjuntos).where(eq(adjuntos.id, id));
    res.status(204).send();
  })
);

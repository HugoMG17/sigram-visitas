import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { ZipArchive } from "archiver";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, puntos } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { findOwnedAdjunto, findOwnedPunto, findOwnedVisita } from "../services/obraAccess.js";
import { ALLOWED_ADJUNTO_MIME_TYPES, adjuntoMetaSchema, idParamSchema } from "../validation.js";
import { saveAttachmentFile } from "../services/fileService.js";
import {
  buildOAuthClient,
  downloadFromDrive,
  saveAttachmentToDrive,
} from "../services/driveService.js";
import { eliminarAdjuntos } from "../services/adjuntoDeletion.js";
import { slugify } from "../utils/nombreArchivo.js";
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
    if (!ALLOWED_ADJUNTO_MIME_TYPES.has(req.file.mimetype)) {
      res.status(400).json({ error: "Tipo de fichero no permitido" });
      return;
    }

    const owned = await findOwnedVisita(visitaId, email);
    if (!owned) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const { visita } = owned;

    // El puntoId lo elige el cliente: hay que comprobar que ese punto existe
    // y cuelga de ESTA visita, o un usuario podría colgar sus adjuntos del
    // punto de otra persona (aparecerían listados en el punto ajeno).
    if (meta.puntoId) {
      const ownedPunto = await findOwnedPunto(meta.puntoId, email);
      if (!ownedPunto || ownedPunto.punto.visitaId !== visitaId) {
        res.status(400).json({ error: "El punto indicado no pertenece a esta visita" });
        return;
      }
    }

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
    await eliminarAdjuntos([owned.adjunto], req.user as AuthUser | undefined);
    res.status(204).send();
  })
);

// Nombre seguro para una carpeta o fichero dentro del ZIP: sin los caracteres
// que rompen rutas en Windows/macOS y sin espacios al principio o al final.
function nombreSeguro(valor: string, porDefecto: string): string {
  const limpio = valor
    .replace(/[\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return limpio || porDefecto;
}

// Descarga en un ZIP todas las fotos de una visita, organizadas en carpetas:
// las generales por un lado y las de cada punto en la suya, con el nombre del
// punto, para que al descomprimir se entienda de un vistazo qué es cada cosa.
adjuntosRouter.get(
  "/visitas/:id/fotos.zip",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const owned = await findOwnedVisita(id, email);
    if (!owned) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const { visita, obra } = owned;

    const todos = await db
      .select()
      .from(adjuntos)
      .where(eq(adjuntos.visitaId, id))
      .orderBy(asc(adjuntos.orden));
    const fotos = todos.filter((a) => a.mimeType.startsWith("image/"));
    if (fotos.length === 0) {
      res.status(404).json({ error: "Esta visita no tiene fotos" });
      return;
    }

    const puntosDeVisita = await db
      .select()
      .from(puntos)
      .where(and(eq(puntos.visitaId, id), isNull(puntos.deletedAt)))
      .orderBy(asc(puntos.orden));
    // Carpeta de cada punto, numerada para que salgan en el mismo orden que
    // en la app y en el informe.
    const carpetaDePunto = new Map<string, string>();
    puntosDeVisita.forEach((punto, i) => {
      const numero = String(i + 1).padStart(2, "0");
      carpetaDePunto.set(punto.id, `${numero} - ${nombreSeguro(punto.titulo ?? "", "Punto")}`);
    });

    const fecha = visita.fecha.slice(0, 10);
    const nombreZip = `${fecha}_Fotos_${slugify(obra.nombre)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${nombreZip}"`);

    // store: las fotos (JPEG/PNG) ya vienen comprimidas; volver a comprimirlas
    // solo gastaria tiempo y CPU para no ganar practicamente nada.
    const archive = new ZipArchive({ store: true });
    archive.on("error", (err: Error) => {
      console.error("[fotos.zip] error creando el ZIP:", err);
      res.destroy(err);
    });
    archive.pipe(res);

    const user = req.user as AuthUser | undefined;
    const auth = user ? buildOAuthClient(user) : undefined;
    // Cada carpeta numera sus fotos desde 1: si el contador fuera global, en
    // una carpeta podrian quedar la 01 y la 04, que despista al mirarlas.
    const contadorPorCarpeta = new Map<string, number>();

    for (const foto of fotos) {
      const carpeta = foto.puntoId
        ? (carpetaDePunto.get(foto.puntoId) ?? "Fotos de puntos borrados")
        : "Fotos generales";
      const indice = (contadorPorCarpeta.get(carpeta) ?? 0) + 1;
      contadorPorCarpeta.set(carpeta, indice);
      const nombre = `${String(indice).padStart(2, "0")}_${nombreSeguro(foto.nombreArchivo, "foto.jpg")}`;
      try {
        if (foto.driveFileId && auth) {
          const { buffer } = await downloadFromDrive(auth, foto.driveFileId);
          archive.append(buffer, { name: `${carpeta}/${nombre}` });
        } else if (foto.rutaServidor) {
          archive.file(path.join(env.uploadsDir, ...foto.rutaServidor.split("/")), {
            name: `${carpeta}/${nombre}`,
          });
        }
      } catch (err) {
        // Una foto ilegible no debe tumbar la descarga entera: se omite y se
        // deja constancia dentro del propio ZIP para que se note la ausencia.
        console.error(`[fotos.zip] no se pudo añadir ${foto.id}:`, err);
        archive.append(`No se pudo recuperar esta foto (${foto.nombreArchivo}).`, {
          name: `${carpeta}/FALTA_${nombre}.txt`,
        });
      }
    }

    await archive.finalize();
  })
);

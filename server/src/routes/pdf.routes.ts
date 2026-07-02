import { Router } from "express";
import { asc, eq, isNull, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, puntos, visitas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { findOwnedVisita } from "../services/obraAccess.js";
import { idParamSchema } from "../validation.js";
import { generateInformeVisitaPdf } from "../services/pdfService.js";
import type { AuthUser } from "../auth/passport.js";

export const pdfRouter = Router();

const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

pdfRouter.get(
  "/visitas/:id/pdf",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);

    const owned = await findOwnedVisita(id, email);
    if (!owned) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }
    const { visita, obra } = owned;

    const visitasDeObra = await db
      .select({ id: visitas.id })
      .from(visitas)
      .where(and(eq(visitas.obraId, obra.id), isNull(visitas.deletedAt)))
      .orderBy(asc(visitas.fecha));
    const numeroVisita = Math.max(
      1,
      visitasDeObra.findIndex((v) => v.id === id) + 1
    );

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

    const pdfBuffer = await generateInformeVisitaPdf({
      obra,
      visita,
      adjuntos: attachments,
      puntos: puntosDeVisita,
      numeroVisita,
      user: req.user as AuthUser | undefined,
    });

    const fecha = visita.fecha.slice(0, 10);
    const fileName = `Informe_Visita_${slugify(obra.nombre)}_${fecha}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  })
);

import { Router } from "express";
import { asc, eq, isNull, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos, obras, visitas } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { idParamSchema } from "../validation.js";
import { generateInformeVisitaPdf } from "../services/pdfService.js";

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

    const [visita] = await db.select().from(visitas).where(eq(visitas.id, id));
    if (!visita) {
      res.status(404).json({ error: "Visita no encontrada" });
      return;
    }

    const [obra] = await db.select().from(obras).where(eq(obras.id, visita.obraId));
    if (!obra) {
      res.status(404).json({ error: "Obra no encontrada" });
      return;
    }

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

    const pdfBuffer = await generateInformeVisitaPdf({
      obra,
      visita,
      adjuntos: attachments,
      numeroVisita,
    });

    const fecha = visita.fecha.slice(0, 10);
    const fileName = `Informe_Visita_${slugify(obra.nombre)}_${fecha}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  })
);

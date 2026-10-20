import { Router } from "express";
import { eq } from "drizzle-orm";
import type { IntervencionesMusaat, TipoIntervencionMusaat } from "@sigram/shared";
import { db } from "../db/client.js";
import { musaat } from "../db/schema.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { estadoMusaat, ESTADO_MUSAAT_LABELS, type EstadoMusaat } from "@sigram/shared";
import { findOwnedMusaat, listMusaatVivos } from "../services/musaatAccess.js";
import { generateListaMusaatPdf } from "../services/pdfService.js";
import { idParamSchema, musaatUpsertSchema } from "../validation.js";

export const musaatRouter = Router();

// El validador admite null en los campos (patrón null-tras-pull) y la columna
// JSON guarda undefined: se normaliza aquí, igual que con los agentes de la
// obra. Se recorren solo las claves propias del objeto recibido.
//
// CUIDADO: esta función reconstruye cada intervención campo a campo, así que
// todo campo nuevo hay que añadirlo aquí o se pierde al guardar, sin ningún
// error. Pasó con `estado`: "No procede" se guardaba en el móvil y volvía
// convertido en "pendiente" después de sincronizar.
function normalizarIntervenciones(
  intervenciones: ReturnType<typeof musaatUpsertSchema.parse>["intervenciones"]
): IntervencionesMusaat | null {
  if (!intervenciones) return null;
  const limpio: IntervencionesMusaat = {};
  for (const [tipo, valor] of Object.entries(intervenciones)) {
    if (!valor) continue;
    limpio[tipo as TipoIntervencionMusaat] = {
      estado: valor.estado ?? undefined,
      fechaEnvio: valor.fechaEnvio ?? undefined,
      aplica: valor.aplica ?? undefined,
    };
  }
  return limpio;
}

musaatRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const email = currentUserEmail(req);
    const filas = await listMusaatVivos(email);
    // En memoria y no con ORDER BY: SQLite no compara con las reglas del
    // español y la eñe y las tildes quedarían fuera de sitio.
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    res.json(filas);
  })
);

// Exporta la lista a PDF, con el mismo filtro y la misma búsqueda que se
// estén viendo en la app (llegan por la URL).
//
// Va declarada ANTES de "/:id" a propósito: si fuera después, Express
// intentaría leer "pdf" como si fuera un identificador y respondería 400.
musaatRouter.get(
  "/pdf",
  asyncHandler(async (req, res) => {
    const email = currentUserEmail(req);
    const estado = typeof req.query.estado === "string" ? req.query.estado : "";
    const texto = (typeof req.query.q === "string" ? req.query.q : "").trim().toLowerCase();

    let registros = await listMusaatVivos(email);
    registros.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const esEstado = (v: string): v is EstadoMusaat =>
      v === "nada" || v === "parcial" || v === "completo";

    const partes: string[] = [];
    if (esEstado(estado)) {
      registros = registros.filter((r) => estadoMusaat(r) === estado);
      partes.push(ESTADO_MUSAAT_LABELS[estado]);
    }
    if (texto) {
      registros = registros.filter(
        (r) =>
          r.nombre.toLowerCase().includes(texto) ||
          (r.numeroExpediente ?? "").toLowerCase().includes(texto)
      );
      partes.push(`búsqueda: “${req.query.q as string}”`);
    }

    const descripcion = partes.length ? partes.join(" · ") : "Todas las obras";
    const pdf = await generateListaMusaatPdf({ registros, descripcion });

    // Fecha delante para que el explorador los ordene solos, como el informe.
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fecha}_Musaat.pdf"`);
    res.send(pdf);
  })
);

musaatRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const registro = await findOwnedMusaat(id, email);
    if (!registro || registro.deletedAt) {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }
    res.json(registro);
  })
);

// Upsert idempotente por id generado en el cliente, igual que obras.
musaatRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const parsed = musaatUpsertSchema.parse(req.body);
    const data = {
      numeroExpediente: parsed.numeroExpediente ?? null,
      // `nombre` es NOT NULL en la tabla: se rellena con "" como en obras.
      nombre: parsed.nombre ?? "",
      intervenciones: normalizarIntervenciones(parsed.intervenciones),
      observaciones: parsed.observaciones ?? null,
    };
    const now = new Date().toISOString();

    const [existing] = await db.select().from(musaat).where(eq(musaat.id, id));

    if (existing) {
      if (email && existing.ownerEmail !== email) {
        res.status(404).json({ error: "Registro no encontrado" });
        return;
      }
      await db
        .update(musaat)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(musaat.id, id));
    } else {
      await db
        .insert(musaat)
        .values({ id, ownerEmail: email, ...data, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(musaat).where(eq(musaat.id, id));
    res.json(row);
  })
);

musaatRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const registro = await findOwnedMusaat(id, email);
    if (!registro) {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }
    const now = new Date().toISOString();
    await db
      .update(musaat)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(musaat.id, id));
    res.status(204).send();
  })
);

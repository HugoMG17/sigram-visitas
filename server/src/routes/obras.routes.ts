import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AgenteExtra, ObraAgentes, RolAgente } from "@sigram/shared";
import { db } from "../db/client.js";
import { obras, visitas } from "../db/schema.js";
import { eliminarAdjuntosDeVisitas } from "../services/adjuntoDeletion.js";
import type { AuthUser } from "../auth/passport.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { currentUserEmail } from "../middleware/currentUser.js";
import { idParamSchema, obraUpsertSchema } from "../validation.js";

export const obrasRouter = Router();

// El validador permite null en nombre/dni de cada persona (patrón null-tras-pull),
// pero la columna JSON guarda AgentePersona (string | undefined): se normaliza
// aquí, convirtiendo null en undefined y descartando roles vacíos.
function normalizarAgentes(
  agentes: ReturnType<typeof obraUpsertSchema.parse>["agentes"]
): ObraAgentes | null {
  if (!agentes) return null;
  const limpio: ObraAgentes = {};
  for (const [rol, personas] of Object.entries(agentes)) {
    if (!personas) continue;
    limpio[rol as RolAgente] = personas.map((p) => ({
      nombre: p.nombre ?? undefined,
      dni: p.dni ?? undefined,
    }));
  }
  return limpio;
}

// Mismo motivo que normalizarAgentes: el validador admite null en nombre/dni y
// la columna JSON guarda AgentePersona (string | undefined).
function normalizarAgentesExtra(
  extra: ReturnType<typeof obraUpsertSchema.parse>["direccionFacultativaExtra"]
): AgenteExtra[] | null {
  if (!extra) return null;
  return extra.map((item) => ({
    rol: item.rol ?? "",
    personas: (item.personas ?? []).map((p) => ({
      nombre: p.nombre ?? undefined,
      dni: p.dni ?? undefined,
    })),
  }));
}

// En modo local/dev sin login (currentUserEmail === null) no se filtra por
// propietario: se sigue viendo todo, como antes del multi-usuario.
function ownerFilter(email: string | null) {
  return email ? eq(obras.ownerEmail, email) : undefined;
}

obrasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const email = currentUserEmail(req);
    const rows = await db
      .select()
      .from(obras)
      .where(and(isNull(obras.deletedAt), ownerFilter(email)))
      .orderBy(desc(obras.updatedAt));
    res.json(rows);
  })
);

obrasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const [row] = await db
      .select()
      .from(obras)
      .where(and(eq(obras.id, id), isNull(obras.deletedAt), ownerFilter(email)));
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
    const email = currentUserEmail(req);
    const parsed = obraUpsertSchema.parse(req.body);
    // Ningún campo es obligatorio en el formulario, pero varias columnas
    // históricas son NOT NULL en SQLite: se rellenan con valores neutros.
    const data = {
      ...parsed,
      agentes: normalizarAgentes(parsed.agentes),
      direccionFacultativaExtra: normalizarAgentesExtra(parsed.direccionFacultativaExtra),
      nombre: parsed.nombre ?? "",
      direccion: parsed.direccion ?? "",
      municipio: parsed.municipio ?? "",
      provincia: parsed.provincia ?? "",
      promotor: parsed.promotor ?? "",
      tipoObra: parsed.tipoObra ?? "otro",
      estado: parsed.estado ?? "en_ejecucion",
    };
    const now = new Date().toISOString();

    const [existing] = await db.select().from(obras).where(eq(obras.id, id));

    if (existing) {
      // No se deja editar una obra ajena ni una sin dueño asignado; se
      // responde 404 (no 403) para no confirmar a un tercero que el id existe.
      if (email && existing.ownerEmail !== email) {
        res.status(404).json({ error: "Obra no encontrada" });
        return;
      }
      await db
        .update(obras)
        .set({ ...data, updatedAt: now, deletedAt: null })
        .where(eq(obras.id, id));
    } else {
      await db.insert(obras).values({ id, ownerEmail: email, ...data, createdAt: now, updatedAt: now });
    }

    const [row] = await db.select().from(obras).where(eq(obras.id, id));
    res.json(row);
  })
);

obrasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParamSchema.parse(req.params.id);
    const email = currentUserEmail(req);
    const [existing] = await db.select().from(obras).where(eq(obras.id, id));
    if (existing && email && existing.ownerEmail !== email) {
      res.status(404).json({ error: "Obra no encontrada" });
      return;
    }
    // La obra se marca como borrada (no se elimina la fila) para que la
    // sincronización propague el borrado a los demás dispositivos. Pero sus
    // fotos sí se eliminan de verdad: si no, se quedarían para siempre
    // ocupando espacio en el Drive del usuario y sin forma de llegar a ellas.
    const visitasDeObra = await db
      .select({ id: visitas.id })
      .from(visitas)
      .where(eq(visitas.obraId, id));
    const borradas = await eliminarAdjuntosDeVisitas(
      visitasDeObra.map((v) => v.id),
      req.user as AuthUser | undefined
    );
    if (borradas > 0) console.log(`[obras] borrada ${id}: ${borradas} adjunto(s) eliminados`);

    const now = new Date().toISOString();
    await db.update(obras).set({ deletedAt: now, updatedAt: now }).where(eq(obras.id, id));
    res.status(204).send();
  })
);

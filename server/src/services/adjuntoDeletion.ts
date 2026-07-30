import { inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { adjuntos } from "../db/schema.js";
import type { AuthUser } from "../auth/passport.js";
import { buildOAuthClient, deleteFromDrive } from "./driveService.js";
import { deleteAttachmentFiles } from "./fileService.js";

type AdjuntoRow = typeof adjuntos.$inferSelect;

// Cuántos ficheros se borran a la vez en Drive. Ni de uno en uno (una obra con
// muchas fotos tardaría demasiado) ni todos de golpe (Google limita el ritmo
// de peticiones).
const BORRADOS_SIMULTANEOS = 5;

// Borra de verdad los adjuntos indicados: primero el fichero donde esté
// guardado (Drive o el disco del servidor) y después su fila.
//
// Se usa tanto al borrar una foto suelta como al borrar una obra, una visita
// o un punto: en esos casos el registro se marca como borrado (para que la
// sincronización propague el borrado a los demás dispositivos), pero las
// fotos sí se eliminan, porque si no se quedarían ocupando espacio en el
// Drive del usuario para siempre y sin ninguna forma de llegar a ellas.
export async function eliminarAdjuntos(
  filas: AdjuntoRow[],
  user: AuthUser | undefined
): Promise<number> {
  if (filas.length === 0) return 0;

  const enDrive = filas.filter((f) => f.driveFileId);
  const enDisco = filas.filter((f) => !f.driveFileId);

  if (enDrive.length > 0) {
    if (user) {
      const auth = buildOAuthClient(user);
      for (let i = 0; i < enDrive.length; i += BORRADOS_SIMULTANEOS) {
        const lote = enDrive.slice(i, i + BORRADOS_SIMULTANEOS);
        await Promise.all(
          lote.flatMap((f) => [
            deleteFromDrive(auth, f.driveFileId!),
            ...(f.driveThumbnailId ? [deleteFromDrive(auth, f.driveThumbnailId)] : []),
          ])
        );
      }
    } else {
      // Sin usuario no hay permisos para tocar su Drive. Se avisa en vez de
      // borrar la fila en silencio y dejar el fichero inalcanzable.
      console.error(
        `[adjuntos] ${enDrive.length} fichero(s) de Drive no se han podido borrar: no hay sesión de usuario`
      );
    }
  }

  await deleteAttachmentFiles(enDisco.flatMap((f) => [f.rutaServidor, f.rutaThumbnail]));

  await db.delete(adjuntos).where(
    inArray(
      adjuntos.id,
      filas.map((f) => f.id)
    )
  );
  return filas.length;
}

// Los adjuntos de una visita: incluye tanto sus fotos generales como las que
// cuelgan de sus puntos, ya que todas llevan el visitaId de la visita.
export async function eliminarAdjuntosDeVisitas(
  visitaIds: string[],
  user: AuthUser | undefined
): Promise<number> {
  if (visitaIds.length === 0) return 0;
  const filas = await db.select().from(adjuntos).where(inArray(adjuntos.visitaId, visitaIds));
  return eliminarAdjuntos(filas, user);
}

export async function eliminarAdjuntosDePuntos(
  puntoIds: string[],
  user: AuthUser | undefined
): Promise<number> {
  if (puntoIds.length === 0) return 0;
  const filas = await db.select().from(adjuntos).where(inArray(adjuntos.puntoId, puntoIds));
  return eliminarAdjuntos(filas, user);
}

import { Store, type SessionData } from "express-session";
import { sqlClient } from "../db/client.js";

// Almacén de sesiones respaldado por la base de datos (libSQL/Turso).
//
// Por defecto express-session guarda las sesiones en la memoria del proceso,
// así que cada reinicio del servidor las borra todas: en Render eso pasa en
// cada despliegue (y cada vez que el servicio despierta tras dormirse), y
// obliga a volver a iniciar sesión. Guardándolas aquí sobreviven.
//
// No vale meter los datos de sesión en la propia cookie: la sesión contiene
// los tokens de Google del usuario (los que usa Drive para subir sus fotos),
// y esos no pueden viajar en el navegador.

const UNA_HORA_MS = 60 * 60 * 1000;

function expiracionDe(sess: SessionData): number {
  const expires = sess.cookie?.expires;
  if (expires) return new Date(expires).getTime();
  const maxAge = sess.cookie?.originalMaxAge;
  return Date.now() + (typeof maxAge === "number" ? maxAge : UNA_HORA_MS);
}

export class DbSessionStore extends Store {
  private ultimaLimpieza = 0;

  // Borra las sesiones caducadas de vez en cuando (como mucho una vez por
  // hora), aprovechando cualquier escritura. Evita que la tabla crezca sin fin
  // sin necesidad de un proceso aparte.
  private async limpiarCaducadas(): Promise<void> {
    const ahora = Date.now();
    if (ahora - this.ultimaLimpieza < UNA_HORA_MS) return;
    this.ultimaLimpieza = ahora;
    try {
      await sqlClient.execute({
        sql: "DELETE FROM sesiones WHERE expira_en < ?;",
        args: [ahora],
      });
    } catch (err) {
      console.error("[sesiones] no se pudieron limpiar las caducadas:", err);
    }
  }

  get(sid: string, callback: (err?: unknown, session?: SessionData | null) => void): void {
    sqlClient
      .execute({ sql: "SELECT datos, expira_en FROM sesiones WHERE sid = ?;", args: [sid] })
      .then((res) => {
        const fila = res.rows[0];
        if (!fila) return callback(null, null);
        if (Number(fila.expira_en) < Date.now()) {
          // Caducada: se trata como inexistente y se borra por el camino.
          void sqlClient.execute({ sql: "DELETE FROM sesiones WHERE sid = ?;", args: [sid] });
          return callback(null, null);
        }
        callback(null, JSON.parse(String(fila.datos)) as SessionData);
      })
      .catch((err) => callback(err));
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const datos = JSON.stringify(session);
    sqlClient
      .execute({
        sql: `INSERT INTO sesiones (sid, datos, expira_en) VALUES (?, ?, ?)
              ON CONFLICT(sid) DO UPDATE SET datos = excluded.datos, expira_en = excluded.expira_en;`,
        args: [sid, datos, expiracionDe(session)],
      })
      .then(() => this.limpiarCaducadas())
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    sqlClient
      .execute({ sql: "DELETE FROM sesiones WHERE sid = ?;", args: [sid] })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  // Con resave:false, express-session llama a touch() en vez de set() cuando
  // la sesión no ha cambiado; sin esto, la caducidad no se renovaría y el
  // usuario acabaría desconectado a los 30 días aunque siguiera usando la app.
  touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    sqlClient
      .execute({
        sql: "UPDATE sesiones SET expira_en = ? WHERE sid = ?;",
        args: [expiracionDe(session), sid],
      })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }
}

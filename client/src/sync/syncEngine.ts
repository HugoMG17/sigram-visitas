import { isAxiosError } from "axios";
import { apiClient } from "../api/client";
import { fetchAuthStatus } from "../api/auth";
import { deleteObra, saveObra } from "../api/obras";
import { deleteVisita, saveVisita } from "../api/visitas";
import { deletePunto, savePunto } from "../api/puntos";
import { uploadAdjunto } from "../api/adjuntos";
import { db } from "../db/db";
import type { Adjunto, Obra, Punto, Visita } from "@sigram/shared";

let syncing = false;
let intervalHandle: ReturnType<typeof setInterval> | undefined;

function describeError(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return `Sin respuesta del servidor (${err.message}). Comprueba que el móvil está en la misma wifi que el ordenador y que el servidor sigue arrancado.`;
    }
    const data = err.response.data as { error?: string } | undefined;
    return `HTTP ${err.response.status}: ${data?.error ?? err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

async function pushObras(): Promise<void> {
  const pendientes = await db.obras.where("syncStatus").anyOf(["pending", "error"]).toArray();
  for (const obra of pendientes) {
    try {
      if (obra.deletedAt) {
        await deleteObra(obra.id);
      } else {
        const { id, syncStatus: _s, syncError: _e, createdAt: _c, updatedAt: _u, deletedAt: _d, ...data } = obra;
        await saveObra(id, data);
      }
      await db.obras.update(obra.id, { syncStatus: "synced", syncError: undefined });
    } catch (err) {
      await db.obras.update(obra.id, { syncStatus: "error", syncError: describeError(err) });
    }
  }
}

async function pushVisitas(): Promise<void> {
  const pendientes = await db.visitas.where("syncStatus").anyOf(["pending", "error"]).toArray();
  for (const visita of pendientes) {
    const obraPadre = await db.obras.get(visita.obraId);
    if (!obraPadre) {
      await db.visitas.update(visita.id, {
        syncStatus: "error",
        syncError: "No se encuentra la obra de esta visita en el dispositivo.",
      });
      continue;
    }
    if (obraPadre.syncStatus === "pending" || obraPadre.syncStatus === "error") continue;
    try {
      if (visita.deletedAt) {
        await deleteVisita(visita.id);
      } else {
        const { id, syncStatus: _s, syncError: _e, createdAt: _c, updatedAt: _u, deletedAt: _d, ...data } =
          visita;
        await saveVisita(id, data);
      }
      await db.visitas.update(visita.id, { syncStatus: "synced", syncError: undefined });
    } catch (err) {
      await db.visitas.update(visita.id, { syncStatus: "error", syncError: describeError(err) });
    }
  }
}

async function pushPuntos(): Promise<void> {
  const pendientes = await db.puntos.where("syncStatus").anyOf(["pending", "error"]).toArray();
  for (const punto of pendientes) {
    const visitaPadre = await db.visitas.get(punto.visitaId);
    if (!visitaPadre) {
      await db.puntos.update(punto.id, {
        syncStatus: "error",
        syncError: "No se encuentra la visita de este punto en el dispositivo.",
      });
      continue;
    }
    if (visitaPadre.syncStatus === "pending" || visitaPadre.syncStatus === "error") continue;
    try {
      if (punto.deletedAt) {
        await deletePunto(punto.id);
      } else {
        const { id, syncStatus: _s, syncError: _e, orden: _o, createdAt: _c, updatedAt: _u, deletedAt: _d, ...data } =
          punto;
        await savePunto(id, data);
      }
      await db.puntos.update(punto.id, { syncStatus: "synced", syncError: undefined });
    } catch (err) {
      await db.puntos.update(punto.id, { syncStatus: "error", syncError: describeError(err) });
    }
  }
}

async function pushAdjuntos(): Promise<void> {
  const pendientes = await db.adjuntos.where("syncStatus").anyOf(["pending", "error"]).toArray();
  for (const adjunto of pendientes) {
    const visitaPadre = await db.visitas.get(adjunto.visitaId);
    if (visitaPadre?.syncStatus === "pending" || visitaPadre?.syncStatus === "error") continue;
    if (adjunto.puntoId) {
      const puntoPadre = await db.puntos.get(adjunto.puntoId);
      if (puntoPadre?.syncStatus === "pending" || puntoPadre?.syncStatus === "error") continue;
    }
    if (!adjunto.blobLocal) continue;
    try {
      const subido = await uploadAdjunto({
        id: adjunto.id,
        visitaId: adjunto.visitaId,
        puntoId: adjunto.puntoId,
        file: adjunto.blobLocal,
        fileName: adjunto.nombreArchivo,
        tipo: adjunto.tipo,
        caption: adjunto.caption,
        orden: adjunto.orden,
      });
      await db.adjuntos.put({ ...subido, syncStatus: "synced", syncError: undefined, blobLocal: undefined });
    } catch (err) {
      await db.adjuntos.update(adjunto.id, { syncStatus: "error", syncError: describeError(err) });
    }
  }
}

async function pull(): Promise<void> {
  const remoteObras = await apiClient.get<Obra[]>("/obras").then((r) => r.data);
  for (const remota of remoteObras) {
    const local = await db.obras.get(remota.id);
    if (!local || local.syncStatus === "synced") {
      await db.obras.put({ ...remota, syncStatus: "synced" });
    }

    const remoteVisitas = await apiClient
      .get<Visita[]>(`/obras/${remota.id}/visitas`)
      .then((r) => r.data);
    for (const rv of remoteVisitas) {
      const localV = await db.visitas.get(rv.id);
      if (!localV || localV.syncStatus === "synced") {
        await db.visitas.put({ ...rv, syncStatus: "synced" });
      }

      const remotePuntos = await apiClient
        .get<Punto[]>(`/visitas/${rv.id}/puntos`)
        .then((r) => r.data);
      for (const rp of remotePuntos) {
        const localP = await db.puntos.get(rp.id);
        if (!localP || localP.syncStatus === "synced") {
          await db.puntos.put({ ...rp, syncStatus: "synced" });
        }
      }

      const remoteAdjuntos = await apiClient
        .get<Adjunto[]>(`/visitas/${rv.id}/adjuntos`)
        .then((r) => r.data);
      for (const ra of remoteAdjuntos) {
        const localA = await db.adjuntos.get(ra.id);
        if (!localA) {
          await db.adjuntos.put({ ...ra, syncStatus: "synced" });
        }
      }
    }
  }
}

let lastRunAt = 0;
const MIN_INTERVAL_MS = 5_000;

export async function runSync(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  // Límite de seguridad: pase lo que pase disparando "online"/clics repetidos
  // (algunas extensiones del navegador emiten ese evento en ráfaga), nunca
  // se martillea el servidor más de una vez cada pocos segundos.
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;

  syncing = true;
  try {
    await pushObras();
    await pushVisitas();
    await pushPuntos();
    await pushAdjuntos();
    await pull();
  } catch {
    // Fallo en el pull (o de red general): se reintentará en el siguiente
    // ciclo. Los fallos de cada registro individual ya quedan registrados
    // en su propio syncError durante el push.
  } finally {
    syncing = false;
  }
}

const LAST_USER_EMAIL_KEY = "sigram:lastUserEmail";

// Un mismo navegador (p.ej. un ordenador compartido del estudio) podría
// iniciar sesión con dos cuentas de Google distintas en momentos distintos.
// Si detectamos que el usuario autenticado cambió respecto al último que
// sincronizó en este dispositivo, se vacía Dexie antes de traer datos
// nuevos, para no mezclar obras de dos arquitectos distintos.
async function resetLocalDataIfUserChanged(): Promise<void> {
  let status;
  try {
    status = await fetchAuthStatus();
  } catch {
    return; // sin conexión al arrancar: no se puede comprobar, no se toca nada
  }
  if (!status.authenticated || !status.email) return;

  const lastEmail = localStorage.getItem(LAST_USER_EMAIL_KEY);
  if (lastEmail && lastEmail !== status.email) {
    await Promise.all([db.obras.clear(), db.visitas.clear(), db.puntos.clear(), db.adjuntos.clear()]);
  }
  localStorage.setItem(LAST_USER_EMAIL_KEY, status.email);
}

export function initSyncEngine(): void {
  window.addEventListener("online", () => void runSync());
  if (!intervalHandle) {
    intervalHandle = setInterval(() => void runSync(), 30_000);
  }
  void resetLocalDataIfUserChanged().then(() => runSync());
}

import { isAxiosError } from "axios";
import { apiClient } from "../api/client";
import { deleteObra, saveObra } from "../api/obras";
import { deleteVisita, saveVisita } from "../api/visitas";
import { uploadAdjunto } from "../api/adjuntos";
import { db } from "../db/db";
import type { Adjunto, Obra, Visita } from "@sigram/shared";

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

async function pushAdjuntos(): Promise<void> {
  const pendientes = await db.adjuntos.where("syncStatus").anyOf(["pending", "error"]).toArray();
  for (const adjunto of pendientes) {
    const visitaPadre = await db.visitas.get(adjunto.visitaId);
    if (visitaPadre?.syncStatus === "pending" || visitaPadre?.syncStatus === "error") continue;
    if (!adjunto.blobLocal) continue;
    try {
      const subido = await uploadAdjunto({
        id: adjunto.id,
        visitaId: adjunto.visitaId,
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

export function initSyncEngine(): void {
  window.addEventListener("online", () => void runSync());
  if (!intervalHandle) {
    intervalHandle = setInterval(() => void runSync(), 30_000);
  }
  void runSync();
}

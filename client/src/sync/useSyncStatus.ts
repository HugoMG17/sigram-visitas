import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";

export function usePendingCount(): number {
  const count = useLiveQuery(async () => {
    const [per, o, v, p, a] = await Promise.all([
      db.personas.where("syncStatus").equals("pending").count(),
      db.obras.where("syncStatus").equals("pending").count(),
      db.visitas.where("syncStatus").equals("pending").count(),
      db.puntos.where("syncStatus").equals("pending").count(),
      db.adjuntos.where("syncStatus").equals("pending").count(),
    ]);
    return per + o + v + p + a;
  }, []);
  return count ?? 0;
}

export interface SyncErrorInfo {
  entidad: string;
  nombre: string;
  mensaje: string;
}

export function useSyncErrors(): SyncErrorInfo[] {
  const errores = useLiveQuery(async () => {
    const [personas, obras, visitas, puntos, adjuntos] = await Promise.all([
      db.personas.where("syncStatus").equals("error").toArray(),
      db.obras.where("syncStatus").equals("error").toArray(),
      db.visitas.where("syncStatus").equals("error").toArray(),
      db.puntos.where("syncStatus").equals("error").toArray(),
      db.adjuntos.where("syncStatus").equals("error").toArray(),
    ]);
    return [
      ...personas.map((p) => ({
        entidad: "Persona",
        nombre: p.nombre || "Ficha sin nombre",
        mensaje: p.syncError ?? "Error desconocido",
      })),
      ...obras.map((o) => ({ entidad: "Obra", nombre: o.nombre, mensaje: o.syncError ?? "Error desconocido" })),
      ...visitas.map((v) => ({
        entidad: "Visita",
        nombre: v.titulo || "Visita de obra",
        mensaje: v.syncError ?? "Error desconocido",
      })),
      ...puntos.map((p) => ({
        entidad: "Punto",
        nombre: p.titulo || "Punto sin título",
        mensaje: p.syncError ?? "Error desconocido",
      })),
      ...adjuntos.map((a) => ({
        entidad: "Adjunto",
        nombre: a.nombreArchivo,
        mensaje: a.syncError ?? "Error desconocido",
      })),
    ];
  }, []);
  return errores ?? [];
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

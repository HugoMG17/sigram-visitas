import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useMutation } from "@tanstack/react-query";
import { ESTADO_PUNTO_LABELS } from "@sigram/shared";
import type { LocalAdjunto, LocalPunto } from "../db/db";
import { listAdjuntosDePunto, deleteAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import {
  movePuntoLocal,
  setPuntoDescripcionLocal,
  setPuntoEstadoLocal,
  softDeletePuntoLocal,
} from "../db/repositories/puntoRepo";
import { resolveAdjuntoFileUrl } from "../api/adjuntos";
import { runSync } from "../sync/syncEngine";
import { downloadBlob, downloadFromUrl } from "../utils/download";
import { AttachmentCapture } from "./AttachmentCapture";
import { AdjuntoImage } from "./AdjuntoImage";

async function descargarAdjunto(adjunto: LocalAdjunto) {
  try {
    if (adjunto.blobLocal) {
      await downloadBlob(adjunto.blobLocal, adjunto.nombreArchivo);
      return;
    }
    const url = resolveAdjuntoFileUrl(adjunto);
    if (!url) return;
    await downloadFromUrl(url, adjunto.nombreArchivo);
  } catch {
    window.alert("No se pudo descargar el archivo.");
  }
}

export function PuntoCard({
  punto,
  isFirst,
  isLast,
}: {
  punto: LocalPunto;
  isFirst: boolean;
  isLast: boolean;
}) {
  const adjuntos = useLiveQuery(() => listAdjuntosDePunto(punto.id), [punto.id]) ?? [];
  const [descripcion, setDescripcion] = useState(punto.descripcion ?? "");

  const toggleMutation = useMutation({
    networkMode: "always",
    mutationFn: () =>
      setPuntoEstadoLocal(punto.id, punto.estado === "pendiente" ? "solucionado" : "pendiente"),
    onSuccess: () => void runSync(),
  });

  const moveMutation = useMutation({
    networkMode: "always",
    mutationFn: (direccion: "arriba" | "abajo") =>
      movePuntoLocal(punto.visitaId, punto.id, direccion),
    onSuccess: () => void runSync(),
  });

  const deleteMutation = useMutation({
    networkMode: "always",
    mutationFn: () => softDeletePuntoLocal(punto.id),
    onSuccess: () => void runSync(),
  });

  const descripcionMutation = useMutation({
    networkMode: "always",
    mutationFn: (valor: string) => setPuntoDescripcionLocal(punto.id, valor),
    onSuccess: () => void runSync(),
  });

  const solucionado = punto.estado === "solucionado";

  return (
    <div className="card stack" style={{ gap: "0.6rem" }}>
      <div className="row-between">
        <div className="row" style={{ gap: "0.5rem" }}>
          <span
            title={solucionado ? "Solucionado" : "Pendiente"}
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: solucionado ? "#16a34a" : "#f59e0b",
              flexShrink: 0,
            }}
          />
          <strong>{punto.titulo || "Punto sin título"}</strong>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Estado: {ESTADO_PUNTO_LABELS[punto.estado]}
          </span>
        </div>
        <div className="row" style={{ gap: "0.4rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            title="Subir"
            style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
            onClick={() => moveMutation.mutate("arriba")}
            disabled={isFirst || moveMutation.isPending}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            title="Bajar"
            style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
            onClick={() => moveMutation.mutate("abajo")}
            disabled={isLast || moveMutation.isPending}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            {solucionado ? "Marcar pendiente" : "Marcar solucionado"}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
            onClick={() => {
              if (window.confirm("¿Eliminar este punto, con sus fotos? No se puede deshacer.")) {
                deleteMutation.mutate();
              }
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      <textarea
        className="input"
        style={{ width: "100%", minHeight: "3rem", resize: "vertical" }}
        placeholder="Añade una descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        onBlur={() => {
          if (descripcion !== (punto.descripcion ?? "")) descripcionMutation.mutate(descripcion);
        }}
      />

      <AttachmentCapture
        visitaId={punto.visitaId}
        puntoId={punto.id}
        siguienteOrden={adjuntos.length}
        compact
      />

      {adjuntos.length > 0 && (
        <div className="photo-grid">
          {adjuntos.map((foto) => (
            <div key={foto.id} className="photo-thumb">
              <AdjuntoImage adjunto={foto} alt={foto.caption ?? "Foto del punto"} />
              {foto.syncStatus === "pending" && (
                <span
                  className="badge"
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: 4,
                    background: "#f59e0b",
                    color: "white",
                  }}
                >
                  pendiente
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                title="Descargar"
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  padding: "0.15rem 0.5rem",
                  fontSize: "0.75rem",
                }}
                onClick={() => void descargarAdjunto(foto)}
              >
                ⬇
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  padding: "0.15rem 0.5rem",
                  fontSize: "0.75rem",
                }}
                onClick={() => {
                  if (window.confirm("¿Eliminar esta foto? No se puede deshacer.")) {
                    void deleteAdjuntoLocal(foto.id);
                  }
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

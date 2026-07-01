import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { isImageMime } from "@sigram/shared";
import { pdfUrl } from "../api/visitas";
import { getVisita } from "../db/repositories/visitaRepo";
import { getObra } from "../db/repositories/obraRepo";
import { listAdjuntos, deleteAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import { runSync } from "../sync/syncEngine";
import { AttachmentCapture } from "../components/AttachmentCapture";
import { AdjuntoImage } from "../components/AdjuntoImage";
import { DocumentoLink } from "../components/DocumentoLink";

export function VisitaDetailPage() {
  const { visitaId } = useParams<{ visitaId: string }>();
  const [syncing, setSyncing] = useState(false);

  const visita = useLiveQuery(() => (visitaId ? getVisita(visitaId) : undefined), [visitaId]);
  const obra = useLiveQuery(() => (visita ? getObra(visita.obraId) : undefined), [visita]);
  const adjuntos = useLiveQuery(
    () => (visitaId ? listAdjuntos(visitaId) : undefined),
    [visitaId]
  );

  if (visita === undefined || adjuntos === undefined) {
    return <p className="muted">Cargando visita…</p>;
  }
  if (!visita) return <p className="error-text">Visita no encontrada.</p>;

  const fotos = adjuntos.filter((a) => isImageMime(a.mimeType));
  const documentos = adjuntos.filter((a) => !isImageMime(a.mimeType));
  const puedeExportar =
    visita.syncStatus === "synced" && adjuntos.every((a) => a.syncStatus === "synced");

  async function handleSincronizar() {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="stack">
      <Link to={`/obras/${visita.obraId}`} className="back-link">
        ← {obra?.nombre ?? "Obra"}
      </Link>

      <div className="card stack">
        <div className="row-between">
          <h1 style={{ margin: 0 }}>{visita.titulo || "Visita de obra"}</h1>
          <div className="row">
            {puedeExportar ? (
              <a href={pdfUrl(visita.id)} className="btn" style={{ textDecoration: "none" }}>
                Exportar PDF
              </a>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSincronizar}
                disabled={syncing}
              >
                {syncing ? "Sincronizando…" : "Sincronizar para exportar"}
              </button>
            )}
            <Link to={`/visitas/${visita.id}/editar`} className="btn btn-secondary">
              Editar
            </Link>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {format(new Date(visita.fecha), "dd/MM/yyyy HH:mm")}
        </p>
        {(visita.tiempoAtmosferico || visita.asistentes) && (
          <p className="muted" style={{ margin: 0 }}>
            {visita.tiempoAtmosferico && `Tiempo: ${visita.tiempoAtmosferico}`}
            {visita.tiempoAtmosferico && visita.asistentes && " · "}
            {visita.asistentes && `Asistentes: ${visita.asistentes}`}
          </p>
        )}
        {visita.notas && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{visita.notas}</p>}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Adjuntos</h2>
        <AttachmentCapture visitaId={visita.id} siguienteOrden={adjuntos.length} />

        {fotos.length > 0 && (
          <div className="photo-grid">
            {fotos.map((foto) => (
              <div key={foto.id} className="photo-thumb">
                <AdjuntoImage adjunto={foto} alt={foto.caption ?? "Foto de la visita"} />
                {foto.syncStatus === "pending" && (
                  <span
                    className="badge"
                    style={{ position: "absolute", bottom: 4, left: 4, background: "#f59e0b", color: "white" }}
                  >
                    pendiente
                  </span>
                )}
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
                  onClick={() => deleteAdjuntoLocal(foto.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {documentos.length > 0 && (
          <div className="stack">
            {documentos.map((doc) => (
              <div key={doc.id} className="attachment-row row-between">
                <DocumentoLink adjunto={doc} />
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteAdjuntoLocal(doc.id)}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {adjuntos.length === 0 && <p className="muted">Todavía no hay adjuntos.</p>}
      </div>
    </div>
  );
}

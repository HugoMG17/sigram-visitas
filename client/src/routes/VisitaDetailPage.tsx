import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { isImageMime } from "@sigram/shared";
import { pdfUrl } from "../api/visitas";
import { getVisita, softDeleteVisitaLocal } from "../db/repositories/visitaRepo";
import { getObra } from "../db/repositories/obraRepo";
import { listAdjuntos, deleteAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import { listPuntosDeVisita } from "../db/repositories/puntoRepo";
import { resolveAdjuntoFileUrl } from "../api/adjuntos";
import { runSync } from "../sync/syncEngine";
import { isNative } from "../native/platform";
import { descargarYAbrirPdf } from "../native/pdf";
import { downloadBlob, downloadFromUrl } from "../utils/download";
import type { LocalAdjunto } from "../db/db";
import { AttachmentCapture } from "../components/AttachmentCapture";
import { AdjuntoImage } from "../components/AdjuntoImage";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { DocumentoLink } from "../components/DocumentoLink";
import { PuntoCard } from "../components/PuntoCard";
import { AddPuntoForm } from "../components/AddPuntoForm";

export function VisitaDetailPage() {
  const { visitaId } = useParams<{ visitaId: string }>();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState<LocalAdjunto | null>(null);

  const visita = useLiveQuery(() => (visitaId ? getVisita(visitaId) : undefined), [visitaId]);
  const obra = useLiveQuery(() => (visita ? getObra(visita.obraId) : undefined), [visita]);
  const adjuntos = useLiveQuery(
    () => (visitaId ? listAdjuntos(visitaId) : undefined),
    [visitaId]
  );
  const puntos = useLiveQuery(
    () => (visitaId ? listPuntosDeVisita(visitaId) : undefined),
    [visitaId]
  );

  if (visita === undefined || adjuntos === undefined || puntos === undefined) {
    return <p className="muted">Cargando visita…</p>;
  }
  if (!visita) return <p className="error-text">Visita no encontrada.</p>;

  const currentVisitaId = visita.id;
  const obraId = visita.obraId;

  // Los adjuntos ligados a un punto se muestran dentro de su propia tarjeta;
  // aquí solo quedan los generales de la visita (documentos sueltos, etc.).
  const adjuntosGenerales = adjuntos.filter((a) => !a.puntoId);
  const fotos = adjuntosGenerales.filter((a) => isImageMime(a.mimeType));
  const documentos = adjuntosGenerales.filter((a) => !isImageMime(a.mimeType));
  const puedeExportar =
    visita.syncStatus === "synced" &&
    adjuntos.every((a) => a.syncStatus === "synced") &&
    puntos.every((p) => p.syncStatus === "synced");

  async function handleSincronizar() {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportarPdf() {
    setExportando(true);
    try {
      await descargarYAbrirPdf(currentVisitaId);
    } catch {
      window.alert("No se pudo generar el PDF. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setExportando(false);
    }
  }

  async function handleDescargarAdjunto(adjunto: LocalAdjunto) {
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

  async function handleEliminarVisita() {
    if (!window.confirm("¿Eliminar esta visita, con todos sus puntos y adjuntos? No se puede deshacer.")) {
      return;
    }
    await softDeleteVisitaLocal(currentVisitaId);
    void runSync();
    navigate(`/obras/${obraId}`);
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
              isNative ? (
                <button
                  type="button"
                  className="btn"
                  onClick={handleExportarPdf}
                  disabled={exportando}
                >
                  {exportando ? "Generando…" : "Exportar PDF"}
                </button>
              ) : (
                <a href={pdfUrl(visita.id)} className="btn" style={{ textDecoration: "none" }}>
                  Exportar PDF
                </a>
              )
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
            <button type="button" className="btn btn-danger" onClick={handleEliminarVisita}>
              Eliminar
            </button>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {format(new Date(visita.fecha), "dd/MM/yyyy")}
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
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Puntos</h2>
          {puntos.length > 0 && (
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {puntos.filter((p) => p.estado === "solucionado").length} de {puntos.length}{" "}
              solucionados
            </span>
          )}
        </div>
        <AddPuntoForm visitaId={visita.id} />
        {puntos.length === 0 && (
          <p className="muted">Todavía no hay puntos registrados en esta visita.</p>
        )}
        {puntos.map((punto, index) => (
          <PuntoCard
            key={punto.id}
            punto={punto}
            isFirst={index === 0}
            isLast={index === puntos.length - 1}
          />
        ))}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Otros adjuntos</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Fotos o documentos generales de la visita, no ligados a un punto concreto.
        </p>
        <AttachmentCapture visitaId={visita.id} siguienteOrden={adjuntosGenerales.length} />

        {fotos.length > 0 && (
          <div className="photo-grid">
            {fotos.map((foto) => (
              <div key={foto.id} className="photo-thumb">
                <AdjuntoImage
                  adjunto={foto}
                  alt={foto.caption ?? "Foto de la visita"}
                  onClick={() => setFotoAbierta(foto)}
                />
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
                  className="btn btn-secondary"
                  title="Descargar"
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.75rem",
                  }}
                  onClick={() => void handleDescargarAdjunto(foto)}
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

        {documentos.length > 0 && (
          <div className="stack">
            {documentos.map((doc) => (
              <div key={doc.id} className="attachment-row row-between">
                <DocumentoLink adjunto={doc} />
                <div className="row" style={{ gap: "0.4rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void handleDescargarAdjunto(doc)}
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm("¿Eliminar este documento? No se puede deshacer.")) {
                        void deleteAdjuntoLocal(doc.id);
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adjuntosGenerales.length === 0 && <p className="muted">Todavía no hay adjuntos generales.</p>}
      </div>

      {fotoAbierta && <PhotoLightbox adjunto={fotoAbierta} onClose={() => setFotoAbierta(null)} />}
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { pdfUrl } from "../api/visitas";
import { getVisita, softDeleteVisitaLocal } from "../db/repositories/visitaRepo";
import { getObra } from "../db/repositories/obraRepo";
import { listAdjuntos } from "../db/repositories/adjuntoRepo";
import { listPuntosDeVisita } from "../db/repositories/puntoRepo";
import { runSync } from "../sync/syncEngine";
import { isNative } from "../native/platform";
import { descargarYAbrirPdf } from "../native/pdf";
import { PuntoCard } from "../components/PuntoCard";
import { AddPuntoForm } from "../components/AddPuntoForm";

export function VisitaDetailPage() {
  const { visitaId } = useParams<{ visitaId: string }>();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [exportando, setExportando] = useState(false);

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

  // Los adjuntos generales de la visita ya no se gestionan aquí (se suben
  // desde "Editar visita"); solo se siguen consultando para saber si están
  // todos sincronizados antes de permitir exportar el PDF, donde sí aparecen.
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
    </div>
  );
}

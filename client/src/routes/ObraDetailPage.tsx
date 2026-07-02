import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { ESTADO_OBRA_LABELS, TIPO_OBRA_LABELS } from "@sigram/shared";
import { getObra } from "../db/repositories/obraRepo";
import { listVisitasDeObra } from "../db/repositories/visitaRepo";

export function ObraDetailPage() {
  const { obraId } = useParams<{ obraId: string }>();

  const obra = useLiveQuery(() => (obraId ? getObra(obraId) : undefined), [obraId]);
  const visitas = useLiveQuery(() => (obraId ? listVisitasDeObra(obraId) : undefined), [obraId]);

  if (obra === undefined) return <p className="muted">Cargando obra…</p>;
  if (!obra) return <p className="error-text">Obra no encontrada.</p>;

  return (
    <div className="stack">
      <Link to="/" className="back-link">
        ← Todas las obras
      </Link>

      <div className="card stack">
        <div className="row-between">
          <h1 style={{ margin: 0 }}>{obra.nombre}</h1>
          <span className="badge">{ESTADO_OBRA_LABELS[obra.estado]}</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {obra.direccion}, {obra.municipio}, {obra.provincia}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Promotor:</strong> {obra.promotor}
          {obra.promotorContacto ? ` · ${obra.promotorContacto}` : ""}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Tipo:</strong> {TIPO_OBRA_LABELS[obra.tipoObra]}
        </p>
        {obra.referenciaCatastral && (
          <p style={{ margin: 0 }}>
            <strong>Ref. catastral:</strong> {obra.referenciaCatastral}
          </p>
        )}
        {obra.numeroExpediente && (
          <p style={{ margin: 0 }}>
            <strong>Nº expediente:</strong> {obra.numeroExpediente}
          </p>
        )}
        {obra.notas && <p style={{ margin: 0 }}>{obra.notas}</p>}
        <div className="row">
          <Link to={`/obras/${obra.id}/editar`} className="btn btn-secondary">
            Editar obra
          </Link>
        </div>
      </div>

      <div className="row-between">
        <h2 style={{ margin: 0 }}>Visitas</h2>
        <Link to={`/obras/${obra.id}/visitas/nueva`} className="btn">
          + Nueva visita
        </Link>
      </div>

      {visitas === undefined && <p className="muted">Cargando visitas…</p>}

      {visitas && visitas.length === 0 && (
        <div className="empty-state">
          <p>Todavía no hay visitas registradas en esta obra.</p>
        </div>
      )}

      {visitas?.map((visita) => (
        <Link key={visita.id} to={`/visitas/${visita.id}`} className="card-link">
          <div className="card row-between">
            <div>
              <strong>{visita.titulo || "Visita de obra"}</strong>
              <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                {format(new Date(visita.fecha), "dd/MM/yyyy")}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

import { Link } from "react-router-dom";
import type { Obra } from "@sigram/shared";
import { ESTADO_OBRA_LABELS } from "@sigram/shared";

export function ObraCard({ obra }: { obra: Obra }) {
  return (
    <Link to={`/obras/${obra.id}`} className="card-link">
      <div className="card">
        {obra.numeroExpediente && (
          <p className="muted" style={{ margin: "0 0 0.3rem", fontSize: "0.8rem", fontWeight: 600 }}>
            Nº expediente: {obra.numeroExpediente}
          </p>
        )}
        <div className="row-between">
          <strong>{obra.nombre || "Obra sin nombre"}</strong>
          <span className="badge">{ESTADO_OBRA_LABELS[obra.estado]}</span>
        </div>
        {(obra.direccion || obra.municipio) && (
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            {[obra.direccion, obra.municipio].filter(Boolean).join(", ")}
          </p>
        )}
        {obra.promotor && (
          <p className="muted" style={{ margin: "0.2rem 0 0" }}>
            Promotor: {obra.promotor}
          </p>
        )}
      </div>
    </Link>
  );
}

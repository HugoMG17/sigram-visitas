import { Link } from "react-router-dom";
import type { Obra } from "@sigram/shared";
import { ESTADO_OBRA_LABELS, TIPO_OBRA_LABELS } from "@sigram/shared";

export function ObraCard({ obra }: { obra: Obra }) {
  return (
    <Link to={`/obras/${obra.id}`} className="card-link">
      <div className="card">
        <div className="row-between">
          <strong>{obra.nombre}</strong>
          <span className="badge">{ESTADO_OBRA_LABELS[obra.estado]}</span>
        </div>
        <p className="muted" style={{ margin: "0.4rem 0 0" }}>
          {obra.direccion}, {obra.municipio}
        </p>
        <p className="muted" style={{ margin: "0.2rem 0 0" }}>
          Promotor: {obra.promotor} · {TIPO_OBRA_LABELS[obra.tipoObra]}
        </p>
      </div>
    </Link>
  );
}

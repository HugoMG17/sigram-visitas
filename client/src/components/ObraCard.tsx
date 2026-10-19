import { Link } from "react-router-dom";
import type { LocalObra } from "../db/db";
import { FaseObra } from "./FaseObra";

// Una obra en la lista. El nombre manda: es lo único por lo que se busca.
// Debajo, dónde está y quién la promueve en una sola línea, y la fase.
export function ObraCard({ obra }: { obra: LocalObra }) {
  const donde = [obra.direccion, obra.municipio].filter(Boolean).join(", ");
  const sinSubir = obra.syncStatus === "pending" || obra.syncStatus === "error";

  return (
    <Link to={`/obras/${obra.id}`} className="fila">
      <div className="fila-meta">
        <span>{obra.numeroExpediente ? `Nº ${obra.numeroExpediente}` : "Sin expediente"}</span>
        {sinSubir && (
          <span className="chip chip--pendiente" title="Todavía no está en el servidor">
            <span className="chip-dot" />
            Sin subir
          </span>
        )}
      </div>
      <p className="fila-nombre">{obra.nombre || "Obra sin nombre"}</p>
      {(donde || obra.promotor) && (
        <p className="fila-sub">{[donde, obra.promotor].filter(Boolean).join(" · ")}</p>
      )}
      <FaseObra estado={obra.estado} />
    </Link>
  );
}

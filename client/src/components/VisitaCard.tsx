import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import type { LocalVisita } from "../db/db";
import { listPuntosDeVisita } from "../db/repositories/puntoRepo";

// Una visita en la ficha de la obra. Lo que identifica a una visita es su
// fecha, así que va primero; debajo, de qué iba y qué dejó pendiente, que es
// lo que de verdad hace falta saber antes de volver a la obra.
export function VisitaCard({ visita }: { visita: LocalVisita }) {
  const puntos = useLiveQuery(() => listPuntosDeVisita(visita.id), [visita.id]);
  const sinSubir = visita.syncStatus === "pending" || visita.syncStatus === "error";

  const pendientes = puntos?.filter((p) => p.estado === "pendiente").length ?? 0;
  const solucionados = puntos?.filter((p) => p.estado === "solucionado").length ?? 0;

  // Se dice lo que hay, incluido el cero: una visita sin puntos lo dice, no
  // se queda en blanco como si todavía estuviera cargando.
  let resumen = "Sin puntos";
  if (puntos === undefined) resumen = "";
  else if (puntos.length > 0) {
    resumen = [
      pendientes > 0 ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : null,
      solucionados > 0 ? `${solucionados} resuelto${solucionados === 1 ? "" : "s"}` : null,
      pendientes === 0 && solucionados === 0 ? `${puntos.length} sin estado` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <Link to={`/visitas/${visita.id}`} className="fila">
      <div className="fila-meta">
        <time dateTime={visita.fecha}>{format(new Date(visita.fecha), "dd/MM/yyyy")}</time>
        {sinSubir && (
          <span className="chip chip--pendiente" title="Todavía no está en el servidor">
            <span className="chip-dot" />
            Sin subir
          </span>
        )}
      </div>
      <p className="fila-nombre" style={{ fontSize: "16px" }}>
        {visita.titulo || "Visita de obra"}
      </p>
      {resumen && (
        <p className="fila-sub" style={{ marginTop: "2px" }}>
          {resumen}
        </p>
      )}
    </Link>
  );
}

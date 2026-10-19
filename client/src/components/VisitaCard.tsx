import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import type { LocalVisita } from "../db/db";
import { listPuntosDeVisita } from "../db/repositories/puntoRepo";

// Una visita en la ficha de la obra. Lo que identifica a una visita es su
// fecha, así que va primero; a la derecha, lo que dejó pendiente, que es lo
// que de verdad hace falta saber antes de volver a la obra.
export function VisitaCard({ visita }: { visita: LocalVisita }) {
  const puntos = useLiveQuery(() => listPuntosDeVisita(visita.id), [visita.id]);
  const sinSubir = visita.syncStatus === "pending" || visita.syncStatus === "error";

  const pendientes = puntos?.filter((p) => p.estado === "pendiente").length ?? 0;
  const solucionados = puntos?.filter((p) => p.estado === "solucionado").length ?? 0;
  const sinEstado = (puntos?.length ?? 0) - pendientes - solucionados;

  return (
    <li>
      <Link to={`/visitas/${visita.id}`} className="fila fila--visita">
        <div>
          <p className="fila-meta" style={{ marginBottom: "2px" }}>
            <time dateTime={visita.fecha}>{format(new Date(visita.fecha), "dd/MM/yyyy")}</time>
          </p>
          <p className="fila-nombre" style={{ margin: 0, fontSize: "16px" }}>
            {visita.titulo || "Visita de obra"}
          </p>
        </div>

        {/* Se dice lo que hay, incluido el cero: una visita sin puntos lo dice,
          no se queda en blanco como si todavía estuviera cargando. */}
        <div className="fila-puntos">
          {sinSubir && (
            <span className="chip chip--pendiente" title="Todavía no está en el servidor">
              <span className="chip-dot" />
              Sin subir
            </span>
          )}
          {puntos !== undefined &&
            (puntos.length === 0 ? (
              <span className="fila-puntos-cero">Sin puntos</span>
            ) : (
              <>
                {pendientes > 0 && (
                  <span className="fila-puntos-dato">
                    {pendientes} pendiente{pendientes === 1 ? "" : "s"}
                  </span>
                )}
                {solucionados > 0 && (
                  <span className="fila-puntos-cero">
                    {solucionados} resuelto{solucionados === 1 ? "" : "s"}
                  </span>
                )}
                {pendientes === 0 && solucionados === 0 && (
                  <span className="fila-puntos-cero">{sinEstado} sin estado</span>
                )}
              </>
            ))}
        </div>
      </Link>
    </li>
  );
}

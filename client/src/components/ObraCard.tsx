import { Link } from "react-router-dom";
import {
  ESTADO_MUSAAT_LABELS,
  estadoMusaatDeExpediente,
  type RegistroMusaat,
} from "@sigram/shared";
import type { LocalObra } from "../db/db";
import { FaseObra } from "./FaseObra";

// Una obra en la lista. El nombre manda: es lo único por lo que se busca.
// Debajo, dónde está y quién la promueve en una sola línea, y la fase.
export function ObraCard({
  obra,
  registrosMusaat,
}: {
  obra: LocalObra;
  registrosMusaat: RegistroMusaat[];
}) {
  const donde = [obra.direccion, obra.municipio].filter(Boolean).join(", ");
  const sinSubir = obra.syncStatus === "pending" || obra.syncStatus === "error";
  // El registro de la mutua se apunta casi siempre antes que la obra, así que
  // se emparejan por el nº de expediente. Una obra que no esté en Musaat
  // cuenta como que no se ha enviado nada.
  const estadoMusaat = estadoMusaatDeExpediente(obra.numeroExpediente, registrosMusaat);

  return (
    <li>
      <Link to={`/obras/${obra.id}`} className="fila">
        <div className="fila-meta">
          <span className={obra.numeroExpediente ? "expediente" : "expediente expediente--vacio"}>
            {obra.numeroExpediente ? `Nº ${obra.numeroExpediente}` : "Sin expediente"}
          </span>
          <span className="row" style={{ gap: "8px" }}>
            {sinSubir && (
              <span className="chip chip--pendiente" title="Todavía no está en el servidor">
                <span className="chip-dot" />
                Sin subir
              </span>
            )}
            <span className={`chip chip-musaat chip-musaat--${estadoMusaat}`}>
              <span className={`punto-estado punto-estado--${estadoMusaat}`} aria-hidden="true" />
              Musaat: {ESTADO_MUSAAT_LABELS[estadoMusaat].toLowerCase()}
            </span>
          </span>
        </div>
        <p className="fila-nombre">{obra.nombre || "Obra sin nombre"}</p>
        {(donde || obra.promotor) && (
          <p className="fila-sub">{[donde, obra.promotor].filter(Boolean).join(" · ")}</p>
        )}
        <FaseObra estado={obra.estado} />
      </Link>
    </li>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  enviadasDeMusaat,
  estadoMusaat,
  intervencionDe,
  pendientesDeMusaat,
  TIPO_INTERVENCION_MUSAAT_LABELS,
  TIPOS_INTERVENCION_MUSAAT,
  type RegistroMusaat,
} from "@sigram/shared";
import { listMusaat } from "../db/repositories/musaatRepo";

// Las intervenciones marcadas, con su fecha si ya se envió. Las que no están
// marcadas no se pintan: no se interviene en ellas y no falta nada.
function Intervenciones({ registro }: { registro: RegistroMusaat }) {
  const marcadas = TIPOS_INTERVENCION_MUSAAT.filter(
    (tipo) => intervencionDe(registro.intervenciones, tipo).aplica === true
  );

  if (marcadas.length === 0) {
    return <p className="fila-sub">Sin intervenciones marcadas todavía</p>;
  }

  return (
    <ul className="intervenciones">
      {marcadas.map((tipo) => {
        const i = intervencionDe(registro.intervenciones, tipo);
        const enviada = Boolean(i.fechaEnvio);
        return (
          <li key={tipo} className={enviada ? "interv interv--enviada" : "interv interv--falta"}>
            <span className="interv-punto" aria-hidden="true" />
            <span className="interv-nombre">{TIPO_INTERVENCION_MUSAAT_LABELS[tipo]}</span>
            <span className="interv-fecha">
              {enviada ? format(new Date(i.fechaEnvio as string), "dd/MM/yyyy") : "Sin enviar"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MusaatListPage() {
  const registros = useLiveQuery(listMusaat, []);
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  const filtro = busqueda.trim().toLowerCase();
  const visibles = registros
    ?.filter((r) => !soloPendientes || pendientesDeMusaat(r).length > 0)
    .filter(
      (r) =>
        !filtro ||
        r.nombre.toLowerCase().includes(filtro) ||
        (r.numeroExpediente ?? "").toLowerCase().includes(filtro)
    );

  const total = registros?.length ?? 0;
  const conPendientes = registros?.filter((r) => pendientesDeMusaat(r).length > 0).length ?? 0;
  const mostradas = visibles?.length ?? 0;
  const resumen =
    filtro || soloPendientes
      ? `${mostradas} de ${total} ${total === 1 ? "obra" : "obras"}`
      : `${total} ${total === 1 ? "obra" : "obras"} · ${conPendientes} con algo por enviar`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Musaat</h1>
          {registros !== undefined && total > 0 && (
            <p className="sub" aria-live="polite">
              {resumen}
            </p>
          )}
        </div>
        <Link to="/musaat/nueva" className="btn">
          Nueva obra
        </Link>
      </div>

      {registros !== undefined && total > 0 && (
        <>
          {/* Dos botones y no una casilla: el estado se ve sin leer, que es
              lo que hace falta cuando entras a mirar qué te falta. */}
          <div className="filtros" role="group" aria-label="Qué obras mostrar">
            <button
              type="button"
              className={soloPendientes ? "filtro" : "filtro filtro--activo"}
              aria-pressed={!soloPendientes}
              onClick={() => setSoloPendientes(false)}
            >
              Todas
            </button>
            <button
              type="button"
              className={soloPendientes ? "filtro filtro--activo" : "filtro"}
              aria-pressed={soloPendientes}
              onClick={() => setSoloPendientes(true)}
            >
              Faltan por enviar{conPendientes > 0 ? ` (${conPendientes})` : ""}
            </button>
          </div>

          <label className="solo-voz" htmlFor="buscar-musaat">
            Buscar una obra por nº de expediente o por nombre
          </label>
          <input
            id="buscar-musaat"
            className="input buscador"
            type="search"
            name="buscar-musaat"
            autoComplete="off"
            placeholder="Buscar por nº de expediente o nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </>
      )}

      {registros === undefined && (
        <p className="muted" aria-live="polite">
          Cargando obras…
        </p>
      )}

      {registros && total === 0 && (
        <div className="empty-state">
          <p>
            Todavía no has apuntado ninguna obra. Aquí llevas la cuenta de lo que hay que declarar a
            la mutua y de lo que ya enviaste.
          </p>
          <Link to="/musaat/nueva" className="btn">
            Apuntar la primera obra
          </Link>
        </div>
      )}

      {registros && total > 0 && mostradas === 0 && (
        <div className="empty-state">
          <p style={{ margin: 0 }}>
            {soloPendientes && !filtro
              ? "No falta nada por enviar. Todo lo marcado tiene su fecha."
              : `Ninguna obra coincide con “${busqueda.trim()}”.`}
          </p>
        </div>
      )}

      <ul className="lista" aria-label="Obras de Musaat">
        {visibles?.map((registro) => {
          const estado = estadoMusaat(registro);
          const faltan = pendientesDeMusaat(registro).length;
          const enviadas = enviadasDeMusaat(registro).length;
          const titulo =
            estado === "enviado"
              ? `Todo enviado (${enviadas})`
              : estado === "pendiente"
              ? `Faltan ${faltan} por enviar`
              : "Sin intervenciones marcadas";

          return (
            <li key={registro.id}>
              <Link to={`/musaat/${registro.id}/editar`} className="fila fila--musaat">
                <span className={`punto-estado punto-estado--${estado}`} title={titulo} />
                <div style={{ minWidth: 0 }}>
                  <p className="fila-meta" style={{ justifyContent: "flex-start" }}>
                    <span>
                      {registro.numeroExpediente
                        ? `Nº ${registro.numeroExpediente}`
                        : "Sin expediente"}
                    </span>
                  </p>
                  <p className="fila-nombre">{registro.nombre || "Obra sin nombre"}</p>
                  <Intervenciones registro={registro} />
                </div>
                {/* Para quien no distinga los colores, el estado también va
                    escrito. */}
                <span className="solo-voz">{titulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

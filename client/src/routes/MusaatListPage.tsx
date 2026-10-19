import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  ESTADO_MUSAAT_LABELS,
  estadoIntervencion,
  estadoMusaat,
  intervencionDe,
  TIPO_INTERVENCION_MUSAAT_LABELS,
  TIPOS_INTERVENCION_MUSAAT,
  type EstadoMusaat,
  type RegistroMusaat,
} from "@sigram/shared";
import { listMusaat } from "../db/repositories/musaatRepo";

// Las cinco intervenciones con su estado. Las que no proceden se dejan en
// gris y sin fecha: no hay nada que enviar, pero conviene verlas para saber
// que están decididas y no olvidadas.
function Intervenciones({ registro }: { registro: RegistroMusaat }) {
  return (
    <ul className="intervenciones">
      {TIPOS_INTERVENCION_MUSAAT.map((tipo) => {
        const estado = estadoIntervencion(registro.intervenciones, tipo);
        const fecha = intervencionDe(registro.intervenciones, tipo).fechaEnvio;
        return (
          <li key={tipo} className={`interv interv--${estado}`}>
            <span className="interv-punto" aria-hidden="true" />
            <span className="interv-nombre">{TIPO_INTERVENCION_MUSAAT_LABELS[tipo]}</span>
            <span className="interv-fecha">
              {estado === "enviado" && fecha
                ? format(new Date(fecha), "dd/MM/yyyy")
                : estado === "enviado"
                ? "Enviado"
                : estado === "no_procede"
                ? "No procede"
                : "Sin enviar"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type Filtro = "todas" | EstadoMusaat;

const FILTROS: { clave: Filtro; texto: string }[] = [
  { clave: "todas", texto: "Todas" },
  { clave: "nada", texto: ESTADO_MUSAAT_LABELS.nada },
  { clave: "parcial", texto: ESTADO_MUSAAT_LABELS.parcial },
  { clave: "completo", texto: ESTADO_MUSAAT_LABELS.completo },
];

export function MusaatListPage() {
  const registros = useLiveQuery(listMusaat, []);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<Filtro>("todas");

  const texto = busqueda.trim().toLowerCase();
  const visibles = registros
    ?.filter((r) => filtroEstado === "todas" || estadoMusaat(r) === filtroEstado)
    .filter(
      (r) =>
        !texto ||
        r.nombre.toLowerCase().includes(texto) ||
        (r.numeroExpediente ?? "").toLowerCase().includes(texto)
    );

  const total = registros?.length ?? 0;
  const mostradas = visibles?.length ?? 0;
  const cuantas = (estado: EstadoMusaat) =>
    registros?.filter((r) => estadoMusaat(r) === estado).length ?? 0;

  const resumen =
    texto || filtroEstado !== "todas"
      ? `${mostradas} de ${total} ${total === 1 ? "obra" : "obras"}`
      : `${total} ${total === 1 ? "obra" : "obras"} · ${
          cuantas("nada") + cuantas("parcial")
        } con algo por enviar`;

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
          {/* Cada filtro lleva su punto de color y su cuenta: se ve de un
              vistazo cuánto hay de cada cosa sin tener que entrar. */}
          <div className="filtros" role="group" aria-label="Qué obras mostrar">
            {FILTROS.map(({ clave, texto: etiqueta }) => (
              <button
                key={clave}
                type="button"
                className={filtroEstado === clave ? "filtro filtro--activo" : "filtro"}
                aria-pressed={filtroEstado === clave}
                onClick={() => setFiltroEstado(clave)}
              >
                {clave !== "todas" && (
                  <span className={`punto-estado punto-estado--${clave}`} aria-hidden="true" />
                )}
                {etiqueta}
                {clave !== "todas" ? ` (${cuantas(clave)})` : ""}
              </button>
            ))}
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
            {texto
              ? `Ninguna obra coincide con “${busqueda.trim()}”.`
              : `Ninguna obra está en “${FILTROS.find((f) => f.clave === filtroEstado)?.texto}”.`}
          </p>
        </div>
      )}

      <ul className="lista" aria-label="Obras de Musaat">
        {visibles?.map((registro) => {
          const estado = estadoMusaat(registro);
          return (
            <li key={registro.id}>
              <Link to={`/musaat/${registro.id}/editar`} className="fila fila--musaat">
                <span
                  className={`punto-estado punto-estado--${estado}`}
                  title={ESTADO_MUSAAT_LABELS[estado]}
                />
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
                {/* Para quien no distinga los colores, el estado va escrito. */}
                <span className="solo-voz">{ESTADO_MUSAAT_LABELS[estado]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

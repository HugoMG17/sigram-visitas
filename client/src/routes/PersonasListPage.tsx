import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { etiquetaDocumento } from "@sigram/shared";
import { listPersonas } from "../db/repositories/personaRepo";

export function PersonasListPage() {
  const personas = useLiveQuery(listPersonas, []);
  const [busqueda, setBusqueda] = useState("");

  const filtro = busqueda.trim().toLowerCase();
  // Se busca por nombre y también por documento: a veces lo que uno recuerda
  // es el DNI que está copiando de un papel.
  const filtradas = filtro
    ? personas?.filter(
        (p) =>
          p.nombre.toLowerCase().includes(filtro) ||
          (p.dni ?? "").toLowerCase().includes(filtro)
      )
    : personas;

  const total = personas?.length ?? 0;
  const mostradas = filtradas?.length ?? 0;
  const empresas = personas?.filter((p) => p.esEmpresa).length ?? 0;
  const resumen = filtro
    ? `${mostradas} de ${total} ${total === 1 ? "ficha" : "fichas"}`
    : `${total} ${total === 1 ? "ficha" : "fichas"} · ${empresas} ${
        empresas === 1 ? "empresa" : "empresas"
      }`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Personas</h1>
          {personas !== undefined && total > 0 && (
            <p className="sub" aria-live="polite">
              {resumen}
            </p>
          )}
        </div>
        <Link to="/personas/nueva" className="btn">
          Nueva ficha
        </Link>
      </div>

      {personas !== undefined && total > 0 && (
        <>
          <label className="solo-voz" htmlFor="buscar-persona">
            Buscar una ficha por nombre o por documento
          </label>
          <input
            id="buscar-persona"
            className="input buscador"
            type="search"
            name="buscar-persona"
            autoComplete="off"
            placeholder="Buscar por nombre o documento…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </>
      )}

      {personas === undefined && (
        <p className="muted" aria-live="polite">
          Cargando personas…
        </p>
      )}

      {personas && total === 0 && (
        <div className="empty-state">
          <p>
            Todavía no has guardado ninguna ficha. Lo que guardes aquí se rellena solo al crear una
            obra, y corregir un dato una vez lo corrige en todas.
          </p>
          <Link to="/personas/nueva" className="btn">
            Crear la primera ficha
          </Link>
        </div>
      )}

      {personas && total > 0 && mostradas === 0 && (
        <div className="empty-state">
          <p style={{ margin: 0 }}>
            Ninguna ficha coincide con “{busqueda.trim()}”. Se busca por nombre y por documento.
          </p>
        </div>
      )}

      <ul className="lista" aria-label="Personas">
        {filtradas?.map((persona) => (
          <li key={persona.id}>
            <Link to={`/personas/${persona.id}/editar`} className="fila">
              <div className="fila-meta">
                {/* Se dice el cero: una ficha sin documento lo dice, no se
                    queda en blanco como si todavía estuviera cargando. */}
                <span>
                  {persona.dni
                    ? `${etiquetaDocumento(persona.esEmpresa)} ${persona.dni}`
                    : `Sin ${etiquetaDocumento(persona.esEmpresa)}`}
                </span>
                {persona.esEmpresa && <span className="chip">Empresa</span>}
              </div>
              <p className="fila-nombre">{persona.nombre || "Ficha sin nombre"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

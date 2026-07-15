import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { agentesDeObra, ESTADO_OBRA_LABELS, personasConNombre, personasDeRol, ROLES_AGENTE_ORDEN, ROL_AGENTE_LABELS } from "@sigram/shared";
import type { AgentePersona, RolAgente } from "@sigram/shared";
import type { LocalObra } from "../db/db";
import { getObra, softDeleteObraLocal } from "../db/repositories/obraRepo";
import { listVisitasDeObra } from "../db/repositories/visitaRepo";
import { runSync } from "../sync/syncEngine";

// Bloque de un rol con todas sus personas ("Rol: Nombre (DNI)" por persona);
// no pinta nada si el rol no tiene ninguna persona con nombre.
function BloqueRol({ rol, personas }: { rol: RolAgente; personas: AgentePersona[] }) {
  const conNombre = personasConNombre(personas);
  if (conNombre.length === 0) return null;
  return (
    <p style={{ margin: 0 }}>
      <strong>{ROL_AGENTE_LABELS[rol]}:</strong>{" "}
      {conNombre
        .map((p) => `${p.nombre}${(p.dni ?? "").trim() ? ` (DNI ${p.dni})` : ""}`)
        .join(" · ")}
    </p>
  );
}

// Todos los roles de la obra, en orden, cada uno con sus personas.
function Roles({ obra }: { obra: LocalObra }) {
  const agentes = agentesDeObra(obra);
  return (
    <>
      {ROLES_AGENTE_ORDEN.map((rol) => (
        <BloqueRol key={rol} rol={rol} personas={personasDeRol(agentes, rol)} />
      ))}
    </>
  );
}

export function ObraDetailPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  const obra = useLiveQuery(() => (obraId ? getObra(obraId) : undefined), [obraId]);
  const visitas = useLiveQuery(() => (obraId ? listVisitasDeObra(obraId) : undefined), [obraId]);

  if (obra === undefined) return <p className="muted">Cargando obra…</p>;
  if (!obra) return <p className="error-text">Obra no encontrada.</p>;

  const currentObraId = obra.id;

  async function handleEliminarObra() {
    if (
      !window.confirm(
        "¿Eliminar esta obra, con todas sus visitas, puntos y adjuntos? No se puede deshacer."
      )
    ) {
      return;
    }
    await softDeleteObraLocal(currentObraId);
    void runSync();
    navigate("/");
  }

  return (
    <div className="stack">
      <Link to="/" className="back-link">
        ← Todas las obras
      </Link>

      <div className="card stack">
        {obra.numeroExpediente && (
          <p className="muted" style={{ margin: 0, fontWeight: 600 }}>
            Nº expediente: {obra.numeroExpediente}
          </p>
        )}
        <div className="row-between">
          <h1 style={{ margin: 0 }}>{obra.nombre || "Obra sin nombre"}</h1>
          <span className="badge">{ESTADO_OBRA_LABELS[obra.estado]}</span>
        </div>
        {(obra.direccion || obra.municipio || obra.provincia) && (
          <p className="muted" style={{ margin: 0 }}>
            {[obra.direccion, obra.municipio, obra.provincia].filter(Boolean).join(", ")}
          </p>
        )}
        {obra.referenciaCatastral && (
          <p style={{ margin: 0 }}>
            <strong>Ref. catastral:</strong> {obra.referenciaCatastral}
          </p>
        )}
        <Roles obra={obra} />
        {obra.notas && <p style={{ margin: 0 }}>{obra.notas}</p>}
        <div className="row">
          <Link to={`/obras/${obra.id}/editar`} className="btn btn-secondary">
            Editar obra
          </Link>
          <button type="button" className="btn btn-danger" onClick={handleEliminarObra}>
            Eliminar obra
          </button>
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

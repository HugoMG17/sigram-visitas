import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { AgentePersona, EstadoObra, ObraAgentes, RolAgente } from "@sigram/shared";
import { agentesDeObra, ESTADO_OBRA_LABELS, personasDeRol, ROL_AGENTE_LABELS } from "@sigram/shared";
import type { ObraInput } from "../api/obras";
import { getObra, saveObraLocal } from "../db/repositories/obraRepo";
import { runSync } from "../sync/syncEngine";
import { generateId } from "../utils/id";

const emptyForm: ObraInput = {
  nombre: "",
  direccion: "",
  municipio: "",
  provincia: "",
  referenciaCatastral: "",
  agentes: {},
  promotor: "",
  promotorContacto: "",
  promotorDni: "",
  constructorNombre: "",
  constructorDni: "",
  proyectistaNombre: "",
  proyectistaDni: "",
  arquitectoNombre: "",
  arquitectoDni: "",
  arquitectoTecnicoNombre: "",
  arquitectoTecnicoDni: "",
  coordinadorSSNombre: "",
  coordinadorSSDni: "",
  // El tipo de obra ya no se pide en el formulario; se conserva en el modelo
  // por compatibilidad con los datos existentes.
  tipoObra: "otro",
  estado: "en_ejecucion",
  fechaInicio: "",
  fechaFinPrevista: "",
  numeroExpediente: "",
  notas: "",
};

// Un rol de la obra admite VARIAS personas (nombre + DNI). Se muestra una fila
// por persona, con un botón para añadir otra y ✕ para quitar. Si la lista está
// vacía se pinta igualmente una fila en blanco para poder empezar a escribir.
function CamposRolMulti({
  rol,
  personas,
  onChange,
}: {
  rol: RolAgente;
  personas: AgentePersona[];
  onChange: (personas: AgentePersona[]) => void;
}) {
  const label = ROL_AGENTE_LABELS[rol];
  const filas = personas.length > 0 ? personas : [{ nombre: "", dni: "" }];

  function actualizar(indice: number, campo: keyof AgentePersona, valor: string) {
    const copia = filas.map((p) => ({ ...p }));
    copia[indice] = { ...copia[indice], [campo]: valor };
    onChange(copia);
  }

  function quitar(indice: number) {
    onChange(filas.filter((_, i) => i !== indice));
  }

  return (
    <div className="stack" style={{ gap: "0.4rem" }}>
      {filas.map((persona, indice) => (
        <div className="row" key={indice} style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 2, minWidth: 180 }}>
            <label>
              {label} — Nombre{filas.length > 1 ? ` (${indice + 1})` : ""}
            </label>
            <input
              className="input"
              value={persona.nombre ?? ""}
              onChange={(e) => actualizar(indice, "nombre", e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 110 }}>
            <label>DNI</label>
            <input
              className="input"
              value={persona.dni ?? ""}
              onChange={(e) => actualizar(indice, "dni", e.target.value)}
            />
          </div>
          {filas.length > 1 && (
            <button
              type="button"
              className="btn btn-danger"
              title="Quitar esta persona"
              style={{ padding: "0.3rem 0.6rem", marginBottom: "0.15rem" }}
              onClick={() => quitar(indice)}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
          onClick={() => onChange([...filas, { nombre: "", dni: "" }])}
        >
          + Añadir persona
        </button>
      </div>
    </div>
  );
}

export function ObraFormPage() {
  const { obraId } = useParams();
  const isEdit = Boolean(obraId);
  const navigate = useNavigate();
  const [form, setForm] = useState<ObraInput>(emptyForm);

  const existing = useLiveQuery(
    () => (isEdit ? getObra(obraId as string) : undefined),
    [obraId, isEdit]
  );

  // useLiveQuery re-emite `existing` cada vez que Dexie escribe esta obra por
  // cualquier motivo, incluido un pull() de fondo del motor de sync mientras
  // el usuario sigue rellenando el formulario -- si el efecto se disparara en
  // cada emisión, esa escritura de fondo pisaría lo que el usuario ya ha
  // tecleado. Por eso solo se usa para sembrar `form` la primera vez que
  // llegan datos para esta obra, no en emisiones posteriores.
  const cargadoParaObraId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (existing && cargadoParaObraId.current !== obraId) {
      const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, syncStatus: _s, ...rest } =
        existing;
      // agentesDeObra rehidrata los roles: usa `agentes` si la obra ya lo
      // tiene, o lo reconstruye desde los campos escalares antiguos (obras
      // creadas antes de soportar varias personas por rol).
      setForm({
        ...emptyForm,
        ...rest,
        referenciaCatastral: rest.referenciaCatastral ?? "",
        agentes: agentesDeObra(existing),
      });
      cargadoParaObraId.current = obraId;
    }
  }, [existing, obraId]);

  const mutation = useMutation({
    // Escritura local en Dexie: debe ejecutarse aunque TanStack Query crea
    // que estamos offline (por defecto pausaría la mutación hasta reconectar).
    networkMode: "always",
    mutationFn: () => saveObraLocal(obraId ?? generateId(), form),
    onSuccess: (obra) => {
      void runSync();
      navigate(`/obras/${obra.id}`);
    },
  });

  function update<K extends keyof ObraInput>(key: K, value: ObraInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAgente(rol: RolAgente, personas: AgentePersona[]) {
    setForm((prev) => {
      const agentes: ObraAgentes = { ...(prev.agentes ?? {}), [rol]: personas };
      return { ...prev, agentes };
    });
  }

  function personasDe(rol: RolAgente): AgentePersona[] {
    return personasDeRol(form.agentes, rol);
  }

  return (
    <div className="stack">
      <Link to={isEdit ? `/obras/${obraId}` : "/"} className="back-link">
        ← Volver
      </Link>
      <h1 style={{ margin: 0 }}>{isEdit ? "Editar obra" : "Nueva obra"}</h1>

      <form
        className="stack card"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>Nº de expediente</label>
          <input
            className="input"
            value={form.numeroExpediente}
            onChange={(e) => update("numeroExpediente", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Nombre de la obra</label>
          <input
            className="input"
            value={form.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            placeholder="Reforma vivienda Calle Mayor 12"
          />
        </div>

        <div className="field">
          <label>Dirección</label>
          <input
            className="input"
            value={form.direccion}
            onChange={(e) => update("direccion", e.target.value)}
          />
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Municipio</label>
            <input
              className="input"
              value={form.municipio}
              onChange={(e) => update("municipio", e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Provincia</label>
            <input
              className="input"
              value={form.provincia}
              onChange={(e) => update("provincia", e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Referencia catastral</label>
          <input
            className="input"
            value={form.referenciaCatastral}
            onChange={(e) => update("referenciaCatastral", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Estado</label>
          <select
            className="input"
            value={form.estado}
            onChange={(e) => update("estado", e.target.value as EstadoObra)}
          >
            {Object.entries(ESTADO_OBRA_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Fecha de inicio</label>
            <input
              className="input"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => update("fechaInicio", e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Fecha fin prevista</label>
            <input
              className="input"
              type="date"
              value={form.fechaFinPrevista}
              onChange={(e) => update("fechaFinPrevista", e.target.value)}
            />
          </div>
        </div>

        <h2 style={{ margin: "0.5rem 0 0" }}>Promotor</h2>
        <CamposRolMulti
          rol="promotor"
          personas={personasDe("promotor")}
          onChange={(p) => updateAgente("promotor", p)}
        />

        <h2 style={{ margin: "0.5rem 0 0" }}>Dirección Facultativa</h2>
        <CamposRolMulti
          rol="directorObra"
          personas={personasDe("directorObra")}
          onChange={(p) => updateAgente("directorObra", p)}
        />
        <CamposRolMulti
          rol="directorEjecucion"
          personas={personasDe("directorEjecucion")}
          onChange={(p) => updateAgente("directorEjecucion", p)}
        />
        <CamposRolMulti
          rol="coordinadorSS"
          personas={personasDe("coordinadorSS")}
          onChange={(p) => updateAgente("coordinadorSS", p)}
        />

        <h2 style={{ margin: "0.5rem 0 0" }}>Constructor</h2>
        <CamposRolMulti
          rol="constructor"
          personas={personasDe("constructor")}
          onChange={(p) => updateAgente("constructor", p)}
        />

        <h2 style={{ margin: "0.5rem 0 0" }}>Proyectista</h2>
        <CamposRolMulti
          rol="proyectista"
          personas={personasDe("proyectista")}
          onChange={(p) => updateAgente("proyectista", p)}
        />

        <div className="field">
          <label>Notas</label>
          <textarea
            className="input"
            value={form.notas}
            onChange={(e) => update("notas", e.target.value)}
          />
        </div>

        {mutation.isError && <p className="error-text">No se pudo guardar la obra.</p>}

        <div className="row">
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar obra"}
          </button>
        </div>
      </form>
    </div>
  );
}

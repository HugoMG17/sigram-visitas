import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { EstadoObra } from "@sigram/shared";
import { ESTADO_OBRA_LABELS } from "@sigram/shared";
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

// Un rol de la obra = nombre + DNI, siempre con la misma pareja de campos.
function CampoRol({
  label,
  nombre,
  dni,
  onNombre,
  onDni,
}: {
  label: string;
  nombre: string | undefined;
  dni: string | undefined;
  onNombre: (v: string) => void;
  onDni: (v: string) => void;
}) {
  return (
    <div className="row">
      <div className="field" style={{ flex: 2, minWidth: 180 }}>
        <label>{label} — Nombre</label>
        <input className="input" value={nombre ?? ""} onChange={(e) => onNombre(e.target.value)} />
      </div>
      <div className="field" style={{ flex: 1, minWidth: 120 }}>
        <label>DNI</label>
        <input className="input" value={dni ?? ""} onChange={(e) => onDni(e.target.value)} />
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

  useEffect(() => {
    if (existing) {
      const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, syncStatus: _s, ...rest } =
        existing;
      setForm({ ...emptyForm, ...rest, referenciaCatastral: rest.referenciaCatastral ?? "" });
    }
  }, [existing]);

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
        <CampoRol
          label="Promotor"
          nombre={form.promotor}
          dni={form.promotorDni}
          onNombre={(v) => update("promotor", v)}
          onDni={(v) => update("promotorDni", v)}
        />

        <h2 style={{ margin: "0.5rem 0 0" }}>Dirección Facultativa</h2>
        <CampoRol
          label="Arquitecto"
          nombre={form.arquitectoNombre}
          dni={form.arquitectoDni}
          onNombre={(v) => update("arquitectoNombre", v)}
          onDni={(v) => update("arquitectoDni", v)}
        />
        <CampoRol
          label="Arquitecto Técnico"
          nombre={form.arquitectoTecnicoNombre}
          dni={form.arquitectoTecnicoDni}
          onNombre={(v) => update("arquitectoTecnicoNombre", v)}
          onDni={(v) => update("arquitectoTecnicoDni", v)}
        />
        <CampoRol
          label="Coordinador de seguridad y salud"
          nombre={form.coordinadorSSNombre}
          dni={form.coordinadorSSDni}
          onNombre={(v) => update("coordinadorSSNombre", v)}
          onDni={(v) => update("coordinadorSSDni", v)}
        />

        <h2 style={{ margin: "0.5rem 0 0" }}>Constructor</h2>
        <CampoRol
          label="Constructor"
          nombre={form.constructorNombre}
          dni={form.constructorDni}
          onNombre={(v) => update("constructorNombre", v)}
          onDni={(v) => update("constructorDni", v)}
        />

        <h2 style={{ margin: "0.5rem 0 0" }}>Proyectista</h2>
        <CampoRol
          label="Proyectista"
          nombre={form.proyectistaNombre}
          dni={form.proyectistaDni}
          onNombre={(v) => update("proyectistaNombre", v)}
          onDni={(v) => update("proyectistaDni", v)}
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

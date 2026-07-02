import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { VisitaInput } from "../api/visitas";
import { getVisita, saveVisitaLocal } from "../db/repositories/visitaRepo";
import { runSync } from "../sync/syncEngine";
import { generateId } from "../utils/id";

function nowLocalDate(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function VisitaFormPage() {
  const { obraId, visitaId } = useParams<{ obraId?: string; visitaId?: string }>();
  const isEdit = Boolean(visitaId);
  const navigate = useNavigate();

  const existing = useLiveQuery(
    () => (isEdit ? getVisita(visitaId as string) : undefined),
    [visitaId, isEdit]
  );

  const [form, setForm] = useState<VisitaInput>({
    obraId: obraId ?? "",
    fecha: new Date().toISOString(),
    titulo: "",
    notas: "",
    tiempoAtmosferico: "",
    asistentes: "",
    ubicacionGps: "",
  });
  const [fechaLocal, setFechaLocal] = useState(nowLocalDate());

  useEffect(() => {
    if (existing) {
      setForm({
        obraId: existing.obraId,
        fecha: existing.fecha,
        titulo: existing.titulo ?? "",
        notas: existing.notas ?? "",
        tiempoAtmosferico: existing.tiempoAtmosferico ?? "",
        asistentes: existing.asistentes ?? "",
        ubicacionGps: existing.ubicacionGps ?? "",
      });
      const d = new Date(existing.fecha);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setFechaLocal(d.toISOString().slice(0, 10));
    }
  }, [existing]);

  const mutation = useMutation({
    // networkMode "always": esta escritura va a Dexie (local), no a la red,
    // así que debe ejecutarse aunque TanStack Query crea que estamos offline
    // (por defecto pausaría la mutación hasta recuperar conexión).
    networkMode: "always",
    mutationFn: () => saveVisitaLocal(visitaId ?? generateId(), form),
    onSuccess: (visita) => {
      void runSync();
      navigate(`/visitas/${visita.id}`);
    },
  });

  function update<K extends keyof VisitaInput>(key: K, value: VisitaInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const backTo = isEdit ? `/visitas/${visitaId}` : `/obras/${obraId}`;

  return (
    <div className="stack">
      <Link to={backTo} className="back-link">
        ← Volver
      </Link>
      <h1 style={{ margin: 0 }}>{isEdit ? "Editar visita" : "Nueva visita"}</h1>

      <form
        className="stack card"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>Fecha *</label>
          <input
            className="input"
            type="date"
            required
            value={fechaLocal}
            onChange={(e) => {
              setFechaLocal(e.target.value);
              update("fecha", new Date(e.target.value).toISOString());
            }}
          />
        </div>

        <div className="field">
          <label>Título</label>
          <input
            className="input"
            value={form.titulo}
            onChange={(e) => update("titulo", e.target.value)}
            placeholder="Visita de replanteo de cimentación"
          />
        </div>

        <div className="field">
          <label>Anotaciones</label>
          <textarea
            className="input"
            rows={5}
            value={form.notas}
            onChange={(e) => update("notas", e.target.value)}
            placeholder="Qué se ha observado en la visita…"
          />
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Tiempo atmosférico</label>
            <input
              className="input"
              value={form.tiempoAtmosferico}
              onChange={(e) => update("tiempoAtmosferico", e.target.value)}
              placeholder="Soleado, lluvia…"
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Asistentes</label>
            <input
              className="input"
              value={form.asistentes}
              onChange={(e) => update("asistentes", e.target.value)}
              placeholder="Constructora, promotor…"
            />
          </div>
        </div>

        {mutation.isError && <p className="error-text">No se pudo guardar la visita.</p>}

        <div className="row">
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar visita"}
          </button>
        </div>
        {!isEdit && (
          <p className="muted" style={{ margin: 0 }}>
            Podrás añadir fotos y otros adjuntos justo después de guardar.
          </p>
        )}
      </form>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import {
  intervencionDe,
  TIPO_INTERVENCION_MUSAAT_LABELS,
  TIPOS_INTERVENCION_MUSAAT,
  type IntervencionesMusaat,
  type TipoIntervencionMusaat,
} from "@sigram/shared";
import type { MusaatInput } from "../api/musaat";
import { getMusaat, saveMusaatLocal, softDeleteMusaatLocal } from "../db/repositories/musaatRepo";
import { runSync } from "../sync/syncEngine";
import { generateId } from "../utils/id";

const emptyForm: MusaatInput = { numeroExpediente: "", nombre: "", intervenciones: {} };

// Hoy, en el formato que pide el campo de fecha del navegador.
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MusaatFormPage() {
  const { musaatId } = useParams();
  const isEdit = Boolean(musaatId);
  const navigate = useNavigate();

  const existing = useLiveQuery(
    () => (isEdit ? getMusaat(musaatId as string) : undefined),
    [musaatId, isEdit]
  );

  const [form, setForm] = useState<MusaatInput>(emptyForm);

  // El mismo guard que en los demás formularios: useLiveQuery vuelve a emitir
  // en cada escritura de la base local, incluida la del pull de fondo, y sin
  // esto esa escritura pisaría lo que se está tecleando.
  const cargadoParaId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (existing && cargadoParaId.current !== musaatId) {
      setForm({
        numeroExpediente: existing.numeroExpediente ?? "",
        nombre: existing.nombre ?? "",
        intervenciones: existing.intervenciones ?? {},
      });
      cargadoParaId.current = musaatId;
    }
  }, [existing, musaatId]);

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: () => saveMusaatLocal(musaatId ?? generateId(), form),
    onSuccess: () => {
      void runSync();
      navigate("/musaat");
    },
  });

  function cambiarIntervencion(
    tipo: TipoIntervencionMusaat,
    cambios: Partial<{ aplica: boolean; fechaEnvio: string }>
  ) {
    setForm((prev) => {
      const actual = intervencionDe(prev.intervenciones, tipo);
      const intervenciones: IntervencionesMusaat = {
        ...(prev.intervenciones ?? {}),
        [tipo]: { ...actual, ...cambios },
      };
      return { ...prev, intervenciones };
    });
  }

  async function handleEliminar() {
    if (!musaatId) return;
    if (!window.confirm(`¿Borrar “${form.nombre}” del registro de Musaat?`)) return;
    await softDeleteMusaatLocal(musaatId);
    void runSync();
    navigate("/musaat");
  }

  return (
    <div>
      <Link to="/musaat" className="back-link">
        ← Todas las obras de Musaat
      </Link>

      <div className="page-head">
        <div>
          <h1>{isEdit ? "Editar obra" : "Nueva obra"}</h1>
          <p className="sub">
            Marca en qué intervienes y, cuando envíes cada una a la mutua, ponle su fecha.
          </p>
        </div>
      </div>

      <form
        className="stack card"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="musaat-expediente">Nº de expediente</label>
          <input
            id="musaat-expediente"
            className="input"
            value={form.numeroExpediente ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, numeroExpediente: e.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="musaat-nombre">Nombre de la obra</label>
          <input
            id="musaat-nombre"
            className="input"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
          />
        </div>

        <h2 style={{ margin: "8px 0 0", fontSize: "16px" }}>Intervenciones</h2>
        <p className="fila-sub" style={{ marginTop: "-4px" }}>
          Lo que no marques no cuenta como pendiente.
        </p>

        {TIPOS_INTERVENCION_MUSAAT.map((tipo) => {
          const i = intervencionDe(form.intervenciones, tipo);
          const marcada = i.aplica === true;
          return (
            <div className="intervencion-campo" key={tipo}>
              <label className="opcion-radio">
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={(e) => cambiarIntervencion(tipo, { aplica: e.target.checked })}
                />
                {TIPO_INTERVENCION_MUSAAT_LABELS[tipo]}
              </label>
              {marcada && (
                <div className="field intervencion-fecha">
                  <label htmlFor={`fecha-${tipo}`}>Enviada el</label>
                  <div className="row" style={{ gap: "6px", flexWrap: "nowrap" }}>
                    <input
                      id={`fecha-${tipo}`}
                      className="input"
                      type="date"
                      value={(i.fechaEnvio ?? "").slice(0, 10)}
                      onChange={(e) => cambiarIntervencion(tipo, { fechaEnvio: e.target.value })}
                    />
                    {!i.fechaEnvio && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => cambiarIntervencion(tipo, { fechaEnvio: hoy() })}
                      >
                        Hoy
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {mutation.isError && <p className="error-text">No se pudo guardar.</p>}

        <div className="row">
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </button>
          {isEdit && (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleEliminar}>
              Eliminar del registro
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

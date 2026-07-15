import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { isImageMime } from "@sigram/shared";
import type { VisitaInput } from "../api/visitas";
import { getVisita, saveVisitaLocal } from "../db/repositories/visitaRepo";
import { listAdjuntos, deleteAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import { resolveAdjuntoFileUrl } from "../api/adjuntos";
import { runSync } from "../sync/syncEngine";
import { generateId } from "../utils/id";
import { downloadBlob, downloadFromUrl } from "../utils/download";
import type { LocalAdjunto } from "../db/db";
import { AttachmentCapture } from "../components/AttachmentCapture";
import { AdjuntoImage } from "../components/AdjuntoImage";
import { PhotoLightbox } from "../components/PhotoLightbox";

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
  const [fotoAbierta, setFotoAbierta] = useState<LocalAdjunto | null>(null);

  const existing = useLiveQuery(
    () => (isEdit ? getVisita(visitaId as string) : undefined),
    [visitaId, isEdit]
  );

  const fotos = useLiveQuery(async () => {
    if (!isEdit || !visitaId) return [];
    const adjuntos = await listAdjuntos(visitaId);
    return adjuntos.filter((a) => isImageMime(a.mimeType));
  }, [visitaId, isEdit]) ?? [];

  const [form, setForm] = useState<VisitaInput>({
    obraId: obraId ?? "",
    fecha: new Date().toISOString(),
    titulo: "",
    notas: "",
  });
  const [fechaLocal, setFechaLocal] = useState(nowLocalDate());

  // useLiveQuery reemite `existing` cada vez que Dexie reescribe esta visita
  // (p.ej. un pull() de fondo del motor de sync), no solo al entrar en la
  // página -- si el efecto se disparara en cada emisión, esa escritura de
  // fondo pisaría lo que el usuario ya ha tecleado mientras sigue rellenando
  // el formulario. Por eso solo se siembra `form` la primera vez que llegan
  // datos para esta visita.
  const cargadoParaVisitaId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (existing && cargadoParaVisitaId.current !== visitaId) {
      setForm({
        obraId: existing.obraId,
        fecha: existing.fecha,
        titulo: existing.titulo ?? "",
        notas: existing.notas ?? "",
      });
      const d = new Date(existing.fecha);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setFechaLocal(d.toISOString().slice(0, 10));
      cargadoParaVisitaId.current = visitaId;
    }
  }, [existing, visitaId]);

  const mutation = useMutation({
    // Escritura local en Dexie: debe ejecutarse aunque TanStack Query crea
    // que estamos offline (por defecto pausaría la mutación hasta reconectar).
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

  async function handleDescargarAdjunto(adjunto: LocalAdjunto) {
    try {
      if (adjunto.blobLocal) {
        await downloadBlob(adjunto.blobLocal, adjunto.nombreArchivo);
        return;
      }
      const url = resolveAdjuntoFileUrl(adjunto);
      if (!url) return;
      await downloadFromUrl(url, adjunto.nombreArchivo);
    } catch {
      window.alert("No se pudo descargar el archivo.");
    }
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

        {mutation.isError && <p className="error-text">No se pudo guardar la visita.</p>}

        <div className="row">
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar visita"}
          </button>
        </div>
        {!isEdit && (
          <p className="muted" style={{ margin: 0 }}>
            Podrás añadir fotos justo después de guardar, editando la visita.
          </p>
        )}
      </form>

      {isEdit && visitaId && (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Fotos de la visita</h2>
          <AttachmentCapture visitaId={visitaId} siguienteOrden={fotos.length} compact />

          {fotos.length > 0 && (
            <div className="photo-grid">
              {fotos.map((foto) => (
                <div key={foto.id} className="photo-thumb">
                  <AdjuntoImage
                    adjunto={foto}
                    alt={foto.caption ?? "Foto de la visita"}
                    onClick={() => setFotoAbierta(foto)}
                  />
                  {foto.syncStatus === "pending" && (
                    <span
                      className="badge"
                      style={{ position: "absolute", bottom: 4, left: 4, background: "#f59e0b", color: "white" }}
                    >
                      pendiente
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title="Descargar"
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      padding: "0.15rem 0.5rem",
                      fontSize: "0.75rem",
                    }}
                    onClick={() => void handleDescargarAdjunto(foto)}
                  >
                    ⬇
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      padding: "0.15rem 0.5rem",
                      fontSize: "0.75rem",
                    }}
                    onClick={() => {
                      if (window.confirm("¿Eliminar esta foto? No se puede deshacer.")) {
                        void deleteAdjuntoLocal(foto.id);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {fotos.length === 0 && <p className="muted">Todavía no hay fotos en esta visita.</p>}
        </div>
      )}

      {fotoAbierta && <PhotoLightbox adjunto={fotoAbierta} onClose={() => setFotoAbierta(null)} />}
    </div>
  );
}

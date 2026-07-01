import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { TipoAdjunto } from "@sigram/shared";
import { addAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import { runSync } from "../sync/syncEngine";

const TIPO_LABELS: Record<TipoAdjunto, string> = {
  foto: "Foto",
  plano: "Plano",
  documento: "Documento",
  otro: "Otro",
};

export function AttachmentCapture({
  visitaId,
  siguienteOrden,
}: {
  visitaId: string;
  siguienteOrden: number;
}) {
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const archivoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    // Escritura local en Dexie: debe ejecutarse aunque TanStack Query crea
    // que estamos offline (por defecto pausaría la mutación hasta reconectar).
    networkMode: "always",
    mutationFn: (params: { file: File; tipo: TipoAdjunto; orden: number }) =>
      addAdjuntoLocal({ visitaId, file: params.file, tipo: params.tipo, orden: params.orden }),
    onSuccess: () => {
      setError(null);
      void runSync();
    },
    onError: () => setError("No se pudo guardar el archivo."),
  });

  function handleFiles(files: FileList | null, tipo: TipoAdjunto) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file, index) =>
      mutation.mutate({ file, tipo, orden: siguienteOrden + index })
    );
  }

  return (
    <div className="stack">
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => fotoInputRef.current?.click()}
          disabled={mutation.isPending}
        >
          📷 Añadir fotos
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => archivoInputRef.current?.click()}
          disabled={mutation.isPending}
        >
          📎 Añadir plano/documento
        </button>
      </div>

      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files, "foto");
          e.target.value = "";
        }}
      />
      <input
        ref={archivoInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files, "documento");
          e.target.value = "";
        }}
      />

      {mutation.isPending && <p className="muted">Guardando…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export { TIPO_LABELS };

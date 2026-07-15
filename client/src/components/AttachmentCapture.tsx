import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import { runSync } from "../sync/syncEngine";

export function AttachmentCapture({
  visitaId,
  puntoId,
  siguienteOrden,
  compact = false,
}: {
  visitaId: string;
  puntoId?: string;
  siguienteOrden: number;
  compact?: boolean;
}) {
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    // Escritura local en Dexie: debe ejecutarse aunque TanStack Query crea
    // que estamos offline (por defecto pausaría la mutación hasta reconectar).
    networkMode: "always",
    mutationFn: (params: { file: File; orden: number }) =>
      addAdjuntoLocal({
        visitaId,
        puntoId,
        file: params.file,
        tipo: "foto",
        orden: params.orden,
      }),
    onSuccess: () => {
      setError(null);
      void runSync();
    },
    onError: () => setError("No se pudo guardar el archivo."),
  });

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file, index) =>
      mutation.mutate({ file, orden: siguienteOrden + index })
    );
  }

  const btnStyle = compact ? { padding: "0.3rem 0.6rem", fontSize: "0.8rem" } : undefined;

  return (
    <div className="stack">
      <div className="row">
        <button
          type="button"
          className="btn"
          style={btnStyle}
          onClick={() => fotoInputRef.current?.click()}
          disabled={mutation.isPending}
        >
          📷 Añadir fotos
        </button>
      </div>

      {/* Sin "capture": con ese atributo el móvil abre la cámara directamente
          sin dar opción a elegir; sin él, el selector nativo ofrece tanto
          hacer una foto como elegir de la galería. */}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {mutation.isPending && <p className="muted">Guardando…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

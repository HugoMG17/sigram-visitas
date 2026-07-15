import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addAdjuntoLocal } from "../db/repositories/adjuntoRepo";
import { runSync } from "../sync/syncEngine";
import { isNative } from "../native/platform";

// Convierte el resultado del plugin de cámara (una URL webPath que el WebView
// sabe servir) en un File, para reutilizar el mismo camino que las fotos
// elegidas con <input type="file"> en web (addAdjuntoLocal las comprime).
async function webPathToFile(webPath: string): Promise<File> {
  const res = await fetch(webPath);
  const blob = await res.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], `foto-${Date.now()}.jpg`, { type });
}

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
  const [capturando, setCapturando] = useState(false);

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

  function handleFiles(files: File[]) {
    if (files.length === 0) return;
    files.forEach((file, index) => mutation.mutate({ file, orden: siguienteOrden + index }));
  }

  // En el APK el <input type="file"> del WebView no ofrece bien la cámara, así
  // que se usa el plugin nativo de Capacitor, que sí muestra la cámara y la
  // galería del sistema. Se importa de forma perezosa para no cargarlo en web.
  async function hacerFoto() {
    setError(null);
    setCapturando(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const foto = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 90,
      });
      if (foto.webPath) handleFiles([await webPathToFile(foto.webPath)]);
    } catch {
      // El usuario canceló la cámara: no es un error que mostrar.
    } finally {
      setCapturando(false);
    }
  }

  async function elegirDeGaleria() {
    setError(null);
    setCapturando(true);
    try {
      const { Camera } = await import("@capacitor/camera");
      const { photos } = await Camera.pickImages({ quality: 90 });
      const files = await Promise.all(photos.map((p) => webPathToFile(p.webPath)));
      handleFiles(files);
    } catch {
      // Cancelado o sin permiso: no se muestra error.
    } finally {
      setCapturando(false);
    }
  }

  const btnStyle = compact ? { padding: "0.3rem 0.6rem", fontSize: "0.8rem" } : undefined;
  const ocupado = mutation.isPending || capturando;

  return (
    <div className="stack">
      <div className="row">
        {isNative ? (
          <>
            <button
              type="button"
              className="btn"
              style={btnStyle}
              onClick={() => void hacerFoto()}
              disabled={ocupado}
            >
              📷 Hacer foto
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={btnStyle}
              onClick={() => void elegirDeGaleria()}
              disabled={ocupado}
            >
              🖼️ Elegir de galería
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn"
            style={btnStyle}
            onClick={() => fotoInputRef.current?.click()}
            disabled={ocupado}
          >
            📷 Añadir fotos
          </button>
        )}
      </div>

      {/* Solo web: en el navegador el selector nativo ya ofrece cámara y
          galería. En el APK se usan los botones de arriba con el plugin. */}
      {!isNative && (
        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      )}

      {ocupado && <p className="muted">Guardando…</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

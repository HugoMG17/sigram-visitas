import { useRef, useState } from "react";
import { blobToDataUri, compressImage } from "../utils/imageResize";

// El logo viaja como texto (data URI) dentro de la propia fila de la obra, y
// esa fila se reenvía completa en cada sincronización: conviene que sea
// pequeño. 400 px de lado basta de sobra para la cabecera del PDF.
const MAX_LADO_PX = 400;
const MAX_TAMANO_BYTES = 500 * 1024;

export function CampoLogo({
  logo,
  onChange,
}: {
  logo: string | undefined;
  onChange: (logo: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProcesando(true);
    try {
      // PNG y no JPEG: un logo suele tener fondo transparente, y en JPEG esas
      // zonas saldrían en negro.
      const redimensionado = await compressImage(file, MAX_LADO_PX, 0.9, "image/png");
      const dataUri = await blobToDataUri(redimensionado);
      if (dataUri.length > MAX_TAMANO_BYTES) {
        setError(
          "El logo pesa demasiado incluso reducido. Prueba con una imagen más simple o más pequeña."
        );
        return;
      }
      onChange(dataUri);
    } catch {
      setError("No se pudo procesar la imagen.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="field">
      <label>Logo</label>
      <p className="muted" style={{ margin: "0 0 0.4rem", fontSize: "0.85rem" }}>
        Aparecerá arriba a la derecha en la primera página del informe PDF.
      </p>

      {logo && (
        <img
          src={logo}
          alt="Logo de la obra"
          style={{
            maxHeight: 70,
            maxWidth: 200,
            objectFit: "contain",
            display: "block",
            marginBottom: "0.5rem",
            // Fondo claro para que se vea un logo blanco o transparente.
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: 4,
          }}
        />
      )}

      <div className="row">
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
          onClick={() => inputRef.current?.click()}
          disabled={procesando}
        >
          {procesando ? "Procesando…" : logo ? "Cambiar logo" : "Añadir logo"}
        </button>
        {logo && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
            onClick={() => {
              setError(null);
              onChange("");
            }}
            disabled={procesando}
          >
            Quitar logo
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

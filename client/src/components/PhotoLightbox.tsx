import { useAdjuntoUrl } from "../hooks/useAdjuntoUrl";
import type { LocalAdjunto } from "../db/db";

// Foto a pantalla completa sobre fondo oscuro; se cierra tocando fuera de la
// imagen o el botón "✕". Pide la versión completa (no la miniatura) del
// adjunto -- useAdjuntoUrl ya sabe cómo traerla, esté en Drive, en disco o
// todavía solo en local sin sincronizar.
export function PhotoLightbox({
  adjunto,
  onClose,
}: {
  adjunto: LocalAdjunto;
  onClose: () => void;
}) {
  const src = useAdjuntoUrl(adjunto, false);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1.5rem",
        cursor: "zoom-out",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="btn btn-secondary"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          borderRadius: "50%",
          padding: 0,
        }}
      >
        ✕
      </button>
      {src ? (
        <img
          src={src}
          alt={adjunto.caption ?? "Foto"}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 8,
            cursor: "default",
          }}
        />
      ) : (
        <p className="muted" style={{ color: "#cbd5e1" }}>
          Cargando…
        </p>
      )}
    </div>
  );
}

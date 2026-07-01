import { useAdjuntoUrl } from "../hooks/useAdjuntoUrl";
import type { LocalAdjunto } from "../db/db";
import { TIPO_LABELS } from "./AttachmentCapture";

export function DocumentoLink({ adjunto }: { adjunto: LocalAdjunto }) {
  const href = useAdjuntoUrl(adjunto, false);
  const label = (
    <>
      📎 {adjunto.nombreArchivo} <span className="badge">{TIPO_LABELS[adjunto.tipo]}</span>
    </>
  );

  if (!href) {
    return <span className="muted">{label}</span>;
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
      {label}
    </a>
  );
}

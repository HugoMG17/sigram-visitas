import { ESTADO_OBRA_LABELS, ESTADO_PUNTO_LABELS, TIPO_OBRA_LABELS, isImageMime } from "@sigram/shared";
import type { adjuntos, obras, puntos, visitas } from "../db/schema.js";

type ObraRow = typeof obras.$inferSelect;
type VisitaRow = typeof visitas.$inferSelect;
type PuntoRow = typeof puntos.$inferSelect;
// dataUri se calcula aparte (pdfService lee el fichero del disco) porque Chrome
// bloquea cargar recursos file:// desde un documento inyectado con setContent().
type AdjuntoConDataUri = typeof adjuntos.$inferSelect & { dataUri?: string };

function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DOC_ICONS: Record<string, string> = {
  plano: "📐",
  documento: "📄",
  otro: "📎",
};

function renderGaleria(attachments: AdjuntoConDataUri[]): string {
  const fotos = attachments.filter((a) => isImageMime(a.mimeType));
  const documentos = attachments.filter((a) => !isImageMime(a.mimeType));

  const fotosHtml = fotos.length
    ? `<div class="galeria">${fotos
        .map(
          (foto) => `
            <figure class="foto">
              <img src="${foto.dataUri ?? ""}" />
              ${foto.caption ? `<figcaption>${esc(foto.caption)}</figcaption>` : ""}
            </figure>`
        )
        .join("\n")}</div>`
    : "";

  const documentosHtml = documentos.length
    ? `<ul class="lista-documentos">
        ${documentos
          .map(
            (doc) =>
              `<li>${DOC_ICONS[doc.tipo] ?? "📎"} ${esc(doc.nombreArchivo)}${
                doc.caption ? ` — ${esc(doc.caption)}` : ""
              }</li>`
          )
          .join("\n")}
      </ul>`
    : "";

  return fotosHtml + documentosHtml;
}

export function renderInformeVisitaHtml(params: {
  obra: ObraRow;
  visita: VisitaRow;
  adjuntos: AdjuntoConDataUri[];
  puntos: PuntoRow[];
  numeroVisita: number;
}): string {
  const { obra, visita, adjuntos: attachments, puntos: puntosDeVisita, numeroVisita } = params;

  const adjuntosGenerales = attachments.filter((a) => !a.puntoId);
  const adjuntosPorPunto = new Map<string, AdjuntoConDataUri[]>();
  for (const adjunto of attachments) {
    if (!adjunto.puntoId) continue;
    const lista = adjuntosPorPunto.get(adjunto.puntoId) ?? [];
    lista.push(adjunto);
    adjuntosPorPunto.set(adjunto.puntoId, lista);
  }

  const puntosHtml = puntosDeVisita.length
    ? `
      <section class="puntos">
        <h2>Puntos de la visita</h2>
        ${puntosDeVisita
          .map((punto, index) => {
            const solucionado = punto.estado === "solucionado";
            return `
              <div class="punto">
                <div class="punto-cabecera">
                  <span class="punto-dot ${solucionado ? "dot-verde" : "dot-amarillo"}"></span>
                  <strong>${esc(punto.titulo) || `Punto ${index + 1}`}</strong>
                  <span class="punto-estado">${ESTADO_PUNTO_LABELS[punto.estado as keyof typeof ESTADO_PUNTO_LABELS] ?? punto.estado}</span>
                </div>
                ${punto.descripcion ? `<p class="punto-descripcion">${esc(punto.descripcion)}</p>` : ""}
                ${renderGaleria(adjuntosPorPunto.get(punto.id) ?? [])}
              </div>`;
          })
          .join("\n")}
      </section>`
    : "";

  const generalesHtml = adjuntosGenerales.length
    ? `<section class="anexo"><h2>Otros adjuntos</h2>${renderGaleria(adjuntosGenerales)}</section>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 20mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; font-size: 12px; }
  .portada { margin-bottom: 24px; border-bottom: 3px solid #1e293b; padding-bottom: 16px; }
  .portada h1 { font-size: 22px; margin: 0 0 4px; }
  .portada .visita-num { color: #2563eb; font-weight: 700; font-size: 14px; }
  .datos-obra { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0 20px; }
  .datos-obra div span.label { color: #64748b; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.03em; }
  .notas { margin-bottom: 20px; }
  .notas h2 { font-size: 14px; margin-bottom: 6px; }
  .notas p { white-space: pre-wrap; line-height: 1.5; }
  .meta-visita { color: #64748b; font-size: 11px; margin-bottom: 10px; }
  .galeria { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0; }
  .foto { margin: 0 0 10px; break-inside: avoid; page-break-inside: avoid; }
  .foto img { width: 100%; height: 60mm; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; }
  .foto figcaption { font-size: 10px; color: #64748b; margin-top: 3px; }
  .lista-documentos { padding-left: 18px; margin: 6px 0; }
  .anexo { margin-top: 20px; }
  .anexo h2 { font-size: 14px; }
  .puntos { margin-top: 20px; }
  .puntos h2 { font-size: 14px; margin-bottom: 10px; }
  .punto { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
  .punto-cabecera { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .punto-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .dot-verde { background: #16a34a; }
  .dot-amarillo { background: #f59e0b; }
  .punto-estado { margin-left: auto; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
  .punto-descripcion { margin: 4px 0 8px; white-space: pre-wrap; }
  .pie { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 9px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="portada">
    <div class="visita-num">Visita nº ${numeroVisita}</div>
    <h1>${esc(obra.nombre)}</h1>
    <div>${esc(obra.direccion)}, ${esc(obra.municipio)}, ${esc(obra.provincia)}</div>
  </div>

  <div class="datos-obra">
    <div><span class="label">Promotor</span>${esc(obra.promotor)}</div>
    <div><span class="label">Estado de la obra</span>${ESTADO_OBRA_LABELS[obra.estado as keyof typeof ESTADO_OBRA_LABELS]}</div>
    <div><span class="label">Tipo de obra</span>${TIPO_OBRA_LABELS[obra.tipoObra as keyof typeof TIPO_OBRA_LABELS]}</div>
    ${obra.referenciaCatastral ? `<div><span class="label">Ref. catastral</span>${esc(obra.referenciaCatastral)}</div>` : ""}
  </div>

  <div class="notas">
    <h2>${esc(visita.titulo) || "Visita de obra"}</h2>
    <div class="meta-visita">
      ${formatFecha(visita.fecha)}
      ${visita.tiempoAtmosferico ? ` · Tiempo: ${esc(visita.tiempoAtmosferico)}` : ""}
      ${visita.asistentes ? ` · Asistentes: ${esc(visita.asistentes)}` : ""}
    </div>
    ${visita.notas ? `<p>${esc(visita.notas)}</p>` : ""}
  </div>

  ${puntosHtml}

  ${generalesHtml}

  <div class="pie">Informe generado el ${formatFecha(new Date().toISOString())} — SIGRAM VISITAS</div>
</body>
</html>`;
}

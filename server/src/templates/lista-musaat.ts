import {
  ESTADO_MUSAAT_LABELS,
  estadoIntervencion,
  estadoMusaat,
  intervencionDe,
  TIPO_INTERVENCION_MUSAAT_LABELS,
  TIPOS_INTERVENCION_MUSAAT,
  type EstadoMusaat,
  type RegistroMusaat,
} from "@sigram/shared";
import type { musaat } from "../db/schema.js";

type MusaatRow = typeof musaat.$inferSelect;

function esc(valor: string | null | undefined): string {
  return (valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : iso;
}

// Cabeceras cortas: en la pantalla caben los nombres enteros, pero aquí son
// siete columnas en una hoja y "Dirección de ejecución" partido en tres
// líneas deja la tabla ilegible.
const CABECERAS: Record<string, string> = {
  proyecto: "Proyecto",
  estudioSeguridad: "Est. seguridad",
  direccionObra: "Dir. obra",
  direccionAparejador: "Dir. aparejador",
  coordinacion: "Coordinación",
};

export function renderListaMusaatHtml(params: {
  registros: MusaatRow[];
  descripcion: string;
  generadoEn: Date;
}): string {
  const { registros, descripcion, generadoEn } = params;

  const cuantas = (estado: EstadoMusaat) =>
    registros.filter((r) => estadoMusaat(r as RegistroMusaat) === estado).length;

  const filas = registros
    .map((registro) => {
      const estado = estadoMusaat(registro as RegistroMusaat);
      const celdas = TIPOS_INTERVENCION_MUSAAT.map((tipo) => {
        const situacion = estadoIntervencion(registro.intervenciones, tipo);
        if (situacion === "enviado") {
          const fecha = intervencionDe(registro.intervenciones, tipo).fechaEnvio;
          return `<td class="enviado">${esc(fechaCorta(fecha)) || "Enviado"}</td>`;
        }
        if (situacion === "no_procede") return `<td class="no-procede">No procede</td>`;
        return `<td class="falta">Falta</td>`;
      }).join("");

      // Las observaciones van en una segunda fila bajo la obra, para no
      // estrechar las columnas de fechas por una nota larga.
      const observaciones = (registro.observaciones ?? "").trim();
      const filaNota = observaciones
        ? `<tr class="nota"><td></td><td colspan="6">${esc(observaciones)}</td></tr>`
        : "";

      return `
        <tr>
          <td class="expediente">
            <span class="punto ${estado}"></span>${esc(registro.numeroExpediente) || "—"}
          </td>
          <td class="obra">${esc(registro.nombre) || "Obra sin nombre"}</td>
          ${celdas}
        </tr>${filaNota}`;
    })
    .join("");

  const sinNada = `<tr><td colspan="7" class="vacio">No hay ninguna obra que mostrar.</td></tr>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Musaat</title>
<style>
  /* Los márgenes de página los fija Puppeteer (page.pdf), no @page. */
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; font-size: 11px; margin: 0; }

  .cabecera { display: flex; align-items: flex-end; justify-content: space-between;
              border-bottom: 2px solid #0a0a0a; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 20px; margin: 0; letter-spacing: -0.01em; }
  .sub { font-size: 11px; color: #5d5953; margin-top: 3px; }
  .fecha { font-size: 10px; color: #5d5953; text-align: right; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; font-weight: 600; color: #5d5953;
       padding: 0 6px 5px; border-bottom: 1px solid #cbd5e1; }
  th.interv, td.enviado, td.falta, td.no-procede { text-align: center; }
  td { padding: 6px; border-bottom: 1px solid #eef0f2; vertical-align: top; }

  .expediente { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .obra { font-weight: 600; }
  .enviado { font-variant-numeric: tabular-nums; }
  .falta { color: #a8191f; font-weight: 600; }
  .no-procede { color: #94a3b8; }

  /* El punto repite el color de la pantalla, pero impreso en blanco y negro
     se perdería: por eso cada celda dice además su palabra. */
  .punto { display: inline-block; width: 7px; height: 7px; border-radius: 50%;
           margin-right: 6px; background: #cbd5e1; }
  .punto.completo { background: #007d52; }
  .punto.parcial { background: #d2630a; }
  .punto.nada { background: #a8191f; }

  tr.nota td { border-bottom: 1px solid #eef0f2; padding-top: 0; font-size: 10px;
               color: #5d5953; font-style: italic; }
  .vacio { text-align: center; color: #5d5953; padding: 20px; font-style: italic; }

  .leyenda { margin-top: 12px; font-size: 10px; color: #5d5953; display: flex; gap: 18px; }
  .leyenda span { display: inline-flex; align-items: center; gap: 5px; }
</style></head>
<body>
  <div class="cabecera">
    <div>
      <h1>Musaat</h1>
      <div class="sub">${esc(descripcion)}</div>
    </div>
    <div class="fecha">
      ${registros.length} ${registros.length === 1 ? "obra" : "obras"}<br>
      ${cuantas("nada")} sin enviar nada · ${cuantas("parcial")} a medias · ${cuantas("completo")} al día<br>
      Generado el ${fechaCorta(generadoEn.toISOString())}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Nº expediente</th>
        <th>Obra</th>
        ${TIPOS_INTERVENCION_MUSAAT.map(
          (t) => `<th class="interv">${esc(CABECERAS[t] ?? TIPO_INTERVENCION_MUSAAT_LABELS[t])}</th>`
        ).join("")}
      </tr>
    </thead>
    <tbody>${filas || sinNada}</tbody>
  </table>

  <div class="leyenda">
    <span><span class="punto nada"></span>${esc(ESTADO_MUSAAT_LABELS.nada)}</span>
    <span><span class="punto parcial"></span>${esc(ESTADO_MUSAAT_LABELS.parcial)}</span>
    <span><span class="punto completo"></span>${esc(ESTADO_MUSAAT_LABELS.completo)}</span>
    <span>Las fechas son la del envío a la mutua.</span>
  </div>
</body></html>`;
}

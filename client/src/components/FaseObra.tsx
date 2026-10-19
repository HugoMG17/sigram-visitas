import type { EstadoObra } from "@sigram/shared";
import { ESTADO_OBRA_LABELS } from "@sigram/shared";

// Las cuatro fases por las que pasa una obra, en orden. No es un dato nuevo:
// es el estado que ya se guarda, dibujado como lo que de verdad es, el ciclo
// de vida de una obra, para saber de un vistazo por dónde va sin leer.
const FASES: EstadoObra[] = [
  "redaccion_proyecto",
  "tramitacion_licencia",
  "en_ejecucion",
  "finalizada",
];

export function FaseObra({ estado }: { estado: EstadoObra }) {
  // "Paralizada" no es un paso de la secuencia: es una obra detenida, y no se
  // sabe en qué fase. Se dibuja sin ningún tramo marcado y es lo único de la
  // pantalla que lleva rojo, porque es lo único que pide una decisión.
  const parada = estado === "paralizada";
  const acabada = estado === "finalizada";
  const actual = FASES.indexOf(estado);

  const clase = parada ? "fase fase--parada" : acabada ? "fase fase--acabada" : "fase";

  return (
    <div className={clase}>
      <span className="fase-tramos" aria-hidden="true">
        {FASES.map((fase, i) => {
          let tramo = "fase-tramo";
          if (!parada) {
            if (acabada || i < actual) tramo += " fase-tramo--pasado";
            else if (i === actual) tramo += " fase-tramo--ahora";
          }
          return <span key={fase} className={tramo} />;
        })}
      </span>
      <span className="fase-nombre">{ESTADO_OBRA_LABELS[estado]}</span>
    </div>
  );
}

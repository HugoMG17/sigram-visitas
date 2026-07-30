import { isNative } from "../native/platform";

export type Entorno = "produccion" | "pruebas" | "local";

// Qué entorno se está usando, para avisarlo en la cabecera y no confundir el
// sitio de pruebas con el real (meter ahí datos de una visita de verdad y
// perderlos es un error fácil de cometer).
//
// Se deduce del dominio, sin necesidad de variables de compilación: el mismo
// build sirve para los dos despliegues.
export function entornoActual(): Entorno {
  // En el APK el hostname es "localhost" aunque apunte al servidor real de
  // producción, así que se corta aquí antes de mirarlo.
  if (isNative) return "produccion";

  const host = window.location.hostname;
  if (host.includes("pruebas")) return "pruebas";
  if (host === "localhost" || host === "127.0.0.1") return "local";
  return "produccion";
}

// Etiqueta a mostrar, o undefined en producción (donde no se pinta nada).
export function etiquetaEntorno(): { texto: string; color: string } | undefined {
  switch (entornoActual()) {
    case "pruebas":
      return { texto: "PRUEBAS", color: "#dc2626" };
    case "local":
      return { texto: "LOCAL", color: "#7c3aed" };
    default:
      return undefined;
  }
}

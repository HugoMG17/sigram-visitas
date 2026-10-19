// Marca de "ya he recargado la app una vez por sesión caducada".
//
// Vive en su propio módulo, y no junto al cliente de la API, para no crear
// un ciclo de importaciones: el cliente de la API ya lee el token de
// native/auth, y native/auth necesita borrar esta marca al iniciar sesión.
//
// sessionStorage es justo lo que hace falta: sobrevive a window.location
// .reload() y desaparece al cerrar la app.
const CLAVE = "sigram:recargadoPorSesion";

export function yaSeRecargoPorSesion(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) !== null;
  } catch {
    // Si el almacenamiento está bloqueado se sigue adelante: el guard de
    // runSync ya impide el bucle por sí solo.
    return false;
  }
}

export function marcarRecargaPorSesion(): void {
  try {
    sessionStorage.setItem(CLAVE, "1");
  } catch {
    // Igual que arriba.
  }
}

export function olvidarRecargaPorSesion(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Igual que arriba.
  }
}

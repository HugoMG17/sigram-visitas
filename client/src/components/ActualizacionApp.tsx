import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { isNative } from "../native/platform";
import { runSync } from "../sync/syncEngine";
import { usePendingCount, useSyncErrors } from "../sync/useSyncStatus";

// Cada cuánto se pregunta al servidor si hay una versión nueva publicada. Sin
// esta comprobación periódica, una versión recién desplegada no se detecta
// hasta que la app arranca de cero.
const INTERVALO_COMPROBACION_MS = 60_000;

// Rutas en las que NO se debe recargar aunque haya versión nueva: son las de
// formularios, y recargar ahí se llevaría por delante lo que se esté
// escribiendo (eso sí se perdería; los datos ya guardados no).
function esFormulario(pathname: string): boolean {
  return pathname.endsWith("/nueva") || pathname.endsWith("/editar");
}

export function ActualizacionApp() {
  const { pathname } = useLocation();
  const pendientes = usePendingCount();
  const errores = useSyncErrors();

  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Comprobar al volver a la pestaña y cada minuto.
      const comprobar = () => void registration.update();
      const intervalo = setInterval(comprobar, INTERVALO_COMPROBACION_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") comprobar();
      });
      // El registro vive lo que viva la pestaña; no hay desmontaje que
      // gestionar, pero se limpia el intervalo si la pestaña se cierra.
      window.addEventListener("beforeunload", () => clearInterval(intervalo));
    },
  });

  const sinSubir = pendientes > 0 || errores.length > 0;
  const editando = esFormulario(pathname);
  const puedeActualizarse = hayVersionNueva && !sinSubir && !editando;

  useEffect(() => {
    if (!hayVersionNueva) return;
    // Si lo único que falta es subir cambios, se intenta ahora: en cuanto
    // terminen, este efecto vuelve a entrar y ya se aplicará la actualización.
    if (sinSubir) {
      void runSync();
      return;
    }
    if (puedeActualizarse) {
      // true = activa el service worker nuevo y recarga la página. No toca
      // IndexedDB: los datos locales siguen intactos tras la recarga.
      void updateServiceWorker(true);
    }
  }, [hayVersionNueva, sinSubir, puedeActualizarse, updateServiceWorker]);

  // En el APK no hay service worker (los assets van dentro del paquete).
  if (isNative || !hayVersionNueva || puedeActualizarse) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 16,
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        background: "#1e293b",
        color: "white",
        padding: "0.6rem 0.9rem",
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(15, 23, 42, 0.35)",
        fontSize: "0.85rem",
        maxWidth: "min(92vw, 520px)",
      }}
    >
      <span>
        Hay una versión nueva.{" "}
        {sinSubir
          ? "Se instalará en cuanto terminen de subirse tus cambios."
          : "Se instalará al salir de esta pantalla."}
      </span>
      <button
        type="button"
        className="btn"
        style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem", flexShrink: 0 }}
        onClick={() => void updateServiceWorker(true)}
      >
        Actualizar ahora
      </button>
    </div>
  );
}

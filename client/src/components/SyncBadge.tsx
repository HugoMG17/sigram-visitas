import { useState } from "react";
import { runSync } from "../sync/syncEngine";
import { useOnlineStatus, usePendingCount, useSyncErrors } from "../sync/useSyncStatus";

// El estado de sincronización va en la barra de arriba, y es discreto a
// propósito: cuando todo está subido no se pinta ningún aviso, solo el botón
// de sincronizar. El color aparece únicamente cuando hay algo que saber.
export function SyncBadge() {
  const pending = usePendingCount();
  const errores = useSyncErrors();
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
    }
  }

  return (
    // Los avisos aparecen y desaparecen solos; sin esto, quien usa lector de
    // pantalla no se entera de que hay algo sin subir.
    <div className="row" style={{ gap: "8px" }} role="status" aria-live="polite">
      {!online && (
        <span className="chip chip--pendiente" title="No hay conexión: se guarda en el móvil">
          <span className="chip-dot" />
          Sin conexión
        </span>
      )}
      {pending > 0 && (
        <span
          className="chip chip--pendiente"
          title="Hay cambios guardados en este dispositivo que todavía no están en el servidor"
        >
          <span className="chip-dot" />
          {pending} sin subir
        </span>
      )}
      {errores.length > 0 && (
        <span className="chip chip--error">
          <span className="chip-dot" />
          {errores.length} con error
        </span>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleSync}
        disabled={syncing || !online}
      >
        {syncing ? "Sincronizando…" : "Sincronizar"}
      </button>
    </div>
  );
}

// El detalle de los fallos, en una banda bajo la barra. Antes iba dentro de
// la cabecera y eran dos párrafos rojos a pantalla completa: lo más llamativo
// de la app era justo lo que menos veces pasa.
export function SyncErrores() {
  const errores = useSyncErrors();
  if (errores.length === 0) return null;

  const visibles = errores.slice(0, 3);
  const resto = errores.length - visibles.length;

  return (
    <div className="sync-errores" role="status" aria-live="polite">
      <div className="sync-errores-inner">
        {visibles.map((e, i) => (
          <p key={i}>
            {e.entidad} “{e.nombre}”: {e.mensaje}
          </p>
        ))}
        {resto > 0 && <p>Y {resto} más.</p>}
      </div>
    </div>
  );
}

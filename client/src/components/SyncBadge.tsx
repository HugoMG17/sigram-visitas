import { useState } from "react";
import { runSync } from "../sync/syncEngine";
import { useOnlineStatus, usePendingCount, useSyncErrors } from "../sync/useSyncStatus";

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
    <div className="stack" style={{ gap: "0.4rem" }}>
      <div className="row" style={{ gap: "0.5rem" }}>
        <span
          className="badge"
          style={{
            background: online ? "#16a34a" : "#dc2626",
            color: "white",
          }}
        >
          {online ? "En línea" : "Sin conexión"}
        </span>
        {pending > 0 && (
          <span className="badge" style={{ background: "#f59e0b", color: "white" }}>
            {pending} pendiente{pending === 1 ? "" : "s"} de sincronizar
          </span>
        )}
        {errores.length > 0 && (
          <span className="badge" style={{ background: "#dc2626", color: "white" }}>
            {errores.length} con error
          </span>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
          onClick={handleSync}
          disabled={syncing || !online}
        >
          {syncing ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      </div>
      {errores.length > 0 && (
        <div className="stack" style={{ gap: "0.2rem" }}>
          {errores.map((e, i) => (
            <p key={i} className="error-text" style={{ margin: 0, fontSize: "0.75rem" }}>
              {e.entidad} "{e.nombre}": {e.mensaje}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

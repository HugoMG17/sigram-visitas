import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useMutation } from "@tanstack/react-query";
import {
  contarPuntosPendientesImportables,
  importarPuntosPendientes,
} from "../db/repositories/puntoRepo";
import { runSync } from "../sync/syncEngine";

export function ImportarPuntosButton({
  obraId,
  visitaId,
}: {
  obraId: string;
  visitaId: string;
}) {
  const [error, setError] = useState<string | null>(null);

  // Nº de puntos pendientes en las OTRAS visitas de la obra. useLiveQuery se
  // re-evalúa solo cuando cambian puntos/visitas en Dexie.
  const pendientes = useLiveQuery(
    () => contarPuntosPendientesImportables(obraId, visitaId),
    [obraId, visitaId]
  );

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: () => importarPuntosPendientes(obraId, visitaId),
    onSuccess: (copiados) => {
      setError(null);
      if (copiados > 0) void runSync();
    },
    onError: () =>
      setError(
        "No se pudieron copiar las fotos de algún punto (¿sin conexión?). No se ha importado nada; inténtalo con conexión."
      ),
  });

  const cantidad = pendientes ?? 0;
  const sinPendientes = cantidad === 0;

  function handleClick() {
    if (sinPendientes) return;
    const ok = window.confirm(
      `Se copiarán ${cantidad} punto(s) pendiente(s) de otras visitas de esta obra, con sus fotos. ` +
        "Los puntos originales no se modifican. ¿Continuar?"
    );
    if (ok) mutation.mutate();
  }

  return (
    <div className="stack" style={{ gap: "0.3rem" }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleClick}
        disabled={sinPendientes || mutation.isPending}
        title={
          sinPendientes
            ? "No hay puntos pendientes en otras visitas de esta obra"
            : "Copiar aquí los puntos pendientes de otras visitas de esta obra"
        }
      >
        {mutation.isPending
          ? "Importando…"
          : sinPendientes
            ? "Importar puntos pendientes"
            : `Importar puntos pendientes (${cantidad})`}
      </button>
      {error && <p className="error-text" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}

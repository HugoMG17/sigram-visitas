import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addPuntoLocal } from "../db/repositories/puntoRepo";
import { runSync } from "../sync/syncEngine";

export function AddPuntoForm({ visitaId }: { visitaId: string }) {
  const [descripcion, setDescripcion] = useState("");

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: () => addPuntoLocal({ visitaId, descripcion, estado: "pendiente" }),
    onSuccess: () => {
      setDescripcion("");
      void runSync();
    },
  });

  return (
    <form
      className="row"
      style={{ alignItems: "flex-start" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!descripcion.trim()) return;
        mutation.mutate();
      }}
    >
      <input
        className="input"
        style={{ flex: 1 }}
        placeholder="Describe el punto (ej. Humedad en el techo del salón)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <button className="btn" type="submit" disabled={mutation.isPending || !descripcion.trim()}>
        + Añadir punto
      </button>
    </form>
  );
}

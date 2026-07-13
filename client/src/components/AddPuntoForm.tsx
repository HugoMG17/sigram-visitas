import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addPuntoLocal } from "../db/repositories/puntoRepo";
import { runSync } from "../sync/syncEngine";

export function AddPuntoForm({ visitaId }: { visitaId: string }) {
  const [titulo, setTitulo] = useState("");

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: () => addPuntoLocal({ visitaId, titulo, estado: "sin_estado" }),
    onSuccess: () => {
      setTitulo("");
      void runSync();
    },
  });

  return (
    <form
      className="row"
      style={{ alignItems: "flex-start" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) return;
        mutation.mutate();
      }}
    >
      <input
        className="input"
        style={{ flex: 1 }}
        placeholder="Título del punto (ej. Humedad en el techo del salón)"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <button className="btn" type="submit" disabled={mutation.isPending || !titulo.trim()}>
        + Añadir punto
      </button>
    </form>
  );
}

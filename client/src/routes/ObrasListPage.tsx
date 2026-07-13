import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { listObras } from "../db/repositories/obraRepo";
import { ObraCard } from "../components/ObraCard";

export function ObrasListPage() {
  const obras = useLiveQuery(listObras, []);
  const [busqueda, setBusqueda] = useState("");

  const filtro = busqueda.trim().toLowerCase();
  const obrasFiltradas = filtro
    ? obras?.filter(
        (o) =>
          (o.numeroExpediente ?? "").toLowerCase().includes(filtro) ||
          o.nombre.toLowerCase().includes(filtro)
      )
    : obras;

  return (
    <div className="stack">
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Obras</h1>
        <Link to="/obras/nueva" className="btn" style={{ textDecoration: "none" }}>
          + Nueva obra
        </Link>
      </div>

      <input
        className="input"
        type="search"
        placeholder="Buscar por nº de expediente o nombre…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {obras === undefined && <p className="muted">Cargando obras…</p>}

      {obras && obras.length === 0 && (
        <div className="empty-state">
          <p>Todavía no has creado ninguna obra.</p>
          <Link to="/obras/nueva" className="btn" style={{ textDecoration: "none" }}>
            Crear la primera obra
          </Link>
        </div>
      )}

      {obras && obras.length > 0 && obrasFiltradas?.length === 0 && (
        <div className="empty-state">
          <p>Ninguna obra coincide con "{busqueda}".</p>
        </div>
      )}

      {obrasFiltradas?.map((obra) => (
        <ObraCard key={obra.id} obra={obra} />
      ))}
    </div>
  );
}

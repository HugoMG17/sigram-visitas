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

  // La línea bajo el título cuenta lo que hay, y se calcula sobre lo que se
  // está viendo: si hay una búsqueda puesta, dice cuántas coinciden.
  const total = obras?.length ?? 0;
  const mostradas = obrasFiltradas?.length ?? 0;
  const enEjecucion = obras?.filter((o) => o.estado === "en_ejecucion").length ?? 0;
  const resumen = filtro
    ? `${mostradas} de ${total} ${total === 1 ? "obra" : "obras"}`
    : `${total} ${total === 1 ? "obra" : "obras"} · ${enEjecucion} en ejecución`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Obras</h1>
          {obras !== undefined && obras.length > 0 && <p className="sub">{resumen}</p>}
        </div>
        <Link to="/obras/nueva" className="btn">
          Nueva obra
        </Link>
      </div>

      {obras !== undefined && obras.length > 0 && (
        <input
          className="input buscador"
          type="search"
          placeholder="Buscar por nº de expediente o nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

      {obras === undefined && <p className="muted">Cargando obras…</p>}

      {obras && obras.length === 0 && (
        <div className="empty-state">
          <p>Todavía no has creado ninguna obra. Cada obra guarda sus visitas de seguimiento.</p>
          <Link to="/obras/nueva" className="btn">
            Crear la primera obra
          </Link>
        </div>
      )}

      {obras && obras.length > 0 && mostradas === 0 && (
        <div className="empty-state">
          <p style={{ margin: 0 }}>
            Ninguna obra coincide con “{busqueda.trim()}”. Se busca por nº de expediente y por
            nombre.
          </p>
        </div>
      )}

      <div className="lista">
        {obrasFiltradas?.map((obra) => (
          <ObraCard key={obra.id} obra={obra} />
        ))}
      </div>
    </div>
  );
}

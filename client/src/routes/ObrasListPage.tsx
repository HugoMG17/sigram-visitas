import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { listObras } from "../db/repositories/obraRepo";
import { ObraCard } from "../components/ObraCard";

export function ObrasListPage() {
  const obras = useLiveQuery(listObras, []);

  return (
    <div className="stack">
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Obras</h1>
        <Link to="/obras/nueva" className="btn" style={{ textDecoration: "none" }}>
          + Nueva obra
        </Link>
      </div>

      {obras === undefined && <p className="muted">Cargando obras…</p>}

      {obras && obras.length === 0 && (
        <div className="empty-state">
          <p>Todavía no has creado ninguna obra.</p>
          <Link to="/obras/nueva" className="btn" style={{ textDecoration: "none" }}>
            Crear la primera obra
          </Link>
        </div>
      )}

      {obras?.map((obra) => (
        <ObraCard key={obra.id} obra={obra} />
      ))}
    </div>
  );
}

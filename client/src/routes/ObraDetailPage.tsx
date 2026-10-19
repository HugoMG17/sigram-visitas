import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getObra, softDeleteObraLocal } from "../db/repositories/obraRepo";
import { listVisitasDeObra } from "../db/repositories/visitaRepo";
import { listPuntosDeVisita } from "../db/repositories/puntoRepo";
import { runSync } from "../sync/syncEngine";
import { FaseObra } from "../components/FaseObra";
import { VisitaCard } from "../components/VisitaCard";

export function ObraDetailPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  const obra = useLiveQuery(() => (obraId ? getObra(obraId) : undefined), [obraId]);
  const visitas = useLiveQuery(() => (obraId ? listVisitasDeObra(obraId) : undefined), [obraId]);

  // Los puntos que dejó pendientes la última visita: es la pregunta con la
  // que se entra en una obra, así que se responde arriba y no hay que abrir
  // la visita para verlo.
  const ultima = visitas?.[0];
  const pendientesUltima = useLiveQuery(
    async () => {
      if (!ultima) return undefined;
      const puntos = await listPuntosDeVisita(ultima.id);
      return puntos.filter((p) => p.estado === "pendiente").length;
    },
    [ultima?.id]
  );

  if (obra === undefined) return <p className="muted">Cargando obra…</p>;
  if (!obra) return <p className="error-text">Obra no encontrada.</p>;

  const currentObraId = obra.id;
  // Municipio y provincia coinciden en muchas obras (Cáceres, Cáceres):
  // escribirlo dos veces no añade nada y hace la línea más difícil de leer.
  const donde = [obra.direccion, obra.municipio, obra.provincia]
    .filter(Boolean)
    .filter((parte, i, partes) => partes.indexOf(parte) === i)
    .join(", ");

  async function handleEliminarObra() {
    if (
      !window.confirm(
        "¿Eliminar esta obra, con todas sus visitas, puntos y adjuntos? No se puede deshacer."
      )
    ) {
      return;
    }
    await softDeleteObraLocal(currentObraId);
    void runSync();
    navigate("/");
  }

  let resumenVisitas = "";
  if (visitas !== undefined) {
    if (visitas.length === 0) resumenVisitas = "Ninguna todavía";
    else {
      const cuantas = `${visitas.length} ${visitas.length === 1 ? "visita" : "visitas"}`;
      resumenVisitas =
        pendientesUltima === undefined || pendientesUltima === 0
          ? `${cuantas} · nada pendiente en la última`
          : `${cuantas} · ${pendientesUltima} punto${
              pendientesUltima === 1 ? "" : "s"
            } pendiente${pendientesUltima === 1 ? "" : "s"} en la última`;
    }
  }

  return (
    <div>
      <Link to="/" className="back-link">
        ← Todas las obras
      </Link>

      {/* La ficha se queda en el expediente, el nombre y la dirección a
          propósito: la referencia catastral, los roles (que en algunas
          obras son mucha gente) y las notas se consultan en "Editar obra",
          para que esta pantalla no resulte abrumadora. */}
      <div className="page-head page-head--obra">
        <div>
          <p className="fila-meta" style={{ marginBottom: "2px" }}>
            {obra.numeroExpediente ? `Nº ${obra.numeroExpediente}` : "Sin expediente"}
          </p>
          <h1>{obra.nombre || "Obra sin nombre"}</h1>
          {donde && <p className="sub">{donde}</p>}
          <FaseObra estado={obra.estado} />
        </div>
        <div className="row acciones-obra">
          <Link to={`/obras/${obra.id}/editar`} className="btn btn-secondary">
            Editar obra
          </Link>
          {/* Eliminar va en texto y sin recuadro: es lo que menos se usa y lo
              que peor se arregla si se toca sin querer. */}
          <button type="button" className="btn btn-danger btn-sm" onClick={handleEliminarObra}>
            Eliminar obra
          </button>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>Visitas</h2>
          {resumenVisitas && <p className="sub">{resumenVisitas}</p>}
        </div>
        <Link to={`/obras/${obra.id}/visitas/nueva`} className="btn">
          Nueva visita
        </Link>
      </div>

      {visitas === undefined && <p className="muted">Cargando visitas…</p>}

      {visitas && visitas.length === 0 && (
        <div className="empty-state">
          <p style={{ margin: 0 }}>
            Todavía no hay visitas en esta obra. Cada visita guarda sus fotos y sus puntos de
            seguimiento, y de cada una sale el informe en PDF.
          </p>
        </div>
      )}

      <div className="lista">
        {visitas?.map((visita) => (
          <VisitaCard key={visita.id} visita={visita} />
        ))}
      </div>
    </div>
  );
}

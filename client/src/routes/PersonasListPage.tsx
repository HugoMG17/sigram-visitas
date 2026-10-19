import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { etiquetaDocumento } from "@sigram/shared";
import {
  importarPersonasDeObras,
  listPersonas,
  simularImportacion,
} from "../db/repositories/personaRepo";
import { runSync } from "../sync/syncEngine";
import { usePendingCount } from "../sync/useSyncStatus";

export function PersonasListPage() {
  const personas = useLiveQuery(listPersonas, []);
  const [busqueda, setBusqueda] = useState("");
  const [importando, setImportando] = useState(false);
  const sinSubir = usePendingCount();
  // Lo que queda por importar de las obras que ya existen, recalculado cada
  // vez que cambia la agenda o una obra.
  const porImportar = useLiveQuery(simularImportacion, [personas]);

  async function handleImportar() {
    if (!porImportar) return;
    if (sinSubir > 0) {
      window.alert(
        "Antes de importar conviene sincronizar: hay cambios guardados solo en este " +
          "dispositivo y la importación reescribe las obras.\n\n" +
          "Pulsa “Sincronizar” arriba y vuelve a intentarlo."
      );
      return;
    }
    const { fichasNuevas, obrasEnlazadas } = porImportar;
    const ok = window.confirm(
      `Voy a crear ${fichasNuevas} ${fichasNuevas === 1 ? "ficha" : "fichas"} y a enlazar ` +
        `${obrasEnlazadas} ${obrasEnlazadas === 1 ? "obra" : "obras"}.\n\n` +
        "Las obras no cambian de contenido: solo pasan a apuntar a la ficha, para que " +
        "corregir un dato una vez lo corrija en todas.\n\n¿Seguimos?"
    );
    if (!ok) return;
    setImportando(true);
    try {
      const hecho = await importarPersonasDeObras();
      void runSync();
      window.alert(
        `Listo: ${hecho.fichasNuevas} ${
          hecho.fichasNuevas === 1 ? "ficha creada" : "fichas creadas"
        } ` +
          `y ${hecho.obrasEnlazadas} ${
            hecho.obrasEnlazadas === 1 ? "obra enlazada" : "obras enlazadas"
          }.`
      );
    } finally {
      setImportando(false);
    }
  }

  const filtro = busqueda.trim().toLowerCase();
  // Se busca por nombre y también por documento: a veces lo que uno recuerda
  // es el DNI que está copiando de un papel.
  const filtradas = filtro
    ? personas?.filter(
        (p) =>
          p.nombre.toLowerCase().includes(filtro) || (p.dni ?? "").toLowerCase().includes(filtro)
      )
    : personas;

  const total = personas?.length ?? 0;
  const mostradas = filtradas?.length ?? 0;
  const empresas = personas?.filter((p) => p.esEmpresa).length ?? 0;
  const resumen = filtro
    ? `${mostradas} de ${total} ${total === 1 ? "ficha" : "fichas"}`
    : `${total} ${total === 1 ? "ficha" : "fichas"} · ${empresas} ${
        empresas === 1 ? "empresa" : "empresas"
      }`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Personas</h1>
          {personas !== undefined && total > 0 && (
            <p className="sub" aria-live="polite">
              {resumen}
            </p>
          )}
        </div>
        <Link to="/personas/nueva" className="btn">
          Nueva ficha
        </Link>
      </div>

      {personas !== undefined && total > 0 && (
        <>
          <label className="solo-voz" htmlFor="buscar-persona">
            Buscar una ficha por nombre o por documento
          </label>
          <input
            id="buscar-persona"
            className="input buscador"
            type="search"
            name="buscar-persona"
            autoComplete="off"
            placeholder="Buscar por nombre o documento…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </>
      )}

      {personas === undefined && (
        <p className="muted" aria-live="polite">
          Cargando personas…
        </p>
      )}

      {/* Solo aparece mientras quede gente escrita a mano en alguna obra. */}
      {porImportar && porImportar.fichasNuevas > 0 && (
        <div className="aviso-importar">
          <div>
            <p className="aviso-titulo">
              Hay {porImportar.fichasNuevas}{" "}
              {porImportar.fichasNuevas === 1 ? "persona" : "personas"} escritas a mano en tus obras
            </p>
            <p className="fila-sub" style={{ marginTop: "2px" }}>
              Puedo crear su ficha y dejar{" "}
              {porImportar.obrasEnlazadas === 1
                ? "la obra apuntando"
                : `las ${porImportar.obrasEnlazadas} obras apuntando`}{" "}
              a ella. A partir de ahí, corregir un dato una vez lo corrige en todas.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleImportar()}
            disabled={importando}
          >
            {importando ? "Importando…" : "Importar"}
          </button>
        </div>
      )}

      {personas && total === 0 && (
        <div className="empty-state">
          <p>
            Todavía no has guardado ninguna ficha. Lo que guardes aquí se rellena solo al crear una
            obra, y corregir un dato una vez lo corrige en todas.
          </p>
          <Link to="/personas/nueva" className="btn">
            Crear la primera ficha
          </Link>
        </div>
      )}

      {personas && total > 0 && mostradas === 0 && (
        <div className="empty-state">
          <p style={{ margin: 0 }}>
            Ninguna ficha coincide con “{busqueda.trim()}”. Se busca por nombre y por documento.
          </p>
        </div>
      )}

      <ul className="lista" aria-label="Personas">
        {filtradas?.map((persona) => (
          <li key={persona.id}>
            <Link to={`/personas/${persona.id}/editar`} className="fila">
              <div className="fila-meta">
                {/* Se dice el cero: una ficha sin documento lo dice, no se
                    queda en blanco como si todavía estuviera cargando. */}
                <span>
                  {persona.dni
                    ? `${etiquetaDocumento(persona.esEmpresa)} ${persona.dni}`
                    : `Sin ${etiquetaDocumento(persona.esEmpresa)}`}
                </span>
                {persona.esEmpresa && <span className="chip">Empresa</span>}
              </div>
              <p className="fila-nombre">{persona.nombre || "Ficha sin nombre"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

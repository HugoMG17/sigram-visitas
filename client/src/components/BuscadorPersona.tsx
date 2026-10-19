import { useId, useRef, useState } from "react";
import { etiquetaDocumento, type Persona } from "@sigram/shared";

// Buscador de fichas de la agenda para una casilla de nombre.
//
// Es un combobox propio y no un <datalist> del navegador por cuatro motivos
// que se suman: el datalist no puede llevar el id de la ficha (habría que
// casar por texto, y dos personas con el mismo nombre serían
// indistinguibles), no puede enseñar el documento que es justo lo que las
// distingue, no puede ofrecer la opción de crear una ficha nueva, y su
// desplegable lo pinta Android a su manera, sin la zona táctil que necesita
// usarse en obra.
//
// Las sugerencias salen de la base local, así que funciona sin cobertura.

const MAX_SUGERENCIAS = 6;

export function BuscadorPersona({
  id,
  valor,
  personas,
  onEscribir,
  onElegir,
  onCrearFicha,
}: {
  id: string;
  valor: string;
  personas: Persona[];
  onEscribir: (nombre: string) => void;
  onElegir: (persona: Persona) => void;
  onCrearFicha: (nombre: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const listaId = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  const escrito = valor.trim();
  const filtro = escrito.toLowerCase();
  const coincidencias = filtro
    ? personas.filter((p) => p.nombre.toLowerCase().includes(filtro)).slice(0, MAX_SUGERENCIAS)
    : personas.slice(0, MAX_SUGERENCIAS);

  // La última opción ofrece guardar lo escrito como ficha nueva, salvo que ya
  // exista una con ese mismo nombre.
  const yaExiste = personas.some((p) => p.nombre.trim().toLowerCase() === filtro);
  const ofreceCrear = escrito !== "" && !yaExiste;
  const totalOpciones = coincidencias.length + (ofreceCrear ? 1 : 0);

  function cerrar() {
    setAbierto(false);
    setActivo(-1);
  }

  function elegir(indice: number) {
    if (indice < coincidencias.length) {
      onElegir(coincidencias[indice]);
    } else if (ofreceCrear) {
      onCrearFicha(escrito);
    }
    cerrar();
  }

  function alPulsarTecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) {
        setAbierto(true);
        setActivo(0);
        return;
      }
      if (totalOpciones === 0) return;
      const paso = e.key === "ArrowDown" ? 1 : -1;
      setActivo((prev) => (prev + paso + totalOpciones) % totalOpciones);
      return;
    }
    if (e.key === "Enter") {
      // Sin esto, elegir una sugerencia con Enter enviaría el formulario y
      // guardaría la obra a medias.
      if (abierto) e.preventDefault();
      if (abierto && activo >= 0) elegir(activo);
      else cerrar();
      return;
    }
    if (e.key === "Escape") {
      // Se cierra pero se respeta lo tecleado: no se deshace nada.
      cerrar();
    }
  }

  const idOpcion = (i: number) => `${listaId}-${i}`;

  return (
    <div
      className="combo"
      ref={contenedor}
      onBlur={(e) => {
        // Solo se cierra al salir del conjunto input + lista; si no, tocar una
        // sugerencia cerraría el desplegable antes de registrar el toque.
        if (!contenedor.current?.contains(e.relatedTarget as Node)) cerrar();
      }}
    >
      <input
        id={id}
        className="input"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={abierto && activo >= 0 ? idOpcion(activo) : undefined}
        autoComplete="off"
        value={valor}
        onChange={(e) => {
          onEscribir(e.target.value);
          setAbierto(true);
          setActivo(-1);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alPulsarTecla}
      />

      {abierto && totalOpciones > 0 && (
        <ul className="combo-lista" id={listaId} role="listbox" aria-label="Fichas de agentes">
          {coincidencias.map((persona, i) => (
            <li
              key={persona.id}
              id={idOpcion(i)}
              role="option"
              aria-selected={activo === i}
              className={activo === i ? "combo-opcion combo-opcion--activa" : "combo-opcion"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(i)}
            >
              <span className="combo-nombre">{persona.nombre}</span>
              <span className="combo-dato">
                {persona.dni
                  ? `${etiquetaDocumento(persona.esEmpresa)} ${persona.dni}`
                  : `Sin ${etiquetaDocumento(persona.esEmpresa)}`}
                {persona.esEmpresa ? " · Empresa" : ""}
              </span>
            </li>
          ))}
          {ofreceCrear && (
            <li
              id={idOpcion(coincidencias.length)}
              role="option"
              aria-selected={activo === coincidencias.length}
              className={
                activo === coincidencias.length
                  ? "combo-opcion combo-opcion--activa combo-opcion--crear"
                  : "combo-opcion combo-opcion--crear"
              }
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(coincidencias.length)}
            >
              <span className="combo-nombre">Guardar “{escrito}” en Agentes</span>
              <span className="combo-dato">Se crea la ficha y queda enlazada a esta obra</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

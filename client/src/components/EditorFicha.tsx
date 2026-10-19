import { useId, useState } from "react";
import { etiquetaDocumento, type Persona } from "@sigram/shared";
import { savePersonaLocal } from "../db/repositories/personaRepo";
import { runSync } from "../sync/syncEngine";

// Editar una ficha de la agenda sin salir del formulario de obra.
//
// Va sin <form> propio a propósito: esto se pinta DENTRO del formulario de la
// obra y un formulario no puede contener otro. Por eso todos los botones son
// type="button" y el Enter se intercepta: si no, corregir un DNI guardaría la
// obra entera y te sacaría de la pantalla a medio escribir.
//
// Lo que se guarda aquí es la ficha, no la obra. Como manda la ficha, el
// cambio se ve al instante en esta obra y en todas las demás.
export function EditorFicha({ persona, onCerrar }: { persona: Persona; onCerrar: () => void }) {
  const [nombre, setNombre] = useState(persona.nombre ?? "");
  const [dni, setDni] = useState(persona.dni ?? "");
  const [esEmpresa, setEsEmpresa] = useState(Boolean(persona.esEmpresa));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  const idBase = useId();

  const limpio = nombre.trim();

  async function guardar() {
    // Una ficha sin nombre no habría manera de encontrarla al buscar.
    if (!limpio) {
      setError(true);
      return;
    }
    setGuardando(true);
    try {
      await savePersonaLocal(persona.id, { nombre: limpio, dni: dni.trim(), esEmpresa });
      void runSync();
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  // Enter guarda la ficha y NO envía el formulario de la obra.
  function alPulsarTecla(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void guardar();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCerrar();
    }
  }

  return (
    <div className="editor-ficha" onKeyDown={alPulsarTecla}>
      <p className="editor-ficha-titulo">Editar la ficha de la agenda</p>

      <div className="field">
        <label htmlFor={`${idBase}-nombre`}>Nombre</label>
        <input
          id={`${idBase}-nombre`}
          className="input"
          autoFocus
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setError(false);
          }}
        />
      </div>

      <fieldset className="grupo-radio">
        <legend>Tipo de ficha</legend>
        <label className="opcion-radio">
          <input
            type="radio"
            name={`${idBase}-tipo`}
            checked={!esEmpresa}
            onChange={() => setEsEmpresa(false)}
          />
          Persona
        </label>
        <label className="opcion-radio">
          <input
            type="radio"
            name={`${idBase}-tipo`}
            checked={esEmpresa}
            onChange={() => setEsEmpresa(true)}
          />
          Empresa
        </label>
      </fieldset>

      <div className="field">
        <label htmlFor={`${idBase}-dni`}>{etiquetaDocumento(esEmpresa)}</label>
        <input
          id={`${idBase}-dni`}
          className="input"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
        />
      </div>

      {error && (
        <p className="error-text" role="alert">
          Ponle un nombre: es por lo que la vas a buscar.
        </p>
      )}

      <p className="fila-sub">
        Se corrige en esta obra y en todas las demás donde esté esta ficha.
      </p>

      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          disabled={guardando}
          onClick={() => void guardar()}
        >
          {guardando ? "Guardando…" : "Guardar ficha"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

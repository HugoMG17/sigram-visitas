import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { etiquetaDocumento } from "@sigram/shared";
import type { PersonaInput } from "../api/personas";
import {
  contarObrasConPersona,
  getPersona,
  savePersonaLocal,
  softDeletePersonaLocal,
} from "../db/repositories/personaRepo";
import { runSync } from "../sync/syncEngine";
import { generateId } from "../utils/id";

const emptyForm: PersonaInput = { nombre: "", dni: "", esEmpresa: false };

export function PersonaFormPage() {
  const { personaId } = useParams();
  const isEdit = Boolean(personaId);
  const navigate = useNavigate();

  const existing = useLiveQuery(
    () => (isEdit ? getPersona(personaId as string) : undefined),
    [personaId, isEdit]
  );

  const [form, setForm] = useState<PersonaInput>(emptyForm);

  // El mismo guard que en el formulario de obra: useLiveQuery vuelve a emitir
  // en CADA escritura de la base local, incluida la del pull de fondo, y sin
  // esto esa escritura pisaría lo que se está tecleando.
  const cargadoParaPersonaId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (existing && cargadoParaPersonaId.current !== personaId) {
      setForm({
        nombre: existing.nombre ?? "",
        dni: existing.dni ?? "",
        esEmpresa: existing.esEmpresa ?? false,
      });
      cargadoParaPersonaId.current = personaId;
    }
  }, [existing, personaId]);

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: () => savePersonaLocal(personaId ?? generateId(), form),
    onSuccess: () => {
      void runSync();
      navigate("/agentes");
    },
  });

  async function handleEliminar() {
    if (!personaId) return;
    const enObras = await contarObrasConPersona(personaId);
    const aviso =
      enObras > 0
        ? `“${form.nombre}” se usa en ${enObras} ${enObras === 1 ? "obra" : "obras"}.\n\n` +
          "Esas obras seguirán mostrando su nombre y su documento, y seguirán recogiendo las " +
          "correcciones que ya hiciste. Lo que pasa es que la ficha deja de salir al buscar.\n\n" +
          "¿Borrar la ficha?"
        : `¿Borrar a “${form.nombre}” de Agentes?`;
    if (!window.confirm(aviso)) return;
    await softDeletePersonaLocal(personaId);
    void runSync();
    navigate("/agentes");
  }

  const etiqueta = etiquetaDocumento(form.esEmpresa);

  return (
    <div>
      <Link to="/agentes" className="back-link">
        ← Todos los agentes
      </Link>

      <div className="page-head">
        <div>
          <h1>{isEdit ? "Editar agente" : "Nuevo agente"}</h1>
          <p className="sub">
            Lo que guardes aquí sale al buscar en cualquier obra, y corregirlo una vez lo corrige en
            todas.
          </p>
        </div>
      </div>

      <form
        className="stack card"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="persona-nombre">Nombre</label>
          <input
            id="persona-nombre"
            className="input"
            value={form.nombre}
            placeholder="Nombre y apellidos, o razón social"
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
          />
        </div>

        {/* Radios y no una casilla: así se ve de un vistazo de qué depende la
            etiqueta del documento, que cambia a CIF al marcar Empresa. */}
        <fieldset className="grupo-radio">
          <legend>Tipo de ficha</legend>
          <label className="opcion-radio">
            <input
              type="radio"
              name="tipo-ficha"
              checked={!form.esEmpresa}
              onChange={() => setForm((prev) => ({ ...prev, esEmpresa: false }))}
            />
            Persona
          </label>
          <label className="opcion-radio">
            <input
              type="radio"
              name="tipo-ficha"
              checked={Boolean(form.esEmpresa)}
              onChange={() => setForm((prev) => ({ ...prev, esEmpresa: true }))}
            />
            Empresa
          </label>
        </fieldset>

        <div className="field">
          <label htmlFor="persona-dni">{etiqueta}</label>
          <input
            id="persona-dni"
            className="input"
            value={form.dni ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, dni: e.target.value }))}
          />
        </div>

        {mutation.isError && <p className="error-text">No se pudo guardar el agente.</p>}

        <div className="row">
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </button>
          {isEdit && (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleEliminar}>
              Eliminar agente
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

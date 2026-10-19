import {
  agentesDeObra,
  direccionFacultativaExtraDeObra,
  type AgentePersona,
  type Obra,
  type ObraAgentes,
} from "@sigram/shared";
import type { PersonaInput } from "../../api/personas";
import { generateId } from "../../utils/id";
import { db, type LocalPersona } from "../db";
import { saveObraLocal } from "./obraRepo";

export async function listPersonas(): Promise<LocalPersona[]> {
  const all = await db.personas.toArray();
  return all.filter((p) => !p.deletedAt).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function getPersona(id: string): Promise<LocalPersona | undefined> {
  return db.personas.get(id);
}

export async function savePersonaLocal(id: string, data: PersonaInput): Promise<LocalPersona> {
  const now = new Date().toISOString();
  const existing = await db.personas.get(id);
  const record: LocalPersona = {
    id,
    ...data,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
  };
  await db.personas.put(record);
  return record;
}

// Borrado lógico. No se toca ninguna obra a propósito: las obras siguen
// resolviendo contra la ficha borrada, así que lo que ya se corrigió queda
// corregido. Reescribir las obras aquí las dejaría a todas "pendientes" y,
// con la regla "lo local sin subir manda", pisarían cambios hechos desde
// otro dispositivo.
export async function softDeletePersonaLocal(id: string): Promise<void> {
  const existing = await db.personas.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.personas.put({
    ...existing,
    deletedAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });
}

// Todas las personas que aparecen en una obra, mirando los roles fijos y los
// roles escritos a mano. Pasa por agentesDeObra, que es lo único que rescata
// las obras antiguas (las que guardan los roles en columnas sueltas y las que
// quedaron con la clave "constructor").
export function personasDeObra(obra: Obra): AgentePersona[] {
  const agentes = agentesDeObra(obra) as Record<string, AgentePersona[] | undefined>;
  const lista: AgentePersona[] = [];
  for (const rol of Object.keys(agentes)) lista.push(...(agentes[rol] ?? []));
  for (const extra of direccionFacultativaExtraDeObra(obra)) lista.push(...extra.personas);
  return lista;
}

// En cuántas obras se usa una ficha. Sirve para avisar antes de borrarla.
export async function contarObrasConPersona(personaId: string): Promise<number> {
  const obras = await db.obras.toArray();
  return obras.filter(
    (obra) => !obra.deletedAt && personasDeObra(obra).some((p) => p.personaId === personaId)
  ).length;
}

// --- Importar lo que ya está escrito en las obras -------------------------

// Clave para decidir si dos personas escritas en obras distintas son la misma:
// el nombre normalizado (sin mayúsculas, acentos ni espacios de sobra).
function clave(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Un CIF empieza por letra; un DNI, por número. Las de NIE (X, Y, Z) son
// personas, no sociedades. Es el único dato fiable para adivinarlo, y de
// todas formas se puede corregir después en la ficha.
function pareceEmpresa(dni: string): boolean {
  const limpio = dni.trim().toUpperCase();
  return /^[A-W]/.test(limpio) && !/^[XYZ]/.test(limpio);
}

export interface ResumenImportacion {
  fichasNuevas: number;
  obrasEnlazadas: number;
}

// Qué pasaría al importar, sin escribir nada. Sirve para poder preguntar
// antes con cifras de verdad.
export async function simularImportacion(): Promise<ResumenImportacion> {
  const obras = (await db.obras.toArray()).filter((o) => !o.deletedAt);
  const yaEnAgenda = new Set((await listPersonas()).map((p) => clave(p.nombre)));

  const nuevas = new Set<string>();
  let obrasEnlazadas = 0;

  for (const obra of obras) {
    let tocaria = false;
    for (const p of personasDeObra(obra)) {
      const nombre = (p.nombre ?? "").trim();
      if (!nombre || p.personaId) continue;
      tocaria = true;
      if (!yaEnAgenda.has(clave(nombre))) nuevas.add(clave(nombre));
    }
    if (tocaria) obrasEnlazadas += 1;
  }

  return { fichasNuevas: nuevas.size, obrasEnlazadas };
}

// Crea una ficha por cada persona distinta que aparezca en las obras y deja
// las obras apuntando a ella. A partir de ahí, corregir un dato una vez lo
// corrige en todas.
//
// Las obras reescritas quedan "pendientes" y las sube el motor de sync, así
// que conviene no ejecutarlo con cambios sin subir: la pantalla lo comprueba
// antes de ofrecerlo.
export async function importarPersonasDeObras(): Promise<ResumenImportacion> {
  const obras = (await db.obras.toArray()).filter((o) => !o.deletedAt);

  // Las que ya están en la agenda se reutilizan en vez de duplicarse.
  const porClave = new Map<string, string>();
  for (const ficha of await listPersonas()) porClave.set(clave(ficha.nombre), ficha.id);

  const resumen: ResumenImportacion = { fichasNuevas: 0, obrasEnlazadas: 0 };

  // Fase 1: crear las fichas que falten, mirando todas las obras primero,
  // para que el DNI lo aporte la obra que lo tenga aunque otra lo deje vacío.
  const pendientesDeCrear = new Map<string, { nombre: string; dni: string }>();
  for (const obra of obras) {
    for (const p of personasDeObra(obra)) {
      const nombre = (p.nombre ?? "").trim();
      if (!nombre || p.personaId || porClave.has(clave(nombre))) continue;
      const previa = pendientesDeCrear.get(clave(nombre));
      const dni = (p.dni ?? "").trim();
      if (!previa) pendientesDeCrear.set(clave(nombre), { nombre, dni });
      else if (!previa.dni && dni) previa.dni = dni;
    }
  }
  for (const [k, datos] of pendientesDeCrear) {
    const ficha = await savePersonaLocal(generateId(), {
      nombre: datos.nombre,
      dni: datos.dni,
      esEmpresa: pareceEmpresa(datos.dni),
    });
    porClave.set(k, ficha.id);
    resumen.fichasNuevas += 1;
  }

  // Fase 2: enlazar. Se reescribe la obra entera con saveObraLocal, que es lo
  // que la marca como pendiente para que el sync la suba.
  for (const obra of obras) {
    const agentes = agentesDeObra(obra) as Record<string, AgentePersona[] | undefined>;
    let cambiada = false;

    const enlazar = (p: AgentePersona): AgentePersona => {
      const nombre = (p.nombre ?? "").trim();
      if (!nombre || p.personaId) return p;
      const id = porClave.get(clave(nombre));
      if (!id) return p;
      cambiada = true;
      return { ...p, personaId: id };
    };

    const nuevosAgentes: Record<string, AgentePersona[] | undefined> = {};
    for (const rol of Object.keys(agentes)) {
      nuevosAgentes[rol] = (agentes[rol] ?? []).map(enlazar);
    }
    const nuevosExtras = (obra.direccionFacultativaExtra ?? []).map((extra) => ({
      ...extra,
      personas: (extra.personas ?? []).map(enlazar),
    }));

    if (!cambiada) continue;
    const { id, createdAt: _c, updatedAt: _u, deletedAt: _d, syncStatus: _s, ...resto } = obra;
    await saveObraLocal(id, {
      ...resto,
      agentes: nuevosAgentes as ObraAgentes,
      direccionFacultativaExtra: nuevosExtras,
    });
    resumen.obrasEnlazadas += 1;
  }

  return resumen;
}

import {
  agentesDeObra,
  direccionFacultativaExtraDeObra,
  type AgentePersona,
  type Obra,
} from "@sigram/shared";
import type { PersonaInput } from "../../api/personas";
import { db, type LocalPersona } from "../db";

export async function listPersonas(): Promise<LocalPersona[]> {
  const all = await db.personas.toArray();
  return all
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
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

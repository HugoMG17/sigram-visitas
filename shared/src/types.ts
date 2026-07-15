// Tipos de dominio compartidos entre client y server.
// Los `id` son UUID generados en el cliente (permiten upsert idempotente al sincronizar).

export type TipoObra = "nueva" | "reforma" | "rehabilitacion" | "ampliacion" | "otro";

export type EstadoObra =
  | "redaccion_proyecto"
  | "tramitacion_licencia"
  | "en_ejecucion"
  | "finalizada"
  | "paralizada";

export type TipoAdjunto = "foto" | "plano" | "documento" | "otro";

export type SyncStatus = "synced" | "pending" | "error";

// Una persona dentro de un rol de la obra (agente de la edificación).
export interface AgentePersona {
  nombre?: string;
  dni?: string;
}

// Los seis roles de la obra. Cada uno admite VARIAS personas.
export type RolAgente =
  | "promotor"
  | "directorObra"
  | "directorEjecucion"
  | "coordinadorSS"
  | "constructor"
  | "proyectista";

// Estructura de roles con varias personas por rol. Se guarda como JSON dentro
// del propio registro de obra (columna `agentes`), que ya se sincroniza como
// una sola fila -- así no hace falta una entidad de sincronización aparte.
export type ObraAgentes = Partial<Record<RolAgente, AgentePersona[]>>;

export interface Obra {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  provincia: string;
  referenciaCatastral?: string;
  // Roles de la obra con varias personas por rol (fuente de verdad actual).
  agentes?: ObraAgentes;
  // Campos escalares de rol PREVIOS a `agentes`: se conservan solo por
  // compatibilidad con obras antiguas que aún no se han reeditado; se leen
  // vía agentesDeObra() como fallback cuando `agentes` no existe todavía.
  // "promotor" guarda el nombre del promotor (columna histórica reutilizada).
  promotor: string;
  promotorContacto?: string;
  promotorDni?: string;
  constructorNombre?: string;
  constructorDni?: string;
  proyectistaNombre?: string;
  proyectistaDni?: string;
  // Dirección Facultativa
  arquitectoNombre?: string;
  arquitectoDni?: string;
  arquitectoTecnicoNombre?: string;
  arquitectoTecnicoDni?: string;
  coordinadorSSNombre?: string;
  coordinadorSSDni?: string;
  tipoObra: TipoObra;
  estado: EstadoObra;
  fechaInicio?: string;
  fechaFinPrevista?: string;
  numeroExpediente?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Visita {
  id: string;
  obraId: string;
  fecha: string;
  titulo?: string;
  notas?: string;
  tiempoAtmosferico?: string;
  asistentes?: string;
  ubicacionGps?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// "sin_estado" = Vacío: el punto no muestra estado (ni en la app ni en el
// PDF); es el valor con el que nace un punto nuevo.
export type EstadoPunto = "sin_estado" | "pendiente" | "solucionado";

export interface Punto {
  id: string;
  visitaId: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoPunto;
  orden: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Adjunto {
  id: string;
  visitaId: string;
  // Si tiene puntoId, la foto/documento pertenece a ese punto concreto de
  // la visita; si no, es un adjunto general de la visita (comportamiento
  // previo a los puntos, se mantiene para compatibilidad).
  puntoId?: string;
  tipo: TipoAdjunto;
  mimeType: string;
  nombreArchivo: string;
  caption?: string;
  orden: number;
  rutaServidor?: string;
  rutaThumbnail?: string;
  driveFileId?: string;
  driveThumbnailId?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export const ESTADO_PUNTO_LABELS: Record<EstadoPunto, string> = {
  sin_estado: "Vacío",
  pendiente: "Pendiente",
  solucionado: "Solucionado",
};

export const TIPO_OBRA_LABELS: Record<TipoObra, string> = {
  nueva: "Obra nueva",
  reforma: "Reforma",
  rehabilitacion: "Rehabilitación",
  ampliacion: "Ampliación",
  otro: "Otro",
};

export const ESTADO_OBRA_LABELS: Record<EstadoObra, string> = {
  redaccion_proyecto: "En redacción de proyecto",
  tramitacion_licencia: "En tramitación de licencia",
  en_ejecucion: "En ejecución",
  finalizada: "Finalizada",
  paralizada: "Paralizada",
};

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// Nombres profesionales de cada rol y su orden de aparición. El objeto se
// recorre en este orden tanto en la app como en el PDF.
export const ROL_AGENTE_LABELS: Record<RolAgente, string> = {
  promotor: "Promotor",
  directorObra: "Director de obra",
  directorEjecucion: "Director de ejecución de obra",
  coordinadorSS: "Coordinador de seguridad y salud en fase de ejecución",
  constructor: "Constructor",
  proyectista: "Proyectista",
};

export const ROLES_AGENTE_ORDEN: RolAgente[] = [
  "promotor",
  "directorObra",
  "directorEjecucion",
  "coordinadorSS",
  "constructor",
  "proyectista",
];

// Devuelve solo las personas que tienen algún nombre (para no pintar filas
// vacías en la app ni en el PDF).
export function personasConNombre(lista: AgentePersona[] | undefined): AgentePersona[] {
  return (lista ?? []).filter((p) => (p.nombre ?? "").trim() !== "");
}

// Accesor SEGURO de un rol dentro de `agentes`. Imprescindible porque uno de
// los roles se llama "constructor": indexar `agentes["constructor"]` cuando
// esa clave no es propia devolvería Object.prototype.constructor (una
// función), no un array. Se comprueba que la clave sea propia antes de leer.
export function personasDeRol(
  agentes: ObraAgentes | undefined,
  rol: RolAgente
): AgentePersona[] {
  if (agentes && Object.prototype.hasOwnProperty.call(agentes, rol)) {
    return agentes[rol] ?? [];
  }
  return [];
}

// Roles de la obra listos para pintar. Si la obra ya tiene `agentes`
// (estructura nueva), se usa tal cual; si no (obra antigua que aún no se ha
// reeditado), se reconstruye desde los campos escalares históricos, cada rol
// como una lista de una sola persona si tenía datos.
export function agentesDeObra(obra: Obra): ObraAgentes {
  if (obra.agentes) return obra.agentes;
  const persona = (nombre?: string, dni?: string): AgentePersona[] =>
    (nombre ?? "").trim() !== "" || (dni ?? "").trim() !== "" ? [{ nombre, dni }] : [];
  return {
    promotor: persona(obra.promotor, obra.promotorDni),
    directorObra: persona(obra.arquitectoNombre, obra.arquitectoDni),
    directorEjecucion: persona(obra.arquitectoTecnicoNombre, obra.arquitectoTecnicoDni),
    coordinadorSS: persona(obra.coordinadorSSNombre, obra.coordinadorSSDni),
    constructor: persona(obra.constructorNombre, obra.constructorDni),
    proyectista: persona(obra.proyectistaNombre, obra.proyectistaDni),
  };
}

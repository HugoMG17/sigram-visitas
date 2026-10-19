import Dexie, { type Table } from "dexie";
import type { Adjunto, Obra, Persona, Punto, SyncStatus, Visita } from "@sigram/shared";

export interface LocalObra extends Obra {
  syncStatus: SyncStatus;
  // Mensaje del último intento fallido, solo presente si syncStatus === "error".
  syncError?: string;
}

export interface LocalVisita extends Visita {
  syncStatus: SyncStatus;
  syncError?: string;
}

export interface LocalPunto extends Punto {
  syncStatus: SyncStatus;
  syncError?: string;
}

export interface LocalAdjunto extends Adjunto {
  syncStatus: SyncStatus;
  syncError?: string;
  // Solo presente mientras el binario no se ha subido al servidor.
  blobLocal?: Blob;
}

export interface LocalPersona extends Persona {
  syncStatus: SyncStatus;
  syncError?: string;
}

export class AppDB extends Dexie {
  obras!: Table<LocalObra, string>;
  visitas!: Table<LocalVisita, string>;
  puntos!: Table<LocalPunto, string>;
  adjuntos!: Table<LocalAdjunto, string>;
  personas!: Table<LocalPersona, string>;

  constructor() {
    super("sigram-visitas");
    this.version(1).stores({
      obras: "id, syncStatus, updatedAt, deletedAt",
      visitas: "id, obraId, syncStatus, updatedAt, fecha, deletedAt",
      adjuntos: "id, visitaId, syncStatus, orden",
    });
    this.version(2).stores({
      obras: "id, syncStatus, updatedAt, deletedAt",
      visitas: "id, obraId, syncStatus, updatedAt, fecha, deletedAt",
      puntos: "id, visitaId, syncStatus, orden, deletedAt",
      adjuntos: "id, visitaId, puntoId, syncStatus, orden",
    });
    // v3: la agenda de personas. Se repiten los stores anteriores tal cual,
    // que es como Dexie entiende "esto sigue igual"; editar un bloque de
    // versión anterior rompería la actualización de los móviles ya instalados.
    //
    // `nombre` no se indexa: IndexedDB no busca por trozo de palabra, así que
    // el filtro del buscador va en JavaScript, como en la lista de obras.
    this.version(3).stores({
      obras: "id, syncStatus, updatedAt, deletedAt",
      visitas: "id, obraId, syncStatus, updatedAt, fecha, deletedAt",
      puntos: "id, visitaId, syncStatus, orden, deletedAt",
      adjuntos: "id, visitaId, puntoId, syncStatus, orden",
      personas: "id, syncStatus, updatedAt, deletedAt",
    });
  }
}

export const db = new AppDB();

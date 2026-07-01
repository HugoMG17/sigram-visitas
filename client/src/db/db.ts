import Dexie, { type Table } from "dexie";
import type { Adjunto, Obra, SyncStatus, Visita } from "@sigram/shared";

export interface LocalObra extends Obra {
  syncStatus: SyncStatus;
  // Mensaje del último intento fallido, solo presente si syncStatus === "error".
  syncError?: string;
}

export interface LocalVisita extends Visita {
  syncStatus: SyncStatus;
  syncError?: string;
}

export interface LocalAdjunto extends Adjunto {
  syncStatus: SyncStatus;
  syncError?: string;
  // Solo presente mientras el binario no se ha subido al servidor.
  blobLocal?: Blob;
}

export class AppDB extends Dexie {
  obras!: Table<LocalObra, string>;
  visitas!: Table<LocalVisita, string>;
  adjuntos!: Table<LocalAdjunto, string>;

  constructor() {
    super("sigram-visitas");
    this.version(1).stores({
      obras: "id, syncStatus, updatedAt, deletedAt",
      visitas: "id, obraId, syncStatus, updatedAt, fecha, deletedAt",
      adjuntos: "id, visitaId, syncStatus, orden",
    });
  }
}

export const db = new AppDB();

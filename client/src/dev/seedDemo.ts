// Datos de muestra SOLO para revisar el diseño en el navegador.
//
// No se usa nunca en la app publicada: se activa únicamente en el servidor de
// desarrollo (`import.meta.env.DEV`) y únicamente si la URL lleva `?seed=demo`.
// En la compilación de produccion la condicion es constante y falsa, asi que
// todo este modulo desaparece del paquete final.
//
// Sirve para que el inspector de diseño (que abre un Chrome limpio, con la
// base de datos vacía) vea las pantallas con contenido realista.
import { db } from "../db/db";

const FECHA = "2026-10-14T08:00:00.000Z";

export async function seedDemoSiSePide(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (!new URLSearchParams(window.location.search).has("seed")) return;

  await Promise.all([db.obras.clear(), db.visitas.clear(), db.puntos.clear(), db.adjuntos.clear()]);

  const comun = {
    tipoObra: "reforma" as const,
    provincia: "Cáceres",
    createdAt: FECHA,
    updatedAt: FECHA,
    deletedAt: null,
    syncStatus: "synced" as const,
  };

  await db.obras.bulkPut([
    {
      ...comun,
      id: "o1",
      numeroExpediente: "2026-014",
      nombre: "REFORMA DE VIVIENDA UNIFAMILIAR Y PISCINA",
      direccion: "Calle Gil Cordero 18",
      municipio: "Cáceres",
      promotor: "María Jesús Pizarro Hurtado",
      estado: "en_ejecucion",
    },
    {
      ...comun,
      id: "o2",
      numeroExpediente: "2026-009",
      nombre: "EDIFICIO DE 12 VIVIENDAS EN AVENIDA DE ESPAÑA",
      direccion: "Avenida de España 44",
      municipio: "Cáceres",
      promotor: "Promociones Norba S.L.",
      estado: "en_ejecucion",
    },
    {
      ...comun,
      id: "o3",
      numeroExpediente: "2026-022",
      nombre: "NAVE INDUSTRIAL EN EL POLÍGONO LAS CAPELLANÍAS",
      direccion: "Parcela 118, Polígono Las Capellanías",
      municipio: "Cáceres",
      promotor: "Talleres Monfragüe S.L.",
      estado: "tramitacion_licencia",
      syncStatus: "pending",
    },
    {
      ...comun,
      id: "o4",
      numeroExpediente: "2025-187",
      nombre: "REHABILITACIÓN DE CUBIERTA EN LA CASA DE LOS OVANDO",
      direccion: "Plaza de San Mateo 3",
      municipio: "Cáceres",
      promotor: "Comunidad de Propietarios San Mateo 3",
      estado: "paralizada",
    },
    {
      ...comun,
      id: "o5",
      numeroExpediente: "2025-203",
      nombre: "ADECUACIÓN DE LOCAL PARA CAFETERÍA",
      direccion: "Calle Pintores 27",
      municipio: "Cáceres",
      promotor: "Lucía Benítez Tovar",
      estado: "finalizada",
    },
    {
      ...comun,
      id: "o6",
      numeroExpediente: "2026-031",
      nombre: "VIVIENDA UNIFAMILIAR AISLADA EN SIERRA DE FUENTES",
      direccion: "Camino de la Dehesa 7",
      municipio: "Sierra de Fuentes",
      promotor: "Álvaro Rey Cordero",
      estado: "redaccion_proyecto",
    },
  ]);

  await db.visitas.bulkPut([
    {
      id: "v1",
      obraId: "o1",
      fecha: "2026-10-14T09:30:00.000Z",
      titulo: "Replanteo del vaso de la piscina",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "pending",
    },
    {
      id: "v2",
      obraId: "o1",
      fecha: "2026-09-30T09:00:00.000Z",
      titulo: "Tabiquería y pasos de instalaciones",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
    {
      id: "v3",
      obraId: "o1",
      fecha: "2026-09-16T08:45:00.000Z",
      titulo: "Forjado de la planta primera",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
    {
      id: "v4",
      obraId: "o1",
      fecha: "2026-09-02T09:15:00.000Z",
      titulo: "Armado de pilares y estructura",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
    {
      id: "v5",
      obraId: "o2",
      fecha: "2026-10-07T10:00:00.000Z",
      titulo: "Saneamiento enterrado",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
  ]);

  await db.puntos.bulkPut([
    { id: "p1", visitaId: "v1", titulo: "Armado del vaso de la piscina", estado: "pendiente", orden: 0 },
    { id: "p2", visitaId: "v1", titulo: "Impermeabilización del muro de contención", estado: "pendiente", orden: 1 },
    { id: "p3", visitaId: "v1", titulo: "Acometida del cuarto de depuradora", estado: "solucionado", orden: 2 },
    { id: "p4", visitaId: "v2", titulo: "Pasos de instalaciones en tabiquería", estado: "pendiente", orden: 0 },
    { id: "p5", visitaId: "v2", titulo: "Replanteo de huecos de carpintería", estado: "solucionado", orden: 1 },
    { id: "p6", visitaId: "v3", titulo: "Juntas de hormigonado", estado: "solucionado", orden: 0 },
  ].map((p) => ({
    ...p,
    estado: p.estado as "pendiente" | "solucionado",
    descripcion: "",
    createdAt: FECHA,
    updatedAt: FECHA,
    deletedAt: null,
    syncStatus: "synced" as const,
  })));
}

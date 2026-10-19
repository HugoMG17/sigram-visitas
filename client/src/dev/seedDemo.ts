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

// Los identificadores son UUID de verdad, no "o1"/"v1": el servidor valida el
// formato y rechazaba los inventados con un 400, que salía en pantalla como
// un fallo de sincronización y despistaba al revisar el diseño.

export async function seedDemoSiSePide(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (!new URLSearchParams(window.location.search).has("seed")) return;

  await Promise.all([
    db.personas.clear(),
    db.musaat.clear(),
    db.obras.clear(),
    db.visitas.clear(),
    db.puntos.clear(),
    db.adjuntos.clear(),
  ]);

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
      id: "0b4a0000-0000-4000-8000-000000000001",
      // Pendiente igual que su visita: si la obra no estuviera por subir, la
      // visita se enviaria sola y el servidor la rechazaria por no encontrar
      // la obra padre.
      syncStatus: "pending",
      numeroExpediente: "2026-014",
      nombre: "REFORMA DE VIVIENDA UNIFAMILIAR Y PISCINA",
      direccion: "Calle Gil Cordero 18",
      municipio: "Cáceres",
      promotor: "María Jesús Pizarro Hurtado",
      estado: "en_ejecucion",
    },
    {
      ...comun,
      id: "0b4a0000-0000-4000-8000-000000000002",
      numeroExpediente: "2026-009",
      nombre: "EDIFICIO DE 12 VIVIENDAS EN AVENIDA DE ESPAÑA",
      direccion: "Avenida de España 44",
      municipio: "Cáceres",
      promotor: "Promociones Norba S.L.",
      estado: "en_ejecucion",
    },
    {
      ...comun,
      id: "0b4a0000-0000-4000-8000-000000000003",
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
      id: "0b4a0000-0000-4000-8000-000000000004",
      numeroExpediente: "2025-187",
      nombre: "REHABILITACIÓN DE CUBIERTA EN LA CASA DE LOS OVANDO",
      direccion: "Plaza de San Mateo 3",
      municipio: "Cáceres",
      promotor: "Comunidad de Propietarios San Mateo 3",
      estado: "paralizada",
    },
    {
      ...comun,
      id: "0b4a0000-0000-4000-8000-000000000005",
      numeroExpediente: "2025-203",
      nombre: "ADECUACIÓN DE LOCAL PARA CAFETERÍA",
      direccion: "Calle Pintores 27",
      municipio: "Cáceres",
      promotor: "Lucía Benítez Tovar",
      estado: "finalizada",
    },
    {
      ...comun,
      id: "0b4a0000-0000-4000-8000-000000000006",
      numeroExpediente: "2026-031",
      nombre: "VIVIENDA UNIFAMILIAR AISLADA EN SIERRA DE FUENTES",
      direccion: "Camino de la Dehesa 7",
      municipio: "Sierra de Fuentes",
      promotor: "Álvaro Rey Cordero",
      estado: "redaccion_proyecto",
    },
  ]);

  // Fichas de la agenda. A proposito NO se enlazan con las obras: asi se
  // puede probar tanto el buscador del formulario como el importador.
  await db.personas.bulkPut(
    [
      {
        id: "c0a10000-0000-4000-8000-000000000001",
        nombre: "María Jesús Pizarro Hurtado",
        dni: "76123456Z",
        esEmpresa: false,
      },
      {
        id: "c0a10000-0000-4000-8000-000000000002",
        nombre: "Promociones Norba S.L.",
        dni: "B10234567",
        esEmpresa: true,
      },
      {
        id: "c0a10000-0000-4000-8000-000000000003",
        nombre: "Hugo Martín Gabriel",
        dni: "44987654Q",
        esEmpresa: false,
      },
      {
        id: "c0a10000-0000-4000-8000-000000000004",
        nombre: "Talleres Monfragüe S.L.",
        dni: "B10987654",
        esEmpresa: true,
      },
      {
        id: "c0a10000-0000-4000-8000-000000000005",
        nombre: "Lucía Benítez Tovar",
        dni: "28112233D",
        esEmpresa: false,
      },
      {
        id: "c0a10000-0000-4000-8000-000000000006",
        nombre: "Álvaro Rey Cordero",
        dni: "",
        esEmpresa: false,
      },
    ].map((f) => ({
      ...f,
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced" as const,
    }))
  );

  // Registro de Musaat: uno verde (todo resuelto), uno naranja (algo enviado
  // y algo pendiente), uno rojo (nada) y una obra que NO está en Musaat, para
  // ver el punto rojo también en la lista de obras.
  await db.musaat.bulkPut(
    [
      {
        id: "3a5a0000-0000-4000-8000-000000000001",
        numeroExpediente: "2026-014",
        nombre: "REFORMA DE VIVIENDA UNIFAMILIAR Y PISCINA",
        intervenciones: {
          proyecto: { estado: "no_procede" as const },
          estudioSeguridad: { estado: "no_procede" as const },
          direccionObra: { estado: "no_procede" as const },
          direccionAparejador: { estado: "enviado" as const, fechaEnvio: "2026-02-10" },
          coordinacion: { estado: "enviado" as const, fechaEnvio: "2026-02-10" },
        },
      },
      {
        id: "3a5a0000-0000-4000-8000-000000000002",
        numeroExpediente: "2026-009",
        nombre: "EDIFICIO DE 12 VIVIENDAS EN AVENIDA DE ESPAÑA",
        intervenciones: {
          proyecto: { estado: "enviado" as const, fechaEnvio: "2026-01-15" },
          estudioSeguridad: { estado: "enviado" as const, fechaEnvio: "2026-01-15" },
          direccionObra: { estado: "pendiente" as const },
          direccionAparejador: { estado: "pendiente" as const },
          coordinacion: { estado: "pendiente" as const },
        },
      },
      {
        id: "3a5a0000-0000-4000-8000-000000000003",
        numeroExpediente: "2026-022",
        nombre: "NAVE INDUSTRIAL EN EL POLÍGONO LAS CAPELLANÍAS",
        intervenciones: {},
      },
    ].map((r) => ({
      ...r,
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced" as const,
    }))
  );

  await db.visitas.bulkPut([
    {
      id: "71510000-0000-4000-8000-000000000001",
      obraId: "0b4a0000-0000-4000-8000-000000000001",
      fecha: "2026-10-14T09:30:00.000Z",
      titulo: "Replanteo del vaso de la piscina",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "pending",
    },
    {
      id: "71510000-0000-4000-8000-000000000002",
      obraId: "0b4a0000-0000-4000-8000-000000000001",
      fecha: "2026-09-30T09:00:00.000Z",
      titulo: "Tabiquería y pasos de instalaciones",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
    {
      id: "71510000-0000-4000-8000-000000000003",
      obraId: "0b4a0000-0000-4000-8000-000000000001",
      fecha: "2026-09-16T08:45:00.000Z",
      titulo: "Forjado de la planta primera",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
    {
      id: "71510000-0000-4000-8000-000000000004",
      obraId: "0b4a0000-0000-4000-8000-000000000001",
      fecha: "2026-09-02T09:15:00.000Z",
      titulo: "Armado de pilares y estructura",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
    {
      id: "71510000-0000-4000-8000-000000000005",
      obraId: "0b4a0000-0000-4000-8000-000000000002",
      fecha: "2026-10-07T10:00:00.000Z",
      titulo: "Saneamiento enterrado",
      notas: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced",
    },
  ]);

  await db.puntos.bulkPut(
    [
      {
        id: "90410000-0000-4000-8000-000000000001",
        visitaId: "71510000-0000-4000-8000-000000000001",
        titulo: "Armado del vaso de la piscina",
        estado: "pendiente",
        orden: 0,
      },
      {
        id: "90410000-0000-4000-8000-000000000002",
        visitaId: "71510000-0000-4000-8000-000000000001",
        titulo: "Impermeabilización del muro de contención",
        estado: "pendiente",
        orden: 1,
      },
      {
        id: "90410000-0000-4000-8000-000000000003",
        visitaId: "71510000-0000-4000-8000-000000000001",
        titulo: "Acometida del cuarto de depuradora",
        estado: "solucionado",
        orden: 2,
      },
      {
        id: "90410000-0000-4000-8000-000000000004",
        visitaId: "71510000-0000-4000-8000-000000000002",
        titulo: "Pasos de instalaciones en tabiquería",
        estado: "pendiente",
        orden: 0,
      },
      {
        id: "90410000-0000-4000-8000-000000000005",
        visitaId: "71510000-0000-4000-8000-000000000002",
        titulo: "Replanteo de huecos de carpintería",
        estado: "solucionado",
        orden: 1,
      },
      {
        id: "90410000-0000-4000-8000-000000000006",
        visitaId: "71510000-0000-4000-8000-000000000003",
        titulo: "Juntas de hormigonado",
        estado: "solucionado",
        orden: 0,
      },
    ].map((p) => ({
      ...p,
      estado: p.estado as "pendiente" | "solucionado",
      descripcion: "",
      createdAt: FECHA,
      updatedAt: FECHA,
      deletedAt: null,
      syncStatus: "synced" as const,
    }))
  );
}

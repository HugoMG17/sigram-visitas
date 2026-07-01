# SIGRAM VISITAS

App para gestionar obras y visitas de obra (fotos, notas, adjuntos) con exportación de informes en PDF. Funciona offline en el móvil durante la visita y sincroniza al recuperar conexión.

## Arranque en desarrollo

```
npm install
npm run dev
```

Esto levanta el servidor en `http://localhost:4000` y el cliente en `http://localhost:5173`.

En Windows también puedes usar `scripts\iniciar-servidor.bat` (doble clic) para instalar dependencias y arrancar todo.

## Acceso desde el móvil (misma wifi)

1. Averigua la IP local de tu PC: `ipconfig` (busca la IPv4 de tu red wifi/ethernet).
2. Desde el móvil, abre `http://<IP-DE-TU-PC>:5173` en Chrome.
3. Usa "Añadir a pantalla de inicio" para instalarla como PWA.

**Importante**: el modo desarrollo (`npm run dev`) no activa el Service Worker, así que el offline real solo funciona con un build de producción:

```
npm run build -w client
npm run preview -w client -- --host
```

Esto sirve la app ya con Service Worker activo en `http://localhost:4173` (y accesible desde el móvil por IP igual que en desarrollo).

## Estructura

- `client/` — PWA (Vite + React + TypeScript), con Dexie/IndexedDB para almacenamiento offline y sincronización con el servidor
- `server/` — API local (Express + SQLite vía libSQL), generación de PDF con Puppeteer
- `shared/` — tipos TypeScript compartidos

## Estado del proyecto

Completo: gestión de obras y visitas, fotos y documentos adjuntos, exportación de informe de visita a PDF, modo offline (Dexie) con sincronización automática al recuperar conexión, y PWA instalable.

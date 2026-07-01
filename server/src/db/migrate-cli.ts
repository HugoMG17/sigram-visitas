// Punto de entrada para `npm run db:migrate`. Separado de migrate.ts a
// propósito: si el auto-arranque viviera en migrate.ts, al empaquetar el
// servidor con esbuild en un único archivo se dispararía también al arrancar
// normalmente (esbuild comparte import.meta.url entre módulos combinados).
import { ensureSchema } from "./migrate.js";

ensureSchema()
  .then(() => {
    console.log("Esquema listo.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

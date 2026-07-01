import fs from "node:fs";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./env.js";
import { ensureSchema } from "./db/migrate.js";
import { obrasRouter } from "./routes/obras.routes.js";
import { visitasRouter } from "./routes/visitas.routes.js";
import { adjuntosRouter } from "./routes/adjuntos.routes.js";
import { pdfRouter } from "./routes/pdf.routes.js";
import { closeBrowser } from "./services/pdfService.js";

fs.mkdirSync(env.uploadsDir, { recursive: true });

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(env.uploadsDir));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/obras", obrasRouter);
app.use("/api", visitasRouter);
app.use("/api", adjuntosRouter);
app.use("/api", pdfRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    console.error(`Validación fallida en ${_req.method} ${_req.originalUrl}:`, err.issues);
    res.status(400).json({ error: "Datos inválidos", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};
app.use(errorHandler);

async function main() {
  await ensureSchema();
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`SIGRAM VISITAS server escuchando en http://0.0.0.0:${env.port}`);
  });
}

main().catch((err) => {
  console.error("No se pudo arrancar el servidor:", err);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    closeBrowser().finally(() => process.exit(0));
  });
}

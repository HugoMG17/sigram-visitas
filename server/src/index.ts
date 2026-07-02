import fs from "node:fs";
import path from "node:path";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { ZodError } from "zod";
import { env } from "./env.js";
import { ensureSchema } from "./db/migrate.js";
import { configurePassport } from "./auth/passport.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { authRouter } from "./routes/auth.routes.js";
import { obrasRouter } from "./routes/obras.routes.js";
import { visitasRouter } from "./routes/visitas.routes.js";
import { adjuntosRouter } from "./routes/adjuntos.routes.js";
import { pdfRouter } from "./routes/pdf.routes.js";
import { closeBrowser } from "./services/pdfService.js";

fs.mkdirSync(env.uploadsDir, { recursive: true });

const app = express();

app.use(cors());
app.use(express.json());

if (env.authEnabled) {
  configurePassport();
  // Render (y cualquier hosting con proxy TLS) termina el HTTPS en el proxy y
  // habla HTTP con la app; sin esto, express-session cree que la conexión es
  // insegura y se niega a fijar la cookie "secure".
  if (env.cookieSecure) app.set("trust proxy", 1);
  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
} else {
  console.log("Login con Google no configurado: la app funciona sin login (modo local/dev).");
}

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

app.use(authRouter);
app.use(requireAuth);

app.use("/uploads", express.static(env.uploadsDir));
app.use("/api/obras", obrasRouter);
app.use("/api", visitasRouter);
app.use("/api", adjuntosRouter);
app.use("/api", pdfRouter);

// En producción el cliente se sirve desde este mismo servidor (una sola URL,
// necesario para desplegar en un hosting con una única web service). En
// desarrollo local no existe client/dist y esto simplemente no hace nada.
const clientDist = path.resolve(env.rootDir, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

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

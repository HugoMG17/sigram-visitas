import "dotenv/config";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

export const env = {
  port: Number(process.env.SIGRAM_SERVER_PORT ?? 4000),
  dbPath: path.resolve(rootDir, process.env.DB_PATH ?? "./data/sigram.db"),
  uploadsDir: path.resolve(rootDir, process.env.UPLOADS_DIR ?? "./uploads"),
};

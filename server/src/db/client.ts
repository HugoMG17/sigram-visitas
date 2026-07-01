import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../env.js";
import * as schema from "./schema.js";

fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

export const sqlClient = createClient({ url: `file:${env.dbPath}` });

export const db = drizzle(sqlClient, { schema });

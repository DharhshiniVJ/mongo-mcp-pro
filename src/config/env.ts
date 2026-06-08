import { z } from "zod";
import { config } from "dotenv";
import type { AppConfig } from "../types/index.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "../../.env"), quiet: true });


const envSchema = z.object({
  MONGO_URI: z.string().url(),
  DB_NAME: z.string().min(1),
  ROLE: z.enum(["reader", "writer", "admin"]).default("reader"),
  SESSION_ID: z.string().min(1).default("dev-session"),
  LOG_LEVEL: z.enum(["info", "debug", "error"]).default("info"),
  AUDIT_LOG_PATH: z.string().min(1).default("logs/audit.jsonl"),
});

const parsed = envSchema.parse(process.env);

export const appConfig: AppConfig = {
  mongoUri: parsed.MONGO_URI,
  dbName: parsed.DB_NAME,
  role: parsed.ROLE,
  sessionId: parsed.SESSION_ID,
  logLevel: parsed.LOG_LEVEL,
  auditLogPath: parsed.AUDIT_LOG_PATH,
};

import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "yaml";
import type { AppConfig } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const yamlPath = join(__dirname, "../../environments.yaml");
const yamlContent = readFileSync(yamlPath, "utf8");
const parsedYaml = parse(yamlContent);

const envSchema = z.object({
  mongoUri: z.string().url(),
  dbName: z.string().min(1),
  dbMode: z.enum(["restricted", "unrestricted"]).default("restricted"),
});

const configSchema = z.object({
  default: z.string().min(1),
  environments: z.record(z.string(), envSchema),
  sessionId: z.string().min(1).default("dev-session"),
  logLevel: z.enum(["info", "debug", "error"]).default("info"),
  auditLogPath: z.string().min(1).default("logs/audit.jsonl"),
});

const validated = configSchema.parse(parsedYaml);

export const appConfig: AppConfig = {
  default: validated.default,
  environments: validated.environments,
  sessionId: validated.sessionId,
  logLevel: validated.logLevel,
  auditLogPath: validated.auditLogPath,
};

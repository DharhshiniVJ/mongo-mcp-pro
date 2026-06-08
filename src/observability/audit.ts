import { appendFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { appConfig } from "../config/env.js";
import { logger } from "./logger.js";
import type { AuditEntry } from "../types/index.js";
export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const dir = dirname(appConfig.auditLogPath);
    await mkdir(dir, { recursive: true });
    await appendFile(appConfig.auditLogPath, JSON.stringify(entry) + "\n");
  } catch (err) {
    logger.error("Failed to write audit entry", err);
  }
}
import { appConfig } from "../config/env.js";
import type { LogLevel } from "../types/index.js";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  error: 2,
};
function log(level: LogLevel, message: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[appConfig.logLevel]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined && { data }),
  };

  process.stderr.write(JSON.stringify(entry) + "\n");
}
export const logger = {
  info: (message: string, data?: unknown) => log("info", message, data),
  debug: (message: string, data?: unknown) => log("debug", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
};

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../config/db.js";
import { appConfig } from "../config/env.js";
import { runPipeline } from "./index.js";

const ALLOWED_READ_COMMANDS = [
  "find",
  "count",
  "aggregate",
  "distinct",
  "listcollections",
  "listindexes",
  "collstats",
  "dbstats"
];

const ALLOWED_WRITE_COMMANDS = [
  "insert",
  "update",
  "create",
  "createindexes"
];

const BLOCKED_TERMS = [
  "delete",
  "drop",
  "dropdatabase",
  "dropindexes",
  "remove",
  "truncate",
  "eval",
  "copydb",
  "renamecollection",
  "shutdown",
  "applyops"
];

export function isCommandSafe(command: Record<string, unknown>): { safe: boolean; reason?: string } {
  const keys = Object.keys(command);
  if (keys.length === 0) {
    return { safe: false, reason: "Empty command object" };
  }

  const primaryCmd = keys[0].toLowerCase();

  // 1. Check if the primary command itself is explicitly blocked
  if (BLOCKED_TERMS.includes(primaryCmd)) {
    return { safe: false, reason: `Command '${primaryCmd}' is dangerous and not allowed` };
  }

  // 2. Recursively check all keys and values for blocked terms to prevent nested injection/bypasses
  const checkObject = (obj: unknown): string | null => {
    if (typeof obj !== "object" || obj === null) return null;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = checkObject(item);
        if (result) return result;
      }
      return null;
    }

    const rec = obj as Record<string, unknown>;
    for (const key of Object.keys(rec)) {
      const lowerKey = key.toLowerCase();
      for (const term of BLOCKED_TERMS) {
        if (lowerKey === term || lowerKey.includes(term)) {
          return term;
        }
      }

      const val = rec[key];
      if (typeof val === "string") {
        const lowerVal = val.toLowerCase();
        for (const term of BLOCKED_TERMS) {
          if (lowerVal === term || lowerVal.includes(term)) {
            return term;
          }
        }
      }

      const nestedResult = checkObject(val);
      if (nestedResult) return nestedResult;
    }

    return null;
  };

  const blockedFound = checkObject(command);
  if (blockedFound) {
    return { safe: false, reason: `Query contains dangerous term or command parameter: '${blockedFound}'` };
  }

  return { safe: true };
}

export function registerQuery(server: McpServer): void {
  server.tool(
    "query",
    "Execute a raw MongoDB command. Destructive actions (delete, drop, truncate, remove, etc.) are strictly prohibited.",
    {
      command: z.record(z.string(), z.unknown()),
      environment: z.string().optional(),
    },
    async (args) => {
      const commandObj = args.command as Record<string, unknown>;
      const keys = Object.keys(commandObj);
      
      if (keys.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: "Empty command" }, null, 2) }],
        };
      }

      const envName = args.environment ?? appConfig.default;
      const envConfig = appConfig.environments[envName];
      if (!envConfig) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Environment '${envName}' is not defined` }, null, 2) }],
        };
      }

      const primaryCmd = keys[0].toLowerCase();
      const primaryValue = commandObj[keys[0]];
      const collectionName = typeof primaryValue === "string" ? primaryValue : "_none";

      // 1. Firewall/Safety checks: filter out dangerous queries like delete, drop, truncate, etc.
      const safety = isCommandSafe(commandObj);
      if (!safety.safe) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              blocked: true,
              blockReason: safety.reason,
            }, null, 2),
          }],
        };
      }

      // 2. Database Mode Enforcement:
      // Restricted mode only allows read operations
      if (envConfig.dbMode === "restricted" && !ALLOWED_READ_COMMANDS.includes(primaryCmd)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              blocked: true,
              blockReason: `Command '${primaryCmd}' is write/administrative and not permitted in restricted (read-only) mode.`,
            }, null, 2),
          }],
        };
      }

      // Unrestricted mode allows read + write commands but no delete/drop
      const allowedInUnrestricted = [...ALLOWED_READ_COMMANDS, ...ALLOWED_WRITE_COMMANDS];
      if (envConfig.dbMode === "unrestricted" && !allowedInUnrestricted.includes(primaryCmd)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              blocked: true,
              blockReason: `Command '${primaryCmd}' is not permitted.`,
            }, null, 2),
          }],
        };
      }

      const result = await runPipeline(
        {
          operation: primaryCmd,
          database: envConfig.dbName,
          collection: collectionName,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
          filter: commandObj.filter as Record<string, unknown> | undefined,
        },
        async () => {
          const db = await getDbForEnv(envName);
          const res = await db.command(args.command);
          return {
            success: true,
            data: [res],
            message: `Command '${primaryCmd}' executed successfully`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

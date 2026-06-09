import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerFindOne(server: McpServer): void {
  server.tool(
    "find_one",
    "Find a single document in a collection matching a filter",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()).optional(),
      environment: z.string().optional(),
    },
    async (args) => {
      const envName = args.environment ?? appConfig.default;
      const envConfig = appConfig.environments[envName];
      if (!envConfig) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Environment '${envName}' is not defined` }, null, 2) }],
        };
      }

      const result = await runPipeline(
        {
          operation: "find_one",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
          filter: args.filter as Record<string, unknown> | undefined,
        },
        async () => {
          const db = await getDbForEnv(envName);
          const col = db.collection(args.collection);
          const document = await col.findOne(args.filter ?? {});

          return {
            success: true,
            data: document ? [document] : [],
            count: document ? 1 : 0,
            message: document ? "Document found" : "No document matched the filter",
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
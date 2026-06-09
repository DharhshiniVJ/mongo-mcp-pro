import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerCollectionStats(server: McpServer): void {
  server.tool(
    "collection_stats",
    "Get statistics for a collection including document count and storage size",
    {
      collection: z.string().min(1),
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
          operation: "collection_stats",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
        },
        async () => {
          const db = await getDbForEnv(envName);
          const stats = await db.command({
            collStats: args.collection,
          });

          return {
            success: true,
            data: [stats],
            count: stats.count,
            message: `Retrieved stats for collection '${args.collection}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
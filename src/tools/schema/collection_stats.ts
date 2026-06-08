import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerCollectionStats(server: McpServer): void {
  server.tool(
    "collection_stats",
    "Get statistics for a collection including document count and storage size",
    {
      collection: z.string().min(1),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "collection_stats",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
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
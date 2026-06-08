import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerDeleteOne(server: McpServer): void {
  server.tool(
    "delete_one",
    "Delete a single document from a collection matching a filter",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "delete_one",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          filter: args.filter as Record<string, unknown>,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const res = await col.deleteOne(args.filter);

          return {
            success: true,
            count: res.deletedCount,
            message: `Deleted ${res.deletedCount} document(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
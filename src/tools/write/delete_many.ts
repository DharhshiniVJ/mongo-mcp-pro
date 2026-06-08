import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerDeleteMany(server: McpServer): void {
  server.tool(
    "delete_many",
    "Delete multiple documents from a collection matching a filter",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()),
      confirm: z.boolean(),
    },
    async (args) => {
      if (!args.confirm) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "delete_many requires confirm: true to proceed",
            }, null, 2),
          }],
        };
      }

      const result = await runPipeline(
        {
          operation: "delete_many",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          filter: args.filter as Record<string, unknown>,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const res = await col.deleteMany(args.filter);

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
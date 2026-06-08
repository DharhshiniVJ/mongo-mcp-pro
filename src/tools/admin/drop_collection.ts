import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { invalidateSchema } from "../../schema/registry.js";
import { runPipeline } from "../index.js";

export function registerDropCollection(server: McpServer): void {
  server.tool(
    "drop_collection",
    "Drop an entire collection and all its documents",
    {
      collection: z.string().min(1),
      confirm: z.boolean(),
    },
    async (args) => {
      if (!args.confirm) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "drop_collection requires confirm: true to proceed",
            }, null, 2),
          }],
        };
      }

      const result = await runPipeline(
        {
          operation: "drop_collection",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          await db.dropCollection(args.collection);

          invalidateSchema(appConfig.dbName, args.collection);

          return {
            success: true,
            count: 1,
            message: `Dropped collection '${args.collection}' and all its documents`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
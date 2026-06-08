import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerDropIndex(server: McpServer): void {
  server.tool(
    "drop_index",
    "Drop an index from a collection by name",
    {
      collection: z.string().min(1),
      indexName: z.string().min(1),
      confirm: z.boolean(),
    },
    async (args) => {
      if (!args.confirm) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "drop_index requires confirm: true to proceed",
            }, null, 2),
          }],
        };
      }

      const result = await runPipeline(
        {
          operation: "drop_index",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          await col.dropIndex(args.indexName);

          return {
            success: true,
            count: 1,
            message: `Dropped index '${args.indexName}' from '${args.collection}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerCreateIndex(server: McpServer): void {
  server.tool(
    "create_index",
    "Create an index on a collection",
    {
      collection: z.string().min(1),
      keys: z.record(z.string(), z.number()),
      options: z.object({
        unique: z.boolean().optional(),
        sparse: z.boolean().optional(),
        name: z.string().optional(),
      }).optional(),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "create_index",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const indexName = await col.createIndex(args.keys, args.options ?? {});

          return {
            success: true,
            count: 1,
            message: `Created index '${indexName}' on '${args.collection}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerListIndexes(server: McpServer): void {
  server.tool(
    "list_indexes",
    "List all indexes on a collection",
    {
      collection: z.string().min(1),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "list_indexes",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const indexes = await col.indexes();

          return {
            success: true,
            data: indexes,
            count: indexes.length,
            message: `Found ${indexes.length} index(es) on '${args.collection}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
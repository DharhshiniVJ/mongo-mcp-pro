import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerCount(server: McpServer): void {
  server.tool(
    "count",
    "Count documents in a collection matching an optional filter",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()).optional(),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "count",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          filter: args.filter as Record<string, unknown> | undefined,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const count = await col.countDocuments(args.filter ?? {});

          return {
            success: true,
            count,
            message: `${count} document(s) match the filter`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
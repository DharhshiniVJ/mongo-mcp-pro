import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerDistinct(server: McpServer): void {
  server.tool(
    "distinct",
    "Get distinct values for a field in a collection",
    {
      collection: z.string().min(1),
      field: z.string().min(1),
      filter: z.record(z.string(), z.unknown()).optional(),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "distinct",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          filter: args.filter as Record<string, unknown> | undefined,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const values = await col.distinct(args.field, args.filter ?? {});

          return {
            success: true,
            data: values,
            count: values.length,
            message: `Found ${values.length} distinct value(s) for field '${args.field}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
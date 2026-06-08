import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { invalidateSchema } from "../../schema/registry.js";
import { runPipeline } from "../index.js";

export function registerInsertMany(server: McpServer): void {
  server.tool(
    "insert_many",
    "Insert multiple documents into a collection",
    {
      collection: z.string().min(1),
      documents: z.array(z.record(z.string(), z.unknown())).min(1).max(100),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "insert_many",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          documents: args.documents as Record<string, unknown>[],
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const res = await col.insertMany(args.documents);

          invalidateSchema(appConfig.dbName, args.collection);

          return {
            success: true,
            count: res.insertedCount,
            message: `Inserted ${res.insertedCount} document(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
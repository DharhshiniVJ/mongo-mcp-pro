import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { invalidateSchema } from "../../schema/registry.js";
import { runPipeline } from "../index.js";

export function registerInsertOne(server: McpServer): void {
  server.tool(
    "insert_one",
    "Insert a single document into a collection",
    {
      collection: z.string().min(1),
      document: z.record(z.string(), z.unknown()),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "insert_one",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          document: args.document as Record<string, unknown>,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const res = await col.insertOne(args.document);

          invalidateSchema(appConfig.dbName, args.collection);

          return {
            success: true,
            count: 1,
            message: `Inserted document with id ${res.insertedId}`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
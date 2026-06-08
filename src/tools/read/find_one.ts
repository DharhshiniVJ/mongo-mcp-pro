import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerFindOne(server: McpServer): void {
  server.tool(
    "find_one",
    "Find a single document in a collection matching a filter",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()).optional(),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "find_one",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
          filter: args.filter as Record<string, unknown> | undefined,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const document = await col.findOne(args.filter ?? {});

          return {
            success: true,
            data: document ? [document] : [],
            count: document ? 1 : 0,
            message: document ? "Document found" : "No document matched the filter",
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerCreateCollection(server: McpServer): void {
  server.tool(
    "create_collection",
    "Create a new collection in the database",
    {
      collection: z.string().min(1),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "create_collection",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          await db.createCollection(args.collection);

          return {
            success: true,
            count: 1,
            message: `Created collection '${args.collection}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
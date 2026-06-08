import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerListCollections(server: McpServer): void {
  server.tool(
    "list_collections",
    "List all collections in the database",
    {},
    async () => {
      const result = await runPipeline(
        {
          operation: "list_collections",
          database: appConfig.dbName,
          collection: "_none",
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          const collections = await db.listCollections().toArray();
          const names = collections.map(c => c.name);

          return {
            success: true,
            data: names,
            count: names.length,
            message: `Found ${names.length} collection(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
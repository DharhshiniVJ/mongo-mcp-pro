import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerAggregate(server: McpServer): void {
  server.tool(
    "aggregate",
    "Run an aggregation pipeline on a collection",
    {
      collection: z.string().min(1),
      pipeline: z.array(z.record(z.string(), z.unknown())),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "aggregate",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const db = await getDb();
          const col = db.collection(args.collection);
          const documents = await col
            .aggregate(args.pipeline)
            .toArray();

          return {
            success: true,
            data: documents,
            count: documents.length,
            message: `Aggregation returned ${documents.length} document(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerAggregate(server: McpServer): void {
  server.tool(
    "aggregate",
    "Run an aggregation pipeline on a collection",
    {
      collection: z.string().min(1),
      pipeline: z.array(z.record(z.string(), z.unknown())),
      environment: z.string().optional(),
    },
    async (args) => {
      const envName = args.environment ?? appConfig.default;
      const envConfig = appConfig.environments[envName];
      if (!envConfig) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Environment '${envName}' is not defined` }, null, 2) }],
        };
      }

      const result = await runPipeline(
        {
          operation: "aggregate",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
        },
        async () => {
          const db = await getDbForEnv(envName);
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
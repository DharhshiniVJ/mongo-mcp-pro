import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerUpdateOne(server: McpServer): void {
  server.tool(
    "update_one",
    "Update a single document in a collection",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()),
      update: z.record(z.string(), z.unknown()),
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
          operation: "update_one",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
          filter: args.filter as Record<string, unknown>,
          update: args.update as Record<string, unknown>,
        },
        async () => {
          const db = await getDbForEnv(envName);
          const col = db.collection(args.collection);
          const res = await col.updateOne(args.filter, args.update);

          return {
            success: true,
            count: res.modifiedCount,
            message: `Matched ${res.matchedCount} document(s), modified ${res.modifiedCount}`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
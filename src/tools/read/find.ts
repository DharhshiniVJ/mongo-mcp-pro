import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerFind(server: McpServer): void {
  server.tool(
    "find",
    "Find documents in a collection with an optional filter",
    {
      collection: z.string().min(1),
      filter: z.record(z.string(), z.unknown()).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      skip: z.number().int().min(0).optional(),
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
          operation: "find",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
          filter: args.filter as Record<string, unknown> | undefined,
          options: {
            limit: args.limit ?? 20,
            skip: args.skip ?? 0,
          },
        },
        async () => {
          const db = await getDbForEnv(envName);
          const col = db.collection(args.collection);
          const documents = await col
            .find(args.filter ?? {})
            .limit(args.limit ?? 20)
            .skip(args.skip ?? 0)
            .toArray();

          return {
            success: true,
            data: documents,
            count: documents.length,
            message: `Found ${documents.length} document(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
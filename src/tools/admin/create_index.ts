import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerCreateIndex(server: McpServer): void {
  server.tool(
    "create_index",
    "Create an index on a collection",
    {
      collection: z.string().min(1),
      keys: z.record(z.string(), z.number()),
      options: z.object({
        unique: z.boolean().optional(),
        sparse: z.boolean().optional(),
        name: z.string().optional(),
      }).optional(),
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
          operation: "create_index",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
        },
        async () => {
          const db = await getDbForEnv(envName);
          const col = db.collection(args.collection);
          const indexName = await col.createIndex(args.keys, args.options ?? {});

          return {
            success: true,
            count: 1,
            message: `Created index '${indexName}' on '${args.collection}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
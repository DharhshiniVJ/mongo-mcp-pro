import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";
import { runPipeline } from "../index.js";

export function registerDistinct(server: McpServer): void {
  server.tool(
    "distinct",
    "Get distinct values for a field in a collection",
    {
      collection: z.string().min(1),
      field: z.string().min(1),
      filter: z.record(z.string(), z.unknown()).optional(),
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
          operation: "distinct",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
          filter: args.filter as Record<string, unknown> | undefined,
        },
        async () => {
          const db = await getDbForEnv(envName);
          const col = db.collection(args.collection);
          const values = await col.distinct(args.field, args.filter ?? {});

          return {
            success: true,
            data: values,
            count: values.length,
            message: `Found ${values.length} distinct value(s) for field '${args.field}'`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
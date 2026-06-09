import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDbForEnv } from "../../config/db.js";
import { appConfig } from "../../config/env.js";

import { runPipeline } from "../index.js";

export function registerInsertMany(server: McpServer): void {
  server.tool(
    "insert_many",
    "Insert multiple documents into a collection",
    {
      collection: z.string().min(1),
      documents: z.array(z.record(z.string(), z.unknown())).min(1).max(100),
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
          operation: "insert_many",
          database: envConfig.dbName,
          collection: args.collection,
          dbMode: envConfig.dbMode,
          sessionId: appConfig.sessionId,
          environment: envName,
          documents: args.documents as Record<string, unknown>[],
        },
        async () => {
          const db = await getDbForEnv(envName);
          const col = db.collection(args.collection);
          const res = await col.insertMany(args.documents);

          return {
            success: true,
            count: res.insertedCount,
            message: `Inserted ${res.insertedCount} document(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
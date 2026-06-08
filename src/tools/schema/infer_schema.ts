import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { appConfig } from "../../config/env.js";
import { getSchema } from "../../schema/registry.js";
import { runPipeline } from "../index.js";

export function registerInferSchema(server: McpServer): void {
  server.tool(
    "infer_schema",
    "Infer the schema of a collection by sampling documents",
    {
      collection: z.string().min(1),
      sampleSize: z.number().int().min(1).max(500).optional(),
    },
    async (args) => {
      const result = await runPipeline(
        {
          operation: "infer_schema",
          database: appConfig.dbName,
          collection: args.collection,
          role: appConfig.role,
          sessionId: appConfig.sessionId,
        },
        async () => {
          const schema = await getSchema(appConfig.dbName, args.collection);

          return {
            success: true,
            data: [schema],
            count: Object.keys(schema.fields).length,
            message: `Inferred ${Object.keys(schema.fields).length} field(s) from ${schema.sampleSize} document(s)`,
          };
        }
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
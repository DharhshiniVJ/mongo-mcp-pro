import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { appConfig } from "../../config/env.js";

export function registerListEnvironments(server: McpServer): void {
  server.tool(
    "list_environments",
    "List all configured database environments (e.g. staging, production) and their details.",
    {},
    async () => {
      const environmentsList = Object.keys(appConfig.environments).map((name) => {
        const env = appConfig.environments[name];
        return {
          environment: name,
          database: env.dbName,
          mode: env.dbMode,
          isDefault: name === appConfig.default,
        };
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            defaultEnvironment: appConfig.default,
            environments: environmentsList,
          }, null, 2),
        }],
      };
    }
  );
}

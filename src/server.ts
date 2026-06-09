import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { appConfig } from "./config/env.js";
import { getDb, closeDb } from "./config/db.js";
import { logger } from "./observability/logger.js";

import { registerFind } from "./tools/read/find.js";
import { registerFindOne } from "./tools/read/find_one.js";
import { registerCount } from "./tools/read/count.js";
import { registerDistinct } from "./tools/read/distinct.js";
import { registerAggregate } from "./tools/read/aggregate.js";

import { registerInsertOne } from "./tools/write/insert_one.js";
import { registerInsertMany } from "./tools/write/insert_many.js";
import { registerUpdateOne } from "./tools/write/update_one.js";
import { registerUpdateMany } from "./tools/write/update_many.js";

import { registerListCollections } from "./tools/schema/list_collections.js";
import { registerCollectionStats } from "./tools/schema/collection_stats.js";
import { registerListIndexes } from "./tools/schema/list_indexes.js";
import { registerListEnvironments } from "./tools/schema/list_environments.js";

import { registerCreateIndex } from "./tools/admin/create_index.js";
import { registerCreateCollection } from "./tools/admin/create_collection.js";
import { registerQuery } from "./tools/query.js";

async function main(): Promise<void> {
  logger.info("Starting mongo-mcp-pro", {
    defaultEnvironment: appConfig.default,
    environments: Object.keys(appConfig.environments),
    sessionId: appConfig.sessionId,
  });

  // DB connections are established lazily per-environment when tools are invoked.
  logger.info("Ready to accept requests");

  const server = new McpServer({
    name: "mongo-mcp-pro",
    version: "1.0.0",
  });

  registerFind(server);
  registerFindOne(server);
  registerCount(server);
  registerDistinct(server);
  registerAggregate(server);

  registerInsertOne(server);
  registerInsertMany(server);
  registerUpdateOne(server);
  registerUpdateMany(server);

  registerListCollections(server);
  registerCollectionStats(server);
  registerListIndexes(server);
  registerListEnvironments(server);

  registerCreateIndex(server);
  registerCreateCollection(server);
  registerQuery(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("mongo-mcp-pro running", { tools: 16 });
}
main().catch(async (err) => {
  logger.error("Fatal error", err);
  await closeDb();
  process.exit(1);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down");
  await closeDb();
  process.exit(0);
});

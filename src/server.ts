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
import { registerDeleteOne } from "./tools/write/delete_one.js";
import { registerDeleteMany } from "./tools/write/delete_many.js";

import { registerListCollections } from "./tools/schema/list_collections.js";
import { registerInferSchema } from "./tools/schema/infer_schema.js";
import { registerCollectionStats } from "./tools/schema/collection_stats.js";
import { registerListIndexes } from "./tools/schema/list_indexes.js";

import { registerCreateIndex } from "./tools/admin/create_index.js";
import { registerDropIndex } from "./tools/admin/drop_index.js";
import { registerCreateCollection } from "./tools/admin/create_collection.js";
import { registerDropCollection } from "./tools/admin/drop_collection.js";

async function main(): Promise<void> {
  logger.info("Starting mongo-mcp-pro", {
    role: appConfig.role,
    database: appConfig.dbName,
    sessionId: appConfig.sessionId,
  });

  await getDb();
  logger.info("Connected to MongoDB");

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
  registerDeleteOne(server);
  registerDeleteMany(server);

  registerListCollections(server);
  registerInferSchema(server);
  registerCollectionStats(server);
  registerListIndexes(server);

  registerCreateIndex(server);
  registerDropIndex(server);
  registerCreateCollection(server);
  registerDropCollection(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("mongo-mcp-pro running", { tools: 19 });
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

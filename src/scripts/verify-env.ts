import { registerFind } from "../tools/read/find.js";
import { registerFindOne } from "../tools/read/find_one.js";
import { registerCount } from "../tools/read/count.js";
import { registerDistinct } from "../tools/read/distinct.js";
import { registerAggregate } from "../tools/read/aggregate.js";
import { registerInsertOne } from "../tools/write/insert_one.js";
import { registerInsertMany } from "../tools/write/insert_many.js";
import { registerUpdateOne } from "../tools/write/update_one.js";
import { registerUpdateMany } from "../tools/write/update_many.js";
import { registerListCollections } from "../tools/schema/list_collections.js";
import { registerCollectionStats } from "../tools/schema/collection_stats.js";
import { registerListIndexes } from "../tools/schema/list_indexes.js";
import { registerListEnvironments } from "../tools/schema/list_environments.js";
import { registerCreateIndex } from "../tools/admin/create_index.js";
import { registerCreateCollection } from "../tools/admin/create_collection.js";
import { registerQuery } from "../tools/query.js";
import { closeDb } from "../config/db.js";

class MockMcpServer {
  tools: Record<string, {
    description: string;
    schema: any;
    handler: (args: any) => Promise<{ content: Array<{ type: string; text: string }> }>;
  }> = {};

  tool(name: string, description: string, schema: any, handler: any) {
    this.tools[name] = { description, schema, handler };
  }
}

async function runTests() {
  console.log("=== STARTING MULTI-ENVIRONMENT INTEGRATION TESTS ===");
  
  const server = new MockMcpServer();
  
  // Register all tools
  registerFind(server as any);
  registerFindOne(server as any);
  registerCount(server as any);
  registerDistinct(server as any);
  registerAggregate(server as any);
  registerInsertOne(server as any);
  registerInsertMany(server as any);
  registerUpdateOne(server as any);
  registerUpdateMany(server as any);
  registerListCollections(server as any);
  registerCollectionStats(server as any);
  registerListIndexes(server as any);
  registerListEnvironments(server as any);
  registerCreateIndex(server as any);
  registerCreateCollection(server as any);
  registerQuery(server as any);

  const callTool = async (name: string, args: any) => {
    const tool = server.tools[name];
    if (!tool) throw new Error(`Tool ${name} not found`);
    const res = await tool.handler(args);
    return JSON.parse(res.content[0].text);
  };

  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Test list_environments
    console.log("\n--- Testing list_environments tool ---");
    const envs = await callTool("list_environments", {});
    assert(envs.success === true, "list_environments executed successfully");
    assert(envs.environments.length === 2, "Found exactly two environments (staging, production)");
    assert(envs.environments.some((e: any) => e.environment === "staging" && e.mode === "restricted"), "Staging is configured as restricted");
    assert(envs.environments.some((e: any) => e.environment === "production" && e.mode === "unrestricted"), "Production is configured as unrestricted");

    // 2. Test Staging Environment (Restricted Mode)
    console.log("\n--- Testing Staging Environment (Restricted: read-only, no write) ---");
    
    // Read: find users (should return 5 users after seeding)
    const stagingFind = await callTool("find", { collection: "users", environment: "staging" });
    assert(stagingFind.success === true, "find users on staging succeeded");
    assert(stagingFind.count === 5, `Expected 5 users on staging, got: ${stagingFind.count}`);

    // Write: insert_one on staging (should be blocked by RBAC)
    const stagingInsert = await callTool("insert_one", { 
      collection: "users", 
      document: { name: "Test User Staging", email: "test@staging.local" },
      environment: "staging"
    });
    assert(stagingInsert.success === false, "insert_one on staging was rejected");
    assert(stagingInsert.blocked === true, "insert_one on staging blocked flag is true");
    assert(stagingInsert.blockReason.includes("not permitted to perform 'insert_one'"), "insert_one blocked due to restricted mode RBAC");

    // Query tool: read command on staging (should succeed)
    const stagingQueryRead = await callTool("query", {
      command: { find: "users" },
      environment: "staging"
    });
    assert(stagingQueryRead.success === true, "query find on staging succeeded");

    // Query tool: write command on staging (should be blocked by RBAC)
    const stagingQueryWrite = await callTool("query", {
      command: { insert: "users", documents: [{ name: "Test User" }] },
      environment: "staging"
    });
    assert(stagingQueryWrite.success === false, "query insert on staging was rejected");
    assert(stagingQueryWrite.blocked === true, "query insert on staging blocked flag is true");
    assert(stagingQueryWrite.blockReason.includes("not permitted in restricted"), "query insert blocked due to restricted mode");

    // 3. Test Production Environment (Unrestricted Mode: read + write, no delete)
    console.log("\n--- Testing Production Environment (Unrestricted: read/write, no delete) ---");

    // Read: find users (should return 10 users after seeding)
    const prodFind = await callTool("find", { collection: "users", environment: "production" });
    assert(prodFind.success === true, "find users on production succeeded");
    assert(prodFind.count === 10, `Expected 10 users on production, got: ${prodFind.count}`);

    // Write: insert_one on production (should succeed)
    const prodInsert = await callTool("insert_one", {
      collection: "users",
      document: { name: "Test User Prod", email: "test@prod.local" },
      environment: "production"
    });
    assert(prodInsert.success === true, `insert_one on production succeeded: ${prodInsert.message}`);

    // Verify write worked
    const prodFindAfterInsert = await callTool("find", { collection: "users", environment: "production" });
    assert(prodFindAfterInsert.count === 11, `Expected 11 users on production after insert, got: ${prodFindAfterInsert.count}`);

    // Query tool: write command on production (should succeed)
    const prodQueryWrite = await callTool("query", {
      command: { insert: "users", documents: [{ name: "Test User 2" }] },
      environment: "production"
    });
    assert(prodQueryWrite.success === true, "query insert on production succeeded");

    // 4. Test Safety Filters (Drop/Delete/Truncate blocked everywhere)
    console.log("\n--- Testing Safety Filters (Drop/Delete/Truncate blocked everywhere) ---");

    // Query tool: delete command on production (should be blocked by safety check)
    const prodQueryDelete = await callTool("query", {
      command: { delete: "users", deletes: [{ q: {}, limit: 0 }] },
      environment: "production"
    });
    assert(prodQueryDelete.success === false, "query delete on production was rejected");
    assert(prodQueryDelete.blocked === true, "query delete blocked flag is true");
    assert(prodQueryDelete.blockReason.includes("is dangerous and not allowed"), "query delete blocked due to safety check");

    // Query tool: query containing 'delete' keyword in filter on production (should be blocked by safety check)
    const prodQueryDeleteFilter = await callTool("query", {
      command: { find: "users", filter: { status: "delete" } },
      environment: "production"
    });
    assert(prodQueryDeleteFilter.success === false, "query with 'delete' filter value was rejected");
    assert(prodQueryDeleteFilter.blocked === true, "query with 'delete' filter value blocked flag is true");

    // Query tool: query containing '$where' on production (should be blocked by firewall)
    const prodQueryWhere = await callTool("query", {
      command: { find: "users", filter: { $where: "this.age > 10" } },
      environment: "production"
    });
    assert(prodQueryWhere.success === false, "query with $where was rejected");
    assert(prodQueryWhere.blocked === true, "query with $where blocked flag is true");
    assert(prodQueryWhere.blockReason.includes("$where operator is not permitted"), "query with $where blocked due to firewall");

  } catch (err: any) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    await closeDb();
  }

  console.log("\n==================================================");
  if (failed === 0) {
    console.log("All integration tests passed successfully!");
    process.exit(0);
  } else {
    console.error(`${failed} test(s) failed.`);
    process.exit(1);
  }
}

runTests();

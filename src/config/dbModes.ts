import type { DbMode } from "../types/index.js";

export const DB_MODE_PERMISSIONS: Record<DbMode, string[]> = {
  restricted: [
    "find",
    "find_one",
    "count",
    "distinct",
    "aggregate",
    "list_collections",
    "collection_stats",
    "list_indexes",
    // Raw MongoDB read commands for query tool
    "listcollections",
    "listindexes",
    "collstats",
    "dbstats"
  ],
  unrestricted: [
    "find",
    "find_one",
    "count",
    "distinct",
    "aggregate",
    "list_collections",
    "collection_stats",
    "list_indexes",
    "insert_one",
    "insert_many",
    "update_one",
    "update_many",
    "create_index",
    "create_collection",
    // Raw MongoDB read/write commands for query tool
    "listcollections",
    "listindexes",
    "collstats",
    "dbstats",
    "insert",
    "update",
    "create",
    "createindexes"
  ],
};

export function isOperationAllowed(dbMode: DbMode, operation: string): boolean {
  return DB_MODE_PERMISSIONS[dbMode]?.includes(operation) ?? false;
}

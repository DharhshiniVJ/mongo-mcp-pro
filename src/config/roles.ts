import type { Role } from "../types/index.js";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  reader: [
    "find",
    "find_one",
    "count",
    "distinct",
    "aggregate",
    "list_collections",
    "infer_schema",
    "collection_stats",
    "list_indexes",
  ],
  writer: [
    "find",
    "find_one",
    "count",
    "distinct",
    "aggregate",
    "list_collections",
    "infer_schema",
    "collection_stats",
    "list_indexes",
    "insert_one",
    "insert_many",
    "update_one",
    "update_many",
    "delete_one",
  ],
  admin: [
    "find",
    "find_one",
    "count",
    "distinct",
    "aggregate",
    "list_collections",
    "infer_schema",
    "collection_stats",
    "list_indexes",
    "insert_one",
    "insert_many",
    "update_one",
    "update_many",
    "delete_one",
    "delete_many",
    "create_index",
    "drop_index",
    "create_collection",
    "drop_collection",
  ],
};

export function isOperationAllowed(role: Role, operation: string): boolean {
  return ROLE_PERMISSIONS[role].includes(operation);
}
import { inferSchema } from "./inferrer.js";
import { logger } from "../observability/logger.js";
import type { CollectionSchema } from "../types/index.js";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  schema: CollectionSchema;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
export async function getSchema(
  database: string,
  collection: string
): Promise<CollectionSchema> {
  const key = `${database}:${collection}`;
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.cachedAt < REFRESH_INTERVAL_MS) {
    logger.debug("Schema cache hit", { key });
    return cached.schema;
  }

  logger.debug("Schema cache miss, inferring", { key });
  const schema = await inferSchema(database, collection);

  cache.set(key, { schema, cachedAt: now });
  return schema;
}
export function invalidateSchema(database: string, collection: string): void {
  const key = `${database}:${collection}`;
  cache.delete(key);
  logger.debug("Schema cache invalidated", { key });
}

export function clearSchemaCache(): void {
  cache.clear();
  logger.debug("Schema cache cleared");
}
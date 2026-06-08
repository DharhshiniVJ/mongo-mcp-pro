import { getDb } from "../config/db.js";
import { logger } from "../observability/logger.js";
import type { CollectionSchema, SchemaField } from "../types/index.js";
function getType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
function extractFields(
  obj: Record<string, unknown>,
  fieldMap: Map<string, SchemaField>,
  prefix: string = ""
): void {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    const type = getType(value);

    if (!fieldMap.has(fullKey)) {
      fieldMap.set(fullKey, { types: [], nullable: false, frequency: 0 });
    }

    const field = fieldMap.get(fullKey)!;

    if (!field.types.includes(type)) {
      field.types.push(type);
    }

    if (value === null || value === undefined) {
      field.nullable = true;
    }

    if (type === "object" && value !== null) {
      extractFields(value as Record<string, unknown>, fieldMap, fullKey);
    }
  }
}
export async function inferSchema(
  database: string,
  collection: string,
  sampleSize: number = 100
): Promise<CollectionSchema> {
  const db = await getDb();
  const col = db.collection(collection);

  const documents = await col
    .find({})
    .limit(sampleSize)
    .toArray();

  const fieldMap = new Map<string, SchemaField>();

  for (const doc of documents) {
    extractFields(doc as Record<string, unknown>, fieldMap);
  }

  const totalDocs = documents.length;
  const fields: Record<string, SchemaField> = {};

  for (const [key, field] of fieldMap) {
    field.frequency = totalDocs > 0
      ? documents.filter(d => key in d).length / totalDocs
      : 0;
    fields[key] = field;
  }

  logger.debug("Schema inferred", { collection, fieldCount: Object.keys(fields).length });

  return {
    collection,
    database,
    fields,
    sampleSize: totalDocs,
    inferredAt: new Date().toISOString(),
  };
}

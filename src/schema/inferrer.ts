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
  seenInDoc: Set<string>,
  prefix: string = ""
): void {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    const type = getType(value);

    // Track that we have seen this key in the current document
    seenInDoc.add(fullKey);

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
      extractFields(value as Record<string, unknown>, fieldMap, seenInDoc, fullKey);
    } else if (type === "array" && Array.isArray(value)) {
      // Recurse into array elements if they are objects
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          extractFields(item as Record<string, unknown>, fieldMap, seenInDoc, fullKey);
        }
      }
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
    const seenInDoc = new Set<string>();
    extractFields(doc as Record<string, unknown>, fieldMap, seenInDoc);

    // For each unique field found in this document, increment its occurrence count
    for (const key of seenInDoc) {
      const field = fieldMap.get(key)!;
      field.frequency += 1;
    }
  }

  const totalDocs = documents.length;
  const fields: Record<string, SchemaField> = {};

  for (const [key, field] of fieldMap) {
    // Convert count to fractional frequency
    field.frequency = totalDocs > 0 ? field.frequency / totalDocs : 0;
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

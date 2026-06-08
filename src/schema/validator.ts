import { getSchema } from "./registry.js";
import { logger } from "../observability/logger.js";
import type { QueryContext } from "../types/index.js";
function extractQueryFields(obj: Record<string, unknown>, prefix: string = ""): string[] {
  const fields: string[] = [];

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (key.startsWith("$")) {
      // It's a MongoDB operator (like $or, $and, $not).
      // Do not add the operator key to fields, but traverse its value.
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            fields.push(...extractQueryFields(item as Record<string, unknown>, prefix));
          }
        }
      } else if (typeof value === "object" && value !== null) {
        fields.push(...extractQueryFields(value as Record<string, unknown>, prefix));
      }
    } else {
      // It's a normal database field
      const fullKey = prefix ? `${prefix}.${key}` : key;
      fields.push(fullKey);

      // Recursively extract nested fields or objects inside arrays
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            fields.push(...extractQueryFields(item as Record<string, unknown>, fullKey));
          }
        }
      } else if (typeof value === "object" && value !== null) {
        fields.push(...extractQueryFields(value as Record<string, unknown>, fullKey));
      }
    }
  }

  return fields;
}
export async function validateQueryFields(context: QueryContext): Promise<{
  valid: boolean;
  unknownFields: string[];
}> {
  try {
    const schema = await getSchema(context.database, context.collection);
    const knownFields = Object.keys(schema.fields);
    const unknownFields: string[] = [];

    const fieldsToCheck: Record<string, unknown>[] = [];

    if (context.filter) fieldsToCheck.push(context.filter);
    if (context.update) fieldsToCheck.push(context.update);
    if (context.document) fieldsToCheck.push(context.document);

    for (const obj of fieldsToCheck) {
      const queryFields = extractQueryFields(obj);
      for (const field of queryFields) {
        if (!knownFields.includes(field) && field !== "_id") {
          unknownFields.push(field);
        }
      }
    }

    if (unknownFields.length > 0) {
      logger.debug("Unknown fields in query", { unknownFields });
    }

    return {
      valid: unknownFields.length === 0,
      unknownFields,
    };
  } catch (err) {
    logger.error("Schema validation failed", err);
    return { valid: true, unknownFields: [] };
  }
}

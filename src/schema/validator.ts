import { getSchema } from "./registry.js";
import { logger } from "../observability/logger.js";
import type { QueryContext } from "../types/index.js";
function extractQueryFields(obj: Record<string, unknown>, prefix: string = ""): string[] {
  const fields: string[] = [];

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;
    fields.push(fullKey);

    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      fields.push(...extractQueryFields(value as Record<string, unknown>, fullKey));
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

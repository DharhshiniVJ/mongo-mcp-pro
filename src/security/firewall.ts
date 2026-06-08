import { logger } from "../observability/logger.js";
import type { QueryContext } from "../types/index.js";

export interface FirewallResult {
  blocked: boolean;
  reason?: string;
}

type FirewallRule = (context: QueryContext) => string | null;
function containsDollarWhere(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    if (key === "$where") return true;
    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if (containsDollarWhere(value as Record<string, unknown>)) return true;
    }
  }
  return false;
}
function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

const rules: FirewallRule[] = [
  (context) => {
    if (context.collection.startsWith("system.")) {
      return `Operations on system collection '${context.collection}' are not permitted`;
    }
    return null;
  },

  (context) => {
    if (
      (context.operation === "delete_many" || context.operation === "update_many") &&
      (!context.filter || isEmptyObject(context.filter))
    ) {
      return `${context.operation} requires a non-empty filter to prevent mass destruction`;
    }
    return null;
  },

  (context) => {
    const targets = [context.filter, context.update, context.document];
    for (const target of targets) {
      if (target && containsDollarWhere(target)) {
        return "$where operator is not permitted — JavaScript injection risk";
      }
    }
    return null;
  },

  (context) => {
    function depth(obj: Record<string, unknown>, current: number = 0): number {
      if (current > 10) return current;
      let max = current;
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          max = Math.max(max, depth(value as Record<string, unknown>, current + 1));
        }
      }
      return max;
    }

    const targets = [context.filter, context.update, context.document];
    for (const target of targets) {
      if (target && depth(target) > 5) {
        return "Query exceeds maximum field nesting depth of 5";
      }
    }
    return null;
  },
];
export function checkFirewall(context: QueryContext): FirewallResult {
  for (const rule of rules) {
    const reason = rule(context);
    if (reason !== null) {
      logger.debug("Firewall blocked query", { reason, operation: context.operation });
      return { blocked: true, reason };
    }
  }

  return { blocked: false };
}

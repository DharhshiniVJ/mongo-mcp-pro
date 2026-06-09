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

const rules: FirewallRule[] = [
  (context) => {
    if (context.collection.startsWith("system.")) {
      return `Operations on system collection '${context.collection}' are not permitted`;
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

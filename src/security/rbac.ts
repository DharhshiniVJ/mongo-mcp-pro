import { isOperationAllowed } from "../config/dbModes.js";
import { logger } from "../observability/logger.js";
import type { QueryContext } from "../types/index.js";

export interface RbacResult {
  allowed: boolean;
  reason?: string;
}
export function checkPermission(context: QueryContext): RbacResult {
  const allowed = isOperationAllowed(context.dbMode, context.operation);

  if (!allowed) {
    logger.debug("RBAC denied", {
      dbMode: context.dbMode,
      operation: context.operation,
    });

    return {
      allowed: false,
      reason: `DB Mode '${context.dbMode}' is not permitted to perform '${context.operation}'`,
    };
  }

  logger.debug("RBAC allowed", {
    dbMode: context.dbMode,
    operation: context.operation,
  });

  return { allowed: true };
}

import { isOperationAllowed } from "../config/roles.js";
import { logger } from "../observability/logger.js";
import type { QueryContext } from "../types/index.js";

export interface RbacResult {
  allowed: boolean;
  reason?: string;
}
export function checkPermission(context: QueryContext): RbacResult {
  const allowed = isOperationAllowed(context.role, context.operation);

  if (!allowed) {
    logger.debug("RBAC denied", {
      role: context.role,
      operation: context.operation,
    });

    return {
      allowed: false,
      reason: `Role '${context.role}' is not permitted to perform '${context.operation}'`,
    };
  }

  logger.debug("RBAC allowed", {
    role: context.role,
    operation: context.operation,
  });

  return { allowed: true };
}

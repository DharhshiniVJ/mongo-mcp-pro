import { checkRateLimit } from "../security/rateLimit.js";
import { checkPermission } from "../security/rbac.js";
import { checkFirewall } from "../security/firewall.js";
import { validateQueryFields } from "../schema/validator.js";
import { writeAuditEntry } from "../observability/audit.js";
import { recordMetric } from "../observability/metrics.js";
import { logger } from "../observability/logger.js";
import type { QueryContext, OperationResult } from "../types/index.js";

export async function runPipeline(
  context: QueryContext,
  execute: () => Promise<OperationResult>
): Promise<OperationResult> {
  const start = Date.now();
  let result: OperationResult;

  const rateLimitResult = checkRateLimit(context.role);
  if (!rateLimitResult.allowed) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      role: context.role,
      operation: context.operation,
      database: context.database,
      collection: context.collection,
      filter: context.filter,
      durationMs: 0,
      resultCount: null,
      blocked: true,
      blockReason: rateLimitResult.reason ?? null,
      error: null,
    };
    await writeAuditEntry(entry);
    recordMetric(context.operation, context.role, 0, true, false);
    return { success: false, blocked: true, blockReason: rateLimitResult.reason };
  }

  const rbacResult = checkPermission(context);
  if (!rbacResult.allowed) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      role: context.role,
      operation: context.operation,
      database: context.database,
      collection: context.collection,
      filter: context.filter,
      durationMs: 0,
      resultCount: null,
      blocked: true,
      blockReason: rbacResult.reason ?? null,
      error: null,
    };
    await writeAuditEntry(entry);
    recordMetric(context.operation, context.role, 0, true, false);
    return { success: false, blocked: true, blockReason: rbacResult.reason };
  }

  const firewallResult = checkFirewall(context);
  if (firewallResult.blocked) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      role: context.role,
      operation: context.operation,
      database: context.database,
      collection: context.collection,
      filter: context.filter,
      durationMs: 0,
      resultCount: null,
      blocked: true,
      blockReason: firewallResult.reason ?? null,
      error: null,
    };
    await writeAuditEntry(entry);
    recordMetric(context.operation, context.role, 0, true, false);
    return { success: false, blocked: true, blockReason: firewallResult.reason };
  }

  const schemaResult = await validateQueryFields(context);
  if (!schemaResult.valid) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      role: context.role,
      operation: context.operation,
      database: context.database,
      collection: context.collection,
      filter: context.filter,
      durationMs: 0,
      resultCount: null,
      blocked: true,
      blockReason: `Unknown fields: ${schemaResult.unknownFields.join(", ")}`,
      error: null,
    };
    await writeAuditEntry(entry);
    recordMetric(context.operation, context.role, 0, true, false);
    return {
      success: false,
      blocked: true,
      blockReason: `Unknown fields in query: ${schemaResult.unknownFields.join(", ")}`,
    };
  }

  try {
    result = await execute();
    const durationMs = Date.now() - start;

    await writeAuditEntry({
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      role: context.role,
      operation: context.operation,
      database: context.database,
      collection: context.collection,
      filter: context.filter,
      durationMs,
      resultCount: result.count ?? null,
      blocked: false,
      blockReason: null,
      error: null,
    });

    recordMetric(context.operation, context.role, durationMs, false, false);
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error("Operation failed", { operation: context.operation, error: errorMessage });

    await writeAuditEntry({
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      role: context.role,
      operation: context.operation,
      database: context.database,
      collection: context.collection,
      filter: context.filter,
      durationMs,
      resultCount: null,
      blocked: false,
      blockReason: null,
      error: errorMessage,
    });

    recordMetric(context.operation, context.role, durationMs, false, true);
    return { success: false, error: errorMessage };
  }
}

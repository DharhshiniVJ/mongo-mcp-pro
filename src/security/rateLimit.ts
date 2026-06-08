import { logger } from "../observability/logger.js";
import type { Role, RateLimitState } from "../types/index.js";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

const WINDOW_MS = 60 * 1000;

const ROLE_LIMITS: Record<Role, number> = {
  reader: 300,
  writer: 100,
  admin: 50,
};

const state = new Map<Role, RateLimitState>();
export function checkRateLimit(role: Role): RateLimitResult {
  const now = Date.now();
  const limit = ROLE_LIMITS[role];
  const current = state.get(role);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    state.set(role, {
      count: 1,
      windowStart: now,
      lastOperation: now,
    });
    return { allowed: true };
  }

  if (current.count >= limit) {
    logger.debug("Rate limit exceeded", { role, count: current.count, limit });
    return {
      allowed: false,
      reason: `Rate limit exceeded for role '${role}': ${current.count}/${limit} operations in current window`,
    };
  }

  state.set(role, {
    count: current.count + 1,
    windowStart: current.windowStart,
    lastOperation: now,
  });

  return { allowed: true };
}
export function getRateLimitState(): Record<Role, RateLimitState | null> {
  return {
    reader: state.get("reader") ?? null,
    writer: state.get("writer") ?? null,
    admin: state.get("admin") ?? null,
  };
}

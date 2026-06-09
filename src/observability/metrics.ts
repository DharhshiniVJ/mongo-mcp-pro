import type { DbMode } from "../types/index.js";

const operationCounts = new Map<string, number>();
const blockedCounts = new Map<string, number>();
const errorCounts = new Map<string, number>();
const latencyBuckets = new Map<string, number[]>();
export function recordMetric(
  operation: string,
  dbMode: DbMode,
  durationMs: number,
  blocked: boolean,
  error: boolean
): void {
  const key = `${dbMode}:${operation}`;

  if (blocked) {
    blockedCounts.set(key, (blockedCounts.get(key) ?? 0) + 1);
    return;
  }

  if (error) {
    errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    return;
  }

  operationCounts.set(key, (operationCounts.get(key) ?? 0) + 1);

  const bucket = latencyBuckets.get(key) ?? [];
  bucket.push(durationMs);
  latencyBuckets.set(key, bucket);
}
export function getMetrics(): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  const allKeys = new Set<string>([
    ...operationCounts.keys(),
    ...blockedCounts.keys(),
    ...errorCounts.keys(),
  ]);

  for (const key of allKeys) {
    const latencies = latencyBuckets.get(key) ?? [];
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    summary[key] = {
      count: operationCounts.get(key) ?? 0,
      avgLatencyMs: Math.round(avgLatency),
      blocked: blockedCounts.get(key) ?? 0,
      errors: errorCounts.get(key) ?? 0,
    };
  }

  return summary;
}
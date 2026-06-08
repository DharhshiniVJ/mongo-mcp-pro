export type Role = "reader" | "writer" | "admin";
export type LogLevel = "debug" | "info" | "error";

export interface AppConfig {
    mongoUri: string;
    dbName: string;
    role: Role;
    sessionId: string;
    logLevel: LogLevel;
    auditLogPath: string;
}

export interface QueryContext {
    operation: string;
    database: string;
    collection: string;
    role: Role;
    sessionId: string;
    filter?: Record<string, unknown>;
    update?: Record<string, unknown>;
    document?: Record<string, unknown>;
    documents?: Record<string, unknown>[];
    options?: Record<string, unknown>;
}

export interface AuditEntry{
    timestamp: string;
    sessionId: string;
    role: Role;
    operation: string;
    database: string;
    collection: string;
    filter?: Record<string, unknown>;
    durationMs: number;
    resultCount?: number | null;
    blocked: boolean;
    blockReason?: string | null;
    error: string | null;
}

export interface OperationResult {
  success: boolean;
  data?: unknown[];
  count?: number;
  message?: string;
  blocked?: boolean;
  blockReason?: string;
  error?: string;
}
export interface SchemaField {
  types: string[];
  nullable: boolean;
  frequency: number;
}
export interface CollectionSchema {
  collection: string;
  database: string;
  fields: Record<string, SchemaField>;
  sampleSize: number;
  inferredAt: string;
}
export interface RateLimitState {
  count: number;
  windowStart: number;
  lastOperation: number;
}


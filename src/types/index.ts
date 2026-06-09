export type DbMode = "restricted" | "unrestricted";
export type LogLevel = "debug" | "info" | "error";

export interface EnvConfig {
    mongoUri: string;
    dbName: string;
    dbMode: DbMode;
}

export interface AppConfig {
    default: string;
    environments: Record<string, EnvConfig>;
    sessionId: string;
    logLevel: LogLevel;
    auditLogPath: string;
}

export interface QueryContext {
    operation: string;
    database: string;
    collection: string;
    dbMode: DbMode;
    sessionId: string;
    environment?: string;
    filter?: Record<string, unknown>;
    update?: Record<string, unknown>;
    document?: Record<string, unknown>;
    documents?: Record<string, unknown>[];
    options?: Record<string, unknown>;
}

export interface AuditEntry{
    timestamp: string;
    sessionId: string;
    dbMode: DbMode;
    operation: string;
    database: string;
    collection: string;
    environment?: string;
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



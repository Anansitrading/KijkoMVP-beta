/**
 * Type definitions for Langfuse integration
 */

export interface LangfuseConfig {
  secretKey?: string;
  publicKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  flushAt?: number;
  flushInterval?: number;
}

export interface ObservationOptions {
  name: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  input?: any;
  output?: any;
}

export interface GeminiCallOptions {
  name: string;
  model: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  tags?: string[];
}

export interface TraceResult<T> {
  result: T;
  observationId?: string;
  traceId?: string;
}


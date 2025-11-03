/**
 * @opencut/langfuse - Shared AI Observability Package
 * 
 * Provides Langfuse integration for tracking AI interactions across the monorepo.
 * Supports both server-side (Next.js API routes) and client-side tracing.
 */

export { initializeLangfuseTelemetry } from './telemetry';
export { tracedGeminiCall, createLangfuseObservation } from './instrumentation';
export { getLangfuseClient, getLangfuseConfig } from './client';
export type { LangfuseConfig, ObservationOptions, GeminiCallOptions } from './types';


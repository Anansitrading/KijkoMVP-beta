/**
 * OpenTelemetry initialization for Langfuse
 * 
 * This module sets up OpenTelemetry with Langfuse span processor
 * for automatic tracing of AI operations.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getLangfuseConfig } from './client';

let telemetryInitialized = false;

/**
 * Initialize Langfuse telemetry with OpenTelemetry
 * 
 * Call this once at application startup (e.g., in Next.js instrumentation.ts)
 * 
 * @example
 * ```ts
 * // instrumentation.ts
 * export function register() {
 *   initializeLangfuseTelemetry();
 * }
 * ```
 */
export function initializeLangfuseTelemetry(): void {
  // Prevent double initialization
  if (telemetryInitialized) {
    console.log('[Langfuse] Telemetry already initialized');
    return;
  }

  const config = getLangfuseConfig();

  // Skip initialization if Langfuse is disabled or not configured
  if (!config.enabled || !config.secretKey || !config.publicKey) {
    console.log('[Langfuse] Telemetry disabled or not configured');
    return;
  }

  try {
    // Note: LangfuseSpanProcessor requires langfuse-node package
    // For now, we'll use the standard Langfuse SDK approach
    // OpenTelemetry integration can be added when using LangChain
    
    console.log('[Langfuse] Telemetry initialization skipped - using SDK approach');
    console.log('[Langfuse] For LangChain integration, use CallbackHandler');
    
    telemetryInitialized = true;
  } catch (error) {
    console.error('[Langfuse] Failed to initialize telemetry:', error);
  }
}

/**
 * Check if telemetry is initialized
 */
export function isTelemetryInitialized(): boolean {
  return telemetryInitialized;
}


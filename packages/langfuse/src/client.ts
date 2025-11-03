/**
 * Langfuse client initialization and configuration
 */

import { Langfuse } from 'langfuse';
import type { LangfuseConfig } from './types';

let langfuseClient: Langfuse | null = null;

/**
 * Get Langfuse configuration from environment variables
 */
export function getLangfuseConfig(): LangfuseConfig {
  return {
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
    enabled: process.env.LANGFUSE_ENABLED !== 'false',
    flushAt: parseInt(process.env.LANGFUSE_FLUSH_AT || '15', 10),
    flushInterval: parseInt(process.env.LANGFUSE_FLUSH_INTERVAL || '1000', 10),
  };
}

/**
 * Get or create singleton Langfuse client
 * 
 * @returns Langfuse client instance or null if not configured
 */
export function getLangfuseClient(): Langfuse | null {
  const config = getLangfuseConfig();

  // Return null if Langfuse is disabled or not configured
  if (!config.enabled || !config.secretKey || !config.publicKey) {
    return null;
  }

  // Return existing client if already initialized
  if (langfuseClient) {
    return langfuseClient;
  }

  // Create new client
  try {
    langfuseClient = new Langfuse({
      secretKey: config.secretKey,
      publicKey: config.publicKey,
      baseUrl: config.baseUrl,
      flushAt: config.flushAt,
      flushInterval: config.flushInterval,
    });

    console.log('[Langfuse] Client initialized successfully');
    return langfuseClient;
  } catch (error) {
    console.error('[Langfuse] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Flush all pending Langfuse events
 * Call this before process exit or in serverless cleanup
 */
export async function flushLangfuse(): Promise<void> {
  if (langfuseClient) {
    await langfuseClient.flushAsync();
  }
}

/**
 * Shutdown Langfuse client
 * Call this during graceful shutdown
 */
export async function shutdownLangfuse(): Promise<void> {
  if (langfuseClient) {
    await langfuseClient.shutdownAsync();
    langfuseClient = null;
  }
}


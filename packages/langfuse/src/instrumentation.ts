/**
 * Instrumentation helpers for tracing AI operations
 */

import { getLangfuseClient } from './client';
import type { ObservationOptions, GeminiCallOptions, TraceResult } from './types';

/**
 * Create a Langfuse observation for manual instrumentation
 * 
 * @example
 * ```ts
 * const observation = createLangfuseObservation({
 *   name: 'Gemini:GenerateSummary',
 *   metadata: { model: 'gemini-2.5-flash' }
 * });
 * 
 * try {
 *   const result = await gemini.generateSummary(input);
 *   observation.end({ output: result });
 *   return result;
 * } catch (error) {
 *   observation.end({ level: 'ERROR', statusMessage: error.message });
 *   throw error;
 * }
 * ```
 */
export function createLangfuseObservation(options: ObservationOptions) {
  const client = getLangfuseClient();
  
  if (!client) {
    // Return no-op observation if Langfuse is not configured
    return {
      end: () => {},
      update: () => {},
      event: () => {},
      span: () => ({ end: () => {} }),
      generation: () => ({ end: () => {} }),
    };
  }

  const trace = client.trace({
    name: options.name,
    metadata: options.metadata,
    userId: options.userId,
    sessionId: options.sessionId,
    tags: options.tags,
    input: options.input,
  });

  return trace;
}

/**
 * Trace a Gemini API call with Langfuse
 * 
 * Wraps a Gemini API call with automatic tracing, error handling,
 * and performance monitoring.
 * 
 * @example
 * ```ts
 * const result = await tracedGeminiCall(
 *   {
 *     name: 'Gemini:GenerateSummary',
 *     model: 'gemini-2.5-flash',
 *     metadata: { temperature: 0.7 }
 *   },
 *   async () => {
 *     return await gemini.generateSummary(input);
 *   }
 * );
 * ```
 */
export async function tracedGeminiCall<T>(
  options: GeminiCallOptions,
  fn: () => Promise<T>
): Promise<TraceResult<T>> {
  const client = getLangfuseClient();

  // If Langfuse is not configured, just execute the function
  if (!client) {
    const result = await fn();
    return { result };
  }

  const startTime = Date.now();
  const trace = client.trace({
    name: options.name,
    metadata: {
      ...options.metadata,
      model: options.model,
      provider: 'google-gemini',
    },
    userId: options.userId,
    sessionId: options.sessionId,
    tags: options.tags || ['gemini', 'ai'],
  });

  const generation = trace.generation({
    name: options.name,
    model: options.model,
    startTime: new Date(startTime),
  });

  try {
    const result = await fn();
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    generation.update({
      output: result,
      metadata: {
        latencyMs,
        success: true,
      },
    }).end();

    return {
      result,
      observationId: generation.id,
      traceId: trace.id,
    };
  } catch (error) {
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    generation.update({
      level: 'ERROR',
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        latencyMs,
        success: false,
        error: error instanceof Error ? error.stack : String(error),
      },
    }).end();

    throw error;
  }
}

/**
 * Create a Langfuse span for a specific operation
 * 
 * Useful for tracking sub-operations within a larger trace
 * 
 * @example
 * ```ts
 * const trace = createLangfuseObservation({ name: 'ProcessVideo' });
 * 
 * const transcribeSpan = trace.span({ name: 'Transcribe' });
 * await transcribeVideo();
 * transcribeSpan.end();
 * 
 * const summarizeSpan = trace.span({ name: 'Summarize' });
 * await summarizeTranscript();
 * summarizeSpan.end();
 * 
 * trace.end();
 * ```
 */
export function createSpan(
  parentTrace: ReturnType<typeof createLangfuseObservation>,
  name: string,
  metadata?: Record<string, any>
) {
  return parentTrace.span({
    name,
    metadata,
    startTime: new Date(),
  });
}


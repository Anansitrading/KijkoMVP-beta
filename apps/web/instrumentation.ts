/**
 * Next.js Instrumentation
 * 
 * This file is automatically loaded by Next.js before the application starts.
 * Use it to initialize observability tools like Langfuse.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Langfuse telemetry for server-side tracing
    const { initializeLangfuseTelemetry } = await import('@opencut/langfuse');
    initializeLangfuseTelemetry();
    
    console.log('[Instrumentation] Langfuse telemetry initialized');
  }
}


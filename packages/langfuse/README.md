# @kijko/langfuse

Shared AI Observability package for tracking AI interactions across the Kijko monorepo.

## Features

- ✅ **Automatic Tracing**: Track all AI operations with minimal code changes
- ✅ **Gemini Integration**: Built-in support for Google Gemini API calls
- ✅ **LangChain Ready**: Prepared for future LangChain/LangGraph integration
- ✅ **Error Tracking**: Automatic error capture and correlation with Sentry
- ✅ **Performance Monitoring**: Track latency, costs, and quality metrics
- ✅ **TypeScript First**: Full type safety and IntelliSense support

## Installation

This package is already installed as part of the monorepo. To use it in your app:

```json
{
  "dependencies": {
    "@kijko/langfuse": "*"
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file with your Langfuse credentials:

```bash
# Get your keys from https://cloud.langfuse.com
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_ENABLED=true

# Optional: Configure flush behavior
LANGFUSE_FLUSH_AT=15
LANGFUSE_FLUSH_INTERVAL=1000

# For client-side tracing (optional)
NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY=pk-lf-...
```

### Next.js Setup

1. Enable instrumentation in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

2. Create `instrumentation.ts` in your app root:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeLangfuseTelemetry } = await import('@kijko/langfuse');
    initializeLangfuseTelemetry();
  }
}
```

## Usage

### Basic Tracing

```ts
import { createLangfuseObservation } from '@kijko/langfuse';

const observation = createLangfuseObservation({
  name: 'ProcessVideo',
  metadata: { videoId: '123' },
  userId: 'user-456',
  tags: ['video', 'processing'],
});

try {
  const result = await processVideo();
  observation.end({ output: result });
  return result;
} catch (error) {
  observation.end({ level: 'ERROR', statusMessage: error.message });
  throw error;
}
```

### Tracing Gemini API Calls

```ts
import { tracedGeminiCall } from '@kijko/langfuse';
import { geminiService } from './gemini';

const result = await tracedGeminiCall(
  {
    name: 'Gemini:GenerateSummary',
    model: 'gemini-2.5-flash',
    metadata: { temperature: 0.7 },
    userId: 'user-123',
    tags: ['summary', 'ai'],
  },
  async () => {
    return await geminiService.generateSummary(input);
  }
);

console.log('Result:', result.result);
console.log('Trace ID:', result.traceId);
```

### Nested Spans

```ts
import { createLangfuseObservation, createSpan } from '@kijko/langfuse';

const trace = createLangfuseObservation({ name: 'ProcessVideo' });

// Transcription step
const transcribeSpan = createSpan(trace, 'Transcribe', { model: 'whisper' });
await transcribeVideo();
transcribeSpan.end();

// Summarization step
const summarizeSpan = createSpan(trace, 'Summarize', { model: 'gemini-2.5-flash' });
await summarizeTranscript();
summarizeSpan.end();

trace.end();
```

### Integration with Sentry

```ts
import * as Sentry from '@sentry/nextjs';
import { tracedGeminiCall } from '@kijko/langfuse';

try {
  const result = await tracedGeminiCall(
    { name: 'Gemini:UserRequest', model: 'gemini-2.5-flash' },
    async () => await gemini.generate(prompt)
  );
  
  // Success - trace is automatically recorded
  return result.result;
} catch (error) {
  // Error is automatically traced in Langfuse
  // Also send to Sentry with Langfuse trace ID
  Sentry.captureException(error, {
    extra: { langfuseTraceId: result.traceId },
  });
  throw error;
}
```

## API Reference

### `initializeLangfuseTelemetry()`

Initialize Langfuse telemetry. Call once at application startup.

### `getLangfuseClient()`

Get the singleton Langfuse client instance.

Returns `null` if Langfuse is not configured or disabled.

### `createLangfuseObservation(options)`

Create a manual observation for custom tracing.

**Options:**
- `name` (required): Name of the observation
- `metadata`: Custom metadata object
- `userId`: User identifier
- `sessionId`: Session identifier
- `tags`: Array of tags
- `input`: Input data
- `output`: Output data

### `tracedGeminiCall(options, fn)`

Wrap a Gemini API call with automatic tracing.

**Options:**
- `name` (required): Name of the operation
- `model` (required): Gemini model name
- `metadata`: Custom metadata
- `userId`: User identifier
- `sessionId`: Session identifier
- `tags`: Array of tags

**Returns:** `Promise<TraceResult<T>>`
- `result`: The function result
- `observationId`: Langfuse observation ID
- `traceId`: Langfuse trace ID

### `flushLangfuse()`

Flush all pending Langfuse events. Call before process exit or in serverless cleanup.

### `shutdownLangfuse()`

Shutdown the Langfuse client. Call during graceful shutdown.

## Best Practices

1. **Always flush in serverless**: Call `flushLangfuse()` before returning from serverless functions
2. **Use meaningful names**: Name your traces and spans descriptively
3. **Add context**: Include userId, sessionId, and metadata for better debugging
4. **Tag appropriately**: Use tags to categorize and filter traces
5. **Correlate with Sentry**: Include Langfuse trace IDs in Sentry events

## Troubleshooting

### Traces not appearing in Langfuse

1. Check environment variables are set correctly
2. Ensure `LANGFUSE_ENABLED=true`
3. Call `flushLangfuse()` in serverless environments
4. Check console for initialization errors

### TypeScript errors

Make sure the package is properly linked in your app's `package.json` and the root `tsconfig.json` includes the path alias.

## Learn More

- [Langfuse Documentation](https://langfuse.com/docs)
- [Langfuse Cloud](https://cloud.langfuse.com)
- [OpenTelemetry](https://opentelemetry.io/)


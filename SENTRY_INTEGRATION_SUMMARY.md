# Sentry Integration Summary

**How Sentry + Augment MCP enhances the Kijko2 merger plan**

---

## Executive Summary

Sentry has been integrated into the 24-day merger plan to provide:
1. **Real-time error tracking** across Next.js frontend and FastAPI backend
2. **Performance monitoring** for timeline operations and workflow execution
3. **Session Replay** for visual debugging of user interactions
4. **Distributed tracing** across Next.js → FastAPI → ComfyUI
5. **Vibe coding continuity** via Augment MCP (query errors from editor)
6. **Automated release management** via CircleCI

---

## Why Sentry?

### Technical Advantages (from Perplexity)
- **Multi-project architecture** for better error isolation
- **Distributed tracing** across services with automatic trace propagation
- **Session Replay** for visual debugging of timeline interactions
- **Custom instrumentation** for ComfyUI workflows and FFmpeg processing
- **Source map support** for Turborepo packages
- **Automated release tracking** via CircleCI integration

### Developer Experience Advantages
- **Augment MCP integration** for vibe coding
- **Query errors from editor** without tab switching
- **Immediate context** on production issues
- **Debug with session replay** without reproducing bugs
- **Performance insights** for optimization

---

## Sentry Project Structure (from Perplexity)

### Multiple Projects for Monorepo

**3 separate Sentry projects:**
1. **kijko-web** - Next.js frontend (apps/web)
2. **kijko-api** - FastAPI backend (apps/comfyui-gateway)
3. **kijko-editor** - Shared editor packages (packages/editor)

**Rationale:**
- Separation improves ownership and alerting
- Frontend and backend errors are distinct in context
- Facilitates distributed tracing across services
- Teams won't be overloaded with irrelevant alerts

---

## Phased Adoption Strategy

### Phase 1 (Day 1): Basic Error Tracking
**Sentry Setup:**
- Create 3 Sentry projects
- Install Next.js SDK in apps/web
- Install Python SDK in apps/comfyui-gateway
- Configure environment variables (DSN, auth token)
- Set up Augment MCP for Sentry

**Augment MCP Queries:**
- "Show recent Sentry errors for kijko-web"
- "What's the most frequent error this week?"

**Time:** 45 minutes

---

### Phase 3 (Days 8-14): Custom Instrumentation & Distributed Tracing
**Sentry Additions:**
- Custom instrumentation for ComfyUI workflow execution
- Custom instrumentation for FFmpeg processing
- Distributed tracing (Next.js → FastAPI)
- Automated release creation via CircleCI
- Source map uploads for Next.js and packages

**Augment MCP Queries:**
- "Show me errors in the workflow execution"
- "What's the trace for the last failed API call?"
- "Show me FFmpeg processing errors"

**Time:** 2-3 hours

---

### Phase 5 (Days 19-21): Session Replay
**Sentry Additions:**
- Enable Session Replay for timeline debugging
- Add breadcrumbs for timeline interactions
- Configure replay masking for PII
- Instrument drag-and-drop operations

**Augment MCP Queries:**
- "Show me the session replay for the last timeline crash"
- "What user actions led to the drag-and-drop error?"

**Time:** 1-2 hours

---

## Custom Instrumentation Examples

### ComfyUI Workflow Execution

```python
# apps/comfyui-gateway/services/workflow_executor.py
import sentry_sdk

async def execute_workflow(workflow_id: str, params: dict):
    with sentry_sdk.start_transaction(
        op="comfyui.workflow",
        name=f"execute_workflow_{workflow_id}"
    ) as transaction:
        transaction.set_tag("workflow_id", workflow_id)
        
        try:
            # Workflow preparation
            with sentry_sdk.start_span(op="workflow.prepare"):
                workflow_data = await prepare_workflow(workflow_id, params)
            
            # ComfyUI API call
            with sentry_sdk.start_span(op="comfyui.api_call"):
                result = await comfyui_client.execute(workflow_data)
            
            return result
            
        except Exception as e:
            sentry_sdk.capture_exception(e)
            raise
```

### FFmpeg Processing

```python
# apps/comfyui-gateway/services/ffmpeg_processor.py
import sentry_sdk

async def process_video(input_path: str, output_path: str):
    with sentry_sdk.start_transaction(
        op="ffmpeg.process",
        name="video_processing"
    ):
        try:
            result = subprocess.run(
                ["ffmpeg", "-i", input_path, output_path],
                capture_output=True,
                timeout=300
            )
            
            if result.returncode != 0:
                sentry_sdk.capture_message(
                    f"FFmpeg failed: {result.stderr.decode()}",
                    level="error"
                )
                
        except subprocess.TimeoutExpired:
            sentry_sdk.capture_message("FFmpeg timeout", level="error")
            raise
```

### Distributed Tracing (Next.js → FastAPI)

```typescript
// apps/web/lib/api-client.ts
import * as Sentry from "@sentry/nextjs";

export async function callWorkflowAPI(workflowId: string, params: any) {
  const transaction = Sentry.startTransaction({
    name: "api.workflow.execute",
    op: "http.client",
  });
  
  try {
    // Propagate trace context to FastAPI
    const headers = {
      "sentry-trace": transaction.toTraceparent(),
      "baggage": transaction.toBaggage(),
    };
    
    const response = await fetch(`/api/workflows/${workflowId}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    
    return await response.json();
    
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

---

## CircleCI Integration

### Automated Release Management

```yaml
# .circleci/config.yml
jobs:
  sentry_release_web:
    executor: node_executor
    steps:
      - run:
          name: Create Sentry release
          command: |
            export RELEASE_VERSION=$(git rev-parse --short HEAD)
            
            # Create release
            sentry-cli releases new -p kijko-web $RELEASE_VERSION
            
            # Associate commits
            sentry-cli releases set-commits $RELEASE_VERSION --auto
            
            # Upload source maps
            sentry-cli releases files $RELEASE_VERSION upload-sourcemaps \
              ./apps/web/.next --url-prefix "~/static/js" --rewrite
            
            # Upload shared package source maps
            sentry-cli releases files $RELEASE_VERSION upload-sourcemaps \
              ./packages/editor/dist --url-prefix "~/editor" --rewrite
            
            # Finalize release
            sentry-cli releases finalize $RELEASE_VERSION
```

### Environment Variables

```bash
# CircleCI Project Settings → Environment Variables
SENTRY_AUTH_TOKEN=<your-auth-token>
SENTRY_ORG=kijko2
SENTRY_PROJECT=kijko-web
```

---

## Augment MCP Vibe Coding Workflow

### Traditional Workflow (Without MCP)
1. User reports error in production
2. Switch to Sentry dashboard
3. Find error in issues list
4. Copy stack trace
5. Switch back to editor
6. Search for file and line number
7. Fix issue
8. Repeat

**Time per iteration:** 10-15 minutes  
**Context switches:** 2-3 per iteration

### Vibe Coding Workflow (With MCP)
1. User reports error
2. Ask Augment: "Show me the last error in kijko-web"
3. Get stack trace and context in editor
4. Ask: "Show me the session replay for this error"
5. Watch user actions leading to error
6. Fix issue without leaving editor
7. Repeat

**Time per iteration:** 2-3 minutes  
**Context switches:** 0 per iteration

**Productivity gain:** 5x faster debugging

---

## Common Augment MCP Queries

### Error Tracking
```
"Show recent Sentry errors for kijko-web"
"What's the most frequent error this week?"
"List unresolved issues for the current commit"
"Show me errors introduced in the latest release"
```

### Performance Monitoring
```
"Show me slow transactions in the timeline editor"
"What's the average response time for workflow API?"
"Show me the slowest database queries"
```

### Session Replay
```
"Show me the session replay for the last timeline crash"
"What user actions led to the drag-and-drop error?"
"Show me all sessions where users encountered the export bug"
```

### Distributed Tracing
```
"Show me the trace for the last failed workflow execution"
"What's the bottleneck in the Next.js → FastAPI → ComfyUI flow?"
```

---

## Best Practices (from Perplexity)

### PII Protection
- Use `beforeSend` hooks to redact sensitive data
- Delete email, IP address, auth tokens before sending
- Mask all text in Session Replay by default
- Unmask only specific elements (e.g., timeline labels)

### Performance Overhead
- Tune sampling rates (50% for transactions, 10% for replays)
- Avoid instrumenting all requests in high-traffic paths
- Use conditional instrumentation for heavy operations

### Source Maps
- Ensure identical release versions for builds and uploads
- Upload source maps for all shared packages
- Re-upload for every build via CircleCI

### Alert Management
- Use alert rules to filter actionable errors
- Set up owners per Sentry project
- Ignore known errors (e.g., ResizeObserver loop)

---

## Success Metrics

1. **Error detection time:** <5 minutes from occurrence to notification
2. **Debug time:** 5x faster with Session Replay
3. **Performance insights:** Identify slow operations within 1 day
4. **Release tracking:** 100% of releases tracked with commits
5. **Developer productivity:** 0 context switches during debugging

---

## Resources

- **Setup Guide:** `SENTRY_SETUP.md`
- **Full Plan:** `plan.md`
- **Sentry Docs:** https://docs.sentry.io
- **Next.js SDK:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **FastAPI SDK:** https://docs.sentry.io/platforms/python/integrations/fastapi/
- **Sentry MCP:** https://docs.sentry.io/product/sentry-mcp/
- **Session Replay:** https://docs.sentry.io/platforms/javascript/session-replay/

---

## Conclusion

Sentry + Augment MCP transforms error monitoring from reactive firefighting into **proactive debugging**. By integrating from Day 1 with incremental enhancements, we:

1. **Catch errors immediately** before users report them
2. **Maintain vibe coding flow** without context switching
3. **Debug visually** with Session Replay
4. **Optimize performance** with distributed tracing
5. **Automate release tracking** via CircleCI

The result: **5x faster debugging** and **zero context switches** during the critical 24-day merger timeline.


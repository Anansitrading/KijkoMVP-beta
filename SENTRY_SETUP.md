# Sentry Setup Guide for Kijko2 Monorepo

**Complete guide for setting up Sentry with Augment MCP integration**

---

## Why Sentry + Augment MCP?

**Sentry Benefits:**
- Real-time error tracking across Next.js and FastAPI
- Performance monitoring for timeline operations
- Session Replay for visual debugging
- Distributed tracing across services
- Automated release management via CircleCI

**Augment MCP Benefits:**
- Query errors from your editor
- Debug production issues without context switching
- Maintain vibe coding flow
- Get immediate error context while coding

---

## Phase 1: Day 1 Setup (45 minutes)

### Step 1: Create Sentry Account and Projects

```bash
# 1. Go to https://sentry.io/signup
# 2. Create organization: "kijko2"
# 3. Create 3 projects:
#    - kijko-web (Platform: Next.js)
#    - kijko-api (Platform: Python/FastAPI)
#    - kijko-editor (Platform: React)
```

### Step 2: Install Sentry SDKs

**Next.js (apps/web):**
```bash
cd apps/web
npx @sentry/wizard@latest -i nextjs

# Follow the wizard prompts:
# - Select your Sentry project: kijko-web
# - Configure source maps: Yes
# - Enable Session Replay: Yes
```

**FastAPI (apps/comfyui-gateway):**
```bash
cd apps/comfyui-gateway
pip install "sentry-sdk[fastapi]"
```

### Step 3: Configure Sentry (Next.js)

**Client-side config:**
```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: 0.5, // 50% of transactions
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions
  
  // Release tracking
  release: process.env.SENTRY_RELEASE,
  environment: process.env.NEXT_PUBLIC_ENV || 'development',
  
  // PII protection
  beforeSend(event, hint) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
  
  // Ignore known errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
  
  // Session Replay configuration
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
      unmask: ['.timeline-label', '.media-title'],
    }),
  ],
});
```

**Server-side config:**
```typescript
// apps/web/sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.5,
  release: process.env.SENTRY_RELEASE,
  environment: process.env.ENV || 'development',
});
```

### Step 4: Configure Sentry (FastAPI)

```python
# apps/comfyui-gateway/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os

def redact_pii(event, hint):
    """Remove sensitive data before sending to Sentry"""
    if event.get("request"):
        if "headers" in event["request"]:
            event["request"]["headers"].pop("Authorization", None)
            event["request"]["headers"].pop("Cookie", None)
    return event

sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.5,
    release=os.environ.get("SENTRY_RELEASE"),
    environment=os.environ.get("ENV", "development"),
    before_send=redact_pii,
)

# Your FastAPI app
app = FastAPI()
```

### Step 5: Set Environment Variables

```bash
# .env.local (Next.js)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=kijko2
SENTRY_PROJECT=kijko-web
SENTRY_AUTH_TOKEN=<your-auth-token>
SENTRY_RELEASE=${CIRCLE_SHA1:0:7}
NEXT_PUBLIC_ENV=development

# .env (FastAPI)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_RELEASE=${CIRCLE_SHA1:0:7}
ENV=development
```

### Step 6: Get Sentry Auth Token

```bash
# In Sentry dashboard:
# 1. Settings → Account → API → Auth Tokens
# 2. Click "Create New Token"
# 3. Scopes: project:read, project:write, project:releases
# 4. Name: "CircleCI Releases"
# 5. Copy the token (save it securely)
```

### Step 7: Test Sentry Integration

**Trigger a test error (Next.js):**
```typescript
// apps/web/pages/test-sentry.tsx
export default function TestSentry() {
  return (
    <button onClick={() => {
      throw new Error("Test Sentry error!");
    }}>
      Trigger Error
    </button>
  );
}
```

**Trigger a test error (FastAPI):**
```python
# apps/comfyui-gateway/main.py
@app.get("/test-sentry")
async def test_sentry():
    raise Exception("Test Sentry error!")
```

**Verify in Sentry dashboard:**
- Go to Issues → All Issues
- You should see your test errors

---

## Phase 2: Augment MCP Setup (15 minutes)

### Step 1: Configure Augment MCP for Sentry

**For VS Code:**
```bash
# Edit VS Code settings.json
code ~/.config/Code/User/settings.json
```

```json
{
  "augment.mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://mcp.sentry.dev/mcp"]
    }
  }
}
```

**For Windsurf:**
```bash
# Settings → Extensions → Augment → MCP Servers
# Add Sentry server with OAuth or API token
```

### Step 2: Test MCP Integration

```bash
# In your editor, ask Augment:
"Show recent Sentry errors for kijko-web"
"What's the most frequent error this week?"
"List unresolved issues for the current commit"
"Show me the session replay for the last timeline crash"
```

---

## Phase 3: Day 8 - Custom Instrumentation

### Instrument ComfyUI Workflow Execution

```python
# apps/comfyui-gateway/services/workflow_executor.py
import sentry_sdk

async def execute_workflow(workflow_id: str, params: dict):
    with sentry_sdk.start_transaction(
        op="comfyui.workflow",
        name=f"execute_workflow_{workflow_id}"
    ) as transaction:
        transaction.set_tag("workflow_id", workflow_id)
        transaction.set_tag("workflow_type", params.get("type"))
        
        try:
            # Workflow preparation
            with sentry_sdk.start_span(op="workflow.prepare") as span:
                workflow_data = await prepare_workflow(workflow_id, params)
                span.set_data("input_params", params)
            
            # ComfyUI API call
            with sentry_sdk.start_span(op="comfyui.api_call") as span:
                result = await comfyui_client.execute(workflow_data)
                span.set_data("execution_time", result.duration)
            
            return result
            
        except Exception as e:
            sentry_sdk.capture_exception(e)
            transaction.set_status("internal_error")
            raise
```

### Instrument FFmpeg Processing

```python
# apps/comfyui-gateway/services/ffmpeg_processor.py
import sentry_sdk
import subprocess

async def process_video(input_path: str, output_path: str):
    with sentry_sdk.start_transaction(
        op="ffmpeg.process",
        name="video_processing"
    ) as transaction:
        transaction.set_tag("input_format", input_path.split('.')[-1])
        
        try:
            with sentry_sdk.start_span(op="ffmpeg.execute") as span:
                result = subprocess.run(
                    ["ffmpeg", "-i", input_path, output_path],
                    capture_output=True,
                    timeout=300
                )
                span.set_data("exit_code", result.returncode)
                
                if result.returncode != 0:
                    sentry_sdk.capture_message(
                        f"FFmpeg failed: {result.stderr.decode()}",
                        level="error"
                    )
                    
        except subprocess.TimeoutExpired:
            sentry_sdk.capture_message("FFmpeg timeout", level="error")
            raise
```

### Configure Distributed Tracing

**Next.js → FastAPI:**
```typescript
// apps/web/lib/api-client.ts
import * as Sentry from "@sentry/nextjs";

export async function callWorkflowAPI(workflowId: string, params: any) {
  const transaction = Sentry.startTransaction({
    name: "api.workflow.execute",
    op: "http.client",
  });
  
  try {
    // Propagate trace context
    const headers = {
      "Content-Type": "application/json",
      "sentry-trace": transaction.toTraceparent(),
      "baggage": transaction.toBaggage(),
    };
    
    const response = await fetch(`/api/workflows/${workflowId}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    
    transaction.setHttpStatus(response.status);
    return await response.json();
    
  } catch (error) {
    Sentry.captureException(error);
    transaction.setStatus("internal_error");
    throw error;
  } finally {
    transaction.finish();
  }
}
```

---

## Phase 3: CircleCI Integration (Day 8)

### Add Sentry Release Jobs to CircleCI

```yaml
# .circleci/config.yml
jobs:
  sentry_release_web:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install Sentry CLI
          command: npm install -g @sentry/cli
      - run:
          name: Create Sentry release
          command: |
            export RELEASE_VERSION=$(git rev-parse --short HEAD)
            sentry-cli releases new -p kijko-web $RELEASE_VERSION
            sentry-cli releases set-commits $RELEASE_VERSION --auto
            sentry-cli releases files $RELEASE_VERSION upload-sourcemaps \
              ./apps/web/.next --url-prefix "~/static/js" --rewrite
            sentry-cli releases finalize $RELEASE_VERSION
```

### Set CircleCI Environment Variables

```bash
# In CircleCI Project Settings → Environment Variables:
SENTRY_AUTH_TOKEN=<your-auth-token>
SENTRY_ORG=kijko2
SENTRY_PROJECT=kijko-web
```

---

## Troubleshooting

### Issue: "DSN not found"

**Solution:**
```bash
# Verify environment variable is set
echo $NEXT_PUBLIC_SENTRY_DSN
echo $SENTRY_DSN

# Check .env.local file exists
cat .env.local
```

### Issue: Source maps not uploading

**Solution:**
```yaml
# Ensure source maps are generated
# next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
  sentry: {
    hideSourceMaps: false,
  },
}
```

### Issue: PII leaking to Sentry

**Solution:**
```typescript
// Use beforeSend hook
beforeSend(event, hint) {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  if (event.request?.headers) {
    delete event.request.headers.Authorization;
    delete event.request.headers.Cookie;
  }
  return event;
}
```

---

## Augment MCP Queries Cheat Sheet

```bash
# Errors
"Show recent Sentry errors for kijko-web"
"What's the most frequent error this week?"
"List unresolved issues for the current commit"

# Performance
"Show me slow transactions in the timeline editor"
"What's the average response time for workflow API?"

# Session Replay
"Show me the session replay for the last timeline crash"
"What user actions led to the drag-and-drop error?"

# Releases
"What errors were introduced in the latest release?"
"Show me the error rate for release abc123"
```

---

## Next Steps

- [ ] Day 1: Set up Sentry projects and SDKs
- [ ] Day 1: Configure Augment MCP for Sentry
- [ ] Day 8: Add custom instrumentation
- [ ] Day 8: Configure distributed tracing
- [ ] Day 8: Add CircleCI release automation
- [ ] Day 19: Enable Session Replay
- [ ] Day 22: Set up alerts and notifications

---

## Resources

- **Sentry Docs:** https://docs.sentry.io
- **Next.js SDK:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **FastAPI SDK:** https://docs.sentry.io/platforms/python/integrations/fastapi/
- **Sentry MCP:** https://docs.sentry.io/product/sentry-mcp/
- **Session Replay:** https://docs.sentry.io/platforms/javascript/session-replay/


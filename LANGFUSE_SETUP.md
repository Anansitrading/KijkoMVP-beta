# Langfuse Setup Guide - Agent Observability & Cost Tracking

**Purpose:** Complete guide for integrating Langfuse into the Kijko Production multi-agent workflow system

**Target:** Day 1 setup + incremental expansion through Phase 4

---

## Why Langfuse for Kijko Production?

Based on Perplexity research, Langfuse provides **mission-critical observability** for multi-agent workflows:

### Key Benefits
- **Agent workflow visibility** for 10-15 sequential AI agents (VRD → ScriptSmith → ShotMaster → Video Solver)
- **Multi-step tracing** for complex decision chains with human approval gates
- **Cost attribution per agent** (critical when AI Concept Generator creates 100+ concepts)
- **Decision point analysis** for tracking why agents made specific recommendations
- **Framework-agnostic** (works with LangGraph + ComfyUI + custom agents)
- **Open source & self-hosted** (client data security for NDAs and competitive advantage)

---

## Day 1: Railway Deployment (15 minutes)

### Step 1: Deploy Langfuse to Railway

Use Railway's one-click template with **separate PostgreSQL database**:

```bash
# 1. Go to https://railway.app/template/langfuse
# 2. Click "Deploy Now"
# 3. Configure environment variables:

NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-langfuse.railway.app
DATABASE_URL=postgresql://langfuse_user:password@host:5432/langfuse_db
SALT=$(openssl rand -base64 32)

# 4. Deploy (takes ~5 minutes)
```

**Why separate database? (from Perplexity)**
- Separation of concerns (Langfuse trace data vs. application data)
- Easier scalability and maintenance
- Prevents cluttering main application database with trace data

### Step 2: Create Langfuse API Keys

```bash
# 1. Open Langfuse dashboard: https://your-langfuse.railway.app
# 2. Go to Settings → API Keys
# 3. Create new API key pair:
#    - Public Key: pk-lf-xxx
#    - Secret Key: sk-lf-xxx
# 4. Save keys securely (you'll need them for SDK configuration)
```

---

## Day 1: SDK Installation (10 minutes)

### Create Shared Langfuse Package (Turborepo Monorepo)

**Rationale (from Perplexity):**
- Centralized updates across all apps
- Reduced duplication
- Consistent configuration

```bash
# Create shared Langfuse package
mkdir -p packages/langfuse
cd packages/langfuse

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@kijko/langfuse",
  "version": "0.1.0",
  "main": "index.ts",
  "dependencies": {
    "langfuse": "^3.0.0",
    "langfuse-langchain": "^3.0.0"
  }
}
EOF

# Install dependencies
pnpm install
```

### Python SDK Configuration

```python
# packages/langfuse/python/client.py
from langfuse import Langfuse
from langfuse.decorators import observe
import os

langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST", "https://your-langfuse.railway.app")
)

# PII sanitization (from Perplexity)
def sanitize_trace(trace_data: dict) -> dict:
    """Remove PII from trace data before sending to Langfuse"""
    if "user" in trace_data:
        trace_data["user"].pop("email", None)
        trace_data["user"].pop("ip_address", None)
    if "metadata" in trace_data:
        trace_data["metadata"].pop("auth_token", None)
        trace_data["metadata"].pop("api_key", None)
    return trace_data
```

### TypeScript SDK Configuration

```typescript
// packages/langfuse/index.ts
import { Langfuse } from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.NEXT_PUBLIC_LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_HOST,
});
```

### Environment Variables

```bash
# .env (FastAPI - apps/comfyui-gateway)
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=https://your-langfuse.railway.app

# .env.local (Next.js - apps/web)
NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY=pk-lf-xxx
NEXT_PUBLIC_LANGFUSE_SECRET_KEY=sk-lf-xxx
NEXT_PUBLIC_LANGFUSE_HOST=https://your-langfuse.railway.app
```

### Test Langfuse Integration

```python
# apps/comfyui-gateway/test_langfuse.py
from packages.langfuse.python.client import langfuse

# Create a test trace
trace = langfuse.trace(name="test_trace")
span = trace.span(name="test_span", input={"test": "data"})
span.end(output={"result": "success"})

print(f"✅ Langfuse test successful! Check dashboard: {os.getenv('LANGFUSE_HOST')}")
```

---

## Phase 3: Agent Instrumentation (Days 8-14)

### Decorator Pattern for Simple Agents

```python
# apps/comfyui-gateway/agents/vrd_agent.py
from langfuse.decorators import observe
from packages.langfuse.python.client import langfuse, sanitize_trace

@observe()  # Automatic tracing
async def vrd_agent_action(brief: dict):
    """VRD Agent: Analyzes brief and creates Video Requirements Doc"""
    
    trace = langfuse.trace(
        name="vrd_agent",
        input=sanitize_trace(brief),
        metadata={
            "agent": "VRD Agent",
            "workflow": "ad_agency_pipeline",
        }
    )
    
    try:
        # Agent logic here
        vrd = await generate_vrd(brief)
        
        # Track cost
        trace.update(
            output=sanitize_trace(vrd),
            metadata={
                "tokens_used": vrd.tokens,
                "cost_usd": vrd.tokens * 0.00002,  # GPT-4 pricing
            }
        )
        
        return vrd
        
    except Exception as e:
        trace.update(level="ERROR", status_message=str(e))
        raise
```

### Nested Spans for Multi-Agent Workflows

```python
# apps/comfyui-gateway/workflows/ad_agency_pipeline.py
async def ad_agency_pipeline(brief: dict):
    """Multi-agent workflow: VRD Agent → ScriptSmith → ShotMaster → Video Solver"""
    
    # Parent trace for entire pipeline
    trace = langfuse.trace(
        name="ad_agency_pipeline",
        input=sanitize_trace(brief),
        metadata={"pipeline": "ad_agency", "client": brief.get("client_name")}
    )
    
    try:
        # Agent 1: VRD Agent
        with trace.span(name="vrd_agent") as vrd_span:
            vrd = await vrd_agent_action(brief)
            vrd_span.end(output={"vrd_id": vrd.id})
        
        # Agent 2: ScriptSmith
        with trace.span(name="scriptsmith_agent") as script_span:
            script = await scriptsmith_action(vrd)
            script_span.end(output={"script_length": len(script.scenes)})
        
        # Agent 3: ShotMaster
        with trace.span(name="shotmaster_agent") as shot_span:
            storyboard = await shotmaster_action(script)
            shot_span.end(output={"shots": len(storyboard.shots)})
        
        # Agent 4: Video Solver
        with trace.span(name="video_solver_agent") as solver_span:
            production_plan = await video_solver_action(storyboard)
            solver_span.end(output={"production_method": production_plan.method})
        
        # Calculate total cost
        total_cost = sum([vrd.cost, script.cost, storyboard.cost, production_plan.cost])
        
        trace.update(
            output=sanitize_trace(production_plan),
            metadata={
                "total_cost_usd": total_cost,
                "agents_executed": 4,
                "pipeline_duration_seconds": trace.duration
            }
        )
        
        return production_plan
        
    except Exception as e:
        trace.update(level="ERROR", status_message=str(e))
        raise
```

### LangGraph Callback Integration

```python
# apps/comfyui-gateway/agents/langgraph_integration.py
from langgraph.graph import StateGraph
from langfuse.callback import CallbackHandler

# Create callback handler
langfuse_handler = CallbackHandler(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST")
)

# Create LangGraph workflow
workflow = StateGraph()
workflow.add_node("vrd_agent", vrd_agent_action)
workflow.add_node("scriptsmith", scriptsmith_action)
workflow.add_node("shotmaster", shotmaster_action)
workflow.add_node("video_solver", video_solver_action)

# Add edges
workflow.add_edge("vrd_agent", "scriptsmith")
workflow.add_edge("scriptsmith", "shotmaster")
workflow.add_edge("shotmaster", "video_solver")

# Compile with Langfuse callback
app = workflow.compile()

# Execute with tracing
result = await app.ainvoke(
    {"input": brief},
    config={"callbacks": [langfuse_handler]}
)
```

---

## Phase 4: Evaluations & Datasets (Days 15-18)

### Automated Quality Scoring

```python
# apps/comfyui-gateway/evaluations/concept_quality.py
async def evaluate_concept_quality(concept: dict, trace_id: str):
    """Evaluate AI Concept Generator output quality"""
    
    # Calculate quality metrics
    creativity_score = await score_creativity(concept)
    brand_score = await score_brand_alignment(concept)
    feasibility_score = await score_feasibility(concept)
    
    # Send evaluation to Langfuse
    langfuse.score(
        trace_id=trace_id,
        name="concept_quality",
        value=(creativity_score + brand_score + feasibility_score) / 3,
        data_type="NUMERIC",
        comment=f"Creativity: {creativity_score}, Brand: {brand_score}, Feasibility: {feasibility_score}"
    )
    
    # If score is low, add to dataset for improvement
    if (creativity_score + brand_score + feasibility_score) / 3 < 0.6:
        langfuse.create_dataset_item(
            dataset_name="failed_concepts",
            input=concept["brief"],
            expected_output=None,  # Will be filled by human review
            metadata={
                "failure_reason": "low_quality_score",
                "scores": {
                    "creativity": creativity_score,
                    "brand": brand_score,
                    "feasibility": feasibility_score
                }
            }
        )
```

### Sentry + Langfuse Integration

```python
# apps/comfyui-gateway/integrations/sentry_langfuse.py
import sentry_sdk
from langfuse import Langfuse

async def capture_agent_failure(agent_name: str, input_data: dict, error: Exception, trace_id: str):
    """Capture agent failures in both Sentry and Langfuse"""
    
    # Send to Sentry for error monitoring
    sentry_sdk.capture_exception(error)
    
    # Add to Langfuse dataset for regression testing
    langfuse.create_dataset_item(
        dataset_name=f"{agent_name}_failures",
        input=input_data,
        expected_output=None,  # Will be filled after fix
        metadata={
            "error_type": type(error).__name__,
            "error_message": str(error),
            "trace_id": trace_id,
            "sentry_event_id": sentry_sdk.last_event_id(),
        }
    )
```

---

## Phase 5: Custom MCP Integration (Days 19-21)

### Deploy Custom Langfuse MCP API

**Why custom API? (from Perplexity)**
- Langfuse doesn't have official MCP server yet
- Custom FastAPI layer enables natural language queries from Augment
- Provides context-aware responses for vibe coding workflow

```python
# apps/langfuse-mcp/main.py
from fastapi import FastAPI, HTTPException
from langfuse import Langfuse
from datetime import datetime, timedelta

app = FastAPI()
langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST")
)

@app.post("/query")
async def handle_query(query: dict):
    """Handle natural language queries from Augment MCP"""
    
    query_text = query.get("query", "").lower()
    
    # Recent agent failures
    if "recent" in query_text and "failure" in query_text:
        traces = langfuse.get_traces(
            filter={
                "level": "ERROR",
                "from_timestamp": datetime.now() - timedelta(hours=24)
            },
            limit=10
        )
        return {
            "response": f"Found {len(traces)} agent failures in the last 24 hours",
            "data": [
                {
                    "agent": trace.name,
                    "error": trace.metadata.get("error"),
                    "timestamp": trace.timestamp
                }
                for trace in traces
            ]
        }
    
    # Average cost per workflow
    if "average cost" in query_text:
        traces = langfuse.get_traces(
            filter={"from_timestamp": datetime.now() - timedelta(days=1)},
            limit=100
        )
        total_cost = sum([trace.metadata.get("total_cost_usd", 0) for trace in traces])
        avg_cost = total_cost / len(traces) if traces else 0
        
        return {
            "response": f"Average cost per workflow today: ${avg_cost:.2f}",
            "data": {"average_cost_usd": avg_cost, "workflows_executed": len(traces)}
        }
    
    # Slowest agent
    if "slowest agent" in query_text:
        traces = langfuse.get_traces(limit=100)
        agent_durations = {}
        
        for trace in traces:
            for span in trace.spans:
                agent_name = span.name
                duration = span.duration
                if agent_name not in agent_durations:
                    agent_durations[agent_name] = []
                agent_durations[agent_name].append(duration)
        
        slowest_agent = max(agent_durations.items(), key=lambda x: sum(x[1]) / len(x[1]))
        
        return {
            "response": f"Slowest agent: {slowest_agent[0]} (avg {sum(slowest_agent[1]) / len(slowest_agent[1]):.2f}s)",
            "data": {"agent": slowest_agent[0], "avg_duration_seconds": sum(slowest_agent[1]) / len(slowest_agent[1])}
        }
    
    return {"response": "Query not recognized", "data": None}
```

### Railway Deployment

```bash
# apps/langfuse-mcp/railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Augment MCP Configuration

```json
// VS Code settings.json or Windsurf config
{
  "augment.mcpServers": {
    "langfuse": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://your-langfuse-mcp.railway.app/mcp"]
    }
  }
}
```

---

## Common Langfuse MCP Queries (Cheat Sheet)

### Agent Performance
- "Show me recent agent failures"
- "What's the slowest agent in the pipeline?"
- "Which agent has the highest error rate?"
- "Show me VRD Agent performance over the last week"

### Cost Tracking
- "What's the average cost per workflow today?"
- "Show me the most expensive workflow this month"
- "What's the total AI spend this week?"
- "Which agent consumes the most budget?"

### Quality Metrics
- "Show me low-quality concept scores from yesterday"
- "What's the average quality score for ScriptSmith?"
- "Show me legal compliance violations this week"

### Debugging
- "Show me the trace for workflow ID abc123"
- "What happened in the last failed ad agency pipeline?"
- "Show me all traces with errors in the last hour"

---

## Troubleshooting

### Issue: Traces not appearing in Langfuse dashboard

**Solution:**
```python
# Check environment variables
print(f"LANGFUSE_HOST: {os.getenv('LANGFUSE_HOST')}")
print(f"LANGFUSE_PUBLIC_KEY: {os.getenv('LANGFUSE_PUBLIC_KEY')[:10]}...")

# Test connection
trace = langfuse.trace(name="connection_test")
trace.update(output={"status": "success"})
print("✅ Trace created successfully")
```

### Issue: High latency when sending traces

**Solution (from Perplexity):**
```python
# Use async mode for non-blocking trace sending
langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST"),
    flush_at=10,  # Batch traces
    flush_interval=1.0  # Flush every 1 second
)
```

### Issue: PII leaking into traces

**Solution:**
Always use `sanitize_trace()` before sending data:
```python
trace = langfuse.trace(
    name="agent_action",
    input=sanitize_trace(user_input),  # ✅ Sanitized
    output=sanitize_trace(result)      # ✅ Sanitized
)
```

---

## Next Steps

1. ✅ Deploy Langfuse to Railway (Day 1)
2. ✅ Install SDKs and test connection (Day 1)
3. ✅ Instrument first agent with @observe decorator (Phase 3)
4. ✅ Add nested spans for multi-agent workflows (Phase 3)
5. ✅ Set up evaluations and datasets (Phase 4)
6. ✅ Deploy custom MCP API (Phase 5)
7. ✅ Configure Augment MCP (Phase 5)
8. ✅ Test vibe coding workflow with Langfuse queries (Phase 5)

**Documentation:**
- Langfuse Self-Hosting: https://langfuse.com/docs/deployment/self-host
- Langfuse Python SDK: https://langfuse.com/docs/sdk/python
- Langfuse LangGraph Integration: https://langfuse.com/docs/integrations/langchain
- Langfuse Evaluations: https://langfuse.com/docs/scores/model-based-evals
- Langfuse Datasets: https://langfuse.com/docs/datasets/overview


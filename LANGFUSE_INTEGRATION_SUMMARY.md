# Langfuse Integration Summary - Multi-Agent Observability

**Purpose:** Executive summary of Langfuse integration for Kijko Production multi-agent workflows

**Based on:** Perplexity research on Langfuse architecture, deployment, and MCP integration

---

## Why Langfuse is Critical for Kijko Production

### The Challenge

Kijko Production runs **10-15 sequential AI agents** for ad agency and film production workflows:

```
VRD Agent → ScriptSmith → ShotMaster → Video Solver → MoodMaker → ...
```

**Without Langfuse:**
- ❌ No visibility into which agent failed or why
- ❌ No cost attribution per agent (critical when AI Concept Generator creates 100+ concepts)
- ❌ No decision point analysis (why did AI Budget Solver choose hybrid production?)
- ❌ No quality metrics for agent outputs
- ❌ No regression testing for failed workflows

**With Langfuse:**
- ✅ Complete trace visualization for entire pipeline
- ✅ Cost tracking per agent and per workflow
- ✅ Decision point analysis with metadata
- ✅ Automated quality evaluations
- ✅ Dataset creation from production failures
- ✅ Regression testing with Langfuse datasets

---

## Phased Adoption Strategy

### Phase 1: Day 1 Setup (15 minutes)

**Deploy Langfuse to Railway:**
- One-click template deployment
- Separate PostgreSQL database for trace data
- API key generation

**Install SDKs:**
- Shared `@kijko/langfuse` package in Turborepo monorepo
- Python SDK for FastAPI backend
- TypeScript SDK for Next.js frontend

**Test Connection:**
- Create test trace
- Verify dashboard visibility

**Deliverables:**
- ✅ Langfuse running on Railway
- ✅ SDKs installed and configured
- ✅ Environment variables set

---

### Phase 3: Agent Instrumentation (Days 8-14)

**Decorator Pattern for Simple Agents:**
```python
@observe()
async def vrd_agent_action(brief: dict):
    trace = langfuse.trace(name="vrd_agent", input=sanitize_trace(brief))
    # ... agent logic
    trace.update(output=result, metadata={"cost_usd": cost})
```

**Nested Spans for Multi-Agent Workflows:**
```python
trace = langfuse.trace(name="ad_agency_pipeline")
with trace.span(name="vrd_agent") as span:
    vrd = await vrd_agent_action(brief)
    span.end(output={"vrd_id": vrd.id})
```

**LangGraph Callback Integration:**
```python
langfuse_handler = CallbackHandler(...)
result = await app.ainvoke({"input": brief}, config={"callbacks": [langfuse_handler]})
```

**Deliverables:**
- ✅ All agents instrumented with @observe decorators
- ✅ Multi-agent pipelines using nested spans
- ✅ LangGraph workflows integrated with callbacks
- ✅ Cost tracking per agent
- ✅ PII sanitization in place

---

### Phase 4: Evaluations & Datasets (Days 15-18)

**Automated Quality Scoring:**
```python
langfuse.score(
    trace_id=trace_id,
    name="concept_quality",
    value=quality_score,
    data_type="NUMERIC"
)
```

**Dataset Creation from Failures:**
```python
langfuse.create_dataset_item(
    dataset_name="failed_concepts",
    input=concept["brief"],
    expected_output=None,  # Filled by human review
    metadata={"failure_reason": "low_quality_score"}
)
```

**Sentry + Langfuse Integration:**
```python
# Send to Sentry for error monitoring
sentry_sdk.capture_exception(error)

# Add to Langfuse dataset for regression testing
langfuse.create_dataset_item(
    dataset_name=f"{agent_name}_failures",
    input=input_data,
    metadata={"sentry_event_id": sentry_sdk.last_event_id()}
)
```

**Deliverables:**
- ✅ Automated quality evaluations for agent outputs
- ✅ Datasets created from production failures
- ✅ Sentry-Langfuse integration for complete observability
- ✅ Regression testing with Langfuse datasets

---

### Phase 5: Custom MCP Integration (Days 19-21)

**Why Custom MCP? (from Perplexity)**
- Langfuse doesn't have official MCP server yet
- Custom FastAPI layer enables natural language queries from Augment
- Provides context-aware responses for vibe coding workflow

**Custom MCP API:**
```python
@app.post("/query")
async def handle_query(query: dict):
    query_text = query.get("query", "").lower()
    
    if "recent" in query_text and "failure" in query_text:
        traces = langfuse.get_traces(filter={"level": "ERROR"}, limit=10)
        return {"response": f"Found {len(traces)} agent failures", "data": traces}
```

**Augment MCP Configuration:**
```json
{
  "augment.mcpServers": {
    "langfuse": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://your-langfuse-mcp.railway.app/mcp"]
    }
  }
}
```

**Deliverables:**
- ✅ Custom Langfuse MCP API deployed to Railway
- ✅ Augment MCP configured for Langfuse queries
- ✅ Natural language queries working from editor
- ✅ Vibe coding workflow tested

---

## Multi-Agent Instrumentation Patterns

### Pattern 1: Simple Agent (Decorator)

**Use Case:** Single-step agents (VRD Agent, ScriptSmith)

```python
@observe()
async def vrd_agent_action(brief: dict):
    trace = langfuse.trace(name="vrd_agent", input=sanitize_trace(brief))
    vrd = await generate_vrd(brief)
    trace.update(output=sanitize_trace(vrd), metadata={"cost_usd": vrd.cost})
    return vrd
```

**Benefits:**
- Minimal code changes
- Automatic tracing
- Easy to add to existing agents

---

### Pattern 2: Multi-Agent Pipeline (Nested Spans)

**Use Case:** Sequential agent workflows (Ad Agency Pipeline, Film Production Pipeline)

```python
async def ad_agency_pipeline(brief: dict):
    trace = langfuse.trace(name="ad_agency_pipeline", input=sanitize_trace(brief))
    
    with trace.span(name="vrd_agent") as span:
        vrd = await vrd_agent_action(brief)
        span.end(output={"vrd_id": vrd.id})
    
    with trace.span(name="scriptsmith_agent") as span:
        script = await scriptsmith_action(vrd)
        span.end(output={"script_length": len(script.scenes)})
    
    total_cost = sum([vrd.cost, script.cost])
    trace.update(metadata={"total_cost_usd": total_cost})
```

**Benefits:**
- Complete pipeline visibility
- Cost attribution per agent
- Performance analysis per step

---

### Pattern 3: LangGraph Integration (Callback)

**Use Case:** Complex agent graphs with conditional logic

```python
langfuse_handler = CallbackHandler(...)
workflow = StateGraph()
workflow.add_node("vrd_agent", vrd_agent_action)
workflow.add_node("scriptsmith", scriptsmith_action)
app = workflow.compile()

result = await app.ainvoke({"input": brief}, config={"callbacks": [langfuse_handler]})
```

**Benefits:**
- Automatic tracing for all LangGraph nodes
- No manual instrumentation needed
- Works with conditional edges and loops

---

## Evaluation & Dataset Examples

### Example 1: Concept Quality Evaluation

**Scenario:** AI Concept Generator creates 100+ concepts for a campaign

**Evaluation:**
```python
creativity_score = await score_creativity(concept)
brand_score = await score_brand_alignment(concept)
feasibility_score = await score_feasibility(concept)

langfuse.score(
    trace_id=trace_id,
    name="concept_quality",
    value=(creativity_score + brand_score + feasibility_score) / 3,
    comment=f"Creativity: {creativity_score}, Brand: {brand_score}, Feasibility: {feasibility_score}"
)
```

**Dataset Creation:**
```python
if quality_score < 0.6:
    langfuse.create_dataset_item(
        dataset_name="failed_concepts",
        input=concept["brief"],
        metadata={"failure_reason": "low_quality_score", "scores": {...}}
    )
```

---

### Example 2: Legal Compliance Evaluation

**Scenario:** Generated ads must comply with legal/regulatory requirements

**Evaluation:**
```python
violations = await check_legal_compliance(generated_ad)
compliance_score = 1.0 if len(violations) == 0 else 0.0

langfuse.score(
    trace_id=trace_id,
    name="legal_compliance",
    value=compliance_score,
    comment=f"Violations: {', '.join(violations) if violations else 'None'}"
)
```

**Dataset Creation + Sentry Alert:**
```python
if violations:
    langfuse.create_dataset_item(
        dataset_name="legal_violations",
        input=generated_ad["concept"],
        metadata={"violations": violations}
    )
    
    sentry_sdk.capture_message(
        f"Legal violation in generated ad: {', '.join(violations)}",
        level="warning"
    )
```

---

### Example 3: Regression Testing

**Scenario:** Ensure previously failed concepts don't fail again

```python
@pytest.mark.asyncio
async def test_concept_generator_regression():
    dataset = langfuse.get_dataset("failed_concepts")
    
    for item in dataset.items:
        result = await ai_concept_generator(item.input)
        quality_score = await evaluate_concept_quality(result, item.trace_id)
        assert quality_score > 0.6, f"Concept still failing: {item.input}"
```

---

## Vibe Coding Workflow Comparison

### Traditional Workflow (Without Langfuse MCP)

1. Make code changes to agent
2. Push to branch
3. Wait for CircleCI build
4. **Switch to browser** → Open Langfuse dashboard
5. **Search for trace** → Find relevant workflow
6. **Analyze trace** → Identify issue
7. **Switch back to editor** → Fix issue
8. Repeat

**Time per iteration:** 5-10 minutes  
**Context switches:** 3 per iteration

---

### Vibe Coding Workflow (With Langfuse MCP)

1. Make code changes to agent
2. Push to branch
3. Wait for CircleCI build
4. **Ask Augment:** "Show me recent agent failures"
5. **Get immediate response** with trace data
6. **Ask Augment:** "What's the average cost per workflow?"
7. **Get immediate response** with cost breakdown
8. Fix issue based on insights
9. Repeat

**Time per iteration:** 1-2 minutes  
**Context switches:** 0 per iteration

**Result: 3-5x faster iteration during the 24-day timeline**

---

## Common Langfuse MCP Queries

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

## Complete Observability Architecture

### Langfuse + Sentry + CircleCI Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    Augment MCP (Editor)                      │
│  "Show me recent agent failures" → Langfuse MCP              │
│  "Show recent Sentry errors" → Sentry MCP                    │
│  "Did my build pass?" → CircleCI MCP                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Observability Layer                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Langfuse   │  │    Sentry    │  │   CircleCI   │      │
│  │              │  │              │  │              │      │
│  │ Agent traces │  │ Error        │  │ Build        │      │
│  │ Cost tracking│  │ monitoring   │  │ status       │      │
│  │ Quality eval │  │ Performance  │  │ Test results │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Multi-Agent Workflows (LangGraph + ComfyUI)         │   │
│  │  VRD → ScriptSmith → ShotMaster → Video Solver       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- **Langfuse:** Agent-level observability, cost tracking, quality metrics
- **Sentry:** Runtime error tracking, performance monitoring, session replay
- **CircleCI:** Build status, test results, deployment tracking
- **Augment MCP:** Unified interface for all observability queries

---

## Key Metrics & ROI

### Development Velocity
- **3-5x faster iteration** with Langfuse MCP (1-2 min vs 5-10 min per iteration)
- **Zero context switching** during debugging
- **Immediate insights** without leaving editor

### Cost Optimization
- **Per-agent cost attribution** enables targeted optimization
- **Identify expensive agents** (e.g., AI Concept Generator creating 100+ concepts)
- **Track total AI spend** across all workflows

### Quality Improvement
- **Automated quality evaluations** for all agent outputs
- **Regression testing** with Langfuse datasets
- **Continuous improvement** based on production data

### Observability Coverage
- **100% agent coverage** with @observe decorators
- **Complete pipeline visibility** with nested spans
- **Decision point analysis** with metadata tracking

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

---

## Summary

Langfuse provides **mission-critical observability** for Kijko Production's multi-agent workflows:

- ✅ **Complete visibility** into 10-15 sequential AI agents
- ✅ **Cost attribution** per agent and per workflow
- ✅ **Quality evaluations** with automated scoring
- ✅ **Regression testing** with datasets from production failures
- ✅ **Vibe coding workflow** with Augment MCP integration
- ✅ **3-5x faster iteration** during development

All documentation is backed by expert Perplexity research and follows industry best practices for multi-agent observability with minimal tech debt!


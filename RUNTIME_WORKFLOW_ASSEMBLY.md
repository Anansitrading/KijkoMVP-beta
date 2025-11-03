# Runtime Workflow Assembly Feature

## Overview

**Added to plan.md Section 4.1.1** - A critical feature that enables agents to dynamically assemble new workflow templates at runtime based on user intent, then save them for future reuse.

## Why This Feature Matters

### Cannot Be Replicated with ComfyUI Skills

ComfyUI Skills uses a **static file system** approach where workflows are predefined JSON files. This has fundamental limitations:

❌ **Static composition** - Workflows must be manually created and saved as files  
❌ **No runtime adaptation** - Cannot dynamically adjust based on context  
❌ **No learning** - Cannot improve or create new workflows from user interactions  
❌ **No state management** - Cannot handle complex multi-step workflows with conditional logic  
❌ **No collaborative creation** - No conversational UI for workflow refinement  

### LangGraph + Custom Storage Advantages

✅ **Dynamic composition** - Agents build workflows programmatically at runtime  
✅ **Stateful execution** - LangGraph manages state across steps with conditional edges  
✅ **Persistent storage** - PostgreSQL stores templates with vector embeddings  
✅ **Runtime registration** - New templates immediately available for RAG search  
✅ **Collaborative creation** - Conversational UI for workflow refinement  
✅ **Continuous learning** - Workflows improve based on usage and feedback  

## Architecture

### 1. Runtime Assembly Engine

```python
# apps/comfyui-gateway/agents/workflow_assembler.py
@observe(name="assemble_custom_workflow")
async def assemble_custom_workflow(user_intent: str, context: dict):
    """Agent assembles new workflow template at runtime"""
    
    # 1. Semantic search for similar workflows
    similar = await workflow_discovery.find_workflow(user_intent)
    
    # 2. LangGraph dynamically assembles steps
    workflow_graph = StateGraph()
    
    # Add nodes based on context
    if context.get('requires_video_gen'):
        workflow_graph.add_node("comfyui_gen", comfyui_tool)
    
    if context.get('requires_script'):
        workflow_graph.add_node("scriptsmith", scriptsmith_agent)
    
    # 3. Conditional edges based on results
    workflow_graph.add_conditional_edges(
        "comfyui_gen",
        lambda state: "post_process" if state.quality > 0.8 else "retry"
    )
    
    # 4. Save as new template for future use
    workflow_template = await db.create_workflow_template(
        name=generate_workflow_name(user_intent),
        graph=workflow_graph.to_json(),
        embedding=await embed(user_intent),
        suggested_by_agent=True,
        confidence=calculate_confidence(similar)
    )
    
    return workflow_template
```

### 2. Collaborative UI

```typescript
// apps/web/src/components/ai-panel/WorkflowSuggestion.tsx
const handleAgentSuggestion = (workflow: AssembledWorkflow) => {
  addMessage({
    role: "assistant",
    content: `I've assembled a custom workflow: **${workflow.name}**. 
              Would you like to save this as a reusable template?`,
    actions: [
      { label: "Save as template", onClick: () => saveWorkflowTemplate(workflow) },
      { label: "Modify first", onClick: () => openWorkflowEditor(workflow) },
      { label: "Use once only", onClick: () => executeWorkflow(workflow) }
    ]
  });
};
```

### 3. Database Schema

```sql
-- Enhanced workflow_templates table
ALTER TABLE workflow_templates ADD COLUMN suggested_by_agent BOOLEAN DEFAULT FALSE;
ALTER TABLE workflow_templates ADD COLUMN confidence FLOAT;
ALTER TABLE workflow_templates ADD COLUMN based_on_workflows JSONB;
ALTER TABLE workflow_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE workflow_templates ADD COLUMN last_used_at TIMESTAMP;

-- Track workflow template evolution
CREATE TABLE workflow_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  version INTEGER NOT NULL,
  graph JSONB NOT NULL,
  changes_description TEXT,
  created_by TEXT, -- 'agent' or user_id
  created_at TIMESTAMP DEFAULT NOW()
);
```

## User Flow Example

### Scenario: User requests a custom video workflow

1. **User:** "Create a 10-second product demo with smooth camera motion and voiceover"

2. **Agent analyzes intent:**
   - Requires: video generation, camera motion, voiceover
   - Searches for similar workflows via RAG
   - Finds: "product_demo_basic" (similarity: 0.75)

3. **Agent assembles workflow:**
   ```python
   workflow_graph = StateGraph()
   workflow_graph.add_node("script_gen", scriptsmith_agent)
   workflow_graph.add_node("video_gen", comfyui_product_demo_tool)
   workflow_graph.add_node("voiceover", voice_generation_tool)
   workflow_graph.add_node("human_approval", human_approval_node)
   
   # Conditional edges
   workflow_graph.add_conditional_edges(
       "video_gen",
       lambda state: "voiceover" if state.quality > 0.8 else "retry"
   )
   ```

4. **Agent suggests workflow:**
   ```
   Assistant: I've assembled a custom workflow: "Product Demo with Voiceover"
   
   This workflow will:
   1. Generate a script for your product demo
   2. Create a 10-second video with smooth camera motion
   3. Add professional voiceover
   4. Request your approval before finalizing
   
   [Save as template] [Modify first] [Use once only]
   ```

5. **User saves template:**
   - Workflow stored in PostgreSQL with embedding
   - Immediately available for RAG search
   - Future requests like "product demo" will find this workflow

6. **Continuous improvement:**
   - Usage tracked (usage_count, last_used_at)
   - Confidence score updated based on success rate
   - Versions tracked for rollback if needed

## Key Features

### 1. Dynamic Node Composition

Agents can add/remove nodes based on context:
- Video generation nodes (ComfyUI workflows)
- Script generation nodes (ScriptSmith agent)
- Voiceover nodes (TTS tools)
- Post-processing nodes (FFmpeg tools)
- Human approval gates

### 2. Conditional Execution

LangGraph enables complex conditional logic:
```python
workflow_graph.add_conditional_edges(
    "comfyui_gen",
    lambda state: "post_process" if state.quality > 0.8 else "retry",
    {
        "post_process": "scriptsmith",
        "retry": "comfyui_gen"
    }
)
```

### 3. State Management

LangGraph maintains state across steps:
```python
class WorkflowState(TypedDict):
    user_intent: str
    script: Optional[str]
    video_url: Optional[str]
    quality_score: float
    retry_count: int
    approval_status: str
```

### 4. Confidence Scoring

Agent calculates confidence based on similarity to existing workflows:
```python
def calculate_confidence(similar_workflows: list) -> float:
    if not similar_workflows:
        return 0.5  # Low confidence for novel workflows
    
    avg_similarity = sum(w.similarity for w in similar_workflows) / len(similar_workflows)
    return min(avg_similarity + 0.2, 1.0)
```

### 5. Template Versioning

Track workflow evolution over time:
- Version history for rollback
- Changes description for audit trail
- Created by agent or user for attribution

### 6. RAG Integration

New templates immediately searchable:
```python
# Generate embedding for workflow
embedding = await openai.embeddings.create(
    model="text-embedding-3-small",
    input=f"{workflow.name} {workflow.description}"
)

# Store with embedding for vector search
await db.insertWorkflow({
    ...workflow,
    embedding: embedding.data[0].embedding
})
```

## Implementation Checklist

Added to Phase 4 checklist in plan.md:

- [ ] **Implement runtime workflow assembly with LangGraph StateGraph**
- [ ] **Add workflow template versioning and confidence scoring**
- [ ] **Build collaborative workflow suggestion UI**
- [ ] **Test agent-suggested workflow creation and storage**
- [ ] **Langfuse: Instrument workflow assembly with @observe decorator**

## Success Metrics

Added to plan.md success metrics:

6. **Runtime Workflow Assembly**: Agent successfully creates and saves new workflow templates from user intent
7. **Template Reusability**: Agent-suggested workflows are discoverable via RAG and reusable across sessions

## Benefits Over ComfyUI Skills

| Feature | ComfyUI Skills | LangGraph + Custom Storage |
|---------|----------------|----------------------------|
| **Workflow Creation** | Manual JSON files | Runtime assembly by agent |
| **Adaptation** | Static, predefined | Dynamic, context-aware |
| **State Management** | None | LangGraph StateGraph |
| **Conditional Logic** | Limited | Full conditional edges |
| **Learning** | None | Continuous improvement |
| **Discovery** | File system search | Vector similarity (RAG) |
| **Collaboration** | File editing | Conversational UI |
| **Versioning** | Git-based | Database-tracked |
| **Observability** | None | Langfuse instrumentation |

## Integration Points

### 1. Langfuse Observability

```python
@observe(name="assemble_custom_workflow")
async def assemble_custom_workflow(user_intent: str, context: dict):
    # Automatically traced in Langfuse
    # Tracks: execution time, confidence score, success rate
```

### 2. PostgreSQL + pgvector

```sql
-- Vector similarity search for workflow discovery
SELECT *, 
       1 - (embedding <=> $1) AS similarity
FROM workflow_templates
WHERE suggested_by_agent = TRUE
ORDER BY similarity DESC
LIMIT 3
```

### 3. Zustand Store

```typescript
// packages/stores/ai/workflow-store.ts
export const useWorkflowStore = create<WorkflowStore>((set) => ({
  agentSuggestedWorkflows: [],
  addAgentSuggestion: (workflow) => {
    set((state) => ({
      agentSuggestedWorkflows: [...state.agentSuggestedWorkflows, workflow]
    }));
  }
}));
```

## Documentation References

All documentation for this feature is available in Raindrop:

**LangGraph (Context7 Available):**
- [LangGraph Getting Started](https://langchain-ai.github.io/langgraphjs/getting_started/)
- [LangGraph State Management](https://langchain-ai.github.io/langgraphjs/concepts/state/)
- [LangGraph Human-in-the-Loop](https://langchain-ai.github.io/langgraphjs/concepts/human_in_the_loop/)

**LangChain (Context7 Available):**
- [LangChain.js Agents](https://js.langchain.com/docs/modules/agents/)
- [LangChain.js Memory](https://js.langchain.com/docs/modules/memory/)

**PostgreSQL + pgvector:**
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvector Optimization](https://neon.tech/docs/ai/ai-vector-search-optimization)

## Location in plan.md

**Section 4.1.1: Runtime Workflow Assembly (Dynamic Composition)**
- Lines: 2497-2691 (195 lines)
- Phase: 4 (Days 15-18)
- Dependencies: LangGraph setup, RAG discovery, PostgreSQL with pgvector

## Next Steps

1. Review Section 4.1.1 in plan.md for complete implementation details
2. Ensure LangGraph and pgvector are properly set up in Phase 3
3. Implement workflow assembly engine in Phase 4
4. Build collaborative UI components
5. Test with real user intents and measure success metrics


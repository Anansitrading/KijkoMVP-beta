# Agent Builder Specification - "Capability Inspector" & "Workflow Forge"

**Date:** 2025-11-02  
**Status:** Specification Complete  
**Implementation Timeline:** Days 15-22 (Phase 4A-4C)

---

## Executive Summary

This specification adds **transparent, collaborative agent creation** to Kijko2, bridging the gap between pre-built agents and user customization. Based on analysis of LangSmith Agent Builder and Perplexity research on 2025 best practices.

**Key Features:**
1. **Capability Inspector** - Inspect pre-built agents' instructions and tools before use
2. **Workflow Forge** - Build custom agents through conversational interface
3. **Review w/ Tools Mode** - Approve/reject/edit tool calls before execution
4. **Instruction Versioning** - Version control and rollback for agent instructions

---

## Problem Statement

**Current Gaps (from LangSmith Analysis):**

### UI Gaps:
- ❌ Agents are "black boxes" - users don't know what they can/cannot do
- ❌ No way to modify agent behavior without code changes
- ❌ No transparency into agent planning before execution
- ❌ Conversational feedback is impermanent (doesn't update agent memory)

### Architecture Gaps:
- ❌ Agent builder is agent-facing, not user-facing
- ❌ No UI for creating/modifying agents
- ❌ Memory updates are abstract (no clear mechanism)
- ❌ Tool search is implicit (results not surfaced to user)

---

## Solution Architecture

### 1. Capability Inspector (Pre-Built Agent Transparency)

**Purpose:** Let users inspect agent capabilities before assignment

**UI Components:**
```
┌─────────────────────────────────────────────────────┐
│  Agent Inspector Modal                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ Tabs: Instructions | Tools | Examples       │   │
│  ├─────────────────────────────────────────────┤   │
│  │ Instructions Tab:                           │   │
│  │ - Read-only view of agent's core prompt    │   │
│  │ - Shows how agent thinks and behaves       │   │
│  │                                             │   │
│  │ Tools Tab:                                  │   │
│  │ - List of all available tools              │   │
│  │ - Name, description, parameters            │   │
│  │ - Type badge (ComfyUI, API, Function)      │   │
│  │                                             │   │
│  │ Examples Tab:                               │   │
│  │ - Sample inputs and expected outputs       │   │
│  │ - Helps users write effective prompts      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Database Schema:**
- `agents` - Agent metadata (name, version, instructions)
- `tools` - Tool definitions (name, description, type, parameters)
- `agent_tools` - Many-to-many relationship
- `agent_examples` - Sample interactions

**API Endpoint:**
- `GET /api/agents/[agentId]/capabilities`

---

### 2. Workflow Forge (Conversational Agent Builder)

**Purpose:** Create custom agents through natural language conversation

**3-Panel Layout:**

```
┌──────────────┬──────────────────┬──────────────────┐
│ Instructions │  Forge Chat      │  Testbed         │
│ (Live Edit)  │  (Meta-Agent)    │  - Tools         │
│              │                  │  - Test Chat     │
│ Updates in   │  Conversational  │  - Review Mode   │
│ real-time    │  builder flow    │                  │
│ from chat    │                  │                  │
└──────────────┴──────────────────┴──────────────────┘
```

**Conversational Flow:**

1. **Tool Discovery & Grounding**
   - User: "I want to create an agent that turns images into vintage videos"
   - Forge: "I've found these tools: ImageToVideo, FilmGrain, ColorGrade. Authorize all?"

2. **Interactive Requirement Gathering**
   - Forge: "Should video duration be fixed or user-configurable?"
   - Forge: "What upscaling model should be default?"
   - Forge: "Should I ask for confirmation before expensive operations?"

3. **Instruction Generation**
   - Forge generates instruction template
   - Updates visible in Instructions panel in real-time
   - User can see agent's "brain" being built

4. **Testing with Review Mode**
   - User tests agent in Test Chat tab
   - Enable "Review w/ Tools" to approve each step
   - Agent pauses before executing tools

5. **Memory Updates**
   - User: "Always upscale to 1080p as final step"
   - Forge: "Updated instructions to add upscaling step"
   - Instructions panel updates automatically

---

### 3. Review w/ Tools Mode (Human-in-the-Loop)

**Purpose:** Pause agent execution for human approval of tool calls

**Implementation Pattern:**

```python
# LangGraph with checkpointing
workflow = StateGraph(ReviewState)
workflow.add_node("agent", agent_step)
workflow.add_node("approval_gate", approval_gate)  # PAUSES HERE
workflow.add_node("execute_tools", execute_tools)

# Execution flow
agent → approval_gate → [WAIT FOR HUMAN] → execute_tools
```

**UI Component:**

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Awaiting Approval                              │
│  Review planned tool calls before execution         │
│                                                     │
│  Step 1: ImageToVideo                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ {                                           │   │
│  │   "prompt": "dusty feel",                   │   │
│  │   "duration": 4,                            │   │
│  │   "fps": 24                                 │   │
│  │ }                                           │   │
│  │ [Edit] button                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Step 2: FilmGrain                                 │
│  ┌─────────────────────────────────────────────┐   │
│  │ { "intensity": 0.3 }                        │   │
│  │ [Edit] button                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [✓ Approve & Execute]  [✗ Reject]                │
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- View all planned tool calls before execution
- Edit parameters inline (JSON editor)
- Approve all, reject all, or modify individual calls
- Agent resumes from checkpoint after approval

---

### 4. Instruction Versioning & Rollback

**Purpose:** Track changes to agent instructions with full history

**Database Schema:**

```sql
CREATE TABLE agent_instruction_versions (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  version_number INTEGER NOT NULL,
  instructions TEXT NOT NULL,
  changelog TEXT,
  is_current BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- Every instruction change creates new version
- View version history with diffs
- One-click rollback to previous version
- Audit trail (who changed what when)

---

## Technical Implementation

### Frontend Stack:
- **Next.js 14** - App router with server components
- **shadcn/ui** - UI components (Dialog, Tabs, Resizable, etc.)
- **Zustand** - State management with persistence
- **Monaco Editor** - Optional code editor for instructions
- **WebSocket/SSE** - Real-time approval requests

### Backend Stack:
- **LangGraph** - Agent orchestration with checkpointing
- **LangChain** - Tool abstractions and memory
- **PostgreSQL** - Agent metadata, versions, tools
- **pgvector** - RAG-based tool discovery
- **Langfuse** - Observability and tracing

### Key Technologies (from Perplexity Research):

**Embeddings for Tool Discovery:**
- OpenAI `text-embedding-3-small` or Cohere Embed v3
- Hybrid search (vector + keyword + metadata)

**State Management:**
- LangGraph MemorySaver for checkpointing
- Zustand persist middleware for UI state

**Real-Time Communication:**
- Server-Sent Events (SSE) for streaming updates
- WebSocket for bidirectional approval flow

---

## Implementation Timeline

### Phase 4A: Capability Inspector (Days 15-16)
- Database schema and seed data
- API endpoint implementation
- Inspector modal UI component
- Integration with existing agent cards

### Phase 4B: Workflow Forge (Days 17-20)
- Forge page and 3-panel layout
- Forge Meta-Agent (LangGraph)
- Tool discovery with RAG
- Review w/ Tools mode
- Instruction versioning

### Phase 4C: Integration & Testing (Days 21-22)
- End-to-end testing
- Performance optimization
- Documentation
- Staging deployment

---

## Success Metrics

**Capability Inspector:**
- ✅ All 15+ production agents have complete metadata
- ✅ Inspector loads in <500ms
- ✅ 100% of tools have descriptions

**Workflow Forge:**
- ✅ Create custom agent in <10 minutes
- ✅ Tool discovery returns results in <2s
- ✅ Review mode pauses/resumes successfully
- ✅ Version rollback works without data loss

**User Experience:**
- ✅ Conversational flow feels natural
- ✅ Real-time updates visible in UI
- ✅ Error messages are actionable

---

## Documentation References

All documentation organized in Raindrop collection:

**Context7 Available (✅):**
- LangGraph (Getting Started, State, Human-in-the-Loop, Checkpointing)
- LangChain.js (Agents, Memory, Tools)
- Zustand (Core, Persist Middleware)

**Official Docs (use Raindrop links):**
- shadcn/ui components
- pgvector
- OpenAI Embeddings
- Server-Sent Events (MDN)

---

## Risk Mitigation

1. **RAG returns irrelevant tools** → Hybrid search + user feedback loop
2. **Generated instructions invalid** → Validation + sandbox testing
3. **Review mode state corruption** → LangGraph checkpointing + validation
4. **UI performance issues** → Lazy loading + virtual scrolling + caching
5. **Agent naming conflicts** → Uniqueness validation + namespacing

---

## Next Steps

1. Review this specification with team
2. Confirm database schema design
3. Set up Raindrop collection with all documentation links
4. Begin Phase 4A implementation (Day 15)
5. Daily standups to track progress against timeline

---

**Questions or Concerns?**
- Reach out before starting implementation
- This is a foundational feature - get it right before moving fast


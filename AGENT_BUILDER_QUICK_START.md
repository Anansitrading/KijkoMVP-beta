# Agent Builder Quick Start Guide

**For Developers:** Step-by-step implementation guide for Capability Inspector & Workflow Forge

---

## Prerequisites

Before starting, ensure you have:
- [ ] PostgreSQL with pgvector extension installed
- [ ] OpenAI API key (for embeddings)
- [ ] Langfuse instance running (for tracing)
- [ ] Next.js 14 app with shadcn/ui configured
- [ ] LangGraph and LangChain installed in backend

---

## Phase 4A: Capability Inspector (Days 15-16)

### Day 15 Morning: Database Setup

**1. Create database schema:**

```bash
# Connect to PostgreSQL
psql -U postgres -d kijko_db

# Run schema creation
\i apps/web/prisma/migrations/agent_builder_schema.sql
```

**2. Seed with existing agents:**

```typescript
// scripts/seed-agents.ts
import { db } from '@/lib/db';

const PRODUCTION_AGENTS = [
  {
    name: 'VRD Agent',
    instructions: `You are a Video Requirements Document specialist...`,
    tools: ['script_parser', 'reference_search', 'document_generator']
  },
  {
    name: 'ScriptSmith',
    instructions: `You are an expert screenplay writer...`,
    tools: ['gemini_generate', 'script_formatter', 'character_analyzer']
  },
  // ... add all 15+ agents
];

async function seedAgents() {
  for (const agent of PRODUCTION_AGENTS) {
    const agentId = await db.query(`
      INSERT INTO agents (name, instructions, version)
      VALUES ($1, $2, '1.0.0')
      RETURNING id
    `, [agent.name, agent.instructions]);

    // Link tools
    for (const toolName of agent.tools) {
      const tool = await db.query(`
        SELECT id FROM tools WHERE name = $1
      `, [toolName]);

      await db.query(`
        INSERT INTO agent_tools (agent_id, tool_id)
        VALUES ($1, $2)
      `, [agentId[0].id, tool[0].id]);
    }
  }
}

seedAgents();
```

### Day 15 Afternoon: API Implementation

**3. Create capabilities endpoint:**

```typescript
// apps/web/src/app/api/agents/[agentId]/capabilities/route.ts
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const agent = await db.query(`
    SELECT 
      a.id,
      a.name,
      a.version,
      a.instructions,
      json_agg(
        json_build_object(
          'name', t.name,
          'description', t.description,
          'type', t.type,
          'parameters', t.parameters
        )
      ) as tools
    FROM agents a
    LEFT JOIN agent_tools at ON a.id = at.agent_id
    LEFT JOIN tools t ON at.tool_id = t.id
    WHERE a.id = $1
    GROUP BY a.id
  `, [params.agentId]);

  const examples = await db.query(`
    SELECT input, output FROM agent_examples
    WHERE agent_id = $1 LIMIT 5
  `, [params.agentId]);

  return Response.json({ ...agent[0], examples });
}
```

### Day 16 Morning: UI Component

**4. Create Inspector Modal:**

```bash
# Install dependencies if needed
pnpm add @radix-ui/react-dialog @radix-ui/react-tabs
```

```typescript
// packages/ui/components/agent-inspector-modal.tsx
// (Copy full implementation from plan.md section 4.0.1)
```

**5. Add to agent cards:**

```typescript
// apps/web/src/components/agents/agent-card.tsx
import { Info } from 'lucide-react';
import { AgentInspectorModal } from '@/components/agent-inspector-modal';

export function AgentCard({ agent }) {
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{agent.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInspectorOpen(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <AgentInspectorModal
        agentId={agent.id}
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
      />
    </Card>
  );
}
```

### Day 16 Afternoon: Testing

**6. Test inspector with all agents:**

```bash
# Start dev server
pnpm dev

# Navigate to agent list
# Click info icon on each agent
# Verify:
# - Instructions load correctly
# - All tools are listed
# - Examples are displayed
# - Modal is responsive
```

---

## Phase 4B: Workflow Forge (Days 17-20)

### Day 17: Forge UI Foundation

**1. Create Forge page:**

```bash
mkdir -p apps/web/src/app/forge
touch apps/web/src/app/forge/page.tsx
```

```typescript
// apps/web/src/app/forge/page.tsx
// (Copy full implementation from plan.md section 4.0.2)
```

**2. Create Forge store:**

```typescript
// packages/stores/forge-store.ts
// (Copy full implementation from plan.md section 4.0.2)
```

**3. Create child components:**

```bash
mkdir -p apps/web/src/components/forge
touch apps/web/src/components/forge/forge-chat.tsx
touch apps/web/src/components/forge/tool-selector.tsx
touch apps/web/src/components/forge/test-chat.tsx
```

### Day 18: Forge Meta-Agent Backend

**1. Create Meta-Agent:**

```python
# apps/comfyui-gateway/agents/forge_meta_agent.py
# (Copy full implementation from plan.md section 4.0.2)
```

**2. Create API endpoint:**

```python
# apps/comfyui-gateway/main.py
from agents.forge_meta_agent import ForgeMetaAgent

forge_agent = ForgeMetaAgent()

@app.post("/api/forge/chat")
async def forge_chat(message: str, session_id: str):
    """Handle Forge chat messages"""
    result = await forge_agent.graph.ainvoke({
        "user_goal": message,
        "messages": []
    })
    return result
```

**3. Test tool discovery:**

```bash
# Test RAG search
curl -X POST http://localhost:8188/api/forge/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create agent for vintage video effects", "session_id": "test-123"}'
```

### Day 19: Instruction Generation

**1. Implement instruction templates:**

```python
# apps/comfyui-gateway/agents/instruction_templates.py
INSTRUCTION_TEMPLATE = """You are an expert {goal} agent.

Your goal is to {primary_objective}.

You have access to the following tools:
{tools}

Behavior Rules:
{rules}

Always follow these steps:
1. Analyze the user's request
2. Determine which tools to use
3. Execute tools in the correct order
4. Validate outputs before proceeding
5. Present results clearly to the user
"""

def generate_instructions(goal, tools, requirements):
    return INSTRUCTION_TEMPLATE.format(
        goal=goal,
        primary_objective=requirements.get('primary_objective', goal),
        tools=format_tools(tools),
        rules=format_rules(requirements)
    )
```

**2. Add versioning:**

```typescript
// apps/web/src/app/api/agents/[agentId]/instructions/route.ts
// (Copy full implementation from plan.md section 4.0.4)
```

### Day 20: Review w/ Tools Mode

**1. Implement Review Mode Agent:**

```python
# apps/comfyui-gateway/agents/review_mode.py
# (Copy full implementation from plan.md section 4.0.3)
```

**2. Create approval endpoint:**

```python
@app.post("/api/agents/{agent_id}/approve-tools")
async def approve_tools(agent_id: str, thread_id: str, approval: dict):
    # (Copy implementation from plan.md)
    pass
```

**3. Create approval UI component:**

```typescript
// packages/ui/components/tool-approval-panel.tsx
// (Copy full implementation from plan.md section 4.0.3)
```

---

## Phase 4C: Integration & Testing (Days 21-22)

### Day 21: Integration

**1. Connect Forge to agent system:**

```typescript
// apps/web/src/app/api/agents/route.ts
export async function POST(request: Request) {
  const { name, instructions, tools } = await request.json();
  
  // Create agent
  const agent = await db.query(`
    INSERT INTO agents (name, instructions, version)
    VALUES ($1, $2, '1.0.0')
    RETURNING id
  `, [name, instructions]);

  // Link tools
  for (const toolId of tools) {
    await db.query(`
      INSERT INTO agent_tools (agent_id, tool_id)
      VALUES ($1, $2)
    `, [agent[0].id, toolId]);
  }

  return Response.json(agent[0]);
}
```

**2. Add Langfuse tracing:**

```python
from langfuse.decorators import observe

@observe(name="forge_meta_agent_execution")
async def execute_forge_agent(user_goal: str):
    # Existing implementation
    pass
```

### Day 22: Testing & Deployment

**1. End-to-end test:**

```bash
# Test flow:
# 1. Open /forge
# 2. Enter goal: "Create agent for animated product shots"
# 3. Verify tool discovery works
# 4. Answer requirement questions
# 5. Check instructions panel updates
# 6. Test in Test Chat with Review mode
# 7. Approve tool calls
# 8. Save agent
# 9. Verify agent appears in agent list
# 10. Inspect saved agent
```

**2. Performance testing:**

```bash
# Load test Forge endpoint
ab -n 100 -c 10 http://localhost:3000/api/forge/chat

# Check Langfuse for traces
# Verify no memory leaks
# Test concurrent sessions
```

**3. Deploy to staging:**

```bash
# Build and deploy
pnpm build
vercel deploy --env staging

# Verify environment variables
# Test on staging URL
# Get team feedback
```

---

## Troubleshooting

### Issue: Tool discovery returns no results
**Solution:** Check pgvector extension is installed and embeddings are generated

```sql
-- Verify pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check embeddings
SELECT COUNT(*) FROM comfyui_workflows WHERE embedding IS NOT NULL;
```

### Issue: Review mode doesn't pause
**Solution:** Verify checkpointer is configured

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
graph = workflow.compile(checkpointer=checkpointer)
```

### Issue: Instructions don't update in real-time
**Solution:** Check WebSocket/SSE connection

```typescript
// Verify SSE connection
const eventSource = new EventSource('/api/forge/stream');
eventSource.onmessage = (e) => console.log('Received:', e.data);
```

---

## Next Steps After Implementation

1. **User Testing:** Get feedback from 3-5 users
2. **Documentation:** Write user guide for Forge
3. **Training:** Train team on agent creation
4. **Monitoring:** Set up alerts for Forge errors
5. **Iteration:** Collect feedback and improve

---

**Need Help?**
- Check plan.md for detailed implementation
- Review AGENT_BUILDER_SPEC.md for architecture
- Ask team in #agent-builder Slack channel


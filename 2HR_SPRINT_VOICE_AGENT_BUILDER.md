# 2-Hour Sprint: Voice-Enabled Agent Builder

**Goal:** Get voice-enabled agent creation working with full transparency for testing.

**Timeline:** 2 hours solid work  
**Success Metric:** Create custom agent via voice + inspect system prompts & tools

---

## Hour 1: Database + Core Backend (60 min)

### 1. Database Schema Migration (15 min)

**File:** `/packages/db/migrations/0001_agent_builder_schema.sql`

```sql
-- Agents & Tools Schema
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Agents Table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_via TEXT DEFAULT 'voice'
);

-- Agent Versions
CREATE TABLE agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  notes TEXT,
  UNIQUE(agent_id, version)
);

-- Tools Table
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  embedding VECTOR(1536)
);

-- Tool Credentials (secure refs only)
CREATE TABLE tool_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  secret_ref TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tool_id, credential_type)
);

-- Agent-Tool Mapping
CREATE TABLE agent_tools (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  tool_version INTEGER DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID,
  PRIMARY KEY (agent_id, tool_id)
);

-- Agent Examples (few-shot learning)
CREATE TABLE agent_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Audit Log
CREATE TABLE agent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  details JSONB,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_active ON agents(is_active, created_at DESC);
CREATE INDEX idx_tools_active ON tools(is_active, type);
CREATE INDEX idx_tools_embedding ON tools USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX idx_agent_tools_tool ON agent_tools(tool_id);

-- Seed with 5 starter tools for testing
INSERT INTO tools (name, type, description, config, embedding) VALUES
('Web Search', 'langchain', 'Search the internet for information', '{"provider": "tavily"}', NULL),
('Calculator', 'instruction_set', 'Perform mathematical calculations', '{"instructions": "Evaluate mathematical expressions"}', NULL),
('Image Generator', 'rest', 'Generate images from text descriptions', '{"endpoint": "https://api.openai.com/v1/images/generations"}', NULL),
('Video Editor', 'internal', 'Edit videos on the timeline', '{"tool": "opencut"}', NULL),
('Code Executor', 'instruction_set', 'Execute Python code safely', '{"sandbox": true}', NULL);
```

**Action:** Run migration
```bash
cd /home/david/Projects/Kijko2/packages/db
pnpm drizzle-kit push
```

### 2. Update Drizzle Schema (10 min)

**File:** `/packages/db/src/schema.ts`

Add:
```typescript
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull(),
  createdVia: text('created_via').default('voice')
});

export const agentVersions = pgTable('agent_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  notes: text('notes')
});

export const tools = pgTable('tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  version: integer('version').default(1),
  embedding: vector('embedding', { dimensions: 1536 })
});

export const agentTools = pgTable('agent_tools', {
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }),
  toolVersion: integer('tool_version').default(1),
  addedAt: timestamp('added_at').defaultNow(),
  addedBy: uuid('added_by')
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.toolId] })
}));

export const agentAudit = pgTable('agent_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  details: jsonb('details'),
  performedBy: uuid('performed_by'),
  performedAt: timestamp('performed_at').defaultNow()
});
```

### 3. API Routes (35 min)

**File:** `/apps/OpenCut/apps/web/src/app/api/agents/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@kijko/db';
import { agents, agentVersions, agentAudit } from '@kijko/db/schema';

export async function GET() {
  const allAgents = await db.select().from(agents).where(eq(agents.isActive, true));
  return NextResponse.json(allAgents);
}

export async function POST(req: Request) {
  const { name, description, systemPrompt, tools } = await req.json();

  // Create agent
  const [agent] = await db.insert(agents).values({
    name,
    description,
    systemPrompt,
    createdBy: 'test-user-id', // TODO: Get from auth
    createdVia: 'voice'
  }).returning();

  // Create version 1
  await db.insert(agentVersions).values({
    agentId: agent.id,
    version: 1,
    systemPrompt,
    notes: 'Initial version via voice'
  });

  // Link tools
  if (tools && tools.length > 0) {
    await db.insert(agentTools).values(
      tools.map(toolId => ({
        agentId: agent.id,
        toolId,
        addedBy: 'test-user-id'
      }))
    );
  }

  // Audit log
  await db.insert(agentAudit).values({
    agentId: agent.id,
    event: 'created',
    details: { via: 'voice', tools },
    performedBy: 'test-user-id'
  });

  return NextResponse.json(agent);
}
```

**File:** `/apps/OpenCut/apps/web/src/app/api/agents/[id]/route.ts`

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await db.select().from(agents).where(eq(agents.id, params.id)).limit(1);
  return NextResponse.json(agent[0]);
}
```

**File:** `/apps/OpenCut/apps/web/src/app/api/agents/[id]/tools/route.ts`

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agentToolsList = await db
    .select()
    .from(agentTools)
    .innerJoin(tools, eq(agentTools.toolId, tools.id))
    .where(eq(agentTools.agentId, params.id));

  return NextResponse.json(agentToolsList.map(row => row.tools));
}
```

**File:** `/apps/OpenCut/apps/web/src/app/api/tools/route.ts`

```typescript
export async function GET() {
  const allTools = await db.select().from(tools).where(eq(tools.isActive, true));
  return NextResponse.json(allTools);
}
```

---

## Hour 2: Frontend + Voice Integration (60 min)

### 4. Voice Interface Component (30 min)

**File:** `/apps/OpenCut/apps/web/src/components/agent-builder/VoiceAgentBuilder.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';

export function VoiceAgentBuilder() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentData, setAgentData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    tools: []
  });

  const { startSession, sendMessage, isConnected } = useGeminiLive({
    systemInstruction: `You are an AI agent builder assistant.
      Guide users through creating custom AI agents by asking:
      1. Agent name
      2. What should it do?
      3. Generate system prompt
      4. Suggest relevant tools
      
      Keep responses conversational and brief.`
  });

  const handleVoiceInput = async (text: string) => {
    setTranscript(text);

    // Send to Gemini for processing
    const response = await sendMessage(text);

    // Parse response for agent creation steps
    if (response.includes('system prompt:')) {
      const prompt = extractSystemPrompt(response);
      setAgentData(prev => ({ ...prev, systemPrompt: prompt }));
    }

    // Auto-create when all fields filled
    if (agentData.name && agentData.systemPrompt) {
      await createAgent();
    }
  };

  const createAgent = async () => {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData)
    });

    const agent = await response.json();
    console.log('Agent created:', agent);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Voice Agent Builder</h2>
        <Button
          onClick={() => {
            if (!isListening) {
              startSession();
            }
            setIsListening(!isListening);
          }}
          variant={isListening ? 'destructive' : 'default'}
        >
          {isListening ? <MicOff /> : <Mic />}
          {isListening ? 'Stop' : 'Start Voice'}
        </Button>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">Transcript:</p>
        <p>{transcript || 'Start speaking to create an agent...'}</p>
      </div>

      {agentData.systemPrompt && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-semibold">System Prompt:</p>
          <p className="text-sm font-mono">{agentData.systemPrompt}</p>
        </div>
      )}
    </Card>
  );
}
```

### 5. Agent Inspector UI (20 min)

**File:** `/apps/OpenCut/apps/web/src/components/agent-builder/AgentInspector.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AgentInspector({ agentId }: { agentId: string }) {
  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => fetch(`/api/agents/${agentId}`).then(r => r.json())
  });

  const { data: tools } = useQuery({
    queryKey: ['agent-tools', agentId],
    queryFn: () => fetch(`/api/agents/${agentId}/tools`).then(r => r.json())
  });

  if (!agent) return <div>Loading...</div>;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{agent.name}</h2>
          <p className="text-muted-foreground">{agent.description}</p>
          <Badge variant="secondary" className="mt-2">
            Created via {agent.createdVia}
          </Badge>
        </div>

        <Tabs defaultValue="prompt">
          <TabsList>
            <TabsTrigger value="prompt">System Prompt</TabsTrigger>
            <TabsTrigger value="tools">Tools ({tools?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
              {agent.systemPrompt}
            </div>
          </TabsContent>

          <TabsContent value="tools">
            <div className="space-y-2">
              {tools?.map(tool => (
                <Card key={tool.id} className="p-4">
                  <h4 className="font-semibold">{tool.name}</h4>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                  <Badge variant="outline" className="mt-2">{tool.type}</Badge>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
```

### 6. Test Page (10 min)

**File:** `/apps/OpenCut/apps/web/src/app/agent-builder/page.tsx`

```typescript
'use client';

import { VoiceAgentBuilder } from '@/components/agent-builder/VoiceAgentBuilder';
import { AgentInspector } from '@/components/agent-builder/AgentInspector';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function AgentBuilderPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetch('/api/agents').then(r => r.json())
  });

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-8">Agent Builder</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <VoiceAgentBuilder />
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Your Agents</h3>
            <div className="space-y-2">
              {agents?.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className="w-full text-left p-4 border rounded-lg hover:bg-muted"
                >
                  <p className="font-semibold">{agent.name}</p>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          {selectedAgentId && <AgentInspector agentId={selectedAgentId} />}
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

After 2 hours, verify:

- [ ] Database migration ran successfully
- [ ] Can create agent via POST /api/agents
- [ ] Can view agents via GET /api/agents
- [ ] Can inspect specific agent with GET /api/agents/:id
- [ ] Can see agent tools with GET /api/agents/:id/tools
- [ ] Voice interface renders
- [ ] Agent Inspector shows system prompt
- [ ] Agent Inspector shows tools list
- [ ] Can navigate to /agent-builder page

---

## Quick Start Commands

```bash
# 1. Run migration
cd /home/david/Projects/Kijko2/packages/db
pnpm drizzle-kit push

# 2. Start dev server
cd /home/david/Projects/Kijko2/apps/OpenCut/apps/web
pnpm dev

# 3. Navigate to:
# http://localhost:3000/agent-builder

# 4. Test with curl:
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","description":"Test description","systemPrompt":"You are a helpful assistant","tools":[]}'
```

---

## Notes

- Voice integration uses existing Gemini Live hook
- Tool embeddings will be NULL initially (add embedding generation later)
- Auth uses placeholder 'test-user-id' for sprint
- Focus on getting basic flow working, polish later

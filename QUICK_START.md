# Quick Start Guide: Kijko2 Development

**For developers starting work on the merged project**

---

## Prerequisites

- Node.js 18+
- Bun (recommended) or npm/yarn
- Docker & Docker Compose (for local PostgreSQL/Redis)
- Git

---

## Phase 1: Monorepo Setup (Start Here)

### Step 1: Initialize Turborepo

```bash
# Create new monorepo
npx create-turbo@latest kijko-opencut-monorepo

# Navigate to project
cd kijko-opencut-monorepo

# Install dependencies
bun install
```

### Step 2: Create Package Structure

```bash
# Create package directories
mkdir -p packages/editor packages/ai packages/storage packages/stores packages/shared packages/ui

# Create app directories
mkdir -p apps/web apps/comfyui-gateway
```

### Step 3: Configure Turborepo

Edit `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {}
  }
}
```

---

## Phase 2: Extract OpenCut Editor

### Step 1: Copy OpenCut Components

```bash
# From OpenCut/apps/web/src/components/editor/
# Copy to packages/editor/

cp -r OpenCut/apps/web/src/components/editor/timeline packages/editor/timeline
cp -r OpenCut/apps/web/src/components/editor/preview packages/editor/preview
cp -r OpenCut/apps/web/src/components/editor/media-panel packages/editor/media
cp -r OpenCut/apps/web/src/components/editor/properties packages/editor/properties
```

### Step 2: Copy Zustand Stores

```bash
# From OpenCut/apps/web/src/stores/
# Copy to packages/stores/editor/

cp -r OpenCut/apps/web/src/stores/* packages/stores/editor/
```

### Step 3: Update Import Paths

Use find & replace to update imports:
```typescript
// Before
import { useTimelineStore } from '@/stores/timeline-store';

// After
import { useTimelineStore } from '@kijko/stores/editor/timeline-store';
```

---

## Phase 3: Set Up Next.js App

### Step 1: Create Next.js App

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app
```

### Step 2: Configure Package Imports

Edit `apps/web/package.json`:
```json
{
  "dependencies": {
    "@kijko/editor": "workspace:*",
    "@kijko/stores": "workspace:*",
    "@kijko/ai": "workspace:*",
    "@kijko/storage": "workspace:*",
    "@kijko/shared": "workspace:*",
    "@kijko/ui": "workspace:*"
  }
}
```

### Step 3: Create Main Layout

```tsx
// apps/web/src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="editor-layout">
          <TopBar />
          <div className="main-content">
            <MediaPanel />
            <PreviewPanel />
            <AIPanel />
          </div>
          <TimelinePanel />
        </div>
      </body>
    </html>
  );
}
```

---

## Phase 4: ComfyUI Backend Setup

### Step 1: Deploy ComfyUI to Railway

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install comfy-pack
cd custom_nodes
git clone https://github.com/bentoml/comfy-pack.git
cd ../..

# Create Dockerfile
cat > Dockerfile <<EOF
FROM python:3.10
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8000"]
EOF

# Deploy to Railway
railway init
railway up
```

### Step 2: Set Up PostgreSQL

```bash
# Add PostgreSQL to Railway
railway add postgresql

# Run migrations
railway run psql < schema.sql
```

**schema.sql:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE comfyui_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  workflow_json JSONB NOT NULL,
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  tags TEXT[],
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES comfyui_workflows(id),
  input_params JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  progress INTEGER DEFAULT 0,
  output_urls JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX ON comfyui_workflows USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON workflow_jobs (status, created_at);
```

### Step 3: Add Redis

```bash
# Add Redis to Railway
railway add redis

# Get connection URL
railway variables
```

---

## Phase 5: LangChain Integration

### Step 1: Install Dependencies

```bash
cd packages/ai
bun add langchain @langchain/openai langgraph
```

### Step 2: Create Workflow Tool

```typescript
// packages/ai/workflows/comfyui-tool.ts
import { BaseTool } from "langchain/tools";

export class ComfyUIWorkflowTool extends BaseTool {
  name = "generate_video";
  description = "Generate video from text prompt";
  
  async _call(input: string): Promise<string> {
    const response = await fetch(`${process.env.COMFYUI_API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input })
    });
    
    const { job_id } = await response.json();
    return `Video generation started. Job ID: ${job_id}`;
  }
}
```

### Step 3: Create Agent

```typescript
// packages/ai/agents/video-agent.ts
import { createReactAgent } from "langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { ComfyUIWorkflowTool } from "../workflows/comfyui-tool";

export class VideoProductionAgent {
  private agent;
  
  constructor() {
    const tools = [new ComfyUIWorkflowTool()];
    
    this.agent = createReactAgent({
      llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
      tools,
      stateModifier: "You are a video production assistant."
    });
  }
  
  async process(message: string) {
    return await this.agent.invoke({
      messages: [{ role: "user", content: message }]
    });
  }
}
```

---

## Environment Variables

### apps/web/.env.local

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/kijko"

# Redis
REDIS_URL="redis://localhost:6379"

# AI Services
GEMINI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"

# ComfyUI
COMFYUI_API_URL="https://your-railway-app.railway.app"
COMFYUI_WS_URL="wss://your-railway-app.railway.app"

# Auth
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

---

## Development Commands

```bash
# Install all dependencies
bun install

# Run all apps in dev mode
bun dev

# Run specific app
bun dev --filter=web

# Build all packages
bun build

# Type check
bun type-check

# Lint
bun lint

# Test
bun test
```

---

## Package Scripts

### Root package.json

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

---

## Testing the Integration

### Test 1: Editor Works

```bash
# Start dev server
cd apps/web
bun dev

# Open http://localhost:3000
# Upload a video
# Drag to timeline
# Verify playback works
```

### Test 2: Gemini Chat Works

```bash
# In the AI panel
# Type: "How do I add a transition?"
# Verify Gemini responds
```

### Test 3: ComfyUI Workflow Works

```bash
# In the AI panel
# Type: "Create a 10-second video of a sunset"
# Verify:
# - Agent selects workflow
# - Job is queued
# - Progress updates appear
# - Video appears in media library
```

---

## Troubleshooting

### Issue: Import errors

**Solution:** Check package.json dependencies use `workspace:*`

### Issue: Zustand store not persisting

**Solution:** Verify IndexedDB is enabled in browser

### Issue: ComfyUI API timeout

**Solution:** Check Railway logs, increase timeout in fetch calls

### Issue: Vector search not working

**Solution:** Verify pgvector extension is installed in PostgreSQL

---

## Useful Resources

- **Turborepo Docs**: https://turbo.build/repo/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Zustand Docs**: https://zustand.docs.pmnd.rs
- **LangChain Docs**: https://js.langchain.com/docs
- **ComfyUI Docs**: https://github.com/comfyanonymous/ComfyUI
- **Railway Docs**: https://docs.railway.app

---

## Getting Help

1. Check `plan.md` for detailed architecture
2. Review `IMPLEMENTATION_SUMMARY.md` for overview
3. Check existing code in OpenCut/KijkoCut for patterns
4. Ask in team chat with specific error messages

---

## Next Steps After Setup

1. ✅ Monorepo initialized
2. ✅ Packages created
3. ✅ Editor extracted
4. ✅ Next.js app running
5. ✅ ComfyUI deployed
6. ✅ LangChain integrated
7. → Start building features!

---

**Happy coding! 🚀**


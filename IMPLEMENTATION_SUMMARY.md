# Implementation Summary: Kijko2 Merger & ComfyUI Integration

**Date:** 2025-10-29  
**Status:** Planning Complete  
**Estimated Timeline:** 24 days (3-4 weeks)

---

## What We're Building

A unified AI-powered video editor that combines:
- **OpenCut's** professional timeline editor (multi-track, FFmpeg, client-side processing)
- **KijkoCut's** Gemini AI chat interface (conversational guidance, content generation)
- **ComfyUI** workflow system (advanced video generation as agent tools)

---

## Key Architectural Decisions (Based on Perplexity Research)

### 1. **Monorepo Structure** ✅
**Why:** Code sharing, unified tooling, easier refactoring
**How:** Turborepo with apps/ and packages/ separation
**Benefit:** Decouple editor logic from framework specifics

### 2. **State Management: Domain-Specific Stores** ✅
**Why:** Clear boundaries, easier testing, prevents bloat
**How:** Multiple Zustand stores (editor/, ai/, workflows/)
**Benefit:** Modular state with cross-store communication patterns

### 3. **Storage: Coexist Multiple Systems** ✅
**Why:** Leverage strengths of each system
**How:**
- IndexedDB → Editor projects, scenes
- OPFS → Large media files
- PostgreSQL → ComfyUI workflows, embeddings
- Redis → Job queue, real-time status

**Benefit:** Incremental migration, optimal performance per data type

### 4. **ComfyUI Integration: BentoML + comfy-pack** ✅
**Why:** Production-ready, standardized APIs, scalable
**How:** Deploy to Railway, expose workflows as REST endpoints
**Benefit:** No custom API wrapper needed, battle-tested

### 5. **AI Agents: LangGraph + LangChain** ✅
**Why:** Composable agents, observability, workflow orchestration
**How:** Workflows as tools, RAG for discovery
**Benefit:** Intelligent workflow selection based on user intent

### 6. **Observability: Langfuse + Custom MCP** ✅
**Why:** Multi-agent workflow visibility, cost tracking, quality evaluation
**How:**
- Separate PostgreSQL database for trace data
- Python SDK for FastAPI backend, TypeScript SDK for Next.js frontend
- @observe decorators for simple agents
- Nested spans for multi-agent pipelines
- LangGraph callback integration
- Automated quality evaluations and datasets
- Custom FastAPI MCP layer for natural language queries

**Benefit:** Complete agent visibility, cost attribution per agent, regression testing, vibe coding workflow

### 7. **Monitoring: Sentry + Augment MCP** ✅
**Why:** Real-time error tracking, performance monitoring, visual debugging
**How:**
- 3 separate projects (kijko-web, kijko-api, kijko-editor)
- Next.js SDK for frontend, Python SDK for backend
- Distributed tracing across services
- Session Replay for timeline debugging
- Automated release management via CircleCI
- Integration with Langfuse for error-to-dataset pipeline

**Benefit:** Immediate error visibility, performance insights, no context switching during debugging

### 8. **CI/CD: CircleCI + Augment MCP** ✅
**Why:** Native Turborepo support, GPU runners, vibe coding integration
**How:**
- Day 1: Basic config (setup, lint, typecheck, build)
- Phase 3+: Docker builds, GPU testing, deployments, Sentry releases
- Augment MCP: Query build status from editor

**Benefit:** Automated testing, fast builds, no context switching during development

---

## Project Structure

```
kijko-opencut-monorepo/
├── apps/
│   ├── web/                    # Main Next.js app
│   ├── desktop/                # Future: Tauri desktop
│   └── comfyui-gateway/        # ComfyUI API proxy
├── packages/
│   ├── editor/                 # Timeline, preview, media (framework-agnostic)
│   ├── ai/                     # Gemini + ComfyUI integration
│   ├── storage/                # IndexedDB, OPFS, PostgreSQL adapters
│   ├── stores/                 # Zustand stores (editor, ai, workflows)
│   ├── shared/                 # Utilities, types, hooks
│   └── ui/                     # Shared UI components
└── turbo.json
```

---

## Implementation Phases

### **Phase 1: Foundation (Days 1-3)**
- Set up Turborepo monorepo
- Configure shared tooling (TypeScript, ESLint, Prettier)
- Define package boundaries
- **Langfuse: Deploy to Railway with separate PostgreSQL database**
- **Langfuse: Install SDKs in shared package**
- **Langfuse: Test connection with sample trace**
- **Sentry: Create 3 projects, install SDKs**
- **Sentry: Configure Augment MCP for error queries**
- **CircleCI: Set up basic config (setup, lint, typecheck, build)**
- **Augment MCP: Configure CircleCI MCP server**

### **Phase 2: Editor Migration (Days 4-7)**
- Extract OpenCut editor to `packages/editor/`
- Move Zustand stores to `packages/stores/editor/`
- Ensure framework-agnostic components
- **CircleCI: Add unit tests, verify caching**

### **Phase 3: ComfyUI Backend (Days 8-14)**
- Deploy ComfyUI to Railway with comfy-pack
- Set up PostgreSQL with pgvector for embeddings
- Create workflow database schema
- Package 5-10 core workflows
- **Langfuse: Add @observe decorators to agent functions**
- **Langfuse: Instrument LangGraph workflows with CallbackHandler**
- **Langfuse: Add nested spans for multi-agent pipelines**
- **Langfuse: Configure cost tracking per agent**
- **Sentry: Add custom instrumentation for workflows and FFmpeg**
- **Sentry: Configure distributed tracing (Next.js → FastAPI)**
- **CircleCI: Add Docker builds with layer caching**
- **CircleCI: Add GPU runners for workflow testing**
- **CircleCI: Add Railway deployment with manual approval**
- **CircleCI: Add Sentry release automation**

### **Phase 4: AI Integration (Days 15-18)**
- Implement LangChain workflow tools
- Build RAG discovery system
- Create LangGraph agent orchestration
- Merge Gemini + ComfyUI interfaces
- **Langfuse: Set up automated quality evaluations**
- **Langfuse: Create datasets from production failures**
- **Langfuse: Integrate with Sentry for error-to-dataset pipeline**
- **Langfuse: Set up regression testing with datasets**
- **CircleCI: Add integration tests with Docker Compose**
- **CircleCI: Add parallel testing (6 containers)**

### **Phase 5: Frontend Integration (Days 19-21)**
- Build unified Next.js app
- Create AI panel with chat + workflow modes
- Implement real-time job status (webhooks)
- Design unified layout
- **Langfuse: Deploy custom MCP API to Railway**
- **Langfuse: Configure Augment MCP for Langfuse queries**
- **Langfuse: Test vibe coding workflow with MCP queries**
- **Sentry: Enable Session Replay for timeline debugging**
- **Sentry: Add breadcrumbs for user interactions**
- **CircleCI: Add E2E tests with Playwright**
- **CircleCI: Add Vercel deployment**

### **Phase 6: Testing & Polish (Days 22-24)**
- Integration testing
- Performance optimization
- Documentation
- Deploy to production
- **CircleCI: Add performance benchmarks**
- **CircleCI: Add visual regression testing**
- **CircleCI: Generate CI insights for Augment MCP**

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 | Main web app, SSR/SSG |
| **State** | Zustand | Domain-specific stores |
| **Storage (Client)** | IndexedDB + OPFS | Projects, media files |
| **Storage (Server)** | PostgreSQL + pgvector | Workflows, embeddings |
| **Cache** | Redis | Job queue, real-time status |
| **AI (Chat)** | Gemini API | Conversational AI |
| **AI (Workflows)** | ComfyUI + LangChain | Video generation tools |
| **Agents** | LangGraph | Agent orchestration |
| **Observability** | Langfuse + Custom MCP | Agent tracing, cost tracking, quality evaluation |
| **Monitoring** | Sentry + Augment MCP | Error tracking, performance, session replay |
| **CI/CD** | CircleCI + Augment MCP | Automated testing, deployments, vibe coding |
| **Deployment** | Vercel + Railway | Frontend + Backend |
| **Monorepo** | Turborepo | Build orchestration |

---

## User Experience Flow

### **Scenario 1: Traditional Editing (OpenCut)**
1. User uploads video files
2. Drags to timeline
3. Edits with multi-track tools
4. Exports final video

### **Scenario 2: AI Chat Guidance (KijkoCut)**
1. User asks: "How do I add a transition?"
2. Gemini provides step-by-step guidance
3. User follows instructions in editor

### **Scenario 3: AI-Generated Content (ComfyUI)**
1. User requests: "Create a 10-second product demo with smooth camera motion"
2. LangGraph agent searches workflow library (RAG)
3. Selects best workflow: `text-to-video-camera-motion`
4. Calls ComfyUI API on Railway
5. Job queued in Redis, status updates via webhook
6. Video generated, added to media library
7. User drags to timeline for further editing

### **Scenario 4: Hybrid Workflow**
1. User uploads product images
2. Asks AI: "Turn these into a video montage"
3. Agent selects `image-to-video` workflow
4. Generates video clips
5. Agent suggests timeline arrangement
6. User fine-tunes in editor
7. Exports final video

---

## Key Features

### **From OpenCut**
- ✅ Multi-track timeline editing
- ✅ Client-side FFmpeg processing
- ✅ IndexedDB + OPFS storage
- ✅ Real-time preview
- ✅ Drag & drop media management
- ✅ Keyboard shortcuts
- ✅ Scene management

### **From KijkoCut**
- ✅ Gemini AI chat interface
- ✅ AI-driven content generation
- ✅ Voice recording & TTS
- ✅ Aspect ratio controls
- ✅ Multi-modal AI (text, image, video, audio)

### **New: ComfyUI Integration**
- ✅ Workflow library with vector search
- ✅ RAG-based workflow discovery
- ✅ LangGraph agent orchestration
- ✅ Real-time job tracking
- ✅ Webhook notifications
- ✅ Async job queue
- ✅ Semantic workflow search

---

## Database Schema Highlights

### **ComfyUI Workflows Table**
```sql
CREATE TABLE comfyui_workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'generation', 'enhancement', etc.
  workflow_json JSONB NOT NULL,
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  tags TEXT[],
  embedding VECTOR(1536), -- For RAG
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **Job Tracking Table**
```sql
CREATE TABLE workflow_jobs (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES comfyui_workflows(id),
  input_params JSONB,
  status VARCHAR(50), -- 'queued', 'running', 'completed', 'failed'
  progress INTEGER DEFAULT 0,
  output_urls JSONB,
  error_message TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

---

## Success Metrics

1. **Functional Parity**: All OpenCut editor features work in merged app
2. **AI Integration**: Gemini chat + ComfyUI workflows both functional
3. **Performance**: Timeline handles 100+ elements without lag
4. **Workflow Discovery**: RAG finds relevant workflow in <1s
5. **Job Completion**: ComfyUI workflows complete and assets appear in library

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Complex migration breaks features | Incremental migration with feature flags |
| State management becomes unwieldy | Clear domain boundaries, documented patterns |
| Storage systems conflict | Abstraction layer with clear data ownership |
| ComfyUI API latency | Async job queue, webhooks, optimistic UI |
| Vector search performance | Index optimization, caching, keyword fallback |

---

## Next Steps

1. **Immediate**: Review plan with team, get approval
2. **Day 1**: Initialize Turborepo monorepo
3. **Week 1**: Extract OpenCut editor to shared packages
4. **Week 2**: Integrate editor into Next.js app with KijkoCut AI
5. **Week 3**: Deploy ComfyUI backend and implement LangChain tools
6. **Week 4**: Build unified AI interface and test end-to-end flows

---

## Resources

- **Plan Document**: `plan.md` (detailed implementation plan)
- **Architecture Diagrams**: Rendered Mermaid diagrams in plan
- **Perplexity Research**: 3 consultations on architecture, ComfyUI, state management
- **Reference Projects**: ComfyUI-Copilot (3K stars), BentoML comfy-pack

---

## Questions to Resolve

1. **Deployment**: Vercel for frontend confirmed, Railway for ComfyUI confirmed?
2. **Database**: Managed PostgreSQL (Railway) or separate provider (Supabase)?
3. **Redis**: Railway Redis or Upstash?
4. **OpenAI API**: For embeddings - budget allocation?
5. **ComfyUI Models**: Which models to include in initial workflows?
6. **User Auth**: Better Auth (from OpenCut) or new system?

---

## Conclusion

This plan provides a clear, phased approach to merging two complex codebases while extending with cutting-edge AI capabilities. By following Perplexity's recommendations on monorepo architecture, state management, and ComfyUI integration, we minimize risk while maximizing code reuse and future extensibility.

The result will be a unique video editor that combines:
- Professional editing tools (OpenCut)
- Conversational AI guidance (KijkoCut)
- Advanced AI generation (ComfyUI)

All in a unified, scalable architecture ready for production deployment.


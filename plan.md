# OpenCut + KijkoCut Merger & ComfyUI Integration Plan

**Date:** 2025-10-29  
**Objective:** Merge OpenCut's fully functional in-browser editor into KijkoCut, then extend with ComfyUI as an agent toolbox

---

## Executive Summary

This plan outlines a phased approach to:
1. **Migrate** OpenCut's sophisticated video editor into KijkoCut's AI-driven interface
2. **Preserve** both Gemini AI chat capabilities and OpenCut's timeline functionality
3. **Extend** with ComfyUI workflows as LangChain tools for advanced video generation
4. **Unify** architecture using a monorepo structure with Next.js

**Key Insight from Perplexity:** Use a monorepo with shared packages to decouple editor logic from framework specifics, enabling gradual migration while maintaining both codebases' strengths.

---

## Phase 1: Architecture Foundation (Days 1-3)

### 1.1 Monorepo Setup

**Decision:** Migrate to a unified monorepo structure using Turborepo

**Structure:**
```
kijko-opencut-monorepo/
├── apps/
│   ├── web/                    # Main Next.js app (merged KijkoCut + OpenCut)
│   ├── desktop/                # Future: Tauri desktop app (from OpenCut)
│   ├── comfyui-gateway/        # ComfyUI API proxy service
│   └── production-dashboard/   # NEW: Client production tracking (from AgentFlow)
├── packages/
│   ├── editor/                 # Core timeline editor (framework-agnostic)
│   │   ├── timeline/           # Timeline canvas, tracks, elements
│   │   ├── preview/            # Video preview panel
│   │   ├── media/              # Media panel components
│   │   └── properties/         # Properties panel
│   ├── ai/                     # AI integration layer
│   │   ├── gemini/             # Gemini AI service (from KijkoCut)
│   │   ├── workflows/          # ComfyUI workflow tools
│   │   ├── agents/             # LangChain agent orchestration
│   │   └── production-agents/  # NEW: Production role agents (from AgentFlow)
│   │       ├── pre-production/ # VRD, ScriptSmith, ShotMaster, Budget Solver
│   │       ├── production/     # MoodMaker, BoardBuilder, BreakdownBot, RFQ Forge
│   │       ├── post-production/# Assembler, QC Sentinel, Color grading
│   │       ├── advertising/    # Concept Generator, Version Generator, Legal, Traffic
│   │       └── social-media/   # Trend Analyst, Platform Optimizer, Engagement Monitor
│   ├── storage/                # Storage abstraction layer
│   │   ├── indexeddb/          # IndexedDB adapter
│   │   ├── opfs/               # OPFS adapter
│   │   └── postgres/           # PostgreSQL adapter (for workflows)
│   ├── stores/                 # Zustand state management
│   │   ├── editor/             # Editor stores (from OpenCut)
│   │   ├── ai/                 # AI chat stores (from KijkoCut)
│   │   ├── workflows/          # ComfyUI workflow stores
│   │   └── production/         # NEW: Production workflow stores (from AgentFlow)
│   │       ├── production-store.ts   # Active productions
│   │       ├── agent-store.ts        # Agent status/results
│   │       └── approval-store.ts     # Human approval gates
│   ├── shared/                 # Shared utilities, types, hooks
│   └── ui/                     # Shared UI components (shadcn/ui)
├── .circleci/
│   ├── config.yml              # CircleCI configuration
│   └── continue_config.yml     # Dynamic config for path-filtering
├── turbo.json
└── package.json
```

**Rationale (from Perplexity):**
- Maximizes code reuse across apps
- Decouples editor logic from Next.js specifics
- Enables gradual migration from Vite to Next.js
- Simplifies dependency management
- Future-proofs for desktop/mobile apps
- **NEW:** Supports 15+ production agent workflows for Film/TV, Ad Agency, Social Media use cases

### 1.2 Langfuse Setup (Day 1) - Agent Observability & Cost Tracking

**Why Langfuse? (from Perplexity)**

Langfuse provides **mission-critical observability** for multi-agent workflows:
- **Agent workflow visibility** for 10-15 sequential AI agents (VRD → ScriptSmith → ShotMaster → Video Solver)
- **Multi-step tracing** for complex decision chains with human approval gates
- **Cost attribution per agent** (critical when AI Concept Generator creates 100+ concepts)
- **Decision point analysis** for tracking why agents made specific recommendations
- **Framework-agnostic** (works with LangGraph + ComfyUI + custom agents)
- **Open source & self-hosted** (client data security for NDAs and competitive advantage)

**Railway Deployment (from Perplexity)**

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

**Install Langfuse SDK (from Perplexity)**

Create shared package for Turborepo monorepo:

```bash
# Create shared Langfuse package
mkdir -p packages/langfuse
cd packages/langfuse

# package.json
{
  "name": "@kijko/langfuse",
  "version": "0.1.0",
  "main": "index.ts",
  "dependencies": {
    "langfuse": "^3.0.0",
    "langfuse-langchain": "^3.0.0"
  }
}

pnpm install
```

**Rationale (from Perplexity):**
- Centralized updates across all apps
- Reduced duplication
- Consistent configuration

**Python SDK Configuration:**

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

**TypeScript SDK Configuration:**

```typescript
// packages/langfuse/index.ts
import { Langfuse } from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.NEXT_PUBLIC_LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_HOST,
});
```

**Environment Variables:**

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

**Test Langfuse Integration:**

```python
# apps/comfyui-gateway/test_langfuse.py
from packages.langfuse.python.client import langfuse

# Create a test trace
trace = langfuse.trace(name="test_trace")
span = trace.span(name="test_span", input={"test": "data"})
span.end(output={"result": "success"})

print(f"✅ Langfuse test successful! Check dashboard: {os.getenv('LANGFUSE_HOST')}")
```

### 1.3 Sentry Setup (Day 1) - Error Monitoring & Performance Tracking

**Create Sentry Projects (from Perplexity)**

Create **3 separate Sentry projects** for better error isolation:

1. **kijko-web** - Next.js frontend (apps/web)
2. **kijko-api** - FastAPI backend (apps/comfyui-gateway)
3. **kijko-editor** - Shared editor packages (packages/editor)

**Rationale:**
- Separation improves ownership, alerting, and noise reduction
- Frontend and backend errors are distinct in context and severity
- Facilitates distributed tracing across services
- Teams won't be overloaded with irrelevant alerts

**Install Sentry SDKs:**

```bash
# Next.js SDK (apps/web)
cd apps/web
npx @sentry/wizard@latest -i nextjs

# Python SDK (apps/comfyui-gateway)
cd apps/comfyui-gateway
pip install "sentry-sdk[fastapi]"
```

**Configure Sentry (Next.js):**

```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.5,
  replaysSessionSampleRate: 0.1,
  release: process.env.SENTRY_RELEASE,
  environment: process.env.NEXT_PUBLIC_ENV || 'development',

  beforeSend(event, hint) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
});
```

**Configure Sentry (FastAPI):**

```python
# apps/comfyui-gateway/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.5,
    release=os.environ.get("SENTRY_RELEASE"),
    environment=os.environ.get("ENV", "development"),
    before_send=lambda event, hint: redact_pii(event),
)
```

**Augment MCP Configuration:**

```json
// VS Code settings.json
{
  "augment.mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://mcp.sentry.dev/mcp"]
    }
  }
}
```

**Test Queries:**
- "Show recent Sentry errors for kijko-web"
- "What's the most frequent error this week?"
- "List unresolved issues for the current commit"

### 1.3 CircleCI Setup (Day 1) - Minimum Viable Configuration

**Decision:** Start with basic CI on Day 1, expand incrementally per phase

**Why Early CI (from Perplexity):**
- Catches foundational issues (setup errors, dependency problems) before they propagate
- Minimal initial config prevents slowing down development
- Easier to add complexity incrementally than retrofit later
- Enables Augment MCP integration from the start

**Phase 1-2 Minimum Config:**
```yaml
# .circleci/config.yml (Days 1-7)
version: 2.1

orbs:
  node: circleci/node@5.1.0
  path-filtering: circleci/path-filtering@0.1.3

executors:
  node_executor:
    docker:
      - image: cimg/node:20.11.0
    resource_class: medium
    environment:
      TURBO_UI: false

jobs:
  setup_monorepo:
    executor: node_executor
    steps:
      - checkout
      - restore_cache:
          keys:
            - monorepo-deps-{{ checksum "pnpm-lock.yaml" }}
            - monorepo-deps-
      - run:
          name: Install pnpm
          command: npm install -g pnpm@8
      - run:
          name: Install dependencies
          command: pnpm install --frozen-lockfile
      - save_cache:
          key: monorepo-deps-{{ checksum "pnpm-lock.yaml" }}
          paths:
            - ~/.pnpm-store
            - node_modules
      - persist_to_workspace:
          root: .
          paths:
            - .
            - node_modules

  lint:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Run linting
          command: pnpm turbo run lint --filter='./packages/*'

  typecheck:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Type checking
          command: pnpm turbo run typecheck --filter='./packages/*'

  build_packages:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - restore_cache:
          keys:
            - turbo-cache-{{ .Branch }}-{{ .Revision }}
            - turbo-cache-{{ .Branch }}
            - turbo-cache-main
      - run:
          name: Build packages
          command: pnpm turbo run build --filter='./packages/*'
      - save_cache:
          key: turbo-cache-{{ .Branch }}-{{ .Revision }}
          paths:
            - node_modules/.turbo
      - persist_to_workspace:
          root: .
          paths:
            - packages/*/dist

workflows:
  phase_1_2_basic:
    jobs:
      - setup_monorepo
      - lint:
          requires:
            - setup_monorepo
      - typecheck:
          requires:
            - setup_monorepo
      - build_packages:
          requires:
            - lint
            - typecheck
```

**Caching Strategy (from Perplexity):**

| Cache Type | Strategy | Key Pattern | TTL |
|-----------|----------|-------------|-----|
| **Node Modules** | pnpm store + workspace persistence | `monorepo-deps-{{ checksum "pnpm-lock.yaml" }}` | 30 days |
| **Turbo Cache** | Branch-specific with main fallback | `turbo-cache-{{ .Branch }}-{{ .Revision }}` | 15 days |
| **Docker Layers** | Local buildx cache via DLC (Phase 3+) | `docker-layers-{{ .Revision }}` | 7 days |
| **FFmpeg Binaries** | Versioned once per release (Phase 3+) | `ffmpeg-binary-v4.4` | 90 days |

**Environment Variables (CircleCI Project Settings):**
```bash
# Set these in CircleCI UI → Project Settings → Environment Variables
# Phase 1-2: Basic
TURBO_TOKEN=<vercel-remote-cache-token>  # Optional: Turborepo remote caching
TURBO_TEAM=<team-slug>

# Phase 3+: Full stack (add when needed)
DATABASE_URL=postgresql://user:pass@host:5432/opencut
REDIS_URL=redis://user:pass@host:6379
GEMINI_API_KEY=<gemini-key>
OPENAI_API_KEY=<openai-key>
COMFYUI_API_URL=http://comfyui-gateway:8188
BETTER_AUTH_SECRET=<generate-secure-random-32-char-string>
VERCEL_TOKEN=<scoped-access-token>
VERCEL_ORG_ID=<team-slug>
RAILWAY_TOKEN=<railway-api-token>
```

**Augment MCP Integration (Day 1):**
```json
// Add to Augment config (VS Code/Windsurf settings)
{
  "mcpServers": {
    "circleci": {
      "command": "npx",
      "args": ["-y", "@circleci/mcp-server-circleci@latest"],
      "env": {
        "CIRCLECI_TOKEN": "your-circleci-personal-api-token",
        "CIRCLECI_BASE_URL": "https://circleci.com"
      }
    }
  }
}
```

**Vibe Coding Workflow with MCP:**
1. Make code changes in editor
2. Push to branch
3. Ask Augment: "Did my build pass?"
4. Get immediate feedback without leaving editor
5. Fix issues and iterate—all within coding flow

### 1.4 State Management Strategy

**Decision:** Hybrid approach with domain-specific Zustand stores

**Store Architecture:**

```typescript
// packages/stores/editor/
- editor-store.ts          // Canvas presets, layout guides, app init
- timeline-store.ts        // Timeline tracks, elements, playback state
- media-store.ts           // Media files, asset management
- playback-store.ts        // Video playback controls, timing
- project-store.ts         // Project-level data, persistence
- panel-store.ts           // UI panel visibility, layout
- keybindings-store.ts     // Keyboard shortcuts
- scene-store.ts           // Scene management

// packages/stores/ai/
- chat-store.ts            // Gemini chat history, messages
- generation-store.ts      // AI generation state (video, image, voiceover)
- agent-store.ts           // Agent mode, settings, attached files

// packages/stores/workflows/
- workflow-store.ts        // ComfyUI workflow library, job tracking
- job-queue-store.ts       // Async job status, webhooks
```

**Cross-Store Communication:**
- Use Zustand middleware for persistence (IndexedDB for editor, PostgreSQL for workflows)
- Implement custom hooks for cross-store updates (e.g., `useEditorWithAI()`)
- Event bus for loosely coupled communication between domains

**Rationale (from Perplexity):**
- Balances complexity by organizing state into logical domains
- Avoids single bloated global store
- Easier maintenance and updates within each domain
- Clear boundaries prevent circular dependencies

### 1.5 Storage Layer Strategy

**Decision:** Coexist multiple storage systems with clear separation of concerns

**Storage Mapping:**

| Data Type | Storage System | Rationale |
|-----------|---------------|-----------|
| Editor projects, scenes | IndexedDB | Offline-first, structured data |
| Large media files (video, audio) | OPFS | Better performance for large files |
| ComfyUI workflows, schemas | PostgreSQL | Relational data, vector embeddings |
| Workflow job queue | PostgreSQL + Redis | Real-time status, pub/sub |
| User settings, preferences | IndexedDB | Client-side persistence |

**Implementation:**
```typescript
// packages/storage/storage-service.ts
export class UnifiedStorageService {
  private indexedDB: IndexedDBAdapter;
  private opfs: OPFSAdapter;
  private postgres: PostgresAdapter;
  
  async saveProject(project: Project) {
    // Editor data → IndexedDB
    await this.indexedDB.saveProject(project);
  }
  
  async saveMediaFile(file: MediaFile) {
    // Large files → OPFS
    await this.opfs.saveFile(file);
  }
  
  async saveWorkflow(workflow: ComfyUIWorkflow) {
    // Workflows → PostgreSQL
    await this.postgres.saveWorkflow(workflow);
  }
}
```

**Rationale (from Perplexity):**
- Leverages strengths of each storage system
- Incremental integration reduces migration risks
- Client-side (IndexedDB/OPFS) for editor, server-side (PostgreSQL) for workflows
- Easier to manage than full migration

### 1.6 Complete Persistence Implementation (from Perplexity)

**Decision:** Implement a comprehensive 3-tier persistence architecture with offline-first capabilities

**📚 Documentation References (Raindrop Collection):**

**Core Technologies:**
- [Dexie.js Documentation](https://dexie.org/docs/) - Promise-based IndexedDB wrapper with TypeScript support
- [Dexie.js Database Design](https://dexie.org/docs/Tutorial/Design) - Schema design, indexes, and compound keys
- [Dexie.js TypeScript Guide](https://dexie.org/docs/Typescript) - Type-safe database operations
- [Dexie.js Compound Indexes](https://dexie.org/docs/Compound-Index) - Multi-field queries and performance
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/guides/persisting-store-data) - localStorage and IndexedDB integration
- [IndexedDB API (MDN)](https://developer.mozilla.org/docs/Web/API/IndexedDB_API) - Client-side storage fundamentals
- [IndexedDB Best Practices (MDN)](https://developer.mozilla.org/docs/Web/API/IndexedDB_API/Best_Practices) - Performance and reliability
- [IndexedDB Best Practices (web.dev)](https://web.dev/articles/indexeddb-best-practices) - Quota management and error handling

**Storage & Sync:**
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html) - Direct client-to-S3 uploads
- [Railway Volumes Reference](https://docs.railway.com/reference/volumes) - Persistent storage configuration
- [Railway Simple S3 Template](https://railway.com/deploy/simple-s3) - One-click MinIO deployment
- [MinIO JavaScript SDK](https://min.io/docs/minio/linux/developers/javascript/API.html) - S3-compatible storage client
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API) - Deferred network requests and offline resilience

**Railway Platform:**
- [Railway PostgreSQL Guide](https://docs.railway.com/guides/postgresql) - Database deployment and management
- [Railway Environment Variables](https://docs.railway.com/reference/environments) - Secrets and configuration
- [Railway Docker Deployment](https://docs.railway.com/guides/dockerfiles) - Container deployment
- [Railway CLI Guide](https://docs.railway.com/guides/cli) - Deployment automation
- [Railway Cost Optimization](https://docs.railway.com/guides/optimize-usage) - Resource optimization

**Authentication:**
- [Better Auth Installation](https://www.better-auth.com/docs/installation) - Modern Next.js authentication
- [Better Auth Database Adapters](https://www.better-auth.com/docs/concepts/database) - PostgreSQL integration
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle) - Type-safe database operations

**Context7 Availability:**
- ✅ Zustand (via Context7)
- ✅ Drizzle ORM (via Context7)
- ❌ Dexie.js (use official docs)
- ❌ Railway (use official docs)
- ❌ Better Auth (use official docs)
- ❌ MinIO (use official docs)

**Architecture Overview:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Zustand Store   │  │  IndexedDB       │  │  Service      │ │
│  │  (UI State)      │←→│  (Dexie.js)      │←→│  Worker       │ │
│  │  - Chat state    │  │  - Chat cache    │  │  - Sync queue │ │
│  │  - Asset refs    │  │  - Asset blobs   │  │  - Retry logic│ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ API Routes
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER TIER                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Next.js API     │  │  PostgreSQL      │  │  Railway      │ │
│  │  Routes          │←→│  (Railway)       │  │  Garage       │ │
│  │  - /api/chat     │  │  - Sessions      │  │  (S3)         │ │
│  │  - /api/assets   │  │  - Messages      │  │  - Assets     │ │
│  │  - /api/sync     │  │  - Metadata      │  │  - Media      │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale (from Perplexity):**
- **IndexedDB with Dexie.js:** Structured client-side storage with promise-based API, supports binary blobs for assets
- **Zustand persist:** Lightweight UI state persistence, only stores metadata (not full message bodies)
- **PostgreSQL:** Server-side source of truth for chat sessions, messages, asset metadata
- **Railway Garage:** S3-compatible storage for large files with presigned URL access
- **Progressive sync:** Metadata-first loading on login, on-demand asset fetching

#### 1.6.1 IndexedDB Schema with Dexie.js

**Implementation:**

```typescript
// packages/storage/indexeddb/db.ts
import Dexie, { Table } from 'dexie';

export interface ChatSession {
  id: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
  syncedAt?: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: any[];
  metadata?: Record<string, any>;
  createdAt: Date;
  syncedAt?: Date;
}

export interface Asset {
  id: string;
  projectId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  file?: Blob; // Actual file blob for offline access
  storageUrl?: string; // Garage URL after upload
  thumbnailUrl?: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  uploadProgress?: number;
  error?: string;
  createdAt: Date;
  syncedAt?: Date;
}

export interface AssetMetadata {
  id: string;
  projectId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  duration?: number;
  storageUrl: string;
}

export interface SyncQueue {
  id: string;
  type: 'upload' | 'download' | 'delete';
  assetId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
  lastTriedAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  thumbnailAssetId?: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

class AppDatabase extends Dexie {
  chatSessions!: Table<ChatSession, string>;
  chatMessages!: Table<ChatMessage, string>;
  assets!: Table<Asset, string>;
  assetMetadata!: Table<AssetMetadata, string>;
  syncQueue!: Table<SyncQueue, string>;
  projects!: Table<Project, string>;

  constructor() {
    super('kijko_db');

    this.version(1).stores({
      chatSessions: 'id, projectId, createdAt, updatedAt',
      chatMessages: 'id, sessionId, createdAt, [sessionId+createdAt]',
      assets: 'id, projectId, uploadStatus, createdAt',
      assetMetadata: 'id, projectId, filename',
      syncQueue: 'id, type, status, nextRetryAt, [status+nextRetryAt]',
      projects: 'id, updatedAt, syncedAt'
    });
  }
}

// Singleton instance
export const db = new AppDatabase();
```

**Best Practices (from Perplexity):**
- **Singleton pattern:** Export single db instance to avoid duplicate connections
- **Compound indexes:** `[sessionId+createdAt]` for efficient message queries
- **Binary storage:** Store Blob directly for assets (IndexedDB handles this efficiently)
- **Async/await:** Use Dexie's promise-based API throughout

#### 1.6.2 Next.js API Routes Structure

**Implementation:**

```typescript
// apps/web/src/app/api/chat/sessions/route.ts
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/chat/sessions - List all chat sessions
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const sessions = await db.query(
    `SELECT id, project_id, created_at, updated_at,
     (SELECT content FROM chat_messages
      WHERE session_id = cs.id
      ORDER BY created_at DESC LIMIT 1) as last_message
     FROM chat_sessions cs
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [session.user.id]
  );

  return Response.json(sessions);
}

// POST /api/chat/sessions - Create new chat session
export async function POST(request: Request) {
  const session = await auth();
  const { projectId } = await request.json();

  const chatSession = await db.query(
    `INSERT INTO chat_sessions (user_id, project_id)
     VALUES ($1, $2)
     RETURNING *`,
    [session.user.id, projectId]
  );

  return Response.json(chatSession[0]);
}
```

```typescript
// apps/web/src/app/api/chat/messages/batch/route.ts
export async function POST(request: Request) {
  const session = await auth();
  const { messages, sessionId } = await request.json();

  // Verify session ownership
  const sessionCheck = await db.query(
    'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, session.user.id]
  );

  if (!sessionCheck[0]) return new Response('Forbidden', { status: 403 });

  // Batch insert with transaction
  const result = await db.query(`
    INSERT INTO chat_messages (session_id, content, role, created_at)
    SELECT $1, content, role, to_timestamp(created_at / 1000.0)
    FROM jsonb_to_recordset($2) AS t(content text, role text, created_at bigint)
    RETURNING id, created_at
  `, [sessionId, JSON.stringify(messages)]);

  // Map back to temp IDs
  const serverMessages = result.map((row, idx) => ({
    tempId: messages[idx].id,
    id: row.id,
    createdAt: row.created_at.getTime()
  }));

  return Response.json({ serverMessages });
}
```

```typescript
// apps/web/src/app/api/assets/presign/route.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.GARAGE_ACCESS_KEY!,
    secretAccessKey: process.env.GARAGE_SECRET_KEY!
  },
  endpoint: process.env.GARAGE_ENDPOINT
});

// POST /api/assets/presign - Get presigned URLs for upload/download
export async function POST(request: Request) {
  const session = await auth();
  const { assetIds, operation } = await request.json(); // operation: 'upload' | 'download'

  // Validate user has access to these assets
  const assets = await db.query(`
    SELECT id, storage_key, file_type
    FROM assets
    WHERE id = ANY($1) AND user_id = $2
  `, [assetIds, session.user.id]);

  const urls = await Promise.all(
    assets.map(async (asset) => {
      const command = operation === 'upload'
        ? new PutObjectCommand({
            Bucket: `user-${session.user.id}-assets`,
            Key: asset.storage_key,
            ContentType: asset.file_type
          })
        : new GetObjectCommand({
            Bucket: `user-${session.user.id}-assets`,
            Key: asset.storage_key
          });

      const url = await getSignedUrl(s3Client, command, {
        expiresIn: 3600 // 1 hour (from Perplexity best practices)
      });

      return { assetId: asset.id, url };
    })
  );

  return Response.json({ urls });
}
```

```typescript
// apps/web/src/app/api/sync/init/route.ts
// Comprehensive login sync endpoint (from Perplexity)
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const userId = session.user.id;

  // Tier 1: Critical data (must load before UI is interactive)
  const [sessions, userPrefs] = await Promise.all([
    db.query(`
      SELECT id, name, project_id, created_at, updated_at,
             (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) as message_count
      FROM chat_sessions cs
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 20
    `, [userId]),
    db.query(`
      SELECT last_session_id, theme, sidebar_collapsed
      FROM user_preferences
      WHERE user_id = $1
    `, [userId])
  ]);

  // Tier 2: Load current session's recent messages (if one exists)
  const currentSessionId = userPrefs[0]?.last_session_id;
  let recentMessages = [];
  if (currentSessionId) {
    recentMessages = await db.query(`
      SELECT id, content, role, attachments, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [currentSessionId]);
  }

  // Tier 3: Recent projects with thumbnail metadata
  const projects = await db.query(`
    SELECT p.id, p.name, p.thumbnail_asset_id, p.created_at, p.updated_at,
           a.thumbnail_url
    FROM projects p
    LEFT JOIN assets a ON p.thumbnail_asset_id = a.id
    WHERE p.user_id = $1
    ORDER BY p.updated_at DESC
    LIMIT 10
  `, [userId]);

  return Response.json({
    sessions,
    currentSessionMessages: recentMessages,
    projects,
    userPrefs: userPrefs[0],
    timestamp: Date.now()
  });
}
```

**API Route Structure (from Perplexity):**

```
apps/web/src/app/api/
├── chat/
│   ├── sessions/route.ts          # GET/POST chat sessions
│   ├── messages/
│   │   ├── route.ts               # GET messages for session
│   │   └── batch/route.ts         # POST batch message sync
│   └── [sessionId]/
│       └── messages/route.ts      # GET/POST messages for specific session
├── assets/
│   ├── metadata/route.ts          # GET asset metadata
│   ├── presign/route.ts           # POST get presigned URLs
│   ├── upload-status/route.ts     # GET/POST track upload status
│   └── [id]/
│       └── download-url/route.ts  # GET presigned download URL
├── projects/
│   ├── route.ts                   # GET/POST projects
│   └── [id]/
│       └── assets/route.ts        # GET assets for project
└── sync/
    └── init/route.ts              # GET comprehensive login sync
```

#### 1.6.3 Asset Sync Service with Retry Logic

**Implementation:**

```typescript
// packages/storage/asset-sync-service.ts
import { db } from './indexeddb/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class AssetSyncService {
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startSyncWorker();
  }

  // UPLOAD: Local → Cloud with retry logic (from Perplexity)
  async uploadAsset(
    file: File,
    projectId: string,
    userId: string
  ): Promise<Asset> {
    const assetId = crypto.randomUUID();

    // 1. Save to IndexedDB immediately for instant access
    const localAsset = await db.assets.add({
      id: assetId,
      projectId,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      file: file, // Store actual file blob
      uploadStatus: 'pending',
      uploadProgress: 0,
      createdAt: new Date()
    });

    // 2. Queue for cloud upload
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      type: 'upload',
      assetId: assetId,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      nextRetryAt: new Date()
    });

    // 3. Start upload in background
    this.processUpload(assetId);

    return localAsset;
  }

  private async processUpload(assetId: string) {
    const asset = await db.assets.get(assetId);
    if (!asset || !asset.file) return;

    const queueItem = await db.syncQueue
      .where({ assetId, type: 'upload' })
      .first();

    if (!queueItem) return;

    try {
      // Update status to in-progress
      await db.syncQueue.update(queueItem.id, {
        status: 'in-progress',
        lastTriedAt: new Date()
      });

      await db.assets.update(assetId, {
        uploadStatus: 'uploading',
        uploadProgress: 0
      });

      // Get presigned URL from server
      const presignResponse = await fetch('/api/assets/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: [assetId],
          operation: 'upload'
        })
      });

      const { urls } = await presignResponse.json();
      const presignedUrl = urls[0].url;

      // Upload to Garage with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          db.assets.update(assetId, { uploadProgress: progress });
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', asset.fileType);
        xhr.send(asset.file);
      });

      // Save metadata to PostgreSQL
      const storageKey = `projects/${asset.projectId}/assets/${assetId}/${asset.filename}`;
      const dbAsset = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assetId,
          project_id: asset.projectId,
          filename: asset.filename,
          file_type: asset.fileType,
          file_size: asset.fileSize,
          storage_key: storageKey,
          storage_url: `garage://${storageKey}`
        })
      }).then(r => r.json());

      // Update local DB with cloud URL
      await db.assets.update(assetId, {
        uploadStatus: 'completed',
        uploadProgress: 100,
        storageUrl: dbAsset.storage_url,
        syncedAt: new Date()
      });

      // Clean up queue and file blob (keep metadata)
      await db.syncQueue.delete(queueItem.id);
      await db.assets.update(assetId, { file: undefined }); // Remove blob to save space

    } catch (error) {
      console.error('Upload failed:', error);

      // Exponential backoff retry logic (from Perplexity)
      const nextAttempts = queueItem.attempts + 1;
      const maxRetries = 5;

      if (nextAttempts < maxRetries) {
        const backoffMs = Math.pow(2, nextAttempts) * 1000; // 2s, 4s, 8s, 16s, 32s
        const nextRetryAt = new Date(Date.now() + backoffMs);

        await db.syncQueue.update(queueItem.id, {
          status: 'pending',
          attempts: nextAttempts,
          lastError: error.message,
          nextRetryAt
        });

        await db.assets.update(assetId, {
          uploadStatus: 'pending',
          error: `Retry ${nextAttempts}/${maxRetries}: ${error.message}`
        });
      } else {
        // Max retries reached
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: 'Max retries exceeded'
        });

        await db.assets.update(assetId, {
          uploadStatus: 'failed',
          error: 'Upload failed after 5 attempts. Please try again manually.'
        });
      }
    }
  }

  // Background sync worker (from Perplexity)
  private startSyncWorker() {
    // Process upload queue every 30 seconds
    this.syncInterval = setInterval(async () => {
      const pendingUploads = await db.syncQueue
        .where('status').equals('pending')
        .and(item => item.nextRetryAt <= new Date())
        .toArray();

      for (const upload of pendingUploads) {
        await this.processUpload(upload.assetId);
      }
    }, 30000);
  }

  stopSyncWorker() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // DOWNLOAD: Cloud → Local (on-demand)
  async downloadAsset(assetId: string): Promise<File> {
    // 1. Check local cache first
    const localAsset = await db.assets.get(assetId);
    if (localAsset?.file) {
      return localAsset.file;
    }

    // 2. Fetch metadata from server
    const metadata = await fetch(`/api/assets/${assetId}`)
      .then(r => r.json());

    // 3. Get presigned URL from Garage
    const presignedUrl = await fetch('/api/assets/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetIds: [assetId],
        operation: 'download'
      })
    })
      .then(r => r.json())
      .then(data => data.urls[0].url);

    // 4. Download file
    const response = await fetch(presignedUrl);
    const blob = await response.blob();
    const file = new File([blob], metadata.filename, {
      type: metadata.file_type
    });

    // 5. Cache locally
    await db.assets.put({
      id: assetId,
      projectId: metadata.project_id,
      filename: metadata.filename,
      fileType: metadata.file_type,
      fileSize: metadata.file_size,
      file: file,
      storageUrl: metadata.storage_url,
      uploadStatus: 'completed',
      syncedAt: new Date()
    });

    return file;
  }

  // SYNC: Load user's projects on login (from Perplexity)
  async syncUserProjects(userId: string) {
    // 1. Get comprehensive sync data from server
    const syncData = await fetch('/api/sync/init')
      .then(r => r.json());

    // 2. Store chat sessions locally
    for (const session of syncData.sessions) {
      await db.chatSessions.put({
        ...session,
        syncedAt: new Date()
      });
    }

    // 3. Store current session messages
    if (syncData.currentSessionMessages) {
      for (const message of syncData.currentSessionMessages) {
        await db.chatMessages.put({
          ...message,
          syncedAt: new Date()
        });
      }
    }

    // 4. Store projects with metadata
    for (const project of syncData.projects) {
      await db.projects.put({
        ...project,
        syncedAt: new Date()
      });

      // 5. Preload thumbnail if available
      if (project.thumbnail_asset_id && project.thumbnail_url) {
        await db.assetMetadata.put({
          id: project.thumbnail_asset_id,
          projectId: project.id,
          filename: 'thumbnail',
          fileType: 'image/jpeg',
          fileSize: 0,
          thumbnailUrl: project.thumbnail_url,
          storageUrl: project.thumbnail_url
        });
      }
    }
  }
}
```

#### 1.6.4 Zustand Store with Persistence (from Perplexity)

**Implementation:**

```typescript
// packages/stores/ai/chat-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/storage/indexeddb/db';

interface ChatStore {
  currentSessionId: string | null;
  sessions: ChatSession[];
  messages: Map<string, ChatMessage[]>;
  pendingMessages: Map<string, { synced: boolean }>;

  // Actions
  loadSessions: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  createNewSession: (projectId?: string) => Promise<void>;
  syncMessages: () => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      sessions: [],
      messages: new Map(),
      pendingMessages: new Map(),

      loadSessions: async () => {
        // Try IndexedDB first (offline-first)
        const cachedSessions = await db.chatSessions
          .orderBy('updatedAt')
          .reverse()
          .limit(50)
          .toArray();

        if (cachedSessions.length > 0) {
          set({ sessions: cachedSessions });
        }

        // Then fetch from server for updates
        try {
          const response = await fetch('/api/chat/sessions');
          const sessions = await response.json();

          // Update IndexedDB cache
          for (const session of sessions) {
            await db.chatSessions.put({ ...session, syncedAt: new Date() });
          }

          set({ sessions });
        } catch (error) {
          console.error('Failed to load sessions from server:', error);
          // Continue with cached data
        }
      },

      loadMessages: async (sessionId: string) => {
        // Check memory cache first
        const cached = get().messages.get(sessionId);
        if (cached && cached.length > 0) {
          set({ currentSessionId: sessionId });
          return;
        }

        // Check IndexedDB cache
        const cachedMessages = await db.chatMessages
          .where('sessionId').equals(sessionId)
          .sortBy('createdAt');

        if (cachedMessages.length > 0) {
          set(state => ({
            currentSessionId: sessionId,
            messages: new Map(state.messages).set(sessionId, cachedMessages)
          }));
        }

        // Load from server
        try {
          const response = await fetch(`/api/chat/${sessionId}/messages`);
          const messages = await response.json();

          // Update IndexedDB cache
          for (const message of messages) {
            await db.chatMessages.put({ ...message, syncedAt: new Date() });
          }

          set(state => ({
            currentSessionId: sessionId,
            messages: new Map(state.messages).set(sessionId, messages)
          }));
        } catch (error) {
          console.error('Failed to load messages from server:', error);
          // Continue with cached data
        }
      },

      sendMessage: async (content: string, attachments?: any[]) => {
        let { currentSessionId } = get();

        // Create session if needed
        if (!currentSessionId) {
          await get().createNewSession();
          currentSessionId = get().currentSessionId;
        }

        if (!currentSessionId) return;

        // Generate temp ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        const userMessage: ChatMessage = {
          id: tempId,
          sessionId: currentSessionId,
          role: 'user',
          content,
          attachments,
          createdAt: new Date()
        };

        // Optimistic update (from Perplexity)
        set(state => {
          const messages = state.messages.get(currentSessionId!) || [];
          messages.push(userMessage);
          return {
            messages: new Map(state.messages).set(currentSessionId!, messages),
            pendingMessages: new Map(state.pendingMessages).set(tempId, { synced: false })
          };
        });

        // Save to IndexedDB immediately
        await db.chatMessages.add(userMessage);

        // Queue for server sync (batched)
        setTimeout(() => get().syncMessages(), 2000);
      },

      syncMessages: async () => {
        const { currentSessionId, messages, pendingMessages } = get();
        if (!currentSessionId) return;

        const sessionMessages = messages.get(currentSessionId) || [];
        const unsyncedMessages = sessionMessages.filter(msg =>
          msg.id.startsWith('temp-') && pendingMessages.has(msg.id)
        );

        if (unsyncedMessages.length === 0) return;

        try {
          // Batch sync to server (from Perplexity)
          const response = await fetch('/api/chat/messages/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: unsyncedMessages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                attachments: msg.attachments,
                createdAt: msg.createdAt.getTime()
              })),
              sessionId: currentSessionId
            })
          });

          const { serverMessages } = await response.json();

          // Replace temp IDs with server IDs
          const updatedMessages = sessionMessages.map(msg => {
            const serverMsg = serverMessages.find(sm => sm.tempId === msg.id);
            if (serverMsg) {
              return { ...msg, id: serverMsg.id, syncedAt: new Date() };
            }
            return msg;
          });

          // Update IndexedDB
          for (const msg of updatedMessages) {
            if (!msg.id.startsWith('temp-')) {
              await db.chatMessages.put(msg);
            }
          }

          // Update store
          set(state => ({
            messages: new Map(state.messages).set(currentSessionId, updatedMessages),
            pendingMessages: new Map() // Clear pending
          }));

        } catch (error) {
          console.error('Failed to sync messages:', error);
          // Messages remain in IndexedDB, will retry on next sync
        }
      },

      createNewSession: async (projectId?: string) => {
        try {
          const response = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
          });

          const session = await response.json();

          // Save to IndexedDB
          await db.chatSessions.add({ ...session, syncedAt: new Date() });

          set(state => ({
            currentSessionId: session.id,
            sessions: [session, ...state.sessions],
            messages: new Map(state.messages).set(session.id, [])
          }));
        } catch (error) {
          console.error('Failed to create session:', error);
        }
      }
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist minimal state (from Perplexity)
        currentSessionId: state.currentSessionId,
        sessions: state.sessions.slice(0, 10) // Keep last 10 for quick access
        // Don't persist messages—load from IndexedDB on demand
      })
    }
  )
);
```

#### 1.6.5 Complete User Flow

**1. User Logs In:**
```typescript
// apps/web/src/app/auth/callback/route.ts
export async function GET(request: Request) {
  const session = await auth();

  if (session?.user) {
    // Start syncing user data in background (from Perplexity)
    setTimeout(async () => {
      const syncService = new AssetSyncService();
      await syncService.syncUserProjects(session.user.id);
    }, 0);

    // Redirect to dashboard immediately
    return redirect('/dashboard');
  }

  return redirect('/login');
}
```

**2. User Uploads Asset:**
- Store in IndexedDB immediately (instant UI feedback)
- Upload to Garage in background
- Save metadata to PostgreSQL
- Update IndexedDB with cloud URL when complete

**3. User Opens Project:**
- Load project metadata from IndexedDB (instant)
- Fetch missing assets from Garage on-demand
- Cache downloaded assets in IndexedDB

**4. User Chats with AI:**
- Save each message to IndexedDB immediately
- Batch sync to PostgreSQL every 2 seconds
- Keep last 50 messages in Zustand for quick access
- Load older messages from IndexedDB/PostgreSQL on scroll

**5. User Switches Devices:**
- All data available from cloud (PostgreSQL + Garage)
- Progressive download as needed
- Full offline capability once cached

**Best Practices Summary (from Perplexity):**

1. **IndexedDB with Dexie.js:**
   - Singleton database instance
   - Compound indexes for efficient queries
   - Store Blobs directly for assets
   - Async/await for all operations

2. **Background Sync:**
   - Exponential backoff for retries (2s, 4s, 8s, 16s, 32s)
   - Max 5 retry attempts
   - Show manual retry button after failures
   - Track sync status in UI

3. **Zustand Persist:**
   - Only persist minimal metadata
   - Store full data in IndexedDB
   - Hydrate from IndexedDB on load

4. **Presigned URLs:**
   - Generate on-demand per request
   - 1-hour expiry for security
   - Batch requests for visible assets
   - Use Intersection Observer for lazy loading

5. **Progressive Sync:**
   - Metadata first on login (<2s response)
   - Current session messages next
   - Assets on-demand as user scrolls
   - Prefetch thumbnails for recent projects

6. **Offline/Online Handling:**
   - Listen for `online`/`offline` events
   - Use server timestamps for conflict resolution
   - Show clear UI indicators for sync status
   - Allow manual retry for failed operations

7. **Memory Management:**
   - Remove file blobs after successful upload
   - Keep only metadata in IndexedDB
   - Evict least-recently-used assets when quota nears limit
   - Stream large files to avoid memory pressure

---

## Phase 2: OpenCut Editor Migration (Days 4-7)

### 2.1 Extract Editor Core to Shared Package

**Tasks:**
1. Create `packages/editor/` with framework-agnostic components
2. Extract OpenCut's timeline, preview, media, properties panels
3. Remove Next.js-specific dependencies (use React only)
4. Create clean API boundaries for editor integration

**Key Components to Extract:**
```
packages/editor/
├── timeline/
│   ├── TimelineCanvas.tsx      # Canvas-based timeline
│   ├── TimelineTrack.tsx       # Track rendering
│   ├── TimelineElement.tsx     # Element rendering
│   └── hooks/
│       ├── useTimelineDrag.ts
│       ├── useTimelineSnap.ts
│       └── useTimelineZoom.ts
├── preview/
│   ├── PreviewPanel.tsx        # Video preview
│   ├── PreviewCanvas.tsx       # Canvas rendering
│   └── hooks/
│       └── usePreviewPlayback.ts
├── media/
│   ├── MediaPanel.tsx          # Asset library
│   ├── MediaGrid.tsx
│   └── MediaUpload.tsx
└── properties/
    ├── PropertiesPanel.tsx     # Element properties
    └── property-editors/
        ├── VideoProperties.tsx
        ├── AudioProperties.tsx
        └── TextProperties.tsx
```

### 2.2 Migrate Zustand Stores

**Tasks:**
1. Move OpenCut stores to `packages/stores/editor/`
2. Update import paths to use monorepo structure
3. Ensure stores work independently of Next.js
4. Add persistence middleware for IndexedDB

**Migration Checklist:**
- [ ] editor-store.ts → packages/stores/editor/
- [ ] timeline-store.ts → packages/stores/editor/
- [ ] media-store.ts → packages/stores/editor/
- [ ] playback-store.ts → packages/stores/editor/
- [ ] project-store.ts → packages/stores/editor/
- [ ] panel-store.ts → packages/stores/editor/
- [ ] keybindings-store.ts → packages/stores/editor/
- [ ] scene-store.ts → packages/stores/editor/

### 2.3 Integrate Editor into KijkoCut

**Tasks:**
1. Create new Next.js app in `apps/web/`
2. Import editor components from `packages/editor/`
3. Import editor stores from `packages/stores/editor/`
4. Preserve KijkoCut's AI chat interface
5. Create unified layout with editor + AI panels

**Layout Design:**
```
┌─────────────────────────────────────────────────────┐
│ Top Bar: Project Name, Save, Export, Settings      │
├──────────┬──────────────────────────┬───────────────┤
│          │                          │               │
│  Media   │   Preview Panel          │  AI Chat      │
│  Panel   │   (OpenCut)              │  (KijkoCut)   │
│          │                          │               │
│ (OpenCut)│                          │  - Gemini AI  │
│          │                          │  - Workflows  │
│          │                          │  - Generation │
├──────────┴──────────────────────────┴───────────────┤
│                                                      │
│  Timeline Panel (OpenCut)                            │
│  - Multi-track editing                               │
│  - Drag & drop                                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Phase 3: ComfyUI Integration (Days 8-14)

### 3.1 CircleCI Expansion - Docker, GPU, Deployments

**Add to CircleCI Config (Day 8):**

```yaml
# .circleci/config.yml (Phase 3+ additions)
executors:
  node_large_executor:
    docker:
      - image: cimg/node:20.11.0
    resource_class: large  # Upgrade for 10+ packages
    environment:
      TURBO_UI: false

  docker_builder:
    docker:
      - image: cimg/base:2024.01
    resource_class: large

  gpu_executor:
    machine:
      image: ubuntu-2204-cuda-12.1:2024.01
    resource_class: gpu.nvidia.medium
    environment:
      TURBO_UI: false

jobs:
  # Docker build for ComfyUI gateway
  docker_build_comfyui:
    executor: docker_builder
    steps:
      - checkout
      - attach_workspace:
          at: .
      - setup_remote_docker:
          docker_layer_caching: true  # Critical for performance
          version: 20.10.12
      - restore_cache:
          keys:
            - docker-layers-{{ .Revision }}
            - docker-layers-
      - run:
          name: Build ComfyUI gateway Docker image
          command: |
            docker buildx build \
              --cache-from type=local,src=/tmp/docker-cache \
              --cache-to type=local,dest=/tmp/docker-cache \
              -t opencut/comfyui-gateway:${CIRCLE_SHA1:0:7} \
              -t opencut/comfyui-gateway:latest \
              -f apps/comfyui-gateway/Dockerfile \
              .
      - save_cache:
          key: docker-layers-{{ .Revision }}
          paths:
            - /tmp/docker-cache
      - run:
          name: Save Docker image for deployment
          command: |
            mkdir -p /tmp/docker-images
            docker save opencut/comfyui-gateway:latest \
              > /tmp/docker-images/comfyui-gateway.tar
      - persist_to_workspace:
          root: /tmp
          paths:
            - docker-images

  # GPU testing for ComfyUI workflows
  test_comfyui_workflows:
    executor: gpu_executor
    steps:
      - checkout
      - attach_workspace:
          at: .
      - run:
          name: Verify GPU access
          command: nvidia-smi
      - restore_cache:
          keys:
            - ffmpeg-binary-v4.4
      - run:
          name: Setup FFmpeg
          command: |
            if [ ! -f ~/.ffmpeg/ffmpeg ]; then
              mkdir -p ~/.ffmpeg
              wget -O /tmp/ffmpeg.tar.xz \
                https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
              tar -xf /tmp/ffmpeg.tar.xz -C ~/.ffmpeg --strip-components=1
            fi
            echo 'export PATH="~/.ffmpeg:$PATH"' >> $BASH_ENV
      - save_cache:
          key: ffmpeg-binary-v4.4
          paths:
            - ~/.ffmpeg
      - run:
          name: Install Python dependencies
          command: |
            python3 -m pip install --upgrade pip
            pip install torch torchvision torchaudio \
              --index-url https://download.pytorch.org/whl/cu121
            pip install -r apps/comfyui-gateway/requirements.txt
      - run:
          name: Run ComfyUI workflow tests
          command: |
            cd apps/comfyui-gateway
            python3 -m pytest tests/workflows/ -v --timeout=300
      - store_test_results:
          path: apps/comfyui-gateway/test-results/
      - store_artifacts:
          path: apps/comfyui-gateway/test-artifacts/

  # Deploy to Railway
  deploy_backend_railway:
    executor: docker_builder
    steps:
      - checkout
      - attach_workspace:
          at: /tmp
      - run:
          name: Install Railway CLI
          command: npm install -g @railway/cli
      - run:
          name: Deploy ComfyUI gateway to Railway
          command: |
            cd apps/comfyui-gateway
            railway deploy \
              --service comfyui-gateway \
              --environment production

  # Deploy to Vercel
  deploy_web_vercel:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install Vercel CLI
          command: npm install -g vercel@latest
      - run:
          name: Deploy web app to Vercel
          command: |
            cd apps/web
            vercel --prod \
              --token=${VERCEL_TOKEN} \
              --scope=${VERCEL_ORG_ID}

  # Sentry release management (from Perplexity)
  sentry_release_web:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install Sentry CLI
          command: npm install -g @sentry/cli
      - run:
          name: Create Sentry release for web
          command: |
            export RELEASE_VERSION=$(git rev-parse --short HEAD)

            # Create release
            sentry-cli releases new -p kijko-web $RELEASE_VERSION

            # Associate commits
            sentry-cli releases set-commits $RELEASE_VERSION --auto

            # Upload source maps for Next.js app
            sentry-cli releases files $RELEASE_VERSION upload-sourcemaps \
              ./apps/web/.next \
              --url-prefix "~/static/js" \
              --rewrite

            # Upload source maps for shared packages
            sentry-cli releases files $RELEASE_VERSION upload-sourcemaps \
              ./packages/editor/dist \
              --url-prefix "~/editor" \
              --rewrite

            sentry-cli releases files $RELEASE_VERSION upload-sourcemaps \
              ./packages/stores/dist \
              --url-prefix "~/stores" \
              --rewrite

            # Finalize release
            sentry-cli releases finalize $RELEASE_VERSION

  sentry_release_api:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install Sentry CLI
          command: npm install -g @sentry/cli
      - run:
          name: Create Sentry release for API
          command: |
            export RELEASE_VERSION=$(git rev-parse --short HEAD)

            # Create release
            sentry-cli releases new -p kijko-api $RELEASE_VERSION

            # Associate commits
            sentry-cli releases set-commits $RELEASE_VERSION --auto

            # Finalize release (Python doesn't need source maps typically)
            sentry-cli releases finalize $RELEASE_VERSION

workflows:
  # Phase 3+ workflow with deployments and Sentry
  phase_3_plus:
    jobs:
      - setup_monorepo
      - lint:
          requires:
            - setup_monorepo
      - typecheck:
          requires:
            - setup_monorepo
      - build_packages:
          requires:
            - lint
            - typecheck
      - docker_build_comfyui:
          requires:
            - build_packages
      - test_comfyui_workflows:
          requires:
            - docker_build_comfyui
      # Manual approval for production deployments
      - approve_deploy:
          type: approval
          requires:
            - test_comfyui_workflows
          filters:
            branches:
              only: main
      - deploy_backend_railway:
          requires:
            - approve_deploy
      - deploy_web_vercel:
          requires:
            - approve_deploy
      # Sentry releases after successful deployment
      - sentry_release_web:
          requires:
            - deploy_web_vercel
      - sentry_release_api:
          requires:
            - deploy_backend_railway
```

**Key Improvements (from Perplexity):**
- **Docker Layer Caching (DLC):** Saves ~500MB per build, critical for ComfyUI images
- **GPU Runners:** Test workflows locally before Railway deployment
- **FFmpeg Binary Caching:** Separate cache prevents bloating Node images
- **Manual Approval:** Prevents accidental production deploys during development
- **Resource Class Upgrade:** `large` for 10+ packages prevents OOM errors

### 3.2 Sentry Custom Instrumentation (from Perplexity)

**Instrument ComfyUI Workflow Execution:**

```python
# apps/comfyui-gateway/services/workflow_executor.py
import sentry_sdk

async def execute_workflow(workflow_id: str, params: dict):
    # Create transaction for workflow execution
    with sentry_sdk.start_transaction(
        op="comfyui.workflow",
        name=f"execute_workflow_{workflow_id}"
    ) as transaction:
        transaction.set_tag("workflow_id", workflow_id)
        transaction.set_tag("workflow_type", params.get("type"))

        try:
            # Span for workflow preparation
            with sentry_sdk.start_span(op="workflow.prepare") as span:
                workflow_data = await prepare_workflow(workflow_id, params)
                span.set_data("input_params", params)

            # Span for ComfyUI API call
            with sentry_sdk.start_span(op="comfyui.api_call") as span:
                result = await comfyui_client.execute(workflow_data)
                span.set_data("execution_time", result.duration)

            # Span for result processing
            with sentry_sdk.start_span(op="workflow.process_result") as span:
                processed = await process_result(result)
                span.set_data("output_size", len(processed))

            return processed

        except Exception as e:
            sentry_sdk.capture_exception(e)
            transaction.set_status("internal_error")
            raise
```

**Instrument FFmpeg Processing:**

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
                span.set_data("stderr", result.stderr.decode()[:1000])

                if result.returncode != 0:
                    sentry_sdk.capture_message(
                        f"FFmpeg failed: {result.stderr.decode()}",
                        level="error"
                    )

        except subprocess.TimeoutExpired:
            sentry_sdk.capture_message("FFmpeg timeout", level="error")
            raise
```

**Distributed Tracing (Next.js → FastAPI):**

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

### 3.3 Langfuse Agent Instrumentation (from Perplexity)

**Instrument LangGraph Multi-Agent Workflows:**

```python
# apps/comfyui-gateway/agents/vrd_agent.py
from langfuse.decorators import observe
from langfuse.callback import CallbackHandler
from packages.langfuse.python.client import langfuse, sanitize_trace

# Callback handler for LangGraph (from Perplexity)
langfuse_handler = CallbackHandler(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST")
)

@observe()  # Decorator pattern (from Perplexity)
async def vrd_agent_action(brief: dict):
    """VRD Agent: Analyzes brief and creates Video Requirements Doc"""

    # Create trace with metadata
    trace = langfuse.trace(
        name="vrd_agent",
        input=sanitize_trace(brief),
        metadata={
            "agent": "VRD Agent",
            "workflow": "ad_agency_pipeline",
            "user_id": brief.get("user_id"),
        }
    )

    try:
        # Span for brief analysis
        with trace.span(name="analyze_brief") as span:
            analysis = await analyze_brief(brief)
            span.end(output={"complexity_score": analysis.complexity})

        # Span for VRD generation
        with trace.span(name="generate_vrd") as span:
            vrd = await generate_vrd(analysis)
            span.end(output={"vrd_sections": len(vrd.sections)})

        # Track cost (from Perplexity)
        trace.update(
            output=sanitize_trace(vrd),
            metadata={
                "tokens_used": vrd.tokens,
                "cost_usd": vrd.tokens * 0.00002,  # GPT-4 pricing
            }
        )

        return vrd

    except Exception as e:
        trace.update(
            level="ERROR",
            status_message=str(e)
        )
        raise
```

**Nested Spans for Multi-Agent Workflows (from Perplexity):**

```python
# apps/comfyui-gateway/workflows/ad_agency_pipeline.py
from langfuse import Langfuse

async def ad_agency_pipeline(brief: dict):
    """
    Multi-agent workflow: VRD Agent → ScriptSmith → ShotMaster → Video Solver
    """

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

        # Calculate total cost (from Perplexity)
        total_cost = sum([
            vrd.cost,
            script.cost,
            storyboard.cost,
            production_plan.cost
        ])

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

**Instrument ComfyUI Workflow Execution:**

```python
# apps/comfyui-gateway/services/comfyui_executor.py
from langfuse.decorators import observe

@observe()
async def execute_comfyui_workflow(workflow_id: str, params: dict):
    """Execute ComfyUI workflow with Langfuse tracing"""

    trace = langfuse.trace(
        name="comfyui_workflow_execution",
        input=sanitize_trace(params),
        metadata={
            "workflow_id": workflow_id,
            "workflow_type": params.get("type"),
        }
    )

    try:
        # Span for workflow preparation
        with trace.span(name="prepare_workflow") as span:
            workflow_data = await prepare_workflow(workflow_id, params)
            span.end(output={"nodes": len(workflow_data.nodes)})

        # Span for ComfyUI API call
        with trace.span(name="comfyui_api_call") as span:
            result = await comfyui_client.execute(workflow_data)
            span.end(output={
                "execution_time_seconds": result.duration,
                "output_files": len(result.files)
            })

        # Track GPU cost (from Perplexity)
        gpu_cost = result.duration * 0.50  # $0.50/hour for A100

        trace.update(
            output={"result_url": result.url},
            metadata={
                "gpu_time_seconds": result.duration,
                "gpu_cost_usd": gpu_cost,
            }
        )

        return result

    except Exception as e:
        trace.update(level="ERROR", status_message=str(e))
        raise
```

**LangGraph Callback Integration (from Perplexity):**

```python
# apps/comfyui-gateway/agents/langgraph_integration.py
from langgraph.graph import StateGraph
from langfuse.callback import CallbackHandler

# Create LangGraph workflow
workflow = StateGraph()

# Add agents
workflow.add_node("vrd_agent", vrd_agent_action)
workflow.add_node("scriptsmith", scriptsmith_action)
workflow.add_node("shotmaster", shotmaster_action)
workflow.add_node("video_solver", video_solver_action)

# Add edges
workflow.add_edge("vrd_agent", "scriptsmith")
workflow.add_edge("scriptsmith", "shotmaster")
workflow.add_edge("shotmaster", "video_solver")

# Compile with Langfuse callback (from Perplexity)
app = workflow.compile()

# Execute with tracing
result = await app.ainvoke(
    {"input": brief},
    config={"callbacks": [langfuse_handler]}
)
```

**Benefits (from Perplexity):**
- **Agent decision visibility:** See why AI Budget Solver chose hybrid production
- **Cost attribution:** Track which agents consume most budget
- **Performance optimization:** Identify slow agents in the pipeline
- **Quality improvement:** Build datasets from failed agent decisions

### 3.4 ComfyUI Backend Setup

**Infrastructure:**
- Deploy ComfyUI on Railway with comfy-pack
- Expose workflows as REST API endpoints
- Set up PostgreSQL for workflow storage
- Configure Redis for job queue

**Deployment Steps:**
1. Install comfy-pack in ComfyUI custom nodes
2. Package 5-10 core workflows (text-to-video, image-to-video, upscaling, etc.)
3. Deploy to Railway using Docker (automated via CircleCI)
4. Configure environment variables for API access

### 3.5 Workflow Database Schema

**PostgreSQL Schema:**
```sql
-- Workflow library with vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE comfyui_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'generation', 'enhancement', 'composition', 'effects'
  workflow_json JSONB NOT NULL, -- Full ComfyUI API format
  input_schema JSONB NOT NULL, -- Required parameters
  output_schema JSONB NOT NULL, -- Expected outputs
  tags TEXT[], -- For filtering
  embedding VECTOR(1536), -- OpenAI embeddings for RAG
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Job tracking for async workflows
CREATE TABLE workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES comfyui_workflows(id),
  user_id VARCHAR(255), -- Optional: for multi-user
  input_params JSONB NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'queued', 'running', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  output_urls JSONB, -- Array of generated asset URLs
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Index for vector similarity search
CREATE INDEX ON comfyui_workflows USING ivfflat (embedding vector_cosine_ops);

-- Index for job status queries
CREATE INDEX ON workflow_jobs (status, created_at);

-- Production workflow templates (from AgentFlow)
CREATE TABLE production_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- 'Ad Agency', 'Film/TV', 'Social Media'
  description TEXT,
  workflow_type VARCHAR(100), -- 'advertising', 'film', 'social'
  agent_sequence JSONB NOT NULL, -- Array of agent configs
  approval_gates JSONB NOT NULL, -- Human review points
  estimated_duration INTEGER, -- Minutes
  cost_estimate DECIMAL(10,2), -- USD
  required_inputs JSONB, -- Required inputs for workflow
  config_options JSONB, -- Configurable parameters
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Production jobs (instances of workflows)
CREATE TABLE production_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES production_workflows(id),
  client_name VARCHAR(255),
  brief_text TEXT,
  brief_attachments JSONB, -- URLs to uploaded files
  status VARCHAR(50), -- 'brief', 'pre-production', 'production', 'post', 'complete'
  current_agent VARCHAR(100), -- Which agent is active
  agent_results JSONB, -- Outputs from each agent
  approval_history JSONB, -- Who approved what, when
  total_cost DECIMAL(10,2),
  suggested_by_agent BOOLEAN DEFAULT FALSE, -- Track if AI suggested this workflow
  agent_confidence DECIMAL(3,2), -- Confidence score (0.00-1.00)
  agent_reasoning JSONB, -- Why agent suggested this workflow
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Agent execution tracking
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id UUID REFERENCES production_jobs(id),
  agent_name VARCHAR(100), -- 'VRD Agent', 'ScriptSmith', etc.
  agent_type VARCHAR(50), -- 'pre-production', 'production', 'post'
  input_data JSONB,
  output_data JSONB,
  status VARCHAR(50), -- 'pending', 'running', 'completed', 'failed', 'awaiting_approval'
  llm_calls INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,2),
  duration_seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Human approval gates
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id UUID REFERENCES production_jobs(id),
  agent_execution_id UUID REFERENCES agent_executions(id),
  approver_role VARCHAR(100), -- 'Creative Director', 'Client', 'Director'
  approval_type VARCHAR(50), -- 'concept', 'script', 'final_cut'
  content_to_review JSONB, -- What needs approval
  status VARCHAR(50), -- 'pending', 'approved', 'rejected'
  feedback TEXT,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255)
);

-- Langfuse integration
CREATE TABLE langfuse_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id UUID REFERENCES production_jobs(id),
  agent_execution_id UUID REFERENCES agent_executions(id),
  langfuse_trace_id VARCHAR(255) UNIQUE,
  langfuse_url TEXT, -- Deep link to Langfuse UI
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for production workflows
CREATE INDEX ON production_jobs (status, created_at);
CREATE INDEX ON production_jobs (workflow_id);
CREATE INDEX ON agent_executions (production_job_id, status);
CREATE INDEX ON approval_requests (production_job_id, status);
```

### 3.6 LangChain Tool Integration

**Workflow Tool Wrapper:**
```typescript
// packages/ai/workflows/comfyui-tool.ts
import { BaseTool } from "langchain/tools";
import { z } from "zod";

export class ComfyUIWorkflowTool extends BaseTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  
  constructor(workflow: ComfyUIWorkflow) {
    super();
    this.name = workflow.name;
    this.description = workflow.description;
    this.schema = this.buildSchemaFromWorkflow(workflow);
  }
  
  async _call(input: Record<string, any>): Promise<string> {
    // 1. Query PostgreSQL for workflow
    const workflow = await db.getWorkflow(this.name);
    
    // 2. Call ComfyUI API
    const response = await fetch(`${COMFYUI_API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_id: workflow.id,
        params: input
      })
    });
    
    const { job_id } = await response.json();
    
    // 3. Store job in database
    await db.createJob({
      workflow_id: workflow.id,
      input_params: input,
      status: 'queued'
    });
    
    // 4. Return job ID for tracking
    return `Workflow started. Job ID: ${job_id}`;
  }
}
```

### 3.7 Workflow Discovery with RAG

**Semantic Search Implementation:**
```typescript
// packages/ai/workflows/workflow-discovery.ts
import { OpenAI } from "openai";

export class WorkflowDiscovery {
  private openai: OpenAI;
  
  async findWorkflow(userIntent: string): Promise<ComfyUIWorkflow[]> {
    // 1. Generate embedding for user intent
    const embedding = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userIntent
    });
    
    // 2. Vector similarity search in PostgreSQL
    const workflows = await db.query(`
      SELECT *, 
             1 - (embedding <=> $1) AS similarity
      FROM comfyui_workflows
      ORDER BY similarity DESC
      LIMIT 3
    `, [embedding.data[0].embedding]);
    
    return workflows;
  }
  
  async storeWorkflow(workflow: ComfyUIWorkflow): Promise<void> {
    // Generate embedding for workflow
    const text = `${workflow.name} ${workflow.description} ${workflow.tags.join(' ')}`;
    const embedding = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    
    // Store in PostgreSQL
    await db.insertWorkflow({
      ...workflow,
      embedding: embedding.data[0].embedding
    });
  }
}
```

---

## Phase 4: AI Agent Orchestration (Days 15-22)

### Strategic Role of Langfuse: Dual-Purpose Platform

**Langfuse serves TWO critical functions in Kijko:**

1. **Developer Observability** (Internal Telemetry)
   - Multi-agent workflow tracing (VRD → ScriptSmith → ShotMaster chains)
   - Cost attribution per agent (track when AI Concept Generator creates 100 concepts)
   - Decision point analysis and failure dataset creation
   - Regression testing using datasets from production failures

2. **User-Facing Prompt Optimization** (Product Feature)
   - Prompt management and versioning for all AI interactions
   - A/B testing of prompt variations for ComfyUI workflows
   - Automated prompt optimization through experiments SDK
   - Community-driven prompt template marketplace

**Architecture Pattern:**
- **Langfuse**: Source of truth for prompts, versions, A/B tests, evaluations
- **PostgreSQL**: Cache prompt metadata + references to Langfuse prompt IDs
- **Client-side**: Use Langfuse SDK caching to avoid latency

### 4.1 Voice-Enabled Agent Builder - Core Architecture

**Critical Feature:** Users create custom AI agents via voice/natural language with full transparency into system prompts and tools.

**Database Schema (with Full Transparency):**

```sql
-- Core Agents Table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,  -- FK to users
  created_via TEXT DEFAULT 'voice',  -- 'voice', 'ui', 'api'
  CONSTRAINT agents_name_key UNIQUE (name)
);

-- Agent System Prompt Versions (for rollback)
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

-- Tools Table (Dynamic Registration)
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,  -- 'rest', 'graphql', 'playwright', 'instruction_set', 'langchain'
  description TEXT NOT NULL,
  config JSONB NOT NULL,  -- Contains endpoint, schema, NOT raw credentials
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  embedding VECTOR(1536)  -- For RAG tool discovery
);

-- Tool Credentials (Secure Reference Only)
CREATE TABLE tool_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,  -- 'api_key', 'oauth', 'basic_auth', 'playwright_login'
  secret_ref TEXT NOT NULL,  -- Reference to secret manager (e.g., 'vault:playwright_mcp_123')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tool_id, credential_type)
);

-- Agent-Tool Mapping (Which agents have which tools)
CREATE TABLE agent_tools (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  tool_version INTEGER DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID,  -- User or 'system'
  PRIMARY KEY (agent_id, tool_id)
);

-- Agent Examples (for few-shot learning)
CREATE TABLE agent_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Audit Log (Full transparency)
CREATE TABLE agent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  event TEXT NOT NULL,  -- 'created', 'prompt_updated', 'tool_added', 'tool_removed', 'executed'
  details JSONB,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agents_active ON agents(is_active, created_at DESC);
CREATE INDEX idx_tools_active ON tools(is_active, type);
CREATE INDEX idx_tools_embedding ON tools USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX idx_agent_tools_tool ON agent_tools(tool_id);
```

**Voice-Enabled Agent Creation Flow (Conversational):**

```typescript
// packages/ai/agent-builder/voice-flow.ts
import { StateGraph } from 'langgraph/web';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

interface AgentBuilderState {
  step: 'greeting' | 'name' | 'purpose' | 'prompt' | 'tools' | 'confirmation' | 'done';
  name?: string;
  description?: string;
  systemPrompt?: string;
  selectedTools?: string[];  // tool IDs
  userInput?: string;
  errors?: string[];
}

export class VoiceAgentBuilder {
  private llm: ChatGoogleGenerativeAI;
  private graph: StateGraph<AgentBuilderState>;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-exp',
      streaming: true
    });

    this.buildGraph();
  }

  private buildGraph() {
    const graph = new StateGraph<AgentBuilderState>({
      channels: {
        step: { default: () => 'greeting' },
        name: { default: () => undefined },
        description: { default: () => undefined },
        systemPrompt: { default: () => undefined },
        selectedTools: { default: () => [] },
        userInput: { default: () => undefined },
        errors: { default: () => [] }
      }
    });

    // 1. Greeting
    graph.addNode('greeting', async (state) => {
      return {
        step: 'name',
        userInput: 'Would you like to create a new AI agent? What should we call it?'
      };
    });

    // 2. Collect agent name
    graph.addNode('name', async (state) => {
      const name = state.userInput?.trim();
      
      // Validate name is unique
      const exists = await db.agents.findFirst({ where: { name } });
      if (exists) {
        return {
          step: 'name',
          errors: ['That name is taken. Please choose another.']
        };
      }

      return {
        step: 'purpose',
        name,
        userInput: `Great! What should ${name} do? Describe its main purpose.`
      };
    });

    // 3. Gather purpose and generate system prompt
    graph.addNode('purpose', async (state) => {
      const description = state.userInput;

      // LLM generates system prompt from description
      const promptGeneration = await this.llm.invoke([
        {
          role: 'system',
          content: `You are an expert at writing AI agent system prompts.
            Generate a clear, concise system prompt for an agent that: ${description}`
        },
        {
          role: 'user',
          content: 'Generate the system prompt now.'
        }
      ]);

      return {
        step: 'prompt',
        description,
        systemPrompt: promptGeneration.content,
        userInput: `I've drafted this system prompt:\n\n"${promptGeneration.content}"\n\nWould you like to customize it, or should we proceed?`
      };
    });

    // 4. Tool selection via RAG
    graph.addNode('tools', async (state) => {
      // Semantic search for relevant tools
      const toolSuggestions = await this.discoverTools(state.description!);

      return {
        step: 'confirmation',
        selectedTools: toolSuggestions.map(t => t.id),
        userInput: `I recommend these tools for ${state.name}:\n${toolSuggestions.map(t => `- ${t.name}: ${t.description}`).join('\n')}\n\nShould I add all of these, or would you like to customize?`
      };
    });

    // 5. Confirmation and save
    graph.addNode('confirmation', async (state) => {
      // Save to database
      const agent = await db.agents.create({
        data: {
          name: state.name!,
          description: state.description!,
          systemPrompt: state.systemPrompt!,
          createdBy: 'current-user-id',
          createdVia: 'voice'
        }
      });

      // Link tools
      await db.agentTools.createMany({
        data: state.selectedTools!.map(toolId => ({
          agentId: agent.id,
          toolId,
          addedBy: 'current-user-id'
        }))
      });

      // Create version history
      await db.agentVersions.create({
        data: {
          agentId: agent.id,
          version: 1,
          systemPrompt: state.systemPrompt!,
          createdBy: 'current-user-id',
          notes: 'Initial version created via voice'
        }
      });

      // Audit log
      await db.agentAudit.create({
        data: {
          agentId: agent.id,
          event: 'created',
          details: { via: 'voice', tools: state.selectedTools },
          performedBy: 'current-user-id'
        }
      });

      return {
        step: 'done',
        userInput: `✅ ${state.name} is ready! Would you like to test it now?`
      };
    });

    // Add edges
    graph.addEdge('greeting', 'name');
    graph.addEdge('name', 'purpose');
    graph.addEdge('purpose', 'prompt');
    graph.addEdge('prompt', 'tools');
    graph.addEdge('tools', 'confirmation');

    graph.setEntryPoint('greeting');
    graph.setFinishPoint('done');

    this.graph = graph.compile();
  }

  private async discoverTools(description: string): Promise<Tool[]> {
    // Generate embedding for description
    const embedding = await generateEmbedding(description);

    // Vector similarity search in tools table
    const tools = await db.$queryRaw`
      SELECT id, name, description, type, config,
             1 - (embedding <=> ${embedding}::vector) as similarity
      FROM tools
      WHERE is_active = true
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT 5
    `;

    return tools;
  }

  async processVoiceInput(userInput: string, currentState: AgentBuilderState) {
    return this.graph.invoke({ ...currentState, userInput });
  }
}
```

**Tool Registration API:**

```typescript
// apps/web/src/app/api/tools/register/route.ts
export async function POST(req: Request) {
  const { name, type, description, config, credentials } = await req.json();

  // 1. Validate tool config
  if (!name || !type || !description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 2. Generate embedding for RAG discovery
  const embedding = await generateEmbedding(description);

  // 3. Save tool (WITHOUT raw credentials)
  const tool = await db.tools.create({
    data: {
      name,
      type,
      description,
      config,
      embedding
    }
  });

  // 4. If credentials provided, store in secret manager
  if (credentials) {
    const secretRef = await storeCredentials(tool.id, credentials);
    
    await db.toolCredentials.create({
      data: {
        toolId: tool.id,
        credentialType: credentials.type,
        secretRef  // e.g., 'vault:playwright_mcp_123'
      }
    });
  }

  // 5. Audit log
  await db.agentAudit.create({
    data: {
      agentId: null,
      event: 'tool_registered',
      details: { toolId: tool.id, name, type },
      performedBy: 'current-user-id'
    }
  });

  return NextResponse.json({ success: true, tool });
}
```

**Agent Inspector Component (Full Transparency):**

```typescript
// apps/web/src/components/agents/AgentInspector.tsx
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

  const { data: versions } = useQuery({
    queryKey: ['agent-versions', agentId],
    queryFn: () => fetch(`/api/agents/${agentId}/versions`).then(r => r.json())
  });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{agent?.name}</h2>
          <p className="text-muted-foreground">{agent?.description}</p>
          <Badge variant="secondary" className="mt-2">
            Created via {agent?.createdVia}
          </Badge>
        </div>

        <Tabs defaultValue="prompt">
          <TabsList>
            <TabsTrigger value="prompt">System Prompt</TabsTrigger>
            <TabsTrigger value="tools">Tools ({tools?.length})</TabsTrigger>
            <TabsTrigger value="versions">Version History</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              {agent?.systemPrompt}
            </div>
            <Button variant="outline" onClick={() => editPrompt(agent)}>
              Edit System Prompt
            </Button>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            {tools?.map(tool => (
              <Card key={tool.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{tool.name}</h4>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                    <Badge variant="outline" className="mt-2">{tool.type}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeTool(agentId, tool.id)}>
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
            <Button onClick={() => addToolsDialog(agentId)}>
              + Add Tools
            </Button>
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            {versions?.map(version => (
              <Card key={version.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge>v{version.version}</Badge>
                    <p className="text-sm mt-1">{version.notes}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => rollbackToVersion(version.id)}>
                    Rollback
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
```

### 4.1 LangGraph Agent Setup

**Agent Architecture:**
```typescript
// packages/ai/agents/video-production-agent.ts
import { createReactAgent } from "langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export class VideoProductionAgent {
  private agent: ReturnType<typeof createReactAgent>;
  private tools: ComfyUIWorkflowTool[];

  constructor() {
    // Load all workflows as tools
    this.tools = await this.loadWorkflowTools();

    // Create agent with tools
    this.agent = createReactAgent({
      llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
      tools: this.tools,
      stateModifier: `You are a video production assistant.
        Use ComfyUI workflows to generate and edit video content.
        Available workflows: ${this.tools.map(t => t.name).join(', ')}`
    });
  }

  async processRequest(userMessage: string): Promise<string> {
    const result = await this.agent.invoke({
      messages: [{ role: "user", content: userMessage }]
    });

    return result.messages[result.messages.length - 1].content;
  }
}
```

### 4.1.1 Runtime Workflow Assembly (Dynamic Composition)

**Key Feature:** Agents dynamically assemble new workflow templates at runtime based on user intent, then save them for future reuse.

**Why This Matters:**
- **Cannot be replicated with ComfyUI Skills** (static file system)
- **Dynamic composition:** Agents build workflows programmatically
- **Stateful execution:** LangGraph manages state across steps
- **Persistent storage:** PostgreSQL stores templates with vector embeddings
- **Runtime registration:** New templates immediately available for RAG search

**Implementation:**
```python
# apps/comfyui-gateway/agents/workflow_assembler.py
from langgraph.graph import StateGraph
from langfuse.decorators import observe

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

    if context.get('requires_voiceover'):
        workflow_graph.add_node("voice_gen", voice_generation_tool)

    # 3. Conditional edges based on results
    workflow_graph.add_conditional_edges(
        "comfyui_gen",
        lambda state: "post_process" if state.quality > 0.8 else "retry",
        {
            "post_process": "scriptsmith",
            "retry": "comfyui_gen"
        }
    )

    # 4. Add human approval gate
    workflow_graph.add_node("human_approval", human_approval_node)
    workflow_graph.add_edge("scriptsmith", "human_approval")

    # 5. Save as new template for future use
    workflow_template = await db.create_workflow_template(
        name=generate_workflow_name(user_intent),
        description=f"Auto-generated workflow for: {user_intent}",
        graph=workflow_graph.to_json(),
        embedding=await embed(user_intent),
        suggested_by_agent=True,
        confidence=calculate_confidence(similar),
        metadata={
            "source": "runtime_assembly",
            "based_on": [w.id for w in similar],
            "context": context
        }
    )

    return workflow_template

# Helper: Generate workflow name from intent
def generate_workflow_name(intent: str) -> str:
    """Use LLM to generate descriptive workflow name"""
    response = llm.invoke(
        f"Generate a concise workflow name (max 5 words) for: {intent}"
    )
    return response.content.strip()

# Helper: Calculate confidence score
def calculate_confidence(similar_workflows: list) -> float:
    """Calculate confidence based on similarity to existing workflows"""
    if not similar_workflows:
        return 0.5  # Low confidence for novel workflows

    avg_similarity = sum(w.similarity for w in similar_workflows) / len(similar_workflows)
    return min(avg_similarity + 0.2, 1.0)  # Boost confidence slightly
```

**Collaborative Template Creation UI:**
```typescript
// apps/web/src/components/ai-panel/WorkflowSuggestion.tsx
interface WorkflowSuggestionProps {
  workflow: AssembledWorkflow;
  onSave: (workflow: AssembledWorkflow) => void;
  onModify: (workflow: AssembledWorkflow) => void;
  onExecute: (workflow: AssembledWorkflow) => void;
}

export function WorkflowSuggestion({ workflow, onSave, onModify, onExecute }: WorkflowSuggestionProps) {
  return (
    <div className="border rounded-lg p-4 bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{workflow.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {workflow.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              {workflow.confidence > 0.8 ? 'High' : 'Medium'} Confidence
            </Badge>
            <Badge variant="outline">
              {workflow.graph.nodes.length} steps
            </Badge>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={() => onSave(workflow)} variant="default">
          <Save className="h-4 w-4 mr-2" />
          Save as Template
        </Button>
        <Button onClick={() => onModify(workflow)} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Modify First
        </Button>
        <Button onClick={() => onExecute(workflow)} variant="ghost">
          <Play className="h-4 w-4 mr-2" />
          Use Once Only
        </Button>
      </div>
    </div>
  );
}

// Usage in chat interface
const handleAgentSuggestion = (workflow: AssembledWorkflow) => {
  addMessage({
    role: "assistant",
    content: `I've assembled a custom workflow: **${workflow.name}**.
              This workflow will ${workflow.description}.

              Would you like to save this as a reusable template?`,
    component: (
      <WorkflowSuggestion
        workflow={workflow}
        onSave={async (w) => {
          await saveWorkflowTemplate(w);
          toast.success("Workflow saved! It's now available in your library.");
        }}
        onModify={(w) => {
          openWorkflowEditor(w);
        }}
        onExecute={async (w) => {
          await executeWorkflow(w);
          toast.info("Workflow executed. Results will appear in your library.");
        }}
      />
    )
  });
};
```

**Database Schema for Runtime Templates:**
```sql
-- Add to existing workflow_templates table
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

-- Index for finding agent-suggested workflows
CREATE INDEX idx_agent_suggested ON workflow_templates(suggested_by_agent, confidence DESC);
```

**Rationale:**
- **LangGraph + Custom Storage** provides everything ComfyUI Skills cannot
- **Dynamic composition** allows agents to create workflows programmatically
- **Stateful execution** with LangGraph manages complex multi-step workflows
- **Persistent storage** in PostgreSQL with vector embeddings enables RAG discovery
- **Runtime registration** makes new templates immediately searchable
- **Collaborative creation** through conversational UI improves over time

### 4.2 Unified AI Interface

**Merge Gemini + ComfyUI:**
```typescript
// packages/stores/ai/unified-ai-store.ts
export const useAIStore = create<AIStore>((set, get) => ({
  mode: 'chat', // 'chat' | 'generate-video' | 'generate-image' | 'workflow'
  
  // Gemini chat (from KijkoCut)
  chatHistory: [],
  sendGeminiMessage: async (message: string) => {
    // Existing Gemini logic
  },
  
  // ComfyUI workflows
  availableWorkflows: [],
  activeJob: null,
  executeWorkflow: async (workflowId: string, params: any) => {
    const agent = new VideoProductionAgent();
    const result = await agent.processRequest(
      `Execute workflow ${workflowId} with params: ${JSON.stringify(params)}`
    );
    set({ activeJob: result });
  },
  
  // Hybrid: Let agent decide
  processUserIntent: async (intent: string) => {
    // Use RAG to find best workflow
    const workflows = await workflowDiscovery.findWorkflow(intent);
    
    if (workflows.length > 0) {
      // Use ComfyUI workflow
      return get().executeWorkflow(workflows[0].id, {});
    } else {
      // Fall back to Gemini chat
      return get().sendGeminiMessage(intent);
    }
  }
}));
```

---

## Phase 4: AI Integration & Agent Builder (Days 15-22)

### 4.0 Agent Builder Foundation - "Capability Inspector" & "Workflow Forge"

**Context:** Based on LangSmith Agent Builder analysis and Perplexity research, we need to add transparency and collaborative creation to our agent system. This bridges the gap between pre-built agents and user customization.

**Key Principles (from LangSmith Analysis):**
1. **Natural Language as UI** - Build agents through conversation, not visual workflows
2. **Tool Discovery & Grounding** - Show users what agents CAN and CANNOT do before execution
3. **Interactive Requirement Gathering** - Meta-prompting to refine vague requests into detailed plans
4. **Memory as Editable Instructions** - Persistent, version-controlled agent instructions
5. **Transparent Planning & Debugging** - "Review w/ Tools" mode for step-by-step approval
6. **Human-in-the-Loop** - Pause execution for credentials, approvals, or ambiguity resolution

---

### 4.0.1 Capability Inspector (Pre-Built Agent Transparency)

**User Story:** Before assigning a task to "BreakdownBot," I want to inspect its capabilities to understand what it can/cannot do, so I can write effective prompts and avoid failed runs.

**UI Implementation:**

```typescript
// packages/ui/components/agent-inspector-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentInspectorProps {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentInspectorModal({ agentId, open, onOpenChange }: AgentInspectorProps) {
  const { data: capabilities } = useAgentCapabilities(agentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{capabilities?.name}</span>
            <Badge variant="outline">{capabilities?.version}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="instructions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="tools">Tools ({capabilities?.tools.length})</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="space-y-4">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="prose prose-sm dark:prose-invert">
                <h3>Agent Instructions</h3>
                <pre className="whitespace-pre-wrap text-sm">
                  {capabilities?.instructions}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <ScrollArea className="h-[400px] w-full">
              {capabilities?.tools.map((tool) => (
                <div key={tool.name} className="border rounded-lg p-4 mb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{tool.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tool.description}
                      </p>
                    </div>
                    <Badge variant={tool.type === 'comfyui' ? 'default' : 'secondary'}>
                      {tool.type}
                    </Badge>
                  </div>

                  {tool.parameters && (
                    <div className="mt-3 text-xs">
                      <span className="font-medium">Parameters:</span>
                      <pre className="mt-1 bg-muted p-2 rounded">
                        {JSON.stringify(tool.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <ScrollArea className="h-[400px] w-full">
              {capabilities?.examples.map((example, idx) => (
                <div key={idx} className="border rounded-lg p-4 mb-3">
                  <div className="text-sm font-medium mb-2">Example {idx + 1}</div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Input:</span>
                      <p className="text-sm mt-1">{example.input}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Expected Output:</span>
                      <p className="text-sm mt-1">{example.output}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

**Backend API:**

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

  // Fetch agent metadata from database
  const agent = await db.query(`
    SELECT
      a.id,
      a.name,
      a.version,
      a.instructions,
      a.created_at,
      a.updated_at,
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

  if (!agent[0]) {
    return new Response('Agent not found', { status: 404 });
  }

  // Fetch example interactions
  const examples = await db.query(`
    SELECT input, output
    FROM agent_examples
    WHERE agent_id = $1
    ORDER BY created_at DESC
    LIMIT 5
  `, [params.agentId]);

  return Response.json({
    ...agent[0],
    examples
  });
}
```

**Database Schema:**

```sql
-- Add to PostgreSQL schema
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  instructions TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'comfyui', 'api', 'function'
  parameters JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_tools (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  PRIMARY KEY (agent_id, tool_id)
);

CREATE TABLE agent_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_agent_tools_agent_id ON agent_tools(agent_id);
CREATE INDEX idx_agent_examples_agent_id ON agent_examples(agent_id);
```

---

### 4.0.2 Workflow Forge (Conversational Agent Builder)

**User Story:** As a VFX artist, I want to create a reusable agent that automates my process for turning concept art into animated shots with upscaling and film grain, so I can execute this complex multi-step task with a single command.

**Architecture Overview:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKFLOW FORGE UI                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Instructions │  │ Forge Chat   │  │ Testbed              │  │
│  │ (Editable)   │  │ (Meta-Agent) │  │ - Test Chat          │  │
│  │              │  │              │  │ - Available Tools    │  │
│  │ Live updates │  │ Conversational│ │ - Review w/ Tools   │  │
│  │ from chat    │  │ builder      │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    FORGE META-AGENT (LangGraph)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Tool         │→ │ Requirement  │→ │ Instruction          │  │
│  │ Discovery    │  │ Gathering    │  │ Generation           │  │
│  │ (RAG)        │  │ (Socratic)   │  │ (Template Builder)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE & EXECUTION                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ ComfyUI      │  │ LangGraph Runtime    │  │
│  │ - Agent defs │  │ Workflows    │  │ - Test execution     │  │
│  │ - Versions   │  │ - RAG search │  │ - Review mode        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**UI Implementation:**

```typescript
// apps/web/src/app/forge/page.tsx
'use client';

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useForgeStore } from '@/stores/forge-store';
import { ForgeChat } from '@/components/forge/forge-chat';
import { ToolSelector } from '@/components/forge/tool-selector';
import { TestChat } from '@/components/forge/test-chat';

export default function WorkflowForgePage() {
  const {
    instructions,
    setInstructions,
    availableTools,
    selectedTools,
    toggleTool,
    reviewMode,
    setReviewMode,
    saveAgent
  } = useForgeStore();

  const [agentName, setAgentName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveAgent(agentName);
      // Redirect to agent list or show success
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Forge</h1>
          <p className="text-sm text-muted-foreground">
            Build custom agents through conversation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Agent name..."
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Button onClick={handleSave} disabled={!agentName || isSaving}>
            {isSaving ? 'Saving...' : 'Save Agent'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Panel 1: Instructions */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Instructions</h2>
              <Badge variant="outline">Live</Badge>
            </div>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="flex-1 font-mono text-sm"
              placeholder="Agent instructions will appear here as you build..."
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Panel 2: Forge Chat */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col p-4">
            <h2 className="text-lg font-semibold mb-4">Forge Chat</h2>
            <ForgeChat />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Panel 3: Testbed */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <div className="h-full flex flex-col p-4">
            <Tabs defaultValue="tools" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tools">Available Tools</TabsTrigger>
                <TabsTrigger value="test">Test Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="tools" className="flex-1 overflow-hidden">
                <ToolSelector
                  tools={availableTools}
                  selectedTools={selectedTools}
                  onToggleTool={toggleTool}
                />
              </TabsContent>

              <TabsContent value="test" className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Switch
                    id="review-mode"
                    checked={reviewMode}
                    onCheckedChange={setReviewMode}
                  />
                  <Label htmlFor="review-mode">Review w/ Tools</Label>
                </div>
                <TestChat reviewMode={reviewMode} />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

**Forge Store (State Management):**

```typescript
// packages/stores/forge-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'comfyui' | 'api' | 'function';
  parameters?: any;
}

interface ForgeStore {
  // Agent being built
  instructions: string;
  availableTools: Tool[];
  selectedTools: Set<string>;
  agentMetadata: {
    name: string;
    description: string;
    version: string;
  };

  // UI state
  reviewMode: boolean;

  // Forge chat history
  forgeMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;

  // Test chat history
  testMessages: Array<{
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: any[];
    timestamp: Date;
  }>;

  // Actions
  setInstructions: (instructions: string) => void;
  setAvailableTools: (tools: Tool[]) => void;
  toggleTool: (toolId: string) => void;
  setReviewMode: (enabled: boolean) => void;
  addForgeMessage: (role: 'user' | 'assistant', content: string) => void;
  addTestMessage: (message: any) => void;
  saveAgent: (name: string) => Promise<void>;
  reset: () => void;
}

export const useForgeStore = create<ForgeStore>()(
  persist(
    (set, get) => ({
      instructions: '',
      availableTools: [],
      selectedTools: new Set(),
      agentMetadata: {
        name: '',
        description: '',
        version: '1.0.0'
      },
      reviewMode: false,
      forgeMessages: [],
      testMessages: [],

      setInstructions: (instructions) => set({ instructions }),

      setAvailableTools: (tools) => set({ availableTools: tools }),

      toggleTool: (toolId) => set((state) => {
        const newSelected = new Set(state.selectedTools);
        if (newSelected.has(toolId)) {
          newSelected.delete(toolId);
        } else {
          newSelected.add(toolId);
        }
        return { selectedTools: newSelected };
      }),

      setReviewMode: (enabled) => set({ reviewMode: enabled }),

      addForgeMessage: (role, content) => set((state) => ({
        forgeMessages: [
          ...state.forgeMessages,
          { role, content, timestamp: new Date() }
        ]
      })),

      addTestMessage: (message) => set((state) => ({
        testMessages: [...state.testMessages, message]
      })),

      saveAgent: async (name) => {
        const state = get();
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            instructions: state.instructions,
            tools: Array.from(state.selectedTools),
            version: '1.0.0'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save agent');
        }

        // Reset forge state
        get().reset();
      },

      reset: () => set({
        instructions: '',
        selectedTools: new Set(),
        forgeMessages: [],
        testMessages: [],
        reviewMode: false
      })
    }),
    {
      name: 'forge-storage',
      partialize: (state) => ({
        // Only persist draft state
        instructions: state.instructions,
        selectedTools: Array.from(state.selectedTools),
        forgeMessages: state.forgeMessages.slice(-10) // Keep last 10
      })
    }
  )
);
```

**Forge Meta-Agent (LangGraph Implementation):**

```python
# apps/comfyui-gateway/agents/forge_meta_agent.py
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langfuse.decorators import observe
from typing import TypedDict, Annotated, Sequence
import operator

class ForgeState(TypedDict):
    """State for the Forge Meta-Agent"""
    user_goal: str
    discovered_tools: list[dict]
    requirements: dict
    instructions: str
    messages: Annotated[Sequence[dict], operator.add]
    next_step: str

class ForgeMetaAgent:
    """
    Conversational agent builder that guides users through creating custom agents.
    Implements the LangSmith Agent Builder pattern.
    """

    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the Forge Meta-Agent workflow graph"""
        workflow = StateGraph(ForgeState)

        # Add nodes
        workflow.add_node("discover_tools", self.discover_tools)
        workflow.add_node("gather_requirements", self.gather_requirements)
        workflow.add_node("generate_instructions", self.generate_instructions)
        workflow.add_node("update_memory", self.update_memory)

        # Define edges
        workflow.set_entry_point("discover_tools")
        workflow.add_edge("discover_tools", "gather_requirements")
        workflow.add_edge("gather_requirements", "generate_instructions")
        workflow.add_edge("generate_instructions", END)
        workflow.add_conditional_edges(
            "update_memory",
            lambda x: x["next_step"],
            {
                "gather_requirements": "gather_requirements",
                "generate_instructions": "generate_instructions",
                END: END
            }
        )

        return workflow.compile()

    @observe(name="forge_discover_tools")
    async def discover_tools(self, state: ForgeState) -> ForgeState:
        """
        Step 1: Use RAG to discover relevant ComfyUI workflows and tools
        """
        from .workflow_discovery import WorkflowDiscovery

        discovery = WorkflowDiscovery()

        # Search for relevant workflows
        workflows = await discovery.find_workflow(state["user_goal"])

        # Format for user presentation
        tool_descriptions = []
        for wf in workflows:
            tool_descriptions.append({
                "id": wf["id"],
                "name": wf["title"],
                "description": wf["description"],
                "type": "comfyui",
                "capabilities": wf["capabilities"]
            })

        # Generate conversational response
        response = await self.llm.ainvoke([
            {"role": "system", "content": FORGE_SYSTEM_PROMPT},
            {"role": "user", "content": state["user_goal"]},
            {"role": "assistant", "content": f"""
I've searched our ComfyUI workflow library and found these potentially relevant tools:

{self._format_tools_for_display(tool_descriptions)}

I've added these to the 'Available Tools' panel. Do you want to authorize the agent to use all of them, or should we review them one by one?
            """}
        ])

        return {
            **state,
            "discovered_tools": tool_descriptions,
            "messages": [{"role": "assistant", "content": response.content}],
            "next_step": "gather_requirements"
        }

    @observe(name="forge_gather_requirements")
    async def gather_requirements(self, state: ForgeState) -> ForgeState:
        """
        Step 2: Ask clarifying questions to refine the agent's behavior
        """
        # Determine what questions to ask based on discovered tools
        questions = self._generate_clarifying_questions(
            state["user_goal"],
            state["discovered_tools"]
        )

        response = await self.llm.ainvoke([
            {"role": "system", "content": FORGE_SYSTEM_PROMPT},
            *state["messages"],
            {"role": "assistant", "content": f"""
Got it. Now, let's define the agent's behavior. I have a few questions:

{chr(10).join(f"{i+1}. {q}" for i, q in enumerate(questions))}

Please answer these so I can build the agent's instructions.
            """}
        ])

        return {
            **state,
            "messages": [{"role": "assistant", "content": response.content}],
            "next_step": "generate_instructions"
        }

    @observe(name="forge_generate_instructions")
    async def generate_instructions(self, state: ForgeState) -> ForgeState:
        """
        Step 3: Generate the agent's instruction template based on requirements
        """
        # Extract requirements from conversation
        requirements = await self._extract_requirements_from_messages(
            state["messages"]
        )

        # Generate instruction template
        instructions = await self._generate_instruction_template(
            state["user_goal"],
            state["discovered_tools"],
            requirements
        )

        response = await self.llm.ainvoke([
            {"role": "system", "content": FORGE_SYSTEM_PROMPT},
            *state["messages"],
            {"role": "assistant", "content": f"""
Perfect! I've generated the agent's instructions. You can see them in the 'Instructions' panel on the left.

The agent is now ready to test. Switch to the 'Test Chat' tab and try it out. I recommend enabling 'Review w/ Tools' mode so you can approve each step before execution.

If you want to make changes, just tell me what to adjust and I'll update the instructions.
            """}
        ])

        return {
            **state,
            "instructions": instructions,
            "requirements": requirements,
            "messages": [{"role": "assistant", "content": response.content}],
            "next_step": END
        }

    @observe(name="forge_update_memory")
    async def update_memory(self, state: ForgeState) -> ForgeState:
        """
        Step 4: Update agent instructions based on user feedback
        (Called when user says "always do X" or "never do Y")
        """
        user_feedback = state["messages"][-1]["content"]

        # Parse feedback to extract instruction updates
        update_type = await self._classify_feedback(user_feedback)

        if update_type == "add_rule":
            # Add new rule to instructions
            updated_instructions = await self._add_rule_to_instructions(
                state["instructions"],
                user_feedback
            )
        elif update_type == "modify_parameter":
            # Modify default parameter
            updated_instructions = await self._modify_parameter(
                state["instructions"],
                user_feedback
            )
        else:
            # General refinement
            updated_instructions = await self._refine_instructions(
                state["instructions"],
                user_feedback
            )

        response = await self.llm.ainvoke([
            {"role": "system", "content": FORGE_SYSTEM_PROMPT},
            *state["messages"],
            {"role": "assistant", "content": f"""
Understood. I've updated the agent's instructions to incorporate your feedback. You can see the changes in the 'Instructions' panel.

The agent will now {self._summarize_change(user_feedback)}.
            """}
        ])

        return {
            **state,
            "instructions": updated_instructions,
            "messages": [{"role": "assistant", "content": response.content}]
        }

    def _format_tools_for_display(self, tools: list[dict]) -> str:
        """Format tools for conversational display"""
        lines = []
        for tool in tools:
            lines.append(f"• **{tool['name']}**: {tool['description']}")
        return "\n".join(lines)

    def _generate_clarifying_questions(
        self,
        goal: str,
        tools: list[dict]
    ) -> list[str]:
        """Generate questions to refine agent behavior"""
        # Use LLM to generate contextual questions
        # Example questions:
        return [
            "Should the video duration be fixed or user-configurable?",
            "For the 'vintage look,' should I always apply both FilmGrain and Sepia?",
            "What upscaling model should be the default?",
            "Should the agent ask for confirmation before expensive operations?"
        ]

    async def _extract_requirements_from_messages(
        self,
        messages: list[dict]
    ) -> dict:
        """Extract structured requirements from conversation"""
        # Use LLM to parse conversation into structured requirements
        pass

    async def _generate_instruction_template(
        self,
        goal: str,
        tools: list[dict],
        requirements: dict
    ) -> str:
        """Generate the agent's instruction template"""
        template = f"""You are an expert {goal} agent.

Your goal is to {requirements.get('primary_objective', goal)}.

You have access to the following tools:
{self._format_tools_for_instructions(tools)}

Behavior Rules:
{self._format_requirements_as_rules(requirements)}

Always follow these steps:
1. Analyze the user's request
2. Determine which tools to use
3. Execute tools in the correct order
4. Validate outputs before proceeding
5. Present results clearly to the user

If you encounter ambiguity, ask clarifying questions before proceeding.
"""
        return template

    def _format_tools_for_instructions(self, tools: list[dict]) -> str:
        """Format tools for instruction template"""
        lines = []
        for tool in tools:
            lines.append(f"- {tool['name']}: {tool['description']}")
        return "\n".join(lines)

    def _format_requirements_as_rules(self, requirements: dict) -> str:
        """Convert requirements dict to instruction rules"""
        rules = []
        for key, value in requirements.items():
            if key == "default_parameters":
                for param, default in value.items():
                    rules.append(f"- Default {param}: {default}")
            elif key == "always_rules":
                for rule in value:
                    rules.append(f"- Always {rule}")
            elif key == "never_rules":
                for rule in value:
                    rules.append(f"- Never {rule}")
        return "\n".join(rules)

# System prompt for Forge Meta-Agent
FORGE_SYSTEM_PROMPT = """You are the Workflow Forge Meta-Agent, an expert at helping users build custom AI agents through conversation.

Your role is to:
1. Understand the user's goal
2. Discover relevant tools from the ComfyUI workflow library
3. Ask clarifying questions to refine the agent's behavior
4. Generate clear, executable instructions for the new agent
5. Update instructions based on user feedback

You are collaborative, patient, and thorough. You explain your reasoning and always confirm before making changes.

When the user provides feedback like "always do X" or "never do Y", you update the agent's instructions permanently to reflect this preference.
"""
```

---

### 4.0.3 Review w/ Tools Mode (Human-in-the-Loop Approval)

**Implementation Pattern (from Perplexity Research):**

```python
# apps/comfyui-gateway/agents/review_mode.py
from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from typing import TypedDict, Literal

class ReviewState(TypedDict):
    """State for review mode execution"""
    messages: list
    pending_tool_calls: list[dict]
    approval_status: Literal["pending", "approved", "rejected", "modified"]
    modified_params: dict | None

class ReviewModeAgent:
    """
    Agent that pauses execution for human approval of tool calls.
    Implements the 'Review w/ Tools' pattern from LangSmith.
    """

    def __init__(self, agent_instructions: str, tools: list):
        self.instructions = agent_instructions
        self.tools = tools
        self.checkpointer = MemorySaver()  # For pausing/resuming
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build graph with approval gate"""
        workflow = StateGraph(ReviewState)

        # Add nodes
        workflow.add_node("agent", self.agent_step)
        workflow.add_node("approval_gate", self.approval_gate)
        workflow.add_node("execute_tools", self.execute_tools)

        # Define flow
        workflow.set_entry_point("agent")
        workflow.add_edge("agent", "approval_gate")
        workflow.add_conditional_edges(
            "approval_gate",
            self.check_approval,
            {
                "approved": "execute_tools",
                "rejected": END,
                "modified": "execute_tools"
            }
        )
        workflow.add_edge("execute_tools", "agent")

        return workflow.compile(checkpointer=self.checkpointer)

    async def agent_step(self, state: ReviewState) -> ReviewState:
        """Agent plans which tools to call"""
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(model="gpt-4o")
        llm_with_tools = llm.bind_tools(self.tools)

        response = await llm_with_tools.ainvoke([
            {"role": "system", "content": self.instructions},
            *state["messages"]
        ])

        # Extract tool calls
        tool_calls = []
        if response.tool_calls:
            for tc in response.tool_calls:
                tool_calls.append({
                    "id": tc["id"],
                    "name": tc["name"],
                    "args": tc["args"]
                })

        return {
            **state,
            "pending_tool_calls": tool_calls,
            "approval_status": "pending" if tool_calls else "approved"
        }

    async def approval_gate(self, state: ReviewState) -> ReviewState:
        """
        Pause execution and wait for human approval.
        This is where the agent sends tool call plans to the UI.
        """
        if not state["pending_tool_calls"]:
            return {**state, "approval_status": "approved"}

        # Send to UI via WebSocket/SSE
        await self._send_approval_request(state["pending_tool_calls"])

        # Wait for approval (this is handled by checkpointer)
        # Execution pauses here until user approves/rejects
        return state

    def check_approval(self, state: ReviewState) -> str:
        """Route based on approval status"""
        return state["approval_status"]

    async def execute_tools(self, state: ReviewState) -> ReviewState:
        """Execute approved tool calls"""
        tool_messages = []

        for tool_call in state["pending_tool_calls"]:
            # Use modified params if user edited them
            params = state.get("modified_params", {}).get(
                tool_call["id"],
                tool_call["args"]
            )

            # Execute tool
            tool = next(t for t in self.tools if t.name == tool_call["name"])
            result = await tool.ainvoke(params)

            tool_messages.append(ToolMessage(
                content=str(result),
                tool_call_id=tool_call["id"]
            ))

        return {
            **state,
            "messages": state["messages"] + tool_messages,
            "pending_tool_calls": [],
            "approval_status": "approved"
        }

    async def _send_approval_request(self, tool_calls: list[dict]):
        """Send tool call plans to UI for approval"""
        # This would use WebSocket or SSE to send to frontend
        pass

# API endpoint for approval
@app.post("/api/agents/{agent_id}/approve-tools")
async def approve_tools(
    agent_id: str,
    thread_id: str,
    approval: dict  # {"status": "approved" | "rejected" | "modified", "modified_params": {...}}
):
    """
    Resume agent execution with approval decision.
    This updates the checkpointed state and resumes the graph.
    """
    # Get checkpointed state
    config = {"configurable": {"thread_id": thread_id}}

    # Update state with approval
    state_update = {
        "approval_status": approval["status"],
        "modified_params": approval.get("modified_params")
    }

    # Resume execution
    agent = get_agent(agent_id)
    result = await agent.graph.ainvoke(state_update, config)

    return {"status": "resumed", "result": result}
```

**Frontend Component for Tool Approval:**

```typescript
// packages/ui/components/tool-approval-panel.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Edit } from 'lucide-react';

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

interface ToolApprovalPanelProps {
  toolCalls: ToolCall[];
  onApprove: (modifiedParams?: Record<string, any>) => void;
  onReject: () => void;
}

export function ToolApprovalPanel({
  toolCalls,
  onApprove,
  onReject
}: ToolApprovalPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modifiedParams, setModifiedParams] = useState<Record<string, any>>({});

  const handleEdit = (toolCallId: string, newParams: any) => {
    setModifiedParams({
      ...modifiedParams,
      [toolCallId]: newParams
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
      <div className="flex items-center gap-2">
        <Badge variant="warning">Awaiting Approval</Badge>
        <span className="text-sm text-muted-foreground">
          Review the planned tool calls before execution
        </span>
      </div>

      {toolCalls.map((toolCall, idx) => (
        <Card key={toolCall.id}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Step {idx + 1}: {toolCall.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingId(toolCall.id)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingId === toolCall.id ? (
              <div className="space-y-2">
                <Textarea
                  defaultValue={JSON.stringify(toolCall.args, null, 2)}
                  className="font-mono text-xs"
                  rows={6}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleEdit(toolCall.id, parsed);
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => setEditingId(null)}
                >
                  Done Editing
                </Button>
              </div>
            ) : (
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(
                  modifiedParams[toolCall.id] || toolCall.args,
                  null,
                  2
                )}
              </pre>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button
          onClick={() => onApprove(modifiedParams)}
          className="flex-1"
          variant="default"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve & Execute
        </Button>
        <Button
          onClick={onReject}
          className="flex-1"
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </div>
  );
}
```

---

### 4.0.4 Agent Instruction Versioning & Rollback

**Database Schema (from Perplexity Research):**

```sql
-- Agent instruction versioning
CREATE TABLE agent_instruction_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  instructions TEXT NOT NULL,
  changelog TEXT,
  is_current BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(agent_id, version_number)
);

-- Index for fast current version lookup
CREATE INDEX idx_agent_instructions_current
ON agent_instruction_versions(agent_id, is_current)
WHERE is_current = true;

-- Trigger to ensure only one current version per agent
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE agent_instruction_versions
    SET is_current = false
    WHERE agent_id = NEW.agent_id
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_current_version
BEFORE INSERT OR UPDATE ON agent_instruction_versions
FOR EACH ROW
EXECUTE FUNCTION ensure_single_current_version();
```

**API Implementation:**

```typescript
// apps/web/src/app/api/agents/[agentId]/instructions/route.ts
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET current instructions
export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const current = await db.query(`
    SELECT * FROM agent_instruction_versions
    WHERE agent_id = $1 AND is_current = true
  `, [params.agentId]);

  if (!current[0]) {
    return new Response('No current version found', { status: 404 });
  }

  return Response.json(current[0]);
}

// POST new version
export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  const { instructions, changelog } = await request.json();

  // Get current version number
  const currentVersion = await db.query(`
    SELECT MAX(version_number) as max_version
    FROM agent_instruction_versions
    WHERE agent_id = $1
  `, [params.agentId]);

  const nextVersion = (currentVersion[0]?.max_version || 0) + 1;

  // Insert new version
  const newVersion = await db.query(`
    INSERT INTO agent_instruction_versions
    (agent_id, version_number, instructions, changelog, is_current, created_by)
    VALUES ($1, $2, $3, $4, true, $5)
    RETURNING *
  `, [
    params.agentId,
    nextVersion,
    instructions,
    changelog,
    session.user.id
  ]);

  return Response.json(newVersion[0]);
}

// GET version history
export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/history')) {
    const versions = await db.query(`
      SELECT
        id,
        version_number,
        changelog,
        is_current,
        created_by,
        created_at
      FROM agent_instruction_versions
      WHERE agent_id = $1
      ORDER BY version_number DESC
    `, [params.agentId]);

    return Response.json(versions);
  }
}

// POST rollback to version
export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/rollback')) {
    const { versionId } = await request.json();

    // Set target version as current
    await db.query(`
      UPDATE agent_instruction_versions
      SET is_current = (id = $1)
      WHERE agent_id = $2
    `, [versionId, params.agentId]);

    return Response.json({ success: true });
  }
}
```

---

### 4.0.5 Documentation References (Raindrop Collection)

**Agent Builder Core Technologies:**

**LangGraph (Context7 Available ✅):**
- [LangGraph Getting Started](https://langchain-ai.github.io/langgraphjs/getting_started/)
- [LangGraph State Management](https://langchain-ai.github.io/langgraphjs/concepts/state/)
- [LangGraph Human-in-the-Loop](https://langchain-ai.github.io/langgraphjs/concepts/human_in_the_loop/)
- [LangGraph Checkpointing](https://langchain-ai.github.io/langgraphjs/concepts/persistence/)
- [LangGraph Review Tool Calls](https://langchain-ai.github.io/langgraphjs/how-tos/review-tool-calls-functional/)

**LangChain (Context7 Available ✅):**
- [LangChain.js Agents](https://js.langchain.com/docs/modules/agents/)
- [LangChain.js Memory](https://js.langchain.com/docs/modules/memory/)
- [LangChain.js Tools](https://js.langchain.com/docs/modules/tools/)

**UI Components:**
- [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/resizable) - Split-pane layout
- [shadcn/ui Tabs](https://ui.shadcn.com/docs/components/tabs) - Forge UI tabs
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) - Inspector modal
- [shadcn/ui Textarea](https://ui.shadcn.com/docs/components/textarea) - Instruction editor
- [Monaco Editor React](https://github.com/suren-atoyan/monaco-react) - Code editor (optional)

**State Management:**
- [Zustand Documentation](https://zustand.docs.pmnd.rs/) (Context7 Available ✅)
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/guides/persisting-store-data)

**Vector Search & RAG:**
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Cohere Embed v3](https://docs.cohere.com/docs/embeddings)

**Real-Time Communication:**
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

### 4.0.6 Implementation Timeline & Milestones

**Phase 4A: Capability Inspector (Days 15-16)**

**Day 15:**
- [ ] Create database schema for agents, tools, agent_tools, agent_examples
- [ ] Seed database with existing production agents (VRD, ScriptSmith, etc.)
- [ ] Build API endpoint `/api/agents/[agentId]/capabilities`
- [ ] Create `AgentInspectorModal` component
- [ ] Add "inspect" icon to agent cards in UI

**Day 16:**
- [ ] Test inspector with all production agents
- [ ] Add tool filtering and search in inspector
- [ ] Create admin UI for managing agent metadata
- [ ] Document agent metadata schema for team

**Phase 4B: Workflow Forge (Days 17-20)**

**Day 17:**
- [ ] Create Forge page route `/forge`
- [ ] Build `ForgeStore` with Zustand
- [ ] Implement 3-panel layout (Instructions, Chat, Testbed)
- [ ] Create `ForgeChat` component with message history

**Day 18:**
- [ ] Implement Forge Meta-Agent (Python backend)
- [ ] Build tool discovery with RAG search
- [ ] Create requirement gathering flow
- [ ] Test conversational agent creation end-to-end

**Day 19:**
- [ ] Implement instruction generation logic
- [ ] Build `ToolSelector` component
- [ ] Add instruction versioning database schema
- [ ] Create version history UI

**Day 20:**
- [ ] Implement "Review w/ Tools" mode
- [ ] Build `ToolApprovalPanel` component
- [ ] Add WebSocket/SSE for real-time approval requests
- [ ] Test pause/resume execution with checkpointing

**Phase 4C: Integration & Testing (Days 21-22)**

**Day 21:**
- [ ] Integrate Forge with existing agent system
- [ ] Test creating custom agents from scratch
- [ ] Test modifying existing agents
- [ ] Add Langfuse tracing to Forge Meta-Agent

**Day 22:**
- [ ] End-to-end testing of full workflow:
  - Inspect pre-built agent
  - Clone and modify in Forge
  - Test with Review mode
  - Save and deploy
- [ ] Performance optimization (caching, lazy loading)
- [ ] Documentation and team training
- [ ] Deploy to staging environment

---

### 4.0.7 Success Metrics

**Capability Inspector:**
- ✅ All 15+ production agents have complete metadata
- ✅ Users can view instructions and tools before assignment
- ✅ Inspector loads in <500ms
- ✅ 100% of tools have descriptions and examples

**Workflow Forge:**
- ✅ Users can create custom agent in <10 minutes
- ✅ Tool discovery returns relevant results in <2s
- ✅ Instruction generation produces valid, executable templates
- ✅ Review mode successfully pauses/resumes execution
- ✅ Version rollback works without data loss

**User Experience:**
- ✅ Conversational flow feels natural (no technical jargon)
- ✅ Real-time instruction updates visible in UI
- ✅ Tool approval UI is clear and intuitive
- ✅ Error messages are actionable

**Technical:**
- ✅ All Forge operations traced in Langfuse
- ✅ No memory leaks in long Forge sessions
- ✅ Concurrent Forge sessions don't interfere
- ✅ Agent instructions persist across deployments

---

### 4.0.8 Risk Mitigation

**Risk 1: RAG Tool Discovery Returns Irrelevant Results**
- **Mitigation:**
  - Use hybrid search (vector + keyword + metadata filters)
  - Implement user feedback loop (thumbs up/down on recommendations)
  - Fine-tune embeddings on workflow corpus
  - Add manual tool selection as fallback

**Risk 2: Generated Instructions Are Invalid or Unsafe**
- **Mitigation:**
  - Validate instruction syntax before saving
  - Sandbox test execution before deployment
  - Implement instruction templates with guardrails
  - Add human review for production agents

**Risk 3: Review Mode Causes State Corruption**
- **Mitigation:**
  - Use LangGraph checkpointing for atomic state updates
  - Implement state validation before resume
  - Add rollback mechanism for failed executions
  - Test extensively with concurrent approval requests

**Risk 4: UI Performance Degrades with Large Instruction Files**
- **Mitigation:**
  - Lazy load instruction content
  - Implement virtual scrolling for tool lists
  - Cache frequently accessed agent metadata
  - Use code splitting for Forge page

**Risk 5: Users Create Agents That Conflict with Existing Ones**
- **Mitigation:**
  - Implement agent name uniqueness validation
  - Add conflict detection for overlapping capabilities
  - Provide agent discovery before creation
  - Allow agent namespacing by user/team

---

## Phase 4: AI Integration (Days 15-18)

### 4.1 Langfuse Evaluations & Datasets (from Perplexity)

**Automated Quality Scoring for Agent Outputs:**

```python
# apps/comfyui-gateway/evaluations/concept_quality.py
from langfuse import Langfuse

async def evaluate_concept_quality(concept: dict, trace_id: str):
    """
    Evaluate AI Concept Generator output quality
    Scores: creativity, brand_alignment, feasibility
    """

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

**Automated Dataset Creation from Sentry Errors (from Perplexity):**

```python
# apps/comfyui-gateway/integrations/sentry_langfuse.py
import sentry_sdk
from langfuse import Langfuse

async def capture_agent_failure(agent_name: str, input_data: dict, error: Exception, trace_id: str):
    """
    Capture agent failures in both Sentry and Langfuse
    Sentry: Runtime error tracking
    Langfuse: Dataset for regression testing
    """

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
            "timestamp": datetime.now().isoformat()
        }
    )

    # Link Sentry event to Langfuse trace
    langfuse.trace(
        id=trace_id,
        metadata={
            "sentry_event_id": sentry_sdk.last_event_id(),
            "error": str(error)
        }
    )
```

**Evaluation Pipeline for Legal/Compliance Check (from Perplexity):**

```python
# apps/comfyui-gateway/evaluations/legal_compliance.py
from langfuse import Langfuse

async def evaluate_legal_compliance(generated_ad: dict, trace_id: str):
    """
    Evaluate generated ads for legal/compliance violations
    If violations found, add to dataset for future prevention
    """

    violations = await check_legal_compliance(generated_ad)

    # Score the output
    compliance_score = 1.0 if len(violations) == 0 else 0.0

    langfuse.score(
        trace_id=trace_id,
        name="legal_compliance",
        value=compliance_score,
        data_type="NUMERIC",
        comment=f"Violations: {', '.join(violations) if violations else 'None'}"
    )

    # If violations found, add to dataset
    if violations:
        langfuse.create_dataset_item(
            dataset_name="legal_violations",
            input=generated_ad["concept"],
            expected_output=None,  # Will be filled with corrected version
            metadata={
                "violations": violations,
                "violation_count": len(violations),
                "ad_type": generated_ad["type"]
            }
        )

        # Also send to Sentry for alerting
        sentry_sdk.capture_message(
            f"Legal violation in generated ad: {', '.join(violations)}",
            level="warning"
        )
```

**Regression Testing with Langfuse Datasets:**

```python
# apps/comfyui-gateway/tests/test_agent_regression.py
from langfuse import Langfuse
import pytest

@pytest.mark.asyncio
async def test_concept_generator_regression():
    """
    Run regression tests using Langfuse datasets
    Ensures previously failed concepts don't fail again
    """

    # Fetch dataset of failed concepts
    dataset = langfuse.get_dataset("failed_concepts")

    for item in dataset.items:
        # Re-run AI Concept Generator
        result = await ai_concept_generator(item.input)

        # Evaluate quality
        quality_score = await evaluate_concept_quality(result, item.trace_id)

        # Assert quality improved
        assert quality_score > 0.6, f"Concept still failing: {item.input}"
```

**Benefits (from Perplexity):**
- **Automated quality scoring** for all agent outputs
- **Regression test datasets** from production failures
- **Sentry + Langfuse integration** for complete observability
- **Continuous improvement** based on real production data

---

## Phase 4.5: User-Facing Prompt Management (Days 18-19)

### 4.5.1 Langfuse Prompt Management Integration

**Goal:** Transform Langfuse from pure developer telemetry into a user-facing product feature for systematic prompt optimization.

**Where Langfuse Manages User Prompts:**

1. **ComfyUI Workflow Prompts**
   - Text-to-video, image-to-video, upscaling workflow prompts
   - Enable A/B testing of prompt formulations ("cinematic 4K" vs "photorealistic ultra-detailed")
   - Use Prompt Config to manage model parameters (CFG scale, steps, samplers)
   - Track which prompt versions produce highest quality outputs

2. **Agent System Prompts**
   - Store agent instructions in Langfuse (in addition to PostgreSQL `agent_instruction_versions`)
   - Use Prompt Composability to create modular instructions that reference base templates
   - Enable users to A/B test agent variations through Workflow Forge UI
   - Implement version rollback using Langfuse labels (production, staging, latest)

3. **Direct Model Prompts**
   - Manage prompts for voice generation (Cartesia TTS with Dutch language)
   - Store prompts for image generation models
   - Version control audio model instructions
   - Track performance metrics (latency, cost, user satisfaction)

**Unified Prompt Service Architecture:**

```typescript
// packages/ai/prompt-service/
// ├── langfuse-prompts.ts         // Fetch from Langfuse
// ├── workflow-prompts.ts         // ComfyUI workflow templates  
// ├── agent-prompts.ts            // Agent instruction templates
// └── model-prompts.ts            // Direct model API prompts

// packages/ai/prompt-service/langfuse-prompts.ts
import { Langfuse } from 'langfuse';

export class PromptService {
  private langfuse: Langfuse;
  private cache: Map<string, CachedPrompt> = new Map();

  async getPrompt(name: string, version?: string): Promise<Prompt> {
    // Check cache first
    const cacheKey = `${name}:${version || 'latest'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.prompt;
    }

    // Fetch from Langfuse
    const prompt = await this.langfuse.getPrompt(name, version);

    // Cache for 5 minutes
    this.cache.set(cacheKey, {
      prompt,
      expires: Date.now() + 5 * 60 * 1000
    });

    // Also save reference in PostgreSQL
    await db.promptCache.upsert({
      name,
      version: prompt.version,
      langfusePromptId: prompt.id,
      updatedAt: new Date()
    });

    return prompt;
  }

  async compilePrompt(template: string, variables: Record<string, any>): Promise<string> {
    // Support Langfuse mustache templates
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
  }
}
```

**Database Hybrid Approach:**

```sql
-- PostgreSQL caches prompt metadata only
CREATE TABLE prompt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  langfuse_prompt_id TEXT NOT NULL,  -- Reference to Langfuse
  category TEXT,                      -- 'workflow', 'agent', 'model'
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Langfuse remains source of truth for:
-- - Actual prompt content
-- - Version history
-- - A/B test configurations
-- - Evaluation results
```

### 4.5.2 User-Facing Prompt Optimization Features

**1. Prompt Experimentation UI**

Build into Workflow Forge (extending Days 17-18 work):

```typescript
// apps/web/src/components/forge/PromptExperimentPanel.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PromptExperimentPanel({ workflowId }: { workflowId: string }) {
  const [variants, setVariants] = useState<PromptVariant[]>([]);

  const createVariant = async (basePrompt: string) => {
    // Create new variant in Langfuse
    const variant = await fetch('/api/prompts/create-variant', {
      method: 'POST',
      body: JSON.stringify({
        basePrompt,
        workflowId,
        label: `variant-${variants.length + 1}`
      })
    });

    setVariants([...variants, variant]);
  };

  const runExperiment = async (testDataset: File) => {
    // Run each variant on test dataset
    const results = await Promise.all(
      variants.map(variant => 
        fetch('/api/experiments/run', {
          method: 'POST',
          body: JSON.stringify({
            variantId: variant.id,
            datasetFile: testDataset
          })
        })
      )
    );

    // Display results side-by-side
    return results;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Prompt Experiments</h3>
      
      <Tabs defaultValue="variants">
        <TabsList>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="variants">
          {/* Create and edit prompt variants */}
        </TabsContent>

        <TabsContent value="results">
          {/* Compare outputs side-by-side */}
        </TabsContent>
      </Tabs>

      <Button onClick={() => runExperiment()}>
        Run Experiment
      </Button>
    </div>
  );
}
```

**2. Automated Prompt Optimization**

```typescript
// packages/ai/prompt-optimization/optimizer.ts
import { Langfuse } from 'langfuse';

export class PromptOptimizer {
  async runOptimization(
    promptName: string,
    testDataset: DatasetItem[],
    evaluationCriteria: EvaluationCriteria
  ): Promise<OptimizationResult> {
    
    // 1. Get prompt variants from Langfuse
    const variants = await this.langfuse.getPromptVersions(promptName);

    // 2. Run each variant on test dataset
    const results = await Promise.all(
      variants.map(async variant => {
        const outputs = await this.runVariantOnDataset(variant, testDataset);
        
        // 3. LLM-as-a-judge evaluates outputs
        const scores = await this.evaluateOutputs(outputs, evaluationCriteria);
        
        return {
          variant,
          avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          outputs,
          scores
        };
      })
    );

    // 4. Find best performing variant
    const best = results.reduce((a, b) => 
      a.avgScore > b.avgScore ? a : b
    );

    // 5. Log experiment to Langfuse
    await this.langfuse.createExperiment({
      name: `${promptName}-optimization`,
      variants: results.map(r => ({
        promptId: r.variant.id,
        score: r.avgScore
      })),
      winner: best.variant.id
    });

    return {
      bestVariant: best.variant,
      improvements: best.avgScore - results[0].avgScore,
      allResults: results
    };
  }

  private async evaluateOutputs(
    outputs: string[],
    criteria: EvaluationCriteria
  ): Promise<number[]> {
    // Use LLM-as-a-judge for quality evaluation
    const evaluator = new ChatOpenAI({ model: 'gpt-4o' });

    return Promise.all(
      outputs.map(async output => {
        const evaluation = await evaluator.invoke([
          {
            role: 'system',
            content: `You are evaluating video generation prompts.
              Score from 0-1 based on: ${criteria.description}`
          },
          {
            role: 'user',
            content: `Output to evaluate: ${output}\n\nScore:`
          }
        ]);

        return parseFloat(evaluation.content);
      })
    );
  }
}
```

**3. Workflow Template Marketplace**

```typescript
// apps/web/src/app/marketplace/page.tsx
export default function MarketplacePage() {
  const { data: templates } = useQuery({
    queryKey: ['marketplace-templates'],
    queryFn: () => fetch('/api/marketplace/templates').then(r => r.json())
  });

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Workflow Marketplace</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        {templates?.map(template => (
          <WorkflowCard
            key={template.id}
            name={template.name}
            description={template.description}
            promptVersion={template.langfusePromptId}  {/* Reference to Langfuse */}
            qualityScore={template.avgQualityScore}
            usageCount={template.usageCount}
            onInstall={() => installTemplate(template)}
          />
        ))}
      </div>
    </div>
  );
}

// API endpoint
// apps/web/src/app/api/marketplace/templates/route.ts
export async function GET() {
  // Fetch templates with Langfuse prompt references
  const templates = await db.workflowTemplates.findMany({
    where: { isPublic: true },
    include: {
      creator: true,
      promptCache: true  // Includes Langfuse prompt ID
    },
    orderBy: { avgQualityScore: 'desc' }
  });

  return NextResponse.json(templates);
}
```

### 4.5.3 Clear Separation of Concerns

**Langfuse Responsibilities:**
- ✅ All prompt templates (ComfyUI, agents, direct models)
- ✅ Version control and A/B testing
- ✅ Experiment tracking and evaluations
- ✅ Developer telemetry and agent tracing

**PostgreSQL Responsibilities:**
- ✅ Workflow metadata and relationships
- ✅ Job queue and execution status
- ✅ User projects and production data
- ✅ Approval gates and human review
- ✅ Prompt metadata cache (references to Langfuse)

**IndexedDB Responsibilities:**
- ✅ Editor state and timeline data
- ✅ Chat history and UI preferences
- ✅ Offline-first capabilities

### 4.5.4 Key Benefits

**For Users:**
- Systematically improve prompt quality through experimentation
- Version control prevents losing successful prompts
- Community-driven prompt templates accelerate workflow creation
- Data-driven optimization (not guesswork)

**For Platform:**
- Unified observability across developer and user interactions
- Monetization opportunity (premium prompt templates, analytics)
- Competitive differentiation (prompt optimization as a feature)
- Reduced support burden (users self-optimize)

**For AI Quality:**
- Continuous improvement through evaluation datasets
- Automated regression testing for prompt changes
- Cost optimization through prompt efficiency tracking
- Brand safety through compliance evaluations

---

## Phase 5: Frontend Integration (Days 19-21)

### 5.1 CircleCI Enhancement - Parallel Testing & Integration Tests

**Add to CircleCI Config (Day 19):**

```yaml
# .circleci/config.yml (Phase 5 additions)
jobs:
  # Parallel unit tests per package
  test_unit_parallel:
    executor: node_large_executor
    parallelism: 6  # One per package
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Run unit tests in parallel
          command: |
            # Split tests across parallel containers
            TESTFILES=$(circleci tests glob "packages/*/src/**/*.test.ts" | \
              circleci tests split --split-by=timings)
            pnpm turbo run test:unit --filter=${TESTFILES}
      - store_test_results:
          path: coverage/
      - store_artifacts:
          path: coverage/
          destination: coverage

  # Integration tests for AI + Editor
  test_integration:
    executor: node_large_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Start test services
          command: |
            docker-compose -f docker-compose.test.yml up -d
            sleep 10  # Wait for services to be ready
      - run:
          name: Run integration tests
          command: |
            pnpm turbo run test:integration
      - run:
          name: Stop test services
          command: docker-compose -f docker-compose.test.yml down
      - store_test_results:
          path: test-results/integration/

  # E2E tests with Playwright
  test_e2e:
    executor: node_large_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install Playwright browsers
          command: npx playwright install --with-deps chromium
      - run:
          name: Run E2E tests
          command: |
            pnpm turbo run test:e2e --filter=web
      - store_test_results:
          path: apps/web/test-results/
      - store_artifacts:
          path: apps/web/playwright-report/
          destination: playwright-report

workflows:
  phase_5_plus:
    jobs:
      - setup_monorepo
      - lint:
          requires:
            - setup_monorepo
      - typecheck:
          requires:
            - setup_monorepo
      - test_unit_parallel:
          requires:
            - setup_monorepo
      - build_packages:
          requires:
            - lint
            - typecheck
            - test_unit_parallel
      - test_integration:
          requires:
            - build_packages
      - docker_build_comfyui:
          requires:
            - test_integration
      - test_comfyui_workflows:
          requires:
            - docker_build_comfyui
      - test_e2e:
          requires:
            - test_integration
      - approve_deploy:
          type: approval
          requires:
            - test_comfyui_workflows
            - test_e2e
          filters:
            branches:
              only: main
      - deploy_backend_railway:
          requires:
            - approve_deploy
      - deploy_web_vercel:
          requires:
            - approve_deploy
```

**Key Features (from Perplexity):**
- **Parallel Testing:** 6 parallel containers for unit tests (one per package)
- **Test Splitting:** CircleCI automatically distributes tests based on timing data
- **Integration Tests:** Docker Compose for test services (PostgreSQL, Redis)
- **E2E Tests:** Playwright for full user flow testing
- **Test Artifacts:** Store reports for debugging failures

### 5.2 Production Workflow UI/UX Design (from Perplexity + AgentFlow)

**Design Goal:** Integrate 15+ production agent workflows (Film/TV, Ad Agency, Social Media) while preserving minimalist interface and enabling both manual and agentic workflow access.

**Key UI Patterns (from Perplexity):**

#### 5.2.1 Intelligent Workflow Dropdown Menu

**Placement (from Perplexity):**
- Position in **top toolbar** adjacent to AI chat panel header
- Use clean, text-based button: "Workflows" with lightning bolt icon
- Leverages screen real estate users already scan
- Follows Notion's minimalist onboarding philosophy

**Menu Structure (from Perplexity):**

```tsx
// apps/web/src/components/workflows/WorkflowDropdown.tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, DollarSign, Sparkles } from "lucide-react";

export function WorkflowDropdown() {
  const { suggestedWorkflows, recentWorkflows, favoriteWorkflows } = useWorkflowStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Zap className="w-4 h-4 mr-2" />
          Workflows
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end">
        {/* Smart Suggestions (Context-aware) */}
        {suggestedWorkflows.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Recommended for your project
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {suggestedWorkflows.map(workflow => (
                <WorkflowMenuItem
                  key={workflow.id}
                  workflow={workflow}
                  suggested={true}
                  confidence={workflow.confidence}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Recent Workflows */}
        {recentWorkflows.length > 0 && (
          <>
            <DropdownMenuLabel>Recent</DropdownMenuLabel>
            <DropdownMenuGroup>
              {recentWorkflows.map(workflow => (
                <WorkflowMenuItem key={workflow.id} workflow={workflow} />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Categorized Groups (Collapsible) */}
        <DropdownMenuLabel>Browse All Workflows</DropdownMenuLabel>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="pre-production">
            <AccordionTrigger className="px-2 py-1.5 text-sm">
              Pre-Production
            </AccordionTrigger>
            <AccordionContent>
              <WorkflowMenuItem workflow={workflows.vrd} />
              <WorkflowMenuItem workflow={workflows.scriptsmith} />
              <WorkflowMenuItem workflow={workflows.shotmaster} />
              <WorkflowMenuItem workflow={workflows.budgetSolver} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="production">
            <AccordionTrigger className="px-2 py-1.5 text-sm">
              Production
            </AccordionTrigger>
            <AccordionContent>
              <WorkflowMenuItem workflow={workflows.moodmaker} />
              <WorkflowMenuItem workflow={workflows.boardbuilder} />
              <WorkflowMenuItem workflow={workflows.breakdown} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="post-production">
            <AccordionTrigger className="px-2 py-1.5 text-sm">
              Post-Production
            </AccordionTrigger>
            <AccordionContent>
              <WorkflowMenuItem workflow={workflows.assembler} />
              <WorkflowMenuItem workflow={workflows.qcSentinel} />
              <WorkflowMenuItem workflow={workflows.colorGrading} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advertising">
            <AccordionTrigger className="px-2 py-1.5 text-sm">
              Advertising
            </AccordionTrigger>
            <AccordionContent>
              <WorkflowMenuItem workflow={workflows.conceptGenerator} />
              <WorkflowMenuItem workflow={workflows.versionGenerator} />
              <WorkflowMenuItem workflow={workflows.legalReview} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="social-media">
            <AccordionTrigger className="px-2 py-1.5 text-sm">
              Social Media
            </AccordionTrigger>
            <AccordionContent>
              <WorkflowMenuItem workflow={workflows.trendAnalyst} />
              <WorkflowMenuItem workflow={workflows.platformOptimizer} />
              <WorkflowMenuItem workflow={workflows.engagementMonitor} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Search Input */}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Input
            placeholder="Search workflows..."
            className="h-8"
            onChange={(e) => filterWorkflows(e.target.value)}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Workflow Menu Item with Metadata (from Perplexity):**

```tsx
// apps/web/src/components/workflows/WorkflowMenuItem.tsx
function WorkflowMenuItem({ workflow, suggested = false, confidence }: WorkflowMenuItemProps) {
  return (
    <DropdownMenuItem
      className="flex items-start gap-3 p-3 cursor-pointer"
      onClick={() => openWorkflowConfig(workflow)}
    >
      {/* Left: Icon */}
      <div className="flex-shrink-0">
        <workflow.icon className="w-5 h-5 text-muted-foreground" />
        {suggested && (
          <Sparkles className="w-3 h-3 text-amber-500 absolute -top-1 -right-1" />
        )}
      </div>

      {/* Center: Name + Description + Inputs */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{workflow.name}</span>
          {suggested && confidence && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(confidence * 100)}% match
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {workflow.description}
        </p>

        {/* Required Inputs as Pills */}
        <div className="flex gap-1 mt-1">
          {workflow.requiredInputs.map(input => (
            <Badge key={input} variant="outline" className="text-xs px-1.5 py-0">
              {input}
            </Badge>
          ))}
        </div>
      </div>

      {/* Right: Duration + Cost */}
      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{workflow.estimatedDuration}</span>
        </div>
        {workflow.costEstimate && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>{workflow.costEstimate}</span>
          </div>
        )}
      </div>
    </DropdownMenuItem>
  );
}
```

**Design Rationale (from Perplexity):**
- **Recognition beats recall:** Grouping and context-aware suggestions let users discover workflows without remembering exact names
- **Smart suggestions** leverage agent context (recent actions, project type, media format)
- **Recent/Favorites** reflect modern personalization patterns for power users
- **Search and filtered lists** address scale as workflows exceed 15
- **Progressive disclosure:** High-level info in main list, deeper details on hover/click

#### 5.2.2 Agent Workflow Suggestion UI

**Toast Notification Pattern (from Perplexity):**

```tsx
// apps/web/src/components/workflows/AgentSuggestionToast.tsx
import { toast } from "sonner";
import { Sparkles, Info } from "lucide-react";

export function showAgentWorkflowSuggestion(workflow: Workflow, context: AgentContext) {
  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 p-4 bg-card border rounded-lg shadow-lg max-w-md">
        {/* Icon with pulsating animation */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="absolute inset-0 animate-ping">
              <Sparkles className="w-5 h-5 text-amber-500 opacity-75" />
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">AI suggests workflow</span>
            <Badge variant="secondary" className="text-xs">
              {Math.round(context.confidence * 100)}% match
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {workflow.name}
          </p>

          {/* Explainability: Why this suggestion? */}
          <button
            onClick={() => showExplanation(context)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            Why this suggestion?
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => {
              toast.dismiss(t);
              openWorkflowApproval(workflow, context);
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast.dismiss(t)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    ),
    {
      duration: 10000, // 10 seconds
      position: "bottom-right",
    }
  );
}
```

**Explainability Modal (from Perplexity):**

```tsx
// apps/web/src/components/workflows/WorkflowExplanation.tsx
function WorkflowExplanationDialog({ context }: { context: AgentContext }) {
  return (
    <Dialog>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Why this workflow?</DialogTitle>
          <DialogDescription>
            The AI agent analyzed your project and identified these factors:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Highlighted contextual cues */}
          {context.reasons.map((reason, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
              <div>
                <p className="text-sm font-medium">{reason.title}</p>
                <p className="text-xs text-muted-foreground">{reason.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Agent reasoning graph (optional for pro users) */}
        {context.reasoningGraph && (
          <Accordion type="single" collapsible>
            <AccordionItem value="reasoning">
              <AccordionTrigger className="text-sm">
                View detailed reasoning
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(context.reasoningGraph, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

#### 5.2.3 Workflow Approval Flow (from Perplexity)

**Two-Stage Approval Pattern:**

**Stage 1: Quick Approval (Toast)** - Immediate "Approve" and "Dismiss" buttons for frictionless activation

**Stage 2: Review Before Execution** - Lightweight side panel showing configuration options

```tsx
// apps/web/src/components/workflows/WorkflowApprovalPanel.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkflowApprovalPanel({ workflow, context, open, onClose }: WorkflowApprovalProps) {
  const [config, setConfig] = useState(workflow.defaultConfig);
  const { executeWorkflow } = useProductionStore();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <workflow.icon className="w-5 h-5" />
            {workflow.name}
          </SheetTitle>
          <SheetDescription>
            {workflow.description}
          </SheetDescription>
        </SheetHeader>

        {/* Workflow Metadata */}
        <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Estimated Duration</Label>
            <p className="text-sm font-medium">{workflow.estimatedDuration}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cost Estimate</Label>
            <p className="text-sm font-medium">{workflow.costEstimate}</p>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="space-y-4 my-6">
          <h4 className="text-sm font-semibold">Configuration</h4>

          {workflow.configOptions.map(option => (
            <div key={option.key} className="space-y-2">
              <Label htmlFor={option.key}>{option.label}</Label>

              {option.type === 'select' && (
                <Select
                  value={config[option.key]}
                  onValueChange={(value) => setConfig({ ...config, [option.key]: value })}
                >
                  <SelectTrigger id={option.key}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {option.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {option.type === 'number' && (
                <Input
                  id={option.key}
                  type="number"
                  value={config[option.key]}
                  onChange={(e) => setConfig({ ...config, [option.key]: e.target.value })}
                  min={option.min}
                  max={option.max}
                />
              )}
            </div>
          ))}
        </div>

        {/* Preview/Output Simulation (if available) */}
        {workflow.previewAvailable && (
          <div className="my-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Preview will appear here</p>
            </div>
          </div>
        )}

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              executeWorkflow(workflow.id, config);
              onClose();
              toast.success(`${workflow.name} started`);
            }}
          >
            Execute Workflow
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

**Alternative: Approval via AI Chat Panel (from Perplexity):**

```tsx
// apps/web/src/components/ai/ChatPanel.tsx
function ChatPanel() {
  const { messages, sendMessage } = useChatStore();

  // Agent suggests workflow via chat message
  const handleAgentSuggestion = (workflow: Workflow) => {
    addMessage({
      role: "assistant",
      content: `I've detected ${workflow.trigger} as the next step. Shall I activate the ${workflow.name}?`,
      actions: [
        {
          label: "Yes, activate",
          onClick: () => {
            executeWorkflow(workflow.id);
            addMessage({ role: "user", content: "Yes" });
          }
        },
        {
          label: "No, skip",
          onClick: () => {
            addMessage({ role: "user", content: "No" });
          }
        },
        {
          label: "Tell me more",
          onClick: () => {
            showWorkflowDetails(workflow);
          }
        }
      ]
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <Input
          placeholder="Ask AI for help..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMessage(e.currentTarget.value);
            }
          }}
        />
      </div>
    </div>
  );
}
```

**Design Rationale (from Perplexity):**
- **Two-stage approval** balances speed and control
- **Lightweight side panel** (40% screen width) preserves timeline/preview visibility
- **Clear configuration options** with sensible defaults
- **Chat-based approval** keeps workflow contextual and reduces new UI elements

#### 5.2.4 Workflow Progress Tracking (from Perplexity)

**Non-Intrusive Progress System:**

```tsx
// apps/web/src/components/workflows/WorkflowProgressIndicator.tsx
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export function WorkflowProgressIndicator({ execution }: { execution: WorkflowExecution }) {
  const { activeProduction, currentAgent } = useProductionStore();

  if (!activeProduction) return null;

  return (
    <>
      {/* Timeline Integration: Progress on affected clip */}
      {execution.affectedClips.map(clipId => (
        <div
          key={clipId}
          className="absolute inset-0 pointer-events-none"
          style={{ /* Position over clip in timeline */ }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${execution.progress}%` }}
            />
          </div>
        </div>
      ))}

      {/* Status in AI Chat Panel */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="flex-1">
          {currentAgent}: {execution.progress}% complete
        </span>
        <span className="text-xs text-muted-foreground">
          {execution.estimatedTimeRemaining}
        </span>
      </div>
    </>
  );
}
```

**Completion Toast (from Perplexity):**

```tsx
// Show brief toast on workflow completion
toast.success(
  <div className="flex items-center gap-2">
    <CheckCircle className="w-4 h-4" />
    <div>
      <p className="font-medium">{workflow.name} complete</p>
      <p className="text-xs text-muted-foreground">Review in preview panel</p>
    </div>
  </div>,
  {
    action: {
      label: "View",
      onClick: () => navigateToPreview()
    }
  }
);
```

**Design Rationale (from Perplexity):**
- **Timeline integration:** Subtle progress bar on affected clip without new panels
- **Chat panel updates:** Single-line status without UI sprawl
- **Brief completion toast:** Non-intrusive and action-oriented
- **Avoid:** Floating progress windows, status bars in toolbar, modal dialogs

#### 5.2.5 Visual Distinction: Manual vs. Agent-Suggested (from Perplexity)

**Subtle Visual Cues:**

```tsx
// Workflow icon with AI indicator
function WorkflowIcon({ workflow, suggested }: { workflow: Workflow; suggested?: boolean }) {
  return (
    <div className="relative">
      <workflow.icon className="w-5 h-5" />
      {suggested && (
        <Sparkles className="w-3 h-3 text-amber-500 absolute -top-1 -right-1" />
      )}
    </div>
  );
}

// Workflow badge in history
function WorkflowHistoryItem({ execution }: { execution: WorkflowExecution }) {
  return (
    <div className="flex items-center gap-2">
      <span>{execution.workflow.name}</span>
      {execution.suggestedByAgent && (
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          AI
        </Badge>
      )}
    </div>
  );
}
```

**Design Rationale (from Perplexity):**
- **Minimal distinction:** Single icon indicator (sparkle) suffices
- **Avoid:** Dramatically different colors or large badges (violates minimalist principle)
- **Consistent pattern:** Users quickly internalize without cognitive friction

### 5.3 AI Panel Redesign

**New AI Panel Features:**
1. **Chat Mode** (Gemini): Conversational AI for guidance
2. **Generate Mode** (ComfyUI): Workflow-based generation
3. **Production Mode** (NEW): Multi-agent production workflows
3. **Workflow Browser**: Semantic search for workflows
4. **Job Queue**: Real-time status of running workflows

**UI Components:**
```tsx
// apps/web/src/components/ai-panel/AIPanelContainer.tsx
export function AIPanelContainer() {
  const { mode } = useAIStore();
  
  return (
    <div className="ai-panel">
      <AIPanelHeader />
      
      {mode === 'chat' && <GeminiChatInterface />}
      {mode === 'generate' && <WorkflowGenerator />}
      {mode === 'browse' && <WorkflowBrowser />}
      
      <JobQueuePanel />
    </div>
  );
}
```

### 5.3 Sentry Session Replay for Timeline Debugging (from Perplexity)

**Enable Session Replay:**

```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.5,

  // Session Replay (from Perplexity)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  integrations: [
    new Sentry.Replay({
      // Mask all text content by default
      maskAllText: true,
      // Block all media (images, videos)
      blockAllMedia: true,
      // Unmask specific elements (e.g., timeline labels)
      unmask: ['.timeline-label', '.media-title'],
    }),
  ],
});
```

**Instrument Timeline Interactions:**

```typescript
// packages/editor/timeline/TimelineCanvas.tsx
import * as Sentry from "@sentry/react";

export const TimelineCanvas = Sentry.withProfiler(
  function TimelineCanvas() {
    const handleDragStart = (element: TimelineElement) => {
      // Add breadcrumb for debugging
      Sentry.addBreadcrumb({
        category: "timeline",
        message: "Drag started",
        data: {
          elementId: element.id,
          elementType: element.type,
          position: element.position,
        },
        level: "info",
      });
    };

    const handleDragEnd = (element: TimelineElement) => {
      Sentry.addBreadcrumb({
        category: "timeline",
        message: "Drag ended",
        data: {
          elementId: element.id,
          newPosition: element.position,
        },
        level: "info",
      });
    };

    // ... timeline logic
  },
  { name: "TimelineCanvas" }
);
```

**Augment MCP Queries for Session Replay:**

```
"Show me the session replay for the last timeline crash"
"What user actions led to the drag-and-drop error?"
"Show me all sessions where users encountered the export bug"
```

**Benefits (from Perplexity):**
- **Visual debugging:** See exactly what the user did before the error
- **Timeline interactions:** Replay drag-and-drop, resize, trim operations
- **Performance insights:** Identify slow renders and laggy interactions
- **User context:** Understand the full user journey leading to issues

### 5.4 Langfuse Custom MCP Integration (from Perplexity)

**Build Custom API Layer for Augment MCP:**

Since Langfuse doesn't have an official MCP server yet, we can build a custom API layer to query Langfuse from the editor.

```python
# apps/langfuse-mcp/main.py
from fastapi import FastAPI, HTTPException
from langfuse import Langfuse
import os

app = FastAPI()

langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST")
)

@app.post("/query")
async def handle_query(query: dict):
    """
    Handle natural language queries from Augment MCP
    Examples:
    - "Show me recent agent failures"
    - "What's the average cost per workflow today?"
    - "Show me the slowest agent in the pipeline"
    """

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
                    "agent": t.metadata.get("agent"),
                    "error": t.status_message,
                    "timestamp": t.timestamp
                }
                for t in traces
            ]
        }

    # Average cost per workflow
    elif "average cost" in query_text:
        traces = langfuse.get_traces(
            filter={
                "name": "ad_agency_pipeline",
                "from_timestamp": datetime.now() - timedelta(days=1)
            }
        )
        total_cost = sum([t.metadata.get("total_cost_usd", 0) for t in traces])
        avg_cost = total_cost / len(traces) if traces else 0

        return {
            "response": f"Average cost per workflow today: ${avg_cost:.2f}",
            "data": {
                "total_workflows": len(traces),
                "total_cost": total_cost,
                "average_cost": avg_cost
            }
        }

    # Slowest agent
    elif "slowest agent" in query_text:
        traces = langfuse.get_traces(limit=100)
        agent_durations = {}

        for trace in traces:
            agent = trace.metadata.get("agent")
            if agent:
                if agent not in agent_durations:
                    agent_durations[agent] = []
                agent_durations[agent].append(trace.duration)

        avg_durations = {
            agent: sum(durations) / len(durations)
            for agent, durations in agent_durations.items()
        }

        slowest = max(avg_durations.items(), key=lambda x: x[1])

        return {
            "response": f"Slowest agent: {slowest[0]} (avg {slowest[1]:.2f}s)",
            "data": avg_durations
        }

    else:
        raise HTTPException(status_code=400, detail="Query not recognized")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "langfuse-mcp"}
```

**Augment MCP Configuration:**

```json
// VS Code settings.json or Windsurf config
{
  "augment.mcpServers": {
    "langfuse": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "http://localhost:8001/query",
        "-H", "Content-Type: application/json",
        "-d", "{\"query\": \"${query}\"}"
      ]
    }
  }
}
```

**Deploy Langfuse MCP to Railway:**

```yaml
# apps/langfuse-mcp/railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port 8001"
healthcheckPath = "/health"
restartPolicyType = "ON_FAILURE"
```

**Common Augment MCP Queries:**

```bash
# Agent Performance
"Show me recent agent failures"
"What's the average cost per workflow today?"
"Show me the slowest agent in the pipeline"
"How many workflows executed in the last hour?"

# Quality Metrics
"Show me concepts with low quality scores"
"What's the approval rate for AI Concept Generator?"
"Show me legal violations from yesterday"

# Cost Optimization
"Which agent is most expensive?"
"Show me workflows that exceeded budget"
"What's our total AI spend this week?"

# Decision Analysis
"Why did AI Budget Solver choose hybrid production?"
"Show me rejected concepts from Creative Director"
"What's the success rate of Video Solver decisions?"
```

**Benefits (from Perplexity):**
- **Query agent performance from editor** without context switching
- **Maintain vibe coding flow** during development
- **Immediate insights** on production agent behavior
- **Cost monitoring** in real-time

### 5.5 Real-Time Job Status

**Webhook + WebSocket Integration:**
```typescript
// apps/web/src/lib/workflow-status.ts
export class WorkflowStatusManager {
  private ws: WebSocket;
  
  constructor() {
    // Connect to ComfyUI webhook endpoint
    this.ws = new WebSocket(`${COMFYUI_WS_URL}/status`);
    
    this.ws.onmessage = (event) => {
      const { job_id, status, progress, output_urls } = JSON.parse(event.data);
      
      // Update Zustand store
      useWorkflowStore.getState().updateJobStatus({
        job_id,
        status,
        progress,
        output_urls
      });
      
      // Show toast notification
      if (status === 'completed') {
        toast.success(`Workflow completed! ${output_urls.length} assets generated.`);
      }
    };
  }
}
```

---

## Phase 6: Testing & Polish (Days 22-24)

### 6.1 CircleCI Final Enhancements - Augment MCP & Performance Monitoring

**Add to CircleCI Config (Day 22):**

```yaml
# .circleci/config.yml (Phase 6 additions)
jobs:
  # Performance benchmarking
  test_performance:
    executor: node_large_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Run performance benchmarks
          command: |
            pnpm turbo run test:perf --filter=web
      - run:
          name: Check performance thresholds
          command: |
            # Fail if timeline with 100+ elements lags
            node scripts/check-performance-metrics.js
      - store_artifacts:
          path: performance-reports/
          destination: performance

  # Generate CI insights for Augment MCP
  generate_ci_insights:
    executor: node_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Collect pipeline metrics
          command: |
            cat > /tmp/ci-metrics.json <<EOF
            {
              "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
              "branch": "${CIRCLE_BRANCH}",
              "commit": "${CIRCLE_SHA1}",
              "workflow_id": "${CIRCLE_WORKFLOW_ID}",
              "packages": {
                "total": 6,
                "modified": $(git diff HEAD~1 packages/ --name-only | cut -d/ -f2 | sort -u | wc -l)
              },
              "build_duration_seconds": ${CIRCLE_BUILD_NUM},
              "status": "success"
            }
            EOF
      - run:
          name: Upload metrics to monitoring
          command: |
            # Optional: Send to monitoring service
            curl -X POST https://your-monitoring-service.com/metrics \
              -H "Content-Type: application/json" \
              -d @/tmp/ci-metrics.json || true
      - store_artifacts:
          path: /tmp/ci-metrics.json
          destination: ci-metrics

  # Visual regression testing
  test_visual_regression:
    executor: node_large_executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install Playwright
          command: npx playwright install --with-deps chromium
      - run:
          name: Run visual regression tests
          command: |
            pnpm turbo run test:visual --filter=web
      - store_artifacts:
          path: apps/web/visual-regression-report/
          destination: visual-regression

workflows:
  phase_6_production:
    jobs:
      - setup_monorepo
      - lint:
          requires:
            - setup_monorepo
      - typecheck:
          requires:
            - setup_monorepo
      - test_unit_parallel:
          requires:
            - setup_monorepo
      - build_packages:
          requires:
            - lint
            - typecheck
            - test_unit_parallel
      - test_integration:
          requires:
            - build_packages
      - test_performance:
          requires:
            - build_packages
      - docker_build_comfyui:
          requires:
            - test_integration
      - test_comfyui_workflows:
          requires:
            - docker_build_comfyui
      - test_e2e:
          requires:
            - test_integration
      - test_visual_regression:
          requires:
            - test_integration
      - generate_ci_insights:
          requires:
            - test_e2e
            - test_visual_regression
            - test_performance
      - approve_deploy:
          type: approval
          requires:
            - generate_ci_insights
            - test_comfyui_workflows
          filters:
            branches:
              only: main
      - deploy_backend_railway:
          requires:
            - approve_deploy
      - deploy_web_vercel:
          requires:
            - approve_deploy
```

**Augment MCP Vibe Coding Queries (from Perplexity):**

During development, ask Augment these questions without leaving your editor:

```
# Build status
"Did my build pass?"
"Why did the editor package build fail?"
"Show me the last 3 build failures"

# Test results
"What tests are failing?"
"Show me the E2E test results"
"Why is the timeline drag test failing?"

# Performance
"What's the performance benchmark result?"
"Did the timeline performance improve?"

# Deployment
"Is the production deploy ready?"
"What's the status of the Railway deployment?"
"Show me the last deployment logs"

# Workflow optimization
"Which packages are taking longest to build?"
"What's my CircleCI credit usage this week?"
"Show me the Turbo cache hit rate"
```

**MCP Benefits (from Perplexity):**
- **No context switching:** Stay in editor while monitoring CI
- **Immediate feedback:** Get build results as you code
- **Debugging assistance:** Trace failures to specific commits
- **Performance insights:** Optimize based on actual CI metrics

### 6.2 Integration Testing

**Test Scenarios:**
1. Upload media → Add to timeline → Edit → Export (OpenCut flow)
2. Chat with Gemini → Get editing suggestions (KijkoCut flow)
3. Request video generation → Agent selects workflow → Job completes → Asset added to library (ComfyUI flow)
4. Hybrid: "Create a 10-second product demo" → Agent uses multiple workflows → Composes final video

### 6.3 Performance Optimization

**Key Optimizations:**
- Lazy load editor components (code splitting)
- Virtualize timeline for large projects
- Cache workflow embeddings in IndexedDB
- Optimize OPFS file access
- Use React.memo for expensive renders

### 6.4 Documentation

**Create:**
- Architecture diagram (Mermaid)
- API documentation for workflows
- User guide for AI features
- Developer setup guide
- CircleCI troubleshooting guide

---

## CircleCI Best Practices & Common Pitfalls

### Best Practices (from Perplexity)

**1. Resource Class Optimization**
- Use `medium` for simple jobs (lint, typecheck)
- Use `large` for builds with 10+ packages (prevents OOM)
- Use `xlarge` for parallel testing with high memory usage
- Use `gpu.nvidia.medium` only for ComfyUI workflow testing

**2. Caching Strategy**
- **Always** use branch-specific cache keys with fallbacks
- **Never** cache `node_modules` directly—use pnpm store
- **Always** persist Turbo cache at `node_modules/.turbo`
- **Separate** Docker layer cache from application cache

**3. Secrets Management**
- Use CircleCI Contexts for environment-specific variables
- **Never** expose `TURBO_TOKEN` or API keys in logs
- Use restricted-scope tokens for CI (not personal tokens)
- Rotate secrets quarterly

**4. Workflow Optimization**
- Use path-filtering to run only affected jobs
- Enable parallelism for test jobs (6 containers for 6 packages)
- Use manual approval for production deployments
- Store test results and artifacts for debugging

**5. Augment MCP Integration**
- Set up MCP server on Day 1 for immediate feedback
- Use MCP queries to debug without leaving editor
- Monitor credit usage via MCP to avoid overruns

### Common Pitfalls & Solutions (from Perplexity)

| Pitfall | Solution |
|---------|----------|
| **Memory issues with 10+ packages** | Use `resource_class: large` or `xlarge` for Turbo builds |
| **Turbo cache not persisting** | Persist workspace between jobs, not just save cache |
| **Docker layer caching misses** | Enable `docker_layer_caching: true` in `setup_remote_docker` |
| **FFmpeg binary bloat** | Cache binary separately, don't include in Node image |
| **Secrets leaking to logs** | Use CircleCI's masked environment variables |
| **Slow builds** | Enable parallel testing, use path-filtering, optimize cache keys |
| **Deployment failures** | Use manual approval, test in staging first |
| **GPU runner costs** | Only use for ComfyUI workflow tests, not general builds |

### Incremental Rollout Strategy (from Perplexity)

**Day 1-2:** Basic config (setup, lint, typecheck, build)
**Day 3-7:** Add unit tests, expand caching
**Day 8:** Add Docker builds, GPU testing (Phase 3)
**Day 15:** Add parallel testing, integration tests (Phase 4)
**Day 19:** Add E2E tests, visual regression (Phase 5)
**Day 22:** Add performance benchmarks, Augment MCP insights (Phase 6)

**Rollback Plan:**
- Keep CI config changes in feature branches
- Test on `develop` before merging to `main`
- Use `circleci-cli` for local validation
- Revert to previous config if builds fail

### CircleCI Cost Optimization

**Free Tier (Phases 1-2):**
- 2,000 credits/week ≈ 250 build minutes
- Sufficient for basic builds during setup

**Starter Plan (Phases 3-6):**
- $15/month + usage-based credits
- Recommended for parallel builds and GPU testing
- Estimated: 3,000-4,500 minutes/month

**Cost Reduction Tips:**
- Use path-filtering to skip unchanged packages
- Cache aggressively (dependencies, Docker layers, Turbo cache)
- Use free tier for development branches, paid for main
- Monitor usage via Augment MCP: "What's my credit usage?"

---

## Technology Stack Summary

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
| **Monitoring** | Sentry + Augment MCP | Error tracking, performance monitoring, session replay |
| **CI/CD** | CircleCI + Augment MCP | Automated testing, deployments, vibe coding |
| **Deployment** | Vercel (frontend) + Railway (backend) | Hosting |
| **Monorepo** | Turborepo | Build orchestration |

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| Complex migration breaks existing features | Incremental migration with feature flags |
| State management becomes unwieldy | Clear domain boundaries, documented cross-store patterns |
| Storage systems conflict | Abstraction layer with clear data ownership |
| ComfyUI API latency | Async job queue with webhooks, optimistic UI updates |
| Vector search performance | Index optimization, caching, fallback to keyword search |

---

## Success Metrics

1. **Functional Parity**: All OpenCut editor features work in merged app
2. **AI Integration**: Gemini chat + ComfyUI workflows both functional
3. **Performance**: Timeline handles 100+ elements without lag
4. **Workflow Discovery**: RAG finds relevant workflow in <1s
5. **Job Completion**: ComfyUI workflows complete and assets appear in library
6. **Runtime Workflow Assembly**: Agent successfully creates and saves new workflow templates from user intent
7. **Template Reusability**: Agent-suggested workflows are discoverable via RAG and reusable across sessions

---

## Next Steps

1. **Immediate**: Set up monorepo structure with Turborepo
2. **Week 1**: Extract OpenCut editor to shared packages
3. **Week 2**: Integrate editor into Next.js app with KijkoCut AI
4. **Week 3**: Deploy ComfyUI backend and implement LangChain tools
5. **Week 4**: Build unified AI interface and test end-to-end flows

---

## Appendix A: ComfyUI Workflow Execution Flow

```
User Request: "Create a 10-second product demo with smooth camera motion"
                                    ↓
                        ┌───────────────────────┐
                        │  AI Agent (LangGraph) │
                        └───────────┬───────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  RAG Discovery        │
                        │  (Vector Search)      │
                        └───────────┬───────────┘
                                    ↓
                    Query: "product demo smooth camera motion"
                                    ↓
                        ┌───────────────────────┐
                        │  PostgreSQL           │
                        │  (Workflow Library)   │
                        └───────────┬───────────┘
                                    ↓
            Top 3 Workflows: [text-to-video-camera-motion, ...]
                                    ↓
                        ┌───────────────────────┐
                        │  Agent Tool Selection │
                        └───────────┬───────────┘
                                    ↓
                Selected: "text-to-video-camera-motion"
                                    ↓
                        ┌───────────────────────┐
                        │  ComfyUI API Call     │
                        │  (Railway Backend)    │
                        └───────────┬───────────┘
                                    ↓
                    POST /generate {workflow_id, params}
                                    ↓
                        ┌───────────────────────┐
                        │  Job Queue (Redis)    │
                        │  Status: "queued"     │
                        └───────────┬───────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  ComfyUI Processing   │
                        │  Status: "running"    │
                        └───────────┬───────────┘
                                    ↓
                    Webhook → Next.js Frontend
                                    ↓
                        ┌───────────────────────┐
                        │  Job Store Update     │
                        │  Progress: 45%        │
                        └───────────┬───────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  UI Toast Notification│
                        │  "Generating video..."│
                        └───────────┬───────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  ComfyUI Complete     │
                        │  Output: video.mp4    │
                        └───────────┬───────────┘
                                    ↓
                    Webhook → Next.js Frontend
                                    ↓
                        ┌───────────────────────┐
                        │  Media Store Update   │
                        │  Add to Library       │
                        └───────────┬───────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  UI Update            │
                        │  "Video ready!"       │
                        │  Show in Media Panel  │
                        └───────────────────────┘
```

---

## Appendix B: Key Architectural Decisions

### Decision 1: Monorepo vs Multi-Repo
**Choice:** Monorepo with Turborepo
**Rationale:** Code sharing, unified tooling, easier refactoring
**Trade-off:** Initial setup complexity vs long-term maintainability

### Decision 2: State Management
**Choice:** Multiple domain-specific Zustand stores
**Rationale:** Clear boundaries, easier testing, prevents bloat
**Trade-off:** Cross-store communication complexity vs single store simplicity

### Decision 3: Storage Strategy
**Choice:** Coexist IndexedDB/OPFS + PostgreSQL
**Rationale:** Leverage strengths of each system, incremental migration
**Trade-off:** Multiple storage systems vs unified approach

### Decision 4: ComfyUI Integration
**Choice:** BentoML with comfy-pack
**Rationale:** Production-ready, standardized APIs, scalable
**Trade-off:** Additional dependency vs custom wrapper

### Decision 5: AI Agent Framework
**Choice:** LangGraph with LangChain tools
**Rationale:** Composable agents, observability, workflow orchestration
**Trade-off:** Learning curve vs custom implementation

---

## Appendix C: Migration Checklist

### Phase 1: Foundation (Days 1-3)
- [ ] Initialize Turborepo monorepo
- [ ] Set up package structure (apps/, packages/)
- [ ] Configure shared TypeScript config
- [ ] Set up shared ESLint/Prettier
- [ ] Configure Turborepo build pipeline
- [ ] **Langfuse: Deploy to Railway using one-click template**
- [ ] **Langfuse: Create separate PostgreSQL database**
- [ ] **Langfuse: Install Python SDK in packages/langfuse**
- [ ] **Langfuse: Install TypeScript SDK in packages/langfuse**
- [ ] **Langfuse: Configure environment variables (public key, secret key, host)**
- [ ] **Langfuse: Test basic trace creation**
- [ ] **Sentry: Create 3 projects (kijko-web, kijko-api, kijko-editor)**
- [ ] **Sentry: Install Next.js SDK in apps/web**
- [ ] **Sentry: Install Python SDK in apps/comfyui-gateway**
- [ ] **Sentry: Configure environment variables (DSN, auth token)**
- [ ] **Sentry: Set up Augment MCP for Sentry**
- [ ] **Sentry: Test "Show recent errors" query**
- [ ] **CircleCI: Create account and connect repository**
- [ ] **CircleCI: Set up minimum viable config (setup, lint, typecheck, build)**
- [ ] **CircleCI: Configure pnpm and Turbo cache**
- [ ] **CircleCI: Set environment variables (TURBO_TOKEN, TURBO_TEAM)**
- [ ] **Augment MCP: Configure CircleCI MCP server in editor**
- [ ] **Augment MCP: Test "Did my build pass?" query**

### Phase 2: Editor Migration (Days 4-7)
- [ ] Extract timeline components to packages/editor/timeline
- [ ] Extract preview components to packages/editor/preview
- [ ] Extract media components to packages/editor/media
- [ ] Extract properties components to packages/editor/properties
- [ ] Move all Zustand stores to packages/stores/editor
- [ ] Update import paths across all files
- [ ] Test editor components in isolation
- [ ] **CircleCI: Add unit tests to workflow**
- [ ] **CircleCI: Verify cache hit rates**

### Phase 3: ComfyUI Backend (Days 8-14)
- [ ] Deploy ComfyUI to Railway
- [ ] Install comfy-pack
- [ ] Package 5-10 core workflows
- [ ] Set up PostgreSQL database
- [ ] Create workflow schema
- [ ] Set up Redis for job queue
- [ ] Configure webhooks
- [ ] **Langfuse: Add @observe decorators to agent functions**
- [ ] **Langfuse: Instrument LangGraph workflows with CallbackHandler**
- [ ] **Langfuse: Add nested spans for multi-agent pipelines**
- [ ] **Langfuse: Configure cost tracking per agent**
- [ ] **Langfuse: Test trace visualization in Langfuse dashboard**
- [ ] **Sentry: Add custom instrumentation for workflow execution**
- [ ] **Sentry: Add custom instrumentation for FFmpeg processing**
- [ ] **Sentry: Configure distributed tracing (Next.js → FastAPI)**
- [ ] **Sentry: Test trace propagation across services**
- [ ] **CircleCI: Add Docker build job with layer caching**
- [ ] **CircleCI: Add GPU runner for ComfyUI workflow testing**
- [ ] **CircleCI: Set up FFmpeg binary caching**
- [ ] **CircleCI: Add Railway deployment job with manual approval**
- [ ] **CircleCI: Add Sentry release creation jobs**
- [ ] **CircleCI: Configure source map uploads for Next.js and packages**
- [ ] **CircleCI: Configure secrets (DATABASE_URL, REDIS_URL, SENTRY_AUTH_TOKEN, LANGFUSE_SECRET_KEY, etc.)**
- [ ] **Augment MCP: Test "Show me ComfyUI deployment status" query**
- [ ] **Augment MCP: Test "Show recent Sentry errors for kijko-api" query**

### Phase 4: AI Integration (Days 15-18)
- [ ] Create workflow tool wrappers
- [ ] Implement RAG discovery
- [ ] Set up LangGraph agent
- [ ] **Implement runtime workflow assembly with LangGraph StateGraph**
- [ ] **Add workflow template versioning and confidence scoring**
- [ ] **Build collaborative workflow suggestion UI**
- [ ] **Test agent-suggested workflow creation and storage**
- [ ] Create workflow stores
- [ ] Implement job tracking
- [ ] Build workflow UI
- [ ] **Langfuse: Set up automated quality evaluations for agent outputs**
- [ ] **Langfuse: Create datasets from production failures**
- [ ] **Langfuse: Instrument workflow assembly with @observe decorator**
- [ ] **Langfuse: Integrate with Sentry for error-to-dataset pipeline**
- [ ] **Langfuse: Set up regression testing with datasets**
- [ ] **Langfuse: Configure legal/compliance evaluations**
- [ ] **CircleCI: Add integration tests with Docker Compose**
- [ ] **CircleCI: Add parallel testing (6 containers)**
- [ ] **CircleCI: Monitor build times and optimize**

### Phase 5: Frontend Integration (Days 19-21)
- [ ] Create new Next.js app in apps/web
- [ ] Import editor packages
- [ ] Import KijkoCut AI components
- [ ] Create unified layout
- [ ] **Production Workflows UI: Create WorkflowDropdown component with categorized groups**
- [ ] **Production Workflows UI: Implement smart suggestions section (context-aware)**
- [ ] **Production Workflows UI: Add recent/favorites workflow tracking**
- [ ] **Production Workflows UI: Implement workflow search functionality**
- [ ] **Production Workflows UI: Create WorkflowMenuItem with metadata display (duration, cost, inputs)**
- [ ] **Agent Suggestions: Implement toast notification system for workflow suggestions**
- [ ] **Agent Suggestions: Create explainability modal showing agent reasoning**
- [ ] **Agent Suggestions: Add pulsating animation for AI suggestions**
- [ ] **Workflow Approval: Create WorkflowApprovalPanel side sheet component**
- [ ] **Workflow Approval: Implement two-stage approval flow (toast → config panel)**
- [ ] **Workflow Approval: Add configuration options UI (select, number inputs)**
- [ ] **Workflow Approval: Implement chat-based approval alternative**
- [ ] **Progress Tracking: Add timeline integration for workflow progress bars**
- [ ] **Progress Tracking: Implement AI chat panel status updates**
- [ ] **Progress Tracking: Create completion toast notifications**
- [ ] **Visual Distinction: Add AI sparkle indicator for agent-suggested workflows**
- [ ] **Visual Distinction: Implement subtle color accents for agent suggestions**
- [ ] **Database: Create production_workflows table**
- [ ] **Database: Create production_jobs table with agent suggestion tracking**
- [ ] **Database: Create agent_executions table**
- [ ] **Database: Create approval_requests table**
- [ ] **Database: Create langfuse_traces table for production workflows**
- [ ] Set up routing
- [ ] Configure environment variables
- [ ] Test full integration
- [ ] **Langfuse: Deploy custom MCP API to Railway**
- [ ] **Langfuse: Configure Augment MCP for Langfuse queries**
- [ ] **Langfuse: Test "Show me recent agent failures" query**
- [ ] **Langfuse: Test "What's the average cost per workflow?" query**
- [ ] **Sentry: Enable Session Replay for timeline debugging**
- [ ] **Sentry: Add breadcrumbs for timeline interactions**
- [ ] **Sentry: Configure replay masking for PII**
- [ ] **Sentry: Test "Show me session replay for timeline crash" query**
- [ ] **CircleCI: Add E2E tests with Playwright**
- [ ] **CircleCI: Add Vercel deployment job**
- [ ] **CircleCI: Set up test result storage**
- [ ] **Augment MCP: Test "Why is the E2E test failing?" query**

### Phase 6: Testing & Polish (Days 22-24)
- [ ] Write integration tests
- [ ] Performance optimization
- [ ] Documentation
- [ ] User testing
- [ ] Bug fixes
- [ ] Deploy to production
- [ ] **CircleCI: Add performance benchmarking**
- [ ] **CircleCI: Add visual regression testing**
- [ ] **CircleCI: Generate CI insights for Augment MCP**
- [ ] **CircleCI: Set up production deployment workflow**
- [ ] **CircleCI: Configure monitoring and alerts**
- [ ] **Augment MCP: Test full vibe coding workflow**
- [ ] **CircleCI: Document troubleshooting guide**

---

---

## Appendix A: Documentation References

**All documentation has been bookmarked in Raindrop collection "Kijko2.0" for easy access during implementation.**

### Context7 Availability Legend
- ✅ **Available in Context7** - Use Context7 library ID for instant access to up-to-date documentation
- 📚 **Raindrop Only** - Bookmarked in Raindrop, use web links

---

### 1. Next.js & React (Phase 1)

**Context7:** ✅ `/vercel/next.js` (Trust Score: 10, 3,338 snippets)

**Raindrop Collection:** `1. Next.js & React`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| Next.js App Router | https://nextjs.org/docs/app | `official-docs`, `app-router`, `phase-1` | ⭐ Critical |
| Server Components | https://nextjs.org/docs/app/building-your-application/rendering/server-components | `server-components`, `phase-1` | ⭐ Critical |
| Client Components | https://nextjs.org/docs/app/building-your-application/rendering/client-components | `client-components`, `phase-1` | High |
| API Routes | https://nextjs.org/docs/pages/building-your-application/routing/api-routes | `api-routes`, `phase-2` | High |
| Middleware | https://nextjs.org/docs/app/building-your-application/routing/middleware | `middleware`, `phase-2` | Medium |
| Image Optimization | https://nextjs.org/docs/app/building-your-application/optimizing/images | `optimization`, `phase-1` | High |
| Production Checklist | https://nextjs.org/docs/app/guides/production-checklist | `production`, `best-practices`, `phase-5` | ⭐ Critical |
| React 19 API Reference | https://react.dev/reference/react | `react`, `api-reference`, `phase-1` | ⭐ Critical |
| React Suspense | https://react.dev/reference/react/Suspense | `suspense`, `phase-1` | High |
| React useTransition | https://react.dev/reference/react/useTransition | `hooks`, `phase-1` | Medium |

**Sprint Usage:**
- **Phase 1 (Days 1-3):** App Router setup, Server/Client Components, Image optimization
- **Phase 2 (Days 4-7):** API Routes, Middleware
- **Phase 5 (Days 19-21):** Production checklist review

---

### 2. Turborepo & Monorepo (Phase 1)

**Context7:** 📚 Not available - Use Raindrop bookmarks

**Raindrop Collection:** `2. Turborepo & Monorepo`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| Getting Started | https://turbo.build/repo/docs/getting-started | `getting-started`, `phase-1` | ⭐ Critical |
| Pipelines | https://turbo.build/repo/docs/core-concepts/pipelines | `pipelines`, `phase-1` | ⭐ Critical |
| Caching | https://turbo.build/repo/docs/core-concepts/caching | `caching`, `best-practices`, `phase-1` | ⭐ Critical |
| Remote Caching | https://turbo.build/repo/docs/09-remote-caching | `remote-caching`, `phase-2` | High |
| Best Practices | https://turbo.build/repo/docs/handbook/best-practices | `best-practices`, `phase-1` | High |

**Sprint Usage:**
- **Phase 1 (Days 1-3):** Monorepo setup, pipeline configuration, local caching
- **Phase 2 (Days 4-7):** Remote caching with Vercel

---

### 3. State & Storage (Phase 1-2)

**Context7:** ✅ `/drizzle-team/drizzle-orm` (Trust Score: 7.6, 436 snippets)

**Raindrop Collection:** `3. State & Storage`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| Zustand Introduction | https://zustand.docs.pmnd.rs/getting-started/introduction | `zustand`, `state-management`, `phase-1` | ⭐ Critical |
| Zustand TypeScript | https://zustand.docs.pmnd.rs/guides/typescript | `zustand`, `typescript`, `phase-1` | ⭐ Critical |
| Zustand Persist | https://zustand.docs.pmnd.rs/guides/persisting-store-data | `zustand`, `persistence`, `phase-1` | ⭐ Critical |
| Zustand Immer | https://zustand.docs.pmnd.rs/guides/immutability | `zustand`, `immer`, `phase-1` | High |
| Zustand Slices | https://zustand.docs.pmnd.rs/guides/slices-pattern | `zustand`, `slices`, `best-practices`, `phase-1` | ⭐ Critical |
| IndexedDB API | https://developer.mozilla.org/docs/Web/API/IndexedDB_API | `indexeddb`, `storage`, `phase-1` | ⭐ Critical |
| IndexedDB Best Practices | https://developer.mozilla.org/docs/Web/API/IndexedDB_API/Best_Practices | `indexeddb`, `best-practices`, `phase-1` | High |
| File System API (OPFS) | https://developer.mozilla.org/docs/Web/API/File_System_API | `opfs`, `file-system`, `phase-1` | ⭐ Critical |
| Drizzle PostgreSQL Setup | https://orm.drizzle.team/docs/installation-postgresql | `drizzle-orm`, `postgresql`, `context7-available`, `phase-2` | ⭐ Critical |
| Drizzle Schema Definition | https://orm.drizzle.team/docs/schema-definition | `drizzle-orm`, `schema`, `context7-available`, `phase-2` | ⭐ Critical |

**Sprint Usage:**
- **Phase 1 (Days 1-3):** Zustand store setup, IndexedDB/OPFS integration
- **Phase 2 (Days 4-7):** Drizzle ORM setup for workflow database

---

### 4. AI & ML (Phase 2-3)

**Context7:**
- ✅ `/websites/langchain_oss_javascript_langchain` (Trust Score: 7.5, 329 snippets)
- ✅ `/websites/langchain-ai_github_io_langgraph` (Trust Score: 7.5, 6,226 snippets)

**Raindrop Collection:** `4. AI & ML`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| LangChain.js Getting Started | https://js.langchain.com/docs/getting-started/ | `langchain`, `getting-started`, `context7-available`, `phase-3` | ⭐ Critical |
| LangChain.js Agents | https://js.langchain.com/docs/modules/agents/ | `langchain`, `agents`, `context7-available`, `phase-3` | ⭐ Critical |
| LangChain.js Memory | https://js.langchain.com/docs/modules/memory/ | `langchain`, `memory`, `context7-available`, `phase-3` | High |
| LangGraph Getting Started | https://langchain-ai.github.io/langgraphjs/getting_started/ | `langgraph`, `getting-started`, `context7-available`, `phase-3` | ⭐ Critical |
| LangGraph State Management | https://langchain-ai.github.io/langgraphjs/concepts/state/ | `langgraph`, `state`, `context7-available`, `phase-3` | ⭐ Critical |
| LangGraph Human-in-the-Loop | https://langchain-ai.github.io/langgraphjs/concepts/human_in_the_loop/ | `langgraph`, `human-in-the-loop`, `context7-available`, `phase-3` | ⭐ Critical |
| Gemini API Getting Started | https://ai.google.dev/tutorials/getting_started | `gemini`, `getting-started`, `phase-2` | ⭐ Critical |
| Gemini Function Calling | https://ai.google.dev/docs/gemini/function_calling | `gemini`, `function-calling`, `phase-2` | ⭐ Critical |
| OpenAI Embeddings | https://platform.openai.com/docs/guides/embeddings | `openai`, `embeddings`, `rag`, `phase-3` | ⭐ Critical |

**Sprint Usage:**
- **Phase 2 (Days 4-7):** Gemini AI integration, function calling
- **Phase 3 (Days 8-14):** LangChain/LangGraph setup, agent orchestration, RAG with embeddings

---

### 5. ComfyUI & Backend (Phase 2-3)

**Context7:** 📚 Not available - Use Raindrop bookmarks

**Raindrop Collection:** `5. ComfyUI & Backend`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| ComfyUI GitHub | https://github.com/comfyanonymous/ComfyUI | `comfyui`, `github`, `phase-2` | ⭐ Critical |
| ComfyUI Documentation | https://docs.comfy.org | `comfyui`, `documentation`, `phase-2` | ⭐ Critical |
| ComfyUI API Nodes | https://docs.comfy.org/tutorials/api-nodes/overview | `comfyui`, `api-nodes`, `phase-2` | ⭐ Critical |
| ComfyUI Custom Nodes | https://docs.comfy.org/custom-nodes/overview | `comfyui`, `custom-nodes`, `phase-3` | High |
| pgvector GitHub | https://github.com/pgvector/pgvector | `pgvector`, `postgresql`, `github`, `phase-3` | ⭐ Critical |
| pgvector Optimization | https://neon.tech/docs/ai/ai-vector-search-optimization | `pgvector`, `optimization`, `best-practices`, `phase-3` | ⭐ Critical |
| Redis Documentation | https://redis.io/docs/latest/ | `redis`, `documentation`, `phase-2` | ⭐ Critical |
| **Railway PostgreSQL Guide** | https://docs.railway.com/guides/postgresql | `railway`, `postgresql`, `database`, `phase-2` | ⭐ Critical |
| **Railway Volumes Reference** | https://docs.railway.com/reference/volumes | `railway`, `volumes`, `storage`, `phase-2` | ⭐ Critical |
| **Railway Environment Variables** | https://docs.railway.com/reference/environments | `railway`, `environment-variables`, `secrets`, `phase-1` | ⭐ Critical |
| **Railway Docker Deployment** | https://docs.railway.com/guides/dockerfiles | `railway`, `docker`, `deployment`, `phase-3` | ⭐ Critical |
| **Railway CLI Guide** | https://docs.railway.com/guides/cli | `railway`, `cli`, `deployment`, `phase-3` | ⭐ Critical |
| **Railway Cost Optimization** | https://docs.railway.com/guides/optimize-usage | `railway`, `cost-optimization`, `best-practices`, `phase-3` | ⭐ Critical |
| **Railway Simple S3 Template** | https://railway.com/deploy/simple-s3 | `railway`, `s3`, `storage`, `minio`, `phase-2` | ⭐ Critical |
| **Better Auth Installation** | https://www.better-auth.com/docs/installation | `better-auth`, `authentication`, `nextjs`, `phase-1` | ⭐ Critical |
| **Better Auth Database Adapters** | https://www.better-auth.com/docs/concepts/database | `better-auth`, `database`, `postgresql`, `phase-1` | ⭐ Critical |
| **Better Auth Drizzle Adapter** | https://www.better-auth.com/docs/adapters/drizzle | `better-auth`, `drizzle`, `orm`, `phase-1` | ⭐ Critical |
| **MinIO JavaScript SDK** | https://min.io/docs/minio/linux/developers/javascript/API.html | `minio`, `s3`, `storage`, `javascript`, `phase-2` | ⭐ Critical |

**Sprint Usage:**
- **Phase 1 (Days 1-3):** Better Auth setup, Railway environment configuration
- **Phase 2 (Days 4-7):** ComfyUI gateway setup, Railway deployment, Redis job queue, Railway Garage (S3) storage
- **Phase 3 (Days 8-14):** pgvector setup for RAG, custom ComfyUI nodes, Railway CLI automation

---

### 6. Monitoring & CI/CD (Phase 1-5)

**Context7:**
- ✅ `/getsentry/sentry-docs` (Trust Score: 9, 7,195 snippets)
- ✅ `/langfuse/langfuse-docs` (Trust Score: 8.3, 2,497 snippets)

**Raindrop Collection:** `6. Monitoring & CI/CD`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| Sentry Next.js SDK | https://docs.sentry.io/platforms/javascript/guides/nextjs/ | `sentry`, `nextjs`, `context7-available`, `phase-1` | ⭐ Critical |
| Sentry FastAPI SDK | https://docs.sentry.io/platforms/python/guides/fastapi/ | `sentry`, `fastapi`, `context7-available`, `phase-2` | ⭐ Critical |
| Sentry Session Replay | https://docs.sentry.io/product/session-replay/ | `sentry`, `session-replay`, `context7-available`, `phase-4` | ⭐ Critical |
| Sentry Distributed Tracing | https://docs.sentry.io/product/performance/distributed-tracing/ | `sentry`, `distributed-tracing`, `context7-available`, `phase-4` | ⭐ Critical |
| Langfuse Getting Started | https://langfuse.com/docs/getting-started | `langfuse`, `getting-started`, `context7-available`, `phase-3` | ⭐ Critical |
| Langfuse Python Decorators | https://langfuse.com/docs/sdk/python/decorators | `langfuse`, `python`, `decorators`, `context7-available`, `phase-3` | ⭐ Critical |
| Langfuse LangChain Integration | https://langfuse.com/docs/integrations/langchain | `langfuse`, `langchain`, `integration`, `context7-available`, `phase-3` | ⭐ Critical |
| Langfuse Evaluations | https://langfuse.com/docs/evaluations | `langfuse`, `evaluations`, `context7-available`, `phase-4` | ⭐ Critical |
| CircleCI Getting Started | https://circleci.com/docs/getting-started/ | `circleci`, `getting-started`, `phase-1` | ⭐ Critical |
| CircleCI Configuration | https://circleci.com/docs/configuration-reference/ | `circleci`, `configuration`, `phase-1` | ⭐ Critical |
| **Playwright CI/CD Integration** | https://playwright.dev/docs/ci | `playwright`, `testing`, `ci-cd`, `e2e`, `phase-6` | ⭐ Critical |

**Sprint Usage:**
- **Phase 1 (Days 1-3):** Sentry Next.js setup, CircleCI basic config
- **Phase 2 (Days 4-7):** Sentry FastAPI setup
- **Phase 3 (Days 8-14):** Langfuse setup, agent instrumentation, LangChain callbacks
- **Phase 4 (Days 15-18):** Langfuse evaluations, Sentry Session Replay, distributed tracing
- **Phase 5 (Days 19-21):** Langfuse Custom MCP deployment
- **Phase 6 (Days 22-24):** Playwright E2E testing with CircleCI integration

---

### 7. UI Components (Phase 1, 3)

**Context7:** 📚 Not available - Use Raindrop bookmarks

**Raindrop Collection:** `7. UI Components`

| Resource | URL | Tags | Priority |
|----------|-----|------|----------|
| shadcn/ui Installation | https://ui.shadcn.com/docs/installation | `shadcn-ui`, `installation`, `phase-1` | ⭐ Critical |
| shadcn/ui Dropdown Menu | https://ui.shadcn.com/docs/components/dropdown-menu | `shadcn-ui`, `dropdown-menu`, `phase-3` | ⭐ Critical |
| shadcn/ui Dialog | https://ui.shadcn.com/docs/components/dialog | `shadcn-ui`, `dialog`, `phase-3` | ⭐ Critical |
| shadcn/ui Toast | https://ui.shadcn.com/docs/components/toast | `shadcn-ui`, `toast`, `phase-3` | ⭐ Critical |
| Radix UI Introduction | https://www.radix-ui.com/primitives/docs/overview/introduction | `radix-ui`, `introduction`, `phase-1` | ⭐ Critical |
| Radix UI Accessibility | https://www.radix-ui.com/primitives/docs/overview/accessibility | `radix-ui`, `accessibility`, `best-practices`, `phase-1` | High |
| Tailwind CSS Installation | https://tailwindcss.com/docs/installation | `tailwind`, `installation`, `phase-1` | ⭐ Critical |
| Tailwind CSS Dark Mode | https://tailwindcss.com/docs/dark-mode | `tailwind`, `dark-mode`, `phase-1` | High |
| Lucide Icons React | https://lucide.dev/docs/lucide-react/usage | `lucide`, `react`, `icons`, `phase-1` | ⭐ Critical |
| Lucide Icons Gallery | https://lucide.dev/icons | `lucide`, `icons`, `gallery`, `phase-1` | High |

**Sprint Usage:**
- **Phase 1 (Days 1-3):** shadcn/ui setup, Tailwind CSS, Lucide Icons
- **Phase 3 (Days 8-14):** Workflow dropdown menu, approval dialogs, toast notifications

---

## Appendix B: Context7 Quick Reference

Use these Context7 library IDs in Augment for instant documentation access:

```typescript
// Next.js documentation
const nextjsDocs = await context7.get('/vercel/next.js', {
  topic: 'App Router Server Components'
});

// LangChain.js documentation
const langchainDocs = await context7.get('/websites/langchain_oss_javascript_langchain', {
  topic: 'agents and tools'
});

// LangGraph documentation
const langgraphDocs = await context7.get('/websites/langchain-ai_github_io_langgraph', {
  topic: 'human in the loop patterns'
});

// Drizzle ORM documentation
const drizzleDocs = await context7.get('/drizzle-team/drizzle-orm', {
  topic: 'PostgreSQL schema definition'
});

// Sentry documentation
const sentryDocs = await context7.get('/getsentry/sentry-docs', {
  topic: 'Next.js SDK setup'
});

// Langfuse documentation
const langfuseDocs = await context7.get('/langfuse/langfuse-docs', {
  topic: 'Python decorators for tracing'
});
```

---

## Appendix C: Raindrop Collection Structure

**Master Collection:** `Kijko2.0` (ID: 62594662)

**Subcollections:**
1. `1. Next.js & React` (ID: 62594692) - 10 bookmarks
2. `2. Turborepo & Monorepo` (ID: 62594693) - 5 bookmarks
3. `3. State & Storage` (ID: 62594694) - 10 bookmarks
4. `4. AI & ML` (ID: 62594695) - 9 bookmarks
5. `5. ComfyUI & Backend` (ID: 62594697) - 8 bookmarks
6. `6. Monitoring & CI/CD` (ID: 62594698) - 10 bookmarks
7. `7. UI Components` (ID: 62594699) - 10 bookmarks

**Total:** 67 official documentation bookmarks

**Tag System:**
- `official-docs` - Official documentation from project maintainers
- `tutorial` - Step-by-step guides
- `api-reference` - API documentation
- `best-practices` - Recommended patterns and practices
- `context7-available` - Available in Context7 for instant access
- `phase-1` through `phase-5` - Implementation phase mapping

**Access:** https://app.raindrop.io/my/0

---

## Appendix D: Perplexity Consultation History

**Total Consultations:** 17

### Planning Phase (11 consultations)
1. **Monorepo Architecture** - Turborepo vs Nx, package organization strategies
2. **ComfyUI Integration** - BentoML comfy-pack, workflow API patterns
3. **State Management** - Zustand migration from OpenCut's 11 stores
4. **CircleCI Configuration** - Turborepo caching, parallel jobs, GPU runners
5. **CircleCI Adoption Timing** - Phased rollout strategy
6. **Sentry Integration** - Multi-project setup, distributed tracing
7. **Sentry MCP & CircleCI Automation** - Augment MCP integration patterns
8. **Langfuse Architecture** - Multi-agent observability, cost tracking
9. **Langfuse Automation & MCP** - Evaluations, datasets, custom MCP
10. **UI/UX Patterns** - Workflow dropdown menu, agent suggestions
11. **Workflow Organization** - Categorization, smart suggestions, approval flows

### Documentation Gathering Phase (6 consultations)
12. **Next.js, Turborepo, React, TypeScript** - Official documentation URLs
13. **Zustand, IndexedDB, OPFS, Drizzle ORM** - State and storage documentation
14. **LangChain, LangGraph, Gemini, OpenAI** - AI/ML framework documentation
15. **ComfyUI, PostgreSQL, Redis, Railway** - Backend infrastructure documentation
16. **Sentry, Langfuse, CircleCI** - Monitoring and CI/CD documentation
17. **shadcn/ui, Radix UI, Tailwind, Lucide** - UI component library documentation

---

## Appendix E: Sprint-Specific Documentation Checklist

### Phase 1 (Days 1-3): Architecture Foundation

**Required Documentation:**
- [ ] Next.js App Router (`/vercel/next.js`)
- [ ] Turborepo Getting Started (Raindrop)
- [ ] Zustand Introduction (Raindrop)
- [ ] IndexedDB API (Raindrop)
- [ ] OPFS File System API (Raindrop)
- [ ] shadcn/ui Installation (Raindrop)
- [ ] Tailwind CSS Installation (Raindrop)
- [ ] Sentry Next.js SDK (`/getsentry/sentry-docs`)
- [ ] CircleCI Getting Started (Raindrop)

**Context7 Queries:**
```bash
# Get Next.js App Router setup guide
context7 get /vercel/next.js --topic "App Router setup production checklist"

# Get Sentry Next.js integration
context7 get /getsentry/sentry-docs --topic "Next.js SDK installation"
```

---

### Phase 2 (Days 4-7): ComfyUI Gateway

**Required Documentation:**
- [ ] ComfyUI API Nodes (Raindrop)
- [ ] Railway Documentation (Raindrop)
- [ ] Redis Documentation (Raindrop)
- [ ] Drizzle ORM PostgreSQL Setup (`/drizzle-team/drizzle-orm`)
- [ ] Gemini API Getting Started (Raindrop)
- [ ] Sentry FastAPI SDK (`/getsentry/sentry-docs`)

**Context7 Queries:**
```bash
# Get Drizzle ORM schema definition
context7 get /drizzle-team/drizzle-orm --topic "PostgreSQL schema definition migrations"

# Get Sentry FastAPI integration
context7 get /getsentry/sentry-docs --topic "FastAPI SDK setup distributed tracing"
```

---

### Phase 3 (Days 8-14): Multi-Agent Workflows

**Required Documentation:**
- [ ] LangChain.js Getting Started (`/websites/langchain_oss_javascript_langchain`)
- [ ] LangGraph Getting Started (`/websites/langchain-ai_github_io_langgraph`)
- [ ] LangGraph Human-in-the-Loop (`/websites/langchain-ai_github_io_langgraph`)
- [ ] OpenAI Embeddings (Raindrop)
- [ ] pgvector Optimization (Raindrop)
- [ ] Langfuse Getting Started (`/langfuse/langfuse-docs`)
- [ ] Langfuse Python Decorators (`/langfuse/langfuse-docs`)
- [ ] Langfuse LangChain Integration (`/langfuse/langfuse-docs`)
- [ ] shadcn/ui Dropdown Menu (Raindrop)
- [ ] shadcn/ui Dialog (Raindrop)
- [ ] shadcn/ui Toast (Raindrop)

**Context7 Queries:**
```bash
# Get LangGraph human-in-the-loop patterns
context7 get /websites/langchain-ai_github_io_langgraph --topic "human in the loop approval gates"

# Get Langfuse agent instrumentation
context7 get /langfuse/langfuse-docs --topic "Python decorators LangChain callbacks"
```

---

### Phase 4 (Days 15-18): Production Workflows

**Required Documentation:**
- [ ] Langfuse Evaluations (`/langfuse/langfuse-docs`)
- [ ] Sentry Session Replay (`/getsentry/sentry-docs`)
- [ ] Sentry Distributed Tracing (`/getsentry/sentry-docs`)

**Context7 Queries:**
```bash
# Get Langfuse evaluations setup
context7 get /langfuse/langfuse-docs --topic "evaluations datasets automated quality scoring"

# Get Sentry Session Replay configuration
context7 get /getsentry/sentry-docs --topic "Session Replay Next.js masking PII"
```

---

### Phase 5 (Days 19-21): Integration & Deployment

**Required Documentation:**
- [ ] Next.js Production Checklist (`/vercel/next.js`)
- [ ] CircleCI Configuration Reference (Raindrop)

**Context7 Queries:**
```bash
# Get Next.js production optimization
context7 get /vercel/next.js --topic "production checklist performance optimization"
```

---

**References:**
- Perplexity consultation on monorepo architecture
- Perplexity consultation on ComfyUI + LangChain integration
- Perplexity consultation on Zustand store migration strategies
- Perplexity consultation on CircleCI configuration for Turborepo monorepos
- Perplexity consultation on CircleCI phased adoption strategy
- Perplexity consultation on Sentry integration for Turborepo monorepos
- Perplexity consultation on Sentry MCP and CircleCI automation
- Perplexity consultation on Langfuse architecture and integration for multi-agent observability
- Perplexity consultation on Langfuse deployment, instrumentation, and MCP integration
- Perplexity consultation on UI/UX patterns for workflow access
- Perplexity consultation on workflow organization and agent tool calls
- Perplexity consultation on Next.js, Turborepo, React, TypeScript documentation
- Perplexity consultation on Zustand, IndexedDB, OPFS, Drizzle ORM documentation
- Perplexity consultation on LangChain, LangGraph, Gemini, OpenAI documentation
- Perplexity consultation on ComfyUI, PostgreSQL, Redis, Railway documentation
- Perplexity consultation on Sentry, Langfuse, CircleCI documentation
- Perplexity consultation on shadcn/ui, Radix UI, Tailwind, Lucide documentation

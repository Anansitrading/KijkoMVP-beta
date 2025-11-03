# Kijko Production Workflows Integration Specification

**Date:** 2025-10-29  
**Version:** 1.0  
**Purpose:** Extend merger plan to support multi-agent production workflows for ad agency, film/TV, and social media use cases

***

## Overview

This specification extends the existing 24-day merger plan to incorporate **Kijko Production**—a suite of specialized AI agents that automate traditional film, advertising, and social media production workflows.[1][2]

### Key Additions to Merge Plan

1. **Production Agent System** - 15+ specialized AI agents for production roles
2. **Workflow Templates** - Pre-configured multi-agent workflows for 3 production types
3. **Langfuse Observability** - Agent performance tracking and optimization
4. **Client Dashboard** - Production tracking for agencies/studios

***

## Phase Integration

### Phase 3.5: Production Agent Foundation (Days 14-16)
**Insert between Phase 3 (ComfyUI Backend) and Phase 4 (AI Integration)**

**New Timeline:** 26 days total (was 24 days)

---

## Architecture Extensions

### Enhanced Monorepo Structure

```
kijko-opencut-monorepo/
├── apps/
│   ├── web/                          # Main Next.js app
│   ├── desktop/                      # Future: Tauri desktop
│   ├── comfyui-gateway/              # ComfyUI API proxy
│   └── production-dashboard/         # NEW: Client production tracking
├── packages/
│   ├── editor/                       # Timeline editor
│   ├── ai/
│   │   ├── gemini/                   # Chat AI
│   │   ├── workflows/                # ComfyUI workflows
│   │   ├── agents/                   # LangGraph orchestration
│   │   └── production-agents/        # NEW: Production role agents
│   │       ├── pre-production/
│   │       │   ├── vrd-agent.ts      # Video Requirements Doc
│   │       │   ├── script-agent.ts   # ScriptSmith
│   │       │   ├── shot-agent.ts     # ShotMaster
│   │       │   └── solver-agent.ts   # Budget/Method Solver
│   │       ├── production/
│   │       │   ├── mood-agent.ts     # MoodMaker
│   │       │   ├── board-agent.ts    # BoardBuilder
│   │       │   ├── breakdown-agent.ts # BreakdownBot
│   │       │   └── rfq-agent.ts      # RFQ Forge
│   │       ├── post-production/
│   │       │   ├── assembly-agent.ts # Assembler
│   │       │   ├── qc-agent.ts       # QC Sentinel
│   │       │   └── color-agent.ts    # Color grading
│   │       ├── advertising/
│   │       │   ├── concept-agent.ts  # Concept Generator
│   │       │   ├── version-agent.ts  # Version Generator
│   │       │   ├── legal-agent.ts    # Legal/Compliance
│   │       │   └── traffic-agent.ts  # Traffic Manager
│   │       └── social-media/
│   │           ├── trend-agent.ts    # Trend Analyst
│   │           ├── platform-agent.ts # Platform Optimizer
│   │           └── engagement-agent.ts # Engagement Monitor
│   ├── storage/                      # Storage adapters
│   ├── stores/
│   │   ├── editor/                   # Editor stores
│   │   ├── ai/                       # AI stores
│   │   ├── workflows/                # Workflow stores
│   │   └── production/               # NEW: Production workflow stores
│   │       ├── production-store.ts   # Active productions
│   │       ├── agent-store.ts        # Agent status/results
│   │       └── approval-store.ts     # Human approval gates
│   ├── shared/                       # Shared utilities
│   └── ui/                           # UI components
└── infrastructure/
    └── langfuse/                     # NEW: Langfuse deployment
        ├── docker-compose.yml
        └── config/
```

***

## Database Schema Extensions

### Production Workflows Table

```sql
-- Production workflow templates
CREATE TABLE production_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- 'Ad Agency', 'Film/TV', 'Social Media'
  description TEXT,
  workflow_type VARCHAR(100), -- 'advertising', 'film', 'social'
  agent_sequence JSONB NOT NULL, -- Array of agent configs
  approval_gates JSONB NOT NULL, -- Human review points
  estimated_duration INTEGER, -- Minutes
  cost_estimate DECIMAL(10,2), -- USD
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
```

***

## Production Agent Implementations

### 1. Pre-Production Agents

#### VRD Agent (Video Requirements Doc Creator)
```typescript
// packages/ai/production-agents/pre-production/vrd-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { observe } from "langfuse";

export class VRDAgent {
  private llm: ChatOpenAI;
  private template: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({ 
      model: "gpt-4o",
      temperature: 0.3 
    });
    
    this.template = PromptTemplate.fromTemplate(`
      You are an experienced Creative Producer. Create a detailed Video Requirements Document (VRD) from this brief:
      
      Brief: {brief}
      
      Include:
      1. Project Overview
      2. Target Audience
      3. Key Messages
      4. Deliverables (formats, durations)
      5. Brand Guidelines
      6. Technical Requirements
      7. Timeline
      8. Budget Considerations
      
      Output as structured JSON.
    `);
  }

  @observe({ name: "VRD Agent Execution" })
  async execute(brief: string): Promise<VRDOutput> {
    const prompt = await this.template.format({ brief });
    const response = await this.llm.invoke(prompt);
    
    return JSON.parse(response.content as string);
  }
}

interface VRDOutput {
  project_overview: string;
  target_audience: string;
  key_messages: string[];
  deliverables: Array<{
    format: string;
    duration: string;
    aspect_ratio: string;
  }>;
  brand_guidelines: Record<string, any>;
  technical_requirements: Record<string, any>;
  timeline: Record<string, string>;
  budget_range: { min: number; max: number };
}
```

#### ScriptSmith Agent
```typescript
// packages/ai/production-agents/pre-production/script-agent.ts
export class ScriptSmithAgent {
  @observe({ name: "ScriptSmith Execution" })
  async execute(vrd: VRDOutput): Promise<ScriptOutput> {
    const llm = new ChatOpenAI({ model: "gpt-4o" });
    
    const prompt = `
      Create a professional video script based on this VRD:
      ${JSON.stringify(vrd)}
      
      Generate:
      1. Main script version
      2. Two alternative approaches
      3. Scene breakdown
      4. Estimated duration per scene
      
      Format as production-ready script.
    `;
    
    const response = await llm.invoke(prompt);
    return this.parseScriptOutput(response.content as string);
  }
}
```

#### ShotMaster Agent
```typescript
// packages/ai/production-agents/pre-production/shot-agent.ts
export class ShotMasterAgent {
  @observe({ name: "ShotMaster Execution" })
  async execute(script: ScriptOutput): Promise<ShotListOutput> {
    const llm = new ChatOpenAI({ model: "gpt-4o" });
    
    const prompt = `
      Generate a detailed shot list from this script:
      ${JSON.stringify(script)}
      
      For each shot include:
      - Shot number
      - Scene number
      - Shot type (WS, MS, CU, etc.)
      - Camera movement
      - Lighting notes
      - Audio notes
      - Props/talent required
      - Estimated setup time
    `;
    
    const response = await llm.invoke(prompt);
    return this.parseShotList(response.content as string);
  }
}
```

#### Budget Solver Agent
```typescript
// packages/ai/production-agents/pre-production/solver-agent.ts
export class BudgetSolverAgent {
  @observe({ name: "Budget Solver Execution" })
  async execute(shotList: ShotListOutput, budget: number): Promise<ProductionMethodOutput> {
    const llm = new ChatOpenAI({ model: "gpt-4o" });
    
    const prompt = `
      Analyze this shot list and determine optimal production method within budget $${budget}:
      
      Shot List: ${JSON.stringify(shotList)}
      
      Evaluate:
      1. AI-only production (full synthetic)
      2. Hybrid (real product + AI environment)
      3. Traditional (minimal crew + AI post)
      
      For each option, provide:
      - Estimated cost breakdown
      - Quality assessment
      - Timeline
      - Risk factors
      
      Recommend best approach and justify.
    `;
    
    const response = await llm.invoke(prompt);
    return this.parseProductionMethod(response.content as string);
  }
}
```

### 2. Production Agents

#### MoodMaker Agent
```typescript
// packages/ai/production-agents/production/mood-agent.ts
export class MoodMakerAgent {
  @observe({ name: "MoodMaker Execution" })
  async execute(vrd: VRDOutput, script: ScriptOutput): Promise<MoodBoardOutput> {
    // Generate mood board using:
    // 1. ComfyUI text-to-image workflows
    // 2. Reference image search
    // 3. Color palette extraction
    // 4. Style references
    
    const workflows = await this.selectMoodWorkflows();
    const results = await Promise.all(
      workflows.map(w => this.executeComfyUIWorkflow(w, {
        prompt: this.buildMoodPrompt(vrd, script),
        style: vrd.brand_guidelines.visual_style
      }))
    );
    
    return {
      reference_images: results.flatMap(r => r.output_urls),
      color_palette: await this.extractColors(results),
      style_notes: await this.generateStyleGuide(vrd, script)
    };
  }
}
```

#### BoardBuilder Agent
```typescript
// packages/ai/production-agents/production/board-agent.ts
export class BoardBuilderAgent {
  @observe({ name: "BoardBuilder Execution" })
  async execute(shotList: ShotListOutput, moodBoard: MoodBoardOutput): Promise<StoryboardOutput> {
    // Generate storyboards using:
    // 1. ComfyUI image generation for each shot
    // 2. Consistent character/environment across shots
    // 3. ControlNet for composition consistency
    
    const storyboardFrames = await Promise.all(
      shotList.shots.map(async (shot, index) => {
        const workflow = await this.selectStoryboardWorkflow(shot);
        const result = await this.executeComfyUIWorkflow(workflow, {
          prompt: this.buildShotPrompt(shot, moodBoard),
          shot_type: shot.shot_type,
          camera_angle: shot.camera_movement,
          reference_image: moodBoard.reference_images[0]
        });
        
        return {
          shot_number: shot.shot_number,
          image_url: result.output_urls[0],
          notes: shot.notes
        };
      })
    );
    
    return { frames: storyboardFrames };
  }
}
```

### 3. Post-Production Agents

#### Assembler Agent
```typescript
// packages/ai/production-agents/post-production/assembly-agent.ts
export class AssemblerAgent {
  @observe({ name: "Assembler Execution" })
  async execute(shotAssets: AssetList, timeline: TimelineData): Promise<RoughCutOutput> {
    // Automatically assemble rough cut:
    // 1. Order shots per script timing
    // 2. Apply basic transitions
    // 3. Sync audio
    // 4. Add placeholders for VFX
    
    const edl = await this.generateEDL(shotAssets, timeline);
    const roughCutFile = await this.renderRoughCut(edl);
    
    return {
      video_url: roughCutFile,
      edl: edl,
      notes: await this.generateEditNotes(shotAssets, timeline)
    };
  }
}
```

#### QC Sentinel Agent
```typescript
// packages/ai/production-agents/post-production/qc-agent.ts
export class QCSentinelAgent {
  @observe({ name: "QC Sentinel Execution" })
  async execute(video: VideoAsset): Promise<QCReport> {
    const llm = new ChatOpenAI({ model: "gpt-4o-vision" });
    
    // Analyze video for:
    // 1. Technical issues (compression artifacts, color balance)
    // 2. Content issues (brand guideline violations, typos)
    // 3. Compliance (legal requirements, accessibility)
    
    const frames = await this.extractKeyFrames(video);
    const issues = [];
    
    for (const frame of frames) {
      const analysis = await llm.invoke([
        {
          type: "image_url",
          image_url: { url: frame.url }
        },
        {
          type: "text",
          text: "Identify any technical or content issues in this frame. Check for: artifacts, color issues, text errors, brand violations."
        }
      ]);
      
      issues.push(...this.parseQCIssues(analysis.content as string));
    }
    
    return {
      status: issues.length === 0 ? "pass" : "fail",
      issues: issues,
      recommendations: await this.generateFixes(issues)
    };
  }
}
```

### 4. Advertising Agents

#### Concept Generator Agent
```typescript
// packages/ai/production-agents/advertising/concept-agent.ts
export class ConceptGeneratorAgent {
  @observe({ name: "Concept Generator Execution" })
  async execute(brief: AgencyBrief, count: number = 100): Promise<ConceptOutput[]> {
    const llm = new ChatOpenAI({ 
      model: "gpt-4o",
      temperature: 0.9 // High creativity
    });
    
    const concepts = [];
    
    // Generate concepts in batches
    for (let i = 0; i < count / 10; i++) {
      const prompt = `
        Generate 10 unique advertising concepts for:
        ${JSON.stringify(brief)}
        
        Each concept should include:
        - Big Idea (one sentence)
        - Visual approach
        - Key message
        - Target emotion
        - Unique angle
        
        Be creative and diverse. Avoid clichés.
      `;
      
      const response = await llm.invoke(prompt);
      concepts.push(...this.parseConcepts(response.content as string));
    }
    
    // Rank by uniqueness + relevance
    return this.rankConcepts(concepts, brief);
  }
}
```

#### Version Generator Agent
```typescript
// packages/ai/production-agents/advertising/version-agent.ts
export class VersionGeneratorAgent {
  @observe({ name: "Version Generator Execution" })
  async execute(masterAsset: VideoAsset, formats: FormatSpec[]): Promise<VersionOutput[]> {
    // Generate platform-specific versions:
    // - TV 30s/15s (16:9)
    // - Digital video (16:9, various lengths)
    // - Social cuts (9:16, 1:1, 4:5)
    // - Display ads (animated)
    // - Print/OOH (still frames)
    
    const versions = await Promise.all(
      formats.map(async (format) => {
        const workflow = await this.selectConversionWorkflow(format);
        const result = await this.executeComfyUIWorkflow(workflow, {
          source_video: masterAsset.url,
          target_aspect_ratio: format.aspect_ratio,
          target_duration: format.duration,
          platform_specs: format.platform_requirements
        });
        
        return {
          format: format.name,
          asset_url: result.output_urls[0],
          specs: format
        };
      })
    );
    
    return versions;
  }
}
```

### 5. Social Media Agents

#### Trend Analyst Agent
```typescript
// packages/ai/production-agents/social-media/trend-agent.ts
export class TrendAnalystAgent {
  @observe({ name: "Trend Analyst Execution" })
  async execute(brandContext: BrandContext): Promise<TrendReport> {
    // Analyze current social trends:
    // 1. Scrape trending topics (Twitter API, TikTok API)
    // 2. Identify viral formats
    // 3. Match to brand context
    // 4. Recommend content opportunities
    
    const trends = await this.scrapeTrends([
      'tiktok',
      'instagram',
      'twitter',
      'youtube'
    ]);
    
    const relevantTrends = await this.filterByBrand(trends, brandContext);
    const opportunities = await this.generateOpportunities(relevantTrends, brandContext);
    
    return {
      trending_topics: relevantTrends,
      content_opportunities: opportunities,
      recommended_formats: await this.recommendFormats(opportunities)
    };
  }
}
```

#### Platform Optimizer Agent
```typescript
// packages/ai/production-agents/social-media/platform-agent.ts
export class PlatformOptimizerAgent {
  @observe({ name: "Platform Optimizer Execution" })
  async execute(content: ContentAsset, platforms: string[]): Promise<PlatformOutput[]> {
    // Optimize content for each platform:
    // TikTok: 9:16, 15-60s, high energy, trending audio
    // Instagram: Reels (9:16), Stories (9:16), Posts (1:1)
    // YouTube: Shorts (9:16), Long-form (16:9)
    // Twitter/X: 16:9 or 1:1, max 2:20
    
    const optimized = await Promise.all(
      platforms.map(async (platform) => {
        const specs = this.getPlatformSpecs(platform);
        const workflow = await this.selectOptimizationWorkflow(platform);
        
        const result = await this.executeComfyUIWorkflow(workflow, {
          source_content: content.url,
          platform: platform,
          aspect_ratio: specs.aspect_ratio,
          duration: specs.optimal_duration,
          style: specs.content_style
        });
        
        return {
          platform: platform,
          asset_url: result.output_urls[0],
          caption: await this.generateCaption(content, platform),
          hashtags: await this.generateHashtags(content, platform),
          posting_time: await this.recommendPostTime(platform)
        };
      })
    );
    
    return optimized;
  }
}
```

***

## LangGraph Workflow Orchestration

### Production Workflow Controller
```typescript
// packages/ai/agents/production-workflow-controller.ts
import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

export class ProductionWorkflowController {
  private graph: StateGraph;
  
  constructor(workflowType: 'advertising' | 'film' | 'social') {
    this.graph = this.buildWorkflowGraph(workflowType);
  }
  
  private buildWorkflowGraph(type: string): StateGraph {
    const workflow = new StateGraph({
      channels: {
        brief: null,
        vrd: null,
        script: null,
        shots: null,
        method: null,
        assets: null,
        approval_status: null
      }
    });
    
    if (type === 'film') {
      workflow
        .addNode("vrd", this.vrdNode)
        .addNode("script", this.scriptNode)
        .addNode("cd_review", this.humanReviewNode("Creative Director"))
        .addNode("shots", this.shotNode)
        .addNode("solver", this.solverNode)
        .addNode("branch", this.branchNode)
        .addNode("ai_production", this.aiProductionNode)
        .addNode("hybrid_production", this.hybridProductionNode)
        .addNode("traditional_production", this.traditionalProductionNode)
        .addNode("assembly", this.assemblyNode)
        .addNode("qc", this.qcNode)
        .addNode("editor_review", this.humanReviewNode("Editor"))
        .addNode("director_approval", this.humanReviewNode("Director"));
      
      workflow
        .addEdge("vrd", "script")
        .addEdge("script", "cd_review")
        .addConditionalEdges("cd_review", this.approvalRouter)
        .addEdge("shots", "solver")
        .addEdge("solver", "branch")
        .addConditionalEdges("branch", this.productionRouter)
        .addEdge("ai_production", "assembly")
        .addEdge("hybrid_production", "assembly")
        .addEdge("traditional_production", "assembly")
        .addEdge("assembly", "qc")
        .addEdge("qc", "editor_review")
        .addConditionalEdges("editor_review", this.approvalRouter)
        .addEdge("director_approval", END);
      
    } else if (type === 'advertising') {
      workflow
        .addNode("account_mgr", this.accountManagerNode)
        .addNode("creative_dir", this.humanReviewNode("Creative Director"))
        .addNode("concept_gen", this.conceptGeneratorNode)
        .addNode("concept_review", this.humanReviewNode("Concept Review"))
        .addNode("storyboards", this.storyboardNode)
        .addNode("client_presentation", this.humanReviewNode("Client"))
        .addNode("budget_solver", this.solverNode)
        .addNode("production", this.productionNode)
        .addNode("version_gen", this.versionGeneratorNode)
        .addNode("legal", this.legalReviewNode)
        .addNode("final_qc", this.qcNode)
        .addNode("traffic", this.trafficNode)
        .addNode("distribution", this.distributionNode);
      
      // Connect ad agency workflow...
    }
    
    return workflow.compile();
  }
  
  async execute(brief: string): Promise<ProductionOutput> {
    const result = await this.graph.invoke({
      brief: brief
    });
    
    return result;
  }
}
```

***

## Langfuse Integration

### Configuration
```typescript
// packages/ai/observability/langfuse-config.ts
import { Langfuse } from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST || "http://localhost:3000"
});

// Middleware for all production agents
export function observeProductionAgent(agentName: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const trace = langfuse.trace({
        name: `Production: ${agentName}`,
        metadata: {
          agent: agentName,
          input: args[0]
        }
      });
      
      try {
        const result = await originalMethod.apply(this, args);
        trace.update({ output: result });
        return result;
      } catch (error) {
        trace.update({ 
          level: "ERROR",
          statusMessage: error.message 
        });
        throw error;
      } finally {
        await langfuse.shutdownAsync();
      }
    };
    
    return descriptor;
  };
}
```

### Agent Performance Dashboard
```typescript
// apps/production-dashboard/src/components/AgentMetrics.tsx
export function AgentMetricsPanel() {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  
  useEffect(() => {
    // Query Langfuse for agent performance
    fetch('/api/langfuse/agent-metrics')
      .then(res => res.json())
      .then(setMetrics);
  }, []);
  
  return (
    <div className="metrics-grid">
      {metrics.map(agent => (
        <Card key={agent.name}>
          <h3>{agent.name}</h3>
          <dl>
            <dt>Avg Execution Time</dt>
            <dd>{agent.avg_duration}s</dd>
            
            <dt>Success Rate</dt>
            <dd>{agent.success_rate}%</dd>
            
            <dt>Avg Cost</dt>
            <dd>${agent.avg_cost}</dd>
            
            <dt>Total Executions</dt>
            <dd>{agent.total_runs}</dd>
          </dl>
          <Button onClick={() => viewLangfuseTraces(agent.name)}>
            View Traces
          </Button>
        </Card>
      ))}
    </div>
  );
}
```

***

## Zustand State Management

### Production Store
```typescript
// packages/stores/production/production-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProductionStore {
  activeProduction: ProductionJob | null;
  productionHistory: ProductionJob[];
  currentAgent: string | null;
  agentResults: Record<string, any>;
  approvalQueue: ApprovalRequest[];
  
  // Actions
  startProduction: (workflow: string, brief: string) => Promise<void>;
  updateAgentStatus: (agent: string, status: string) => void;
  submitForApproval: (agent: string, content: any) => Promise<void>;
  approveContent: (approvalId: string, feedback?: string) => Promise<void>;
  rejectContent: (approvalId: string, feedback: string) => Promise<void>;
}

export const useProductionStore = create<ProductionStore>()(
  persist(
    (set, get) => ({
      activeProduction: null,
      productionHistory: [],
      currentAgent: null,
      agentResults: {},
      approvalQueue: [],
      
      startProduction: async (workflow, brief) => {
        const response = await fetch('/api/production/start', {
          method: 'POST',
          body: JSON.stringify({ workflow, brief })
        });
        
        const production = await response.json();
        set({ activeProduction: production });
      },
      
      updateAgentStatus: (agent, status) => {
        set({ currentAgent: agent });
      },
      
      submitForApproval: async (agent, content) => {
        const response = await fetch('/api/production/approval', {
          method: 'POST',
          body: JSON.stringify({
            production_id: get().activeProduction?.id,
            agent,
            content
          })
        });
        
        const approval = await response.json();
        set(state => ({
          approvalQueue: [...state.approvalQueue, approval]
        }));
      },
      
      approveContent: async (approvalId, feedback) => {
        await fetch(`/api/production/approval/${approvalId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ feedback })
        });
        
        set(state => ({
          approvalQueue: state.approvalQueue.filter(a => a.id !== approvalId)
        }));
      },
      
      rejectContent: async (approvalId, feedback) => {
        await fetch(`/api/production/approval/${approvalId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ feedback })
        });
        
        set(state => ({
          approvalQueue: state.approvalQueue.filter(a => a.id !== approvalId)
        }));
      }
    }),
    {
      name: 'production-storage'
    }
  )
);
```

***

## API Endpoints

### Production Controller
```typescript
// apps/web/src/app/api/production/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductionWorkflowController } from '@/packages/ai/agents';

export async function POST(req: NextRequest) {
  const { workflow, brief } = await req.json();
  
  const controller = new ProductionWorkflowController(workflow);
  const productionJob = await db.createProductionJob({
    workflow_id: workflow,
    brief_text: brief,
    status: 'brief'
  });
  
  // Start workflow execution (async)
  controller.execute(brief).then(async (result) => {
    await db.updateProductionJob(productionJob.id, {
      status: 'complete',
      agent_results: result
    });
  }).catch(async (error) => {
    await db.updateProductionJob(productionJob.id, {
      status: 'failed',
      error_message: error.message
    });
  });
  
  return NextResponse.json(productionJob);
}
```

***

## UI Components

### Production Workflow Selector
```tsx
// apps/web/src/components/production/WorkflowSelector.tsx
export function WorkflowSelector() {
  const { startProduction } = useProductionStore();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  
  const workflows = [
    {
      id: 'film',
      name: 'Film/TV Production',
      description: 'Full production pipeline from script to final cut',
      estimatedDuration: '7-14 days',
      estimatedCost: '$5,000-50,000'
    },
    {
      id: 'advertising',
      name: 'Ad Agency Campaign',
      description: 'Concept to delivery across all formats',
      estimatedDuration: '3-7 days',
      estimatedCost: '$2,000-20,000'
    },
    {
      id: 'social',
      name: 'Social Media Content',
      description: 'Multi-platform optimized content at scale',
      estimatedDuration: '1-3 days',
      estimatedCost: '$500-5,000'
    }
  ];
  
  return (
    <div className="workflow-selector">
      <h2>Start New Production</h2>
      
      <div className="workflow-cards">
        {workflows.map(w => (
          <Card 
            key={w.id}
            className={selectedWorkflow === w.id ? 'selected' : ''}
            onClick={() => setSelectedWorkflow(w.id)}
          >
            <h3>{w.name}</h3>
            <p>{w.description}</p>
            <dl>
              <dt>Duration</dt>
              <dd>{w.estimatedDuration}</dd>
              <dt>Cost Range</dt>
              <dd>{w.estimatedCost}</dd>
            </dl>
          </Card>
        ))}
      </div>
      
      <Textarea
        placeholder="Paste your creative brief here..."
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={10}
      />
      
      <Button
        disabled={!selectedWorkflow || !brief}
        onClick={() => startProduction(selectedWorkflow!, brief)}
      >
        Start Production
      </Button>
    </div>
  );
}
```

### Agent Progress Tracker
```tsx
// apps/web/src/components/production/AgentTracker.tsx
export function AgentProgressTracker() {
  const { activeProduction, currentAgent, agentResults } = useProductionStore();
  
  if (!activeProduction) return null;
  
  const agents = getAgentsForWorkflow(activeProduction.workflow_type);
  
  return (
    <div className="agent-tracker">
      <h3>Production Progress</h3>
      
      <div className="agent-timeline">
        {agents.map((agent, index) => {
          const status = getAgentStatus(agent.name, activeProduction);
          
          return (
            <div key={agent.name} className={`agent-step ${status}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <h4>{agent.name}</h4>
                <p>{agent.description}</p>
                
                {status === 'completed' && agentResults[agent.name] && (
                  <Button onClick={() => viewAgentOutput(agent.name)}>
                    View Output
                  </Button>
                )}
                
                {status === 'running' && (
                  <Spinner />
                )}
                
                {status === 'awaiting_approval' && (
                  <Button variant="primary" onClick={() => reviewAgentOutput(agent.name)}>
                    Review & Approve
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Approval Interface
```tsx
// apps/web/src/components/production/ApprovalInterface.tsx
export function ApprovalInterface() {
  const { approvalQueue, approveContent, rejectContent } = useProductionStore();
  const [feedback, setFeedback] = useState('');
  
  if (approvalQueue.length === 0) return null;
  
  const currentApproval = approvalQueue[0];
  
  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentApproval.approval_type} Approval Required
          </DialogTitle>
          <DialogDescription>
            Review the {currentApproval.agent_name} output and provide feedback.
          </DialogDescription>
        </DialogHeader>
        
        <div className="approval-content">
          {renderApprovalContent(currentApproval.content_to_review)}
        </div>
        
        <Textarea
          placeholder="Provide feedback (optional for approval, required for rejection)..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
        />
        
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => rejectContent(currentApproval.id, feedback)}
            disabled={!feedback}
          >
            Reject & Request Revision
          </Button>
          <Button
            variant="primary"
            onClick={() => approveContent(currentApproval.id, feedback)}
          >
            Approve & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

***

## Deployment

### Langfuse Self-Hosted Setup
```yaml
# infrastructure/langfuse/docker-compose.yml
version: '3.8'

services:
  langfuse-db:
    image: postgres:15
    environment:
      POSTGRES_DB: langfuse
      POSTGRES_USER: langfuse
      POSTGRES_PASSWORD: ${LANGFUSE_DB_PASSWORD}
    volumes:
      - langfuse-db-data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  langfuse:
    image: langfuse/langfuse:latest
    depends_on:
      - langfuse-db
    environment:
      DATABASE_URL: postgresql://langfuse:${LANGFUSE_DB_PASSWORD}@langfuse-db:5432/langfuse
      NEXTAUTH_URL: ${LANGFUSE_URL}
      NEXTAUTH_SECRET: ${LANGFUSE_SECRET}
      SALT: ${LANGFUSE_SALT}
    ports:
      - "3001:3000"
    restart: always

volumes:
  langfuse-db-data:
```

### Railway Deployment
```bash
# Deploy Langfuse to Railway
railway up -d infrastructure/langfuse/

# Set environment variables
railway variables set LANGFUSE_DB_PASSWORD=$(openssl rand -base64 32)
railway variables set LANGFUSE_SECRET=$(openssl rand -base64 32)
railway variables set LANGFUSE_SALT=$(openssl rand -base64 32)
```

***

## Testing Strategy

### Agent Unit Tests
```typescript
// packages/ai/production-agents/__tests__/vrd-agent.test.ts
import { VRDAgent } from '../pre-production/vrd-agent';

describe('VRDAgent', () => {
  it('should create comprehensive VRD from brief', async () => {
    const agent = new VRDAgent();
    const brief = `
      Create a 30-second product demo for our new smartphone.
      Target audience: tech enthusiasts aged 25-40.
      Budget: $10,000.
    `;
    
    const vrd = await agent.execute(brief);
    
    expect(vrd.project_overview).toBeDefined();
    expect(vrd.target_audience).toBeDefined();
    expect(vrd.deliverables).toHaveLength(1);
    expect(vrd.deliverables[0].duration).toBe('30s');
    expect(vrd.budget_range.max).toBe(10000);
  });
});
```

### Workflow Integration Tests
```typescript
// packages/ai/agents/__tests__/production-workflow.test.ts
import { ProductionWorkflowController } from '../production-workflow-controller';

describe('ProductionWorkflowController', () => {
  it('should execute film workflow end-to-end', async () => {
    const controller = new ProductionWorkflowController('film');
    const brief = 'Create a 2-minute brand story for sustainable fashion brand';
    
    const result = await controller.execute(brief);
    
    expect(result.vrd).toBeDefined();
    expect(result.script).toBeDefined();
    expect(result.shots).toBeDefined();
    expect(result.final_assets).toHaveLength(1);
  }, 300000); // 5 min timeout for full workflow
});
```

***

## Phase 3.5 Implementation Checklist

### Days 14-15: Agent Foundation
- [ ] Create `packages/ai/production-agents/` structure
- [ ] Implement VRD Agent
- [ ] Implement ScriptSmith Agent
- [ ] Implement ShotMaster Agent
- [ ] Implement Budget Solver Agent
- [ ] Set up Langfuse self-hosted on Railway
- [ ] Configure Langfuse decorators for all agents
- [ ] Create `production_workflows` database tables
- [ ] Create `production_jobs` database tables
- [ ] Create `agent_executions` database tables

### Day 16: Workflow Orchestration
- [ ] Implement `ProductionWorkflowController` with LangGraph
- [ ] Build film/TV workflow graph
- [ ] Build advertising workflow graph
- [ ] Build social media workflow graph
- [ ] Implement approval gate logic
- [ ] Create `production-store.ts` Zustand store
- [ ] Create `/api/production/start` endpoint
- [ ] Create `/api/production/approval` endpoints
- [ ] Test single-agent execution
- [ ] Test full workflow execution

***

## Updated Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | Days 1-3 | Architecture Foundation |
| **Phase 2** | Days 4-7 | Editor Migration |
| **Phase 3** | Days 8-14 | ComfyUI Backend |
| **Phase 3.5** | Days 14-16 | **Production Agents** *(NEW)* |
| **Phase 4** | Days 17-20 | AI Integration |
| **Phase 5** | Days 21-23 | Frontend Integration |
| **Phase 6** | Days 24-26 | Testing & Polish |

**Total Duration:** 26 days (was 24 days)

***

## Success Metrics

### Production Workflow Metrics
1. **Agent Completion Rate**: >95% of agent executions complete successfully
2. **Approval Cycle Time**: <24 hours from submission to approval
3. **Cost Accuracy**: Budget Solver within 20% of actual production cost
4. **Quality Score**: QC Sentinel catches >90% of issues before human review
5. **Workflow Duration**: Film workflow completes in 7-14 days, advertising in 3-7 days

### Langfuse Observability Metrics
1. **Trace Coverage**: 100% of production agents instrumented
2. **Cost Tracking**: Real-time per-agent cost visibility
3. **Performance**: Agent execution times visible within 1 second
4. **Error Rate**: <5% of agent executions fail
5. **Feedback Loop**: Approved vs. rejected outputs tracked for iterative improvement

***

## Cost Estimates

### Production Agent Execution Costs

| Workflow Type | Agents Used | Est. LLM Calls | Est. Cost per Run |
|---------------|-------------|----------------|-------------------|
| Film/TV Production | 10-12 agents | 50-100 calls | $15-50 |
| Ad Agency Campaign | 12-15 agents | 100-200 calls | $30-100 |
| Social Media Content | 6-8 agents | 20-50 calls | $5-20 |

### Infrastructure Costs (Monthly)

| Service | Cost | Purpose |
|---------|------|---------|
| Railway (PostgreSQL) | $10-20 | Production database |
| Railway (Redis) | $5-10 | Job queue |
| Railway (Langfuse) | $10-15 | Observability |
| OpenAI API | $200-500 | Agent LLM calls |
| ComfyUI GPU | $50-100 | Workflow execution |
| **Total** | **$275-645/month** | Full production platform |

***

## Conclusion

This specification extends your 24-day merger plan to support **enterprise-grade production workflows** for ad agencies, film studios, and social media creators. The addition of specialized production agents, Langfuse observability, and multi-agent orchestration positions Kijko as a **comprehensive AI production platform** rather than just a video editor.[2][3][4][1]

**Key Additions:**
- 15+ specialized production agents
- 3 pre-configured workflow templates
- Langfuse observability for agent optimization
- Human approval gates for creative control
- Production dashboard for client tracking
- Cost and performance analytics

**Implementation Impact:**
- +2 days to timeline (26 days total)
- +$275-645/month infrastructure costs
- Significant competitive differentiation
- Enables B2B sales to agencies/studios

The production workflows position Kijko to capture the **$50B global advertising production market** and the **$75B film/TV production market**, not just the video editing market.[3][4]

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/11580522/03e63502-36af-4039-bb14-a860028848be/IMPLEMENTATION_SUMMARY.md)
[2](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/11580522/ad7f6a58-8a4a-48ad-92f2-126a11f617ba/plan.md)
[3](https://langfuse.com/blog/2024-07-ai-agent-observability-with-langfuse)
[4](https://systemshogun.com/p/monitoring-multi-agent-systems-with)
# Kijko Telemetry Cheat Sheet

**Quick Reference for MCP Access During Development**

---

## 🚨 Sentry MCP

### What We Have Access To
- **Error Monitoring**: Uncaught exceptions, stack traces, error rates
- **Session Replay**: User interaction playback for debugging
- **Performance Traces**: Frontend/backend transaction performance, bottlenecks

### MCP Tool Access
```typescript
// Search for issues
mcp7_search_issues(organizationSlug: 'kijko', naturalLanguageQuery: 'errors in last 24 hours')

// Get issue details
mcp7_get_issue_details(organizationSlug: 'kijko', issueId: 'KIJ-XXX')

// Get trace details
mcp7_get_trace_details(organizationSlug: 'kijko', traceId: 'abc123...')

// Search events (logs, errors, spans)
mcp7_search_events(organizationSlug: 'kijko', naturalLanguageQuery: 'database errors this week')
```

### When to Use
- ✅ **Crashes/exceptions**: Always start here for reproducible bugs
- ✅ **Frontend performance regression**: Use trace visualizations
- ✅ **Hard-to-reproduce bugs**: Watch session replay

---

## 🤖 Langfuse (via Context7 Docs)

### What We Have Access To
- **AI Agent Traces**: Step-by-step LLM agent runs, tool use, error branches
- **Prompt Management**: Versioned prompts, input/output auditing
- **Cost Tracking**: Token and spend analysis per agent/session/user
- **Evaluations**: LLM output quality scoring, regression tracking

### Access Patterns
**Via Langfuse UI:**
- Traces → Filter by agent, date, error condition
- Prompt Management → Version diff
- Costs → Filter by date/user/agent
- Evaluations → Below threshold analysis

**Via Context7 MCP:**
```typescript
// Get Langfuse documentation
mcp0_get-library-docs(
  context7CompatibleLibraryID: '/langfuse/langfuse-docs',
  topic: 'prompt management versioning'
)
```

**Via Code:**
```typescript
import { langfuse } from '@kijko/langfuse';

// Trace agent execution
langfuse.trace({ name: 'video-generation', userId: 'user-123' });

// Log prompt usage
langfuse.generation({
  name: 'comfyui-prompt',
  prompt: { template: 'cinematic 4K {{style}}' },
  completion: generatedVideo
});

// Score outputs
langfuse.score({
  traceId: 'trace-abc',
  name: 'quality-score',
  value: 0.85
});
```

### When to Use
- ✅ **"Why did the AI do that?"**: Step through agent traces
- ✅ **Prompt improvement**: Compare versions, examine poor eval runs
- ✅ **Cost spikes**: Monitor token drift, runaway API usage
- ✅ **Quality regression**: Track eval scores over time

---

## 🔄 CircleCI MCP

### What We Have Access To
- **Build Status**: Last build per branch/release, build logs
- **Pipeline Metrics**: Duration, success/failure rates, resource usage
- **Test Results**: Pass rates, flaky tests, per-commit diffs

### MCP Tool Access
*(CircleCI MCP not currently integrated - using UI/CLI)*

**Via CircleCI UI:**
- Pipelines → Branch filter → Latest build
- Job Details → Steps → Sort by duration
- Insights → Test Failures → Filter by test name

**Via CLI:**
```bash
# Check build status
circleci build status --branch develop

# Download artifacts
circleci artifacts download --job 123
```

### When to Use
- ✅ **Release/deployment pipeline**: Build fails, test regressions
- ✅ **Slow CI diagnosis**: Find bottlenecks in pipeline
- ✅ **Flaky tests**: Analyze test history over time

---

## 🎯 Quick Decision Matrix

| Task | MCP | How/Why |
|------|-----|---------|
| Crash/error in production | Sentry | Stack traces, session replay, perf snapshots |
| "Why did AI output X?" | Langfuse | Agent traces, prompt/response logs, evals |
| Release pipeline fails | CircleCI | Build/test logs, history, artifacts |
| High API token cost spike | Langfuse | Cost explorer, token analysis |
| Frontend slow for users | Sentry | Performance traces, transaction waterfall |
| Slow/unstable deployment | CircleCI | Step timings, workflow metrics |
| Compare prompt versions | Langfuse | Prompt version diff, eval regression |
| User bug hard to reproduce | Sentry | Session replay, full user journey |

---

## 🔗 Combined Debugging Flow

**For Root-Cause Analysis:**
1. **Sentry**: Check for app errors, performance issues
2. **Langfuse**: Examine AI agent behavior, prompt effectiveness
3. **CircleCI**: Verify build/test pipeline health

**Example: "Video generation failing for users"**
```typescript
// 1. Check Sentry for errors
mcp7_search_issues(query: 'video generation failures last 24h')

// 2. Check Langfuse for AI agent traces
// UI: Traces → Filter by 'video-generation' agent → Look for errors

// 3. Check if it's a deployment issue
// CircleCI UI: Check if recent deploy had test failures
```

---

## 📊 Cost & Performance Monitoring

**Daily Checks:**
- Sentry: Error rate trends, performance scores
- Langfuse: Token usage, cost per agent
- CircleCI: Build duration, credit usage

**Weekly Reviews:**
- Langfuse evaluations: Quality score trends
- Sentry performance: P95 latency trends
- CircleCI: Flaky test analysis

---

## 🚀 Quick Actions

### Debug Production Error
1. Sentry → Search issues → Get issue details
2. Check session replay for user context
3. Look at distributed traces across services

### Optimize AI Agent
1. Langfuse → Find low-quality traces
2. Compare prompt versions
3. Run evaluation dataset
4. Deploy new prompt version

### Fix Broken Pipeline
1. CircleCI → Check last build status
2. Download test artifacts
3. Look at step timings for bottlenecks

---

**Remember**: Use MCP tools from IDE during development to avoid context switching!

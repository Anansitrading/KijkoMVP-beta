# CircleCI Setup Guide for Kijko2 Monorepo

**Complete guide for setting up CircleCI with Augment MCP integration**

---

## Why CircleCI + Augment MCP?

**CircleCI Benefits:**
- Native Turborepo support with intelligent caching
- GPU runners for ComfyUI workflow testing
- Docker layer caching for fast builds
- Parallel testing across 6 packages
- Automated deployments to Vercel + Railway

**Augment MCP Benefits:**
- Query build status from your editor
- Debug failures without context switching
- Maintain vibe coding flow
- Get immediate CI feedback while coding

---

## Phase 1: Day 1 Setup (30 minutes)

### Step 1: Create CircleCI Account

```bash
# 1. Go to https://circleci.com/signup
# 2. Sign up with GitHub account
# 3. Authorize CircleCI to access your repository
```

### Step 2: Connect Repository

```bash
# In CircleCI dashboard:
# 1. Click "Projects" in sidebar
# 2. Find "kijko-opencut-monorepo"
# 3. Click "Set Up Project"
# 4. Choose "Fastest" option (use existing config)
```

### Step 3: Create Minimum Viable Config

```bash
# Create .circleci directory
mkdir -p .circleci

# Create basic config
cat > .circleci/config.yml <<'EOF'
version: 2.1

orbs:
  node: circleci/node@5.1.0

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
EOF
```

### Step 4: Set Environment Variables

```bash
# In CircleCI dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Add these variables:

TURBO_TOKEN=<your-vercel-token>  # Optional: for remote caching
TURBO_TEAM=<your-team-slug>      # Optional: for remote caching
```

### Step 5: Commit and Push

```bash
git add .circleci/config.yml
git commit -m "feat: add CircleCI basic config"
git push origin main

# CircleCI will automatically trigger a build
```

### Step 6: Verify Build

```bash
# In CircleCI dashboard:
# 1. Go to "Pipelines"
# 2. Click on your latest build
# 3. Verify all jobs pass (green checkmarks)
```

---

## Phase 2: Augment MCP Setup (15 minutes)

### Step 1: Get CircleCI Personal API Token

```bash
# In CircleCI dashboard:
# 1. Click your profile icon → Personal API Tokens
# 2. Click "Create New Token"
# 3. Name: "Augment MCP"
# 4. Copy the token (save it securely)
```

### Step 2: Configure Augment MCP

**For VS Code:**
```bash
# Edit VS Code settings.json
code ~/.config/Code/User/settings.json

# Add this configuration:
{
  "augment.mcpServers": {
    "circleci": {
      "command": "npx",
      "args": ["-y", "@circleci/mcp-server-circleci@latest"],
      "env": {
        "CIRCLECI_TOKEN": "your-personal-api-token-here",
        "CIRCLECI_BASE_URL": "https://circleci.com"
      }
    }
  }
}
```

**For Windsurf:**
```bash
# Edit Windsurf settings
# Settings → Extensions → Augment → MCP Servers

# Add CircleCI server with your token
```

### Step 3: Test MCP Integration

```bash
# In your editor, ask Augment:
"Did my build pass?"
"Show me the last build status"
"What's the status of the lint job?"

# You should get immediate responses without leaving the editor
```

---

## Phase 3: Day 8 Expansion (GPU + Docker)

### Add to .circleci/config.yml:

```yaml
executors:
  docker_builder:
    docker:
      - image: cimg/base:2024.01
    resource_class: large

  gpu_executor:
    machine:
      image: ubuntu-2204-cuda-12.1:2024.01
    resource_class: gpu.nvidia.medium

jobs:
  docker_build_comfyui:
    executor: docker_builder
    steps:
      - checkout
      - attach_workspace:
          at: .
      - setup_remote_docker:
          docker_layer_caching: true
      - run:
          name: Build ComfyUI gateway
          command: |
            docker build \
              -t opencut/comfyui-gateway:${CIRCLE_SHA1:0:7} \
              -f apps/comfyui-gateway/Dockerfile \
              .

  test_comfyui_workflows:
    executor: gpu_executor
    steps:
      - checkout
      - run:
          name: Verify GPU
          command: nvidia-smi
      - run:
          name: Run workflow tests
          command: |
            cd apps/comfyui-gateway
            python3 -m pytest tests/workflows/ -v

workflows:
  phase_3_plus:
    jobs:
      - setup_monorepo
      - lint:
          requires: [setup_monorepo]
      - typecheck:
          requires: [setup_monorepo]
      - build_packages:
          requires: [lint, typecheck]
      - docker_build_comfyui:
          requires: [build_packages]
      - test_comfyui_workflows:
          requires: [docker_build_comfyui]
```

### Add Environment Variables:

```bash
# In CircleCI Project Settings → Environment Variables:
DATABASE_URL=postgresql://user:pass@host:5432/opencut
REDIS_URL=redis://user:pass@host:6379
GEMINI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
COMFYUI_API_URL=http://comfyui-gateway:8188
RAILWAY_TOKEN=<your-railway-token>
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
```

---

## Troubleshooting

### Issue: "pnpm: command not found"

**Solution:**
```yaml
- run:
    name: Install pnpm
    command: npm install -g pnpm@8
```

### Issue: "Out of memory" during build

**Solution:**
```yaml
executors:
  node_large_executor:
    docker:
      - image: cimg/node:20.11.0
    resource_class: large  # or xlarge
```

### Issue: Turbo cache not persisting

**Solution:**
```yaml
- save_cache:
    key: turbo-cache-{{ .Branch }}-{{ .Revision }}
    paths:
      - node_modules/.turbo  # Must be this exact path
```

### Issue: Docker layer caching not working

**Solution:**
```yaml
- setup_remote_docker:
    docker_layer_caching: true  # Must be enabled
    version: 20.10.12
```

### Issue: GPU runner not available

**Solution:**
- Upgrade to CircleCI Performance plan ($25/seat)
- GPU runners require paid plan

---

## Augment MCP Queries Cheat Sheet

```bash
# Build status
"Did my build pass?"
"Show me the last 3 builds"
"Why did the build fail?"

# Job-specific
"Show me the lint job results"
"Why did the typecheck job fail?"
"What's the status of the Docker build?"

# Performance
"How long did the last build take?"
"Which job is taking the longest?"
"What's my cache hit rate?"

# Deployment
"Is the production deploy ready?"
"Show me the Railway deployment logs"
"What's the status of the Vercel deploy?"

# Credits
"What's my CircleCI credit usage?"
"How many credits did the last build use?"
```

---

## Cost Optimization Tips

1. **Use path-filtering** to skip unchanged packages
2. **Cache aggressively** (dependencies, Docker layers, Turbo cache)
3. **Use free tier** for development branches
4. **Upgrade to Starter** ($15/month) only when needed
5. **Monitor usage** via Augment MCP

---

## Next Steps

- [ ] Day 1: Set up basic CircleCI config
- [ ] Day 1: Configure Augment MCP
- [ ] Day 8: Add Docker builds and GPU testing
- [ ] Day 15: Add parallel testing
- [ ] Day 19: Add E2E tests
- [ ] Day 22: Add performance benchmarks

---

## Resources

- **CircleCI Docs:** https://circleci.com/docs/
- **Turborepo + CircleCI:** https://turborepo.com/docs/guides/ci-vendors/circleci
- **CircleCI MCP:** https://circleci.com/mcp/
- **Augment Easy MCP:** https://fintech-pulse.com/news/augment-code-launches-easy-mcp-one-click-integration-with-circleci-mongodb-redis-sentry-and-stripe/


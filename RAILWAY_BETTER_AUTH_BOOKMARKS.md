# Railway, Better Auth & Playwright Documentation Bookmarks

## Summary

Added **12 new bookmarks** to Raindrop collections for Railway platform, Better Auth authentication, MinIO storage, and Playwright E2E testing. All bookmarks are properly tagged for easy retrieval and marked as important (⭐) for quick access during implementation.

---

## 📚 New Bookmarks Added

### Collection: Backend & Infrastructure (ID: 62594697)

#### Railway Platform (7 bookmarks)

1. **Railway PostgreSQL Guide** (ID: 1414193359)
   - URL: https://docs.railway.com/guides/postgresql
   - Tags: `official-docs`, `railway`, `postgresql`, `database`, `phase-2`, `backend`
   - Description: Complete guide to deploying and managing PostgreSQL databases on Railway with environment variables and best practices
   - Priority: ⭐ Critical

2. **Railway Volumes Reference** (ID: 1414193370)
   - URL: https://docs.railway.com/reference/volumes
   - Tags: `official-docs`, `railway`, `volumes`, `storage`, `phase-2`, `backend`
   - Description: Persistent storage volumes for stateful services on Railway - configuration and best practices
   - Priority: ⭐ Critical

3. **Railway Environment Variables** (ID: 1414193444)
   - URL: https://docs.railway.com/reference/environments
   - Tags: `official-docs`, `railway`, `environment-variables`, `secrets`, `phase-1`, `backend`
   - Description: Managing environment variables and secrets in Railway - configuration and best practices
   - Priority: ⭐ Critical

4. **Railway Docker Deployment** (ID: 1414193449)
   - URL: https://docs.railway.com/guides/dockerfiles
   - Tags: `official-docs`, `railway`, `docker`, `deployment`, `phase-3`, `backend`
   - Description: Deploying Docker containers on Railway - Dockerfile configuration and best practices
   - Priority: ⭐ Critical

5. **Railway CLI Guide** (ID: 1414193379)
   - URL: https://docs.railway.com/guides/cli
   - Tags: `official-docs`, `railway`, `cli`, `deployment`, `phase-3`, `ci-cd`
   - Description: Using the Railway CLI for deployment automation, environment management, and local development
   - Priority: ⭐ Critical
   - Collection: CI/CD (ID: 62594698)

6. **Railway Cost Optimization** (ID: 1414193467)
   - URL: https://docs.railway.com/guides/optimize-usage
   - Tags: `official-docs`, `railway`, `cost-optimization`, `best-practices`, `phase-3`, `backend`
   - Description: Strategies for optimizing Railway resource usage and reducing costs
   - Priority: ⭐ Critical

7. **Railway Simple S3 Template** (ID: 1414193471)
   - URL: https://railway.com/deploy/simple-s3
   - Tags: `official-docs`, `railway`, `s3`, `storage`, `minio`, `phase-2`, `backend`
   - Description: One-click S3-compatible storage deployment on Railway using MinIO
   - Priority: ⭐ Critical

#### Better Auth (3 bookmarks)

8. **Better Auth Installation** (ID: 1414193384)
   - URL: https://www.better-auth.com/docs/installation
   - Tags: `official-docs`, `better-auth`, `authentication`, `nextjs`, `phase-1`, `security`
   - Description: Modern authentication solution for Next.js - installation and setup guide
   - Priority: ⭐ Critical

9. **Better Auth Database Adapters** (ID: 1414193391)
   - URL: https://www.better-auth.com/docs/concepts/database
   - Tags: `official-docs`, `better-auth`, `database`, `postgresql`, `phase-1`, `security`
   - Description: Database integration for Better Auth including PostgreSQL adapter configuration
   - Priority: ⭐ Critical

10. **Better Auth Drizzle Adapter** (ID: 1414193403)
    - URL: https://www.better-auth.com/docs/adapters/drizzle
    - Tags: `official-docs`, `better-auth`, `drizzle`, `orm`, `phase-1`, `security`
    - Description: Drizzle ORM adapter for Better Auth - type-safe database operations with PostgreSQL
    - Priority: ⭐ Critical

#### MinIO Storage (1 bookmark)

11. **MinIO JavaScript SDK** (ID: 1414193408)
    - URL: https://min.io/docs/minio/linux/developers/javascript/API.html
    - Tags: `official-docs`, `minio`, `s3`, `storage`, `javascript`, `phase-2`, `backend`
    - Description: MinIO JavaScript client for S3-compatible storage - presigned URLs, multipart uploads, and bucket operations
    - Priority: ⭐ Critical

### Collection: CI/CD (ID: 62594698)

#### Playwright Testing (1 bookmark)

12. **Playwright CI/CD Integration** (ID: 1414193411)
    - URL: https://playwright.dev/docs/ci
    - Tags: `official-docs`, `playwright`, `testing`, `ci-cd`, `e2e`, `phase-6`
    - Description: Running Playwright tests in CI/CD pipelines - CircleCI, GitHub Actions, and parallel testing
    - Priority: ⭐ Critical

---

## 📝 Documentation Updates

### plan.md Updates

#### 1. Documentation References Section (Lines 559-584)
Added comprehensive Railway, Better Auth, and MinIO documentation links:

**Storage & Sync:**
- Railway Volumes Reference
- Railway Simple S3 Template
- MinIO JavaScript SDK
- Background Sync API

**Railway Platform:**
- Railway PostgreSQL Guide
- Railway Environment Variables
- Railway Docker Deployment
- Railway CLI Guide
- Railway Cost Optimization

**Authentication:**
- Better Auth Installation
- Better Auth Database Adapters
- Better Auth Drizzle Adapter

**Context7 Availability:**
- ✅ Zustand (via Context7)
- ✅ Drizzle ORM (via Context7)
- ❌ Dexie.js (use official docs)
- ❌ Railway (use official docs)
- ❌ Better Auth (use official docs)
- ❌ MinIO (use official docs)

#### 2. ComfyUI & Backend Section (Lines 4669-4699)
Updated with all Railway, Better Auth, and MinIO bookmarks in organized table format.

**Sprint Usage:**
- **Phase 1 (Days 1-3):** Better Auth setup, Railway environment configuration
- **Phase 2 (Days 4-7):** ComfyUI gateway setup, Railway deployment, Redis job queue, Railway Garage (S3) storage
- **Phase 3 (Days 8-14):** pgvector setup for RAG, custom ComfyUI nodes, Railway CLI automation

#### 3. Monitoring & CI/CD Section (Lines 4721-4731)
Added Playwright CI/CD Integration bookmark.

**Sprint Usage:**
- **Phase 6 (Days 22-24):** Playwright E2E testing with CircleCI integration

---

## 🔧 Technical Specification Updates

### kijkomaxvp_tech_spec.md Enhancements

#### 1. Better Auth Implementation (Lines 2322-2493)
Added comprehensive Better Auth setup with production-ready code:

- **Installation and configuration** with Drizzle ORM adapter
- **Complete auth.ts configuration** with social providers (GitHub, Google)
- **Drizzle ORM schema** for users, sessions, and accounts tables
- **Next.js API route** integration
- **Client-side hooks** for authentication
- **Security configuration** (HttpOnly cookies, CSRF, rate limiting)
- **Cross-device sync** implementation with PostgreSQL

**Key Features:**
- JWT-based sessions with 7-day expiry
- Email verification required
- Social OAuth providers (GitHub, Google)
- Automatic session renewal
- Cookie caching for performance
- Cross-subdomain cookie support

#### 2. Railway Garage (MinIO) Implementation (Lines 687-972)
Added complete MinIO storage setup with production patterns:

- **Docker configuration** for Railway deployment
- **Environment variables** setup
- **MinIO client initialization** with bucket creation
- **Presigned URL API routes** (5 min upload, 1 hour download)
- **Multipart upload** implementation for large files (>100MB)
- **Client-side upload hook** with progress tracking
- **CDN fronting** with Cloudflare R2 mirroring
- **CORS configuration** and security policies

**Key Features:**
- Direct browser uploads via presigned URLs
- User-scoped object keys for security
- Automatic multipart chunking for files >5MB
- Health check endpoints
- Railway volume mounting for persistence
- Optional R2 mirroring for global CDN delivery

#### 3. Playwright E2E Testing (Lines 5806-6165)
Added comprehensive E2E testing implementation:

- **Playwright configuration** with browser matrix (Chromium, Firefox, WebKit, Mobile)
- **Test database setup** with ephemeral PostgreSQL instances
- **Authentication testing** with Better Auth integration
- **Video upload testing** with progress monitoring
- **AI workflow testing** with RAG-based discovery
- **CircleCI integration** with parallel execution (4 workers)
- **Performance testing** with 60fps validation
- **Artifact collection** (screenshots, videos, traces on failure)

**Key Features:**
- Parallel test execution with automatic splitting
- Reusable authentication state
- Test isolation with fresh browser contexts
- Retry logic (2 retries in CI)
- Multiple reporters (HTML, JSON, JUnit)
- Performance metrics collection
- Video recording on failure

---

## 🔍 Search Examples

### Find Railway Documentation
```
tag:railway
tag:railway tag:postgresql
tag:railway tag:storage
```

### Find Better Auth Documentation
```
tag:better-auth
tag:better-auth tag:drizzle
tag:authentication tag:phase-1
```

### Find Storage Documentation
```
tag:storage tag:s3
tag:minio
tag:railway tag:volumes
```

### Find Testing Documentation
```
tag:playwright
tag:testing tag:e2e
tag:ci-cd tag:phase-6
```

### Find Phase-Specific Documentation
```
tag:phase-1  # Better Auth, Railway environment setup
tag:phase-2  # Railway deployment, MinIO storage
tag:phase-3  # Railway CLI, cost optimization
tag:phase-6  # Playwright E2E testing
```

---

## ✅ Benefits

1. **Searchable:** Proper tags enable quick retrieval by technology, phase, or topic
2. **Organized:** Grouped into logical collections (Backend & Infrastructure, CI/CD)
3. **Prioritized:** All marked as important (⭐) for quick access
4. **Phased:** Tagged by implementation phase for sprint planning
5. **Context7 Marked:** Clear availability indicators in plan.md
6. **Integrated:** URLs referenced in plan.md for easy access during development
7. **Production-Ready:** Tech spec includes complete, tested code examples

---

## 📊 Collection Summary

- **Backend & Infrastructure (62594697):** 11 bookmarks (Railway, Better Auth, MinIO)
- **CI/CD (62594698):** 2 bookmarks (Railway CLI, Playwright)
- **Total New Bookmarks:** 12
- **Total Documentation URLs in plan.md:** 20+ (including existing)

All documentation is now properly indexed and ready for Phase 1-6 implementation! 🚀


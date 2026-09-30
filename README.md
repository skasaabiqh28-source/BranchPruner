# BranchPruner - Automated Git Hygiene Controller

**BranchPruner** is an automated Git hygiene controller that detects stale remote branches across GitHub and GitLab repositories, dispatches developer reminders via Slack, prunes them after a 7-day remediation grace period with zero-loss cryptographic snapshot recovery tags, and allows 1-click ref restoration.

---

## 1. Project Structure Tree

```
Hackathon/
├── backend/                                  # Node.js 20 + TypeScript strict Express API
│   ├── prisma/
│   │   ├── schema.prisma                     # Complete multi-tenant Prisma schema
│   │   └── seed.ts                           # Idempotent seed script with realistic demo data
│   ├── src/
│   │   ├── config/                           # Configuration layer
│   │   │   ├── constants.ts                  # Constants, timeouts, error codes
│   │   │   ├── database.ts                   # Prisma client singleton & query events
│   │   │   ├── env.ts                        # Zod-validated environment config
│   │   │   └── logger.ts                     # Pino logger with credential redaction
│   │   ├── controllers/                      # Thin controller layer (HTTP & status mapping)
│   │   │   ├── activity.controller.ts        # Recovery log & 1-click restore
│   │   │   ├── auth.controller.ts            # Argon2 login, OAuth, JWT & rotating refresh cookies
│   │   │   ├── branch.controller.ts          # Pending remediation, Slack notify, keep & safe prune
│   │   │   ├── integration.controller.ts     # VCS & Slack channel management
│   │   │   ├── metrics.controller.ts         # Clutter reduced formula & repository statistics
│   │   │   ├── repository.controller.ts      # Dropdown repo list
│   │   │   ├── rules.controller.ts           # Wildcard protected pattern guardrails
│   │   │   ├── settings.controller.ts        # Dry-Run mode & staleness window slider
│   │   │   └── webhook.controller.ts         # GitHub push event webhook (HMAC verified)
│   │   ├── docs/
│   │   │   └── openapi.json                  # OpenAPI 3.0 specification served at /docs
│   │   ├── jobs/                             # Background jobs (pg-boss orchestrator)
│   │   │   ├── auto-prune.job.ts             # Hourly auto-prune when dryRun=false & autoPrune=true
│   │   │   ├── boss.ts                       # pg-boss lifecycle & schedule registrations
│   │   │   ├── scan-repositories.job.ts      # Hourly remote branch sync & staleness flagging
│   │   │   ├── send-warnings.job.ts          # 15-min Slack alerts for branches under 48h
│   │   │   └── sync-integrations.job.ts      # Periodic lastSyncedAt refresh
│   │   ├── middlewares/                      # Express middleware layer
│   │   │   ├── auth.middleware.ts            # Cookie & Bearer JWT authentication
│   │   │   ├── error.middleware.ts           # Standardized JSON error envelope
│   │   │   ├── rate-limit.middleware.ts      # express-rate-limit protection
│   │   │   └── validate.middleware.ts        # Zod request schema validation
│   │   ├── providers/                        # External integration abstractions
│   │   │   ├── encryption.ts                 # AES-256-GCM token encryption at rest
│   │   │   ├── git/                          # Git provider abstraction
│   │   │   │   ├── git-provider.interface.ts # Interface (listRepos, createArchiveRef, deleteBranch, etc.)
│   │   │   │   ├── github.provider.ts        # Octokit implementation
│   │   │   │   ├── gitlab.provider.ts        # GitLab REST API implementation
│   │   │   │   ├── mock.provider.ts          # In-memory stateful mock provider
│   │   │   │   └── index.ts                  # Provider factory
│   │   │   └── slack/                        # Slack notifier abstraction
│   │   │       ├── mock-slack.notifier.ts    # In-memory alert collector for tests
│   │   │       ├── slack.notifier.ts         # Live Slack Web API implementation
│   │   │       ├── slack-notifier.interface.ts
│   │   │       └── index.ts                  # Notifier factory
│   │   ├── repositories/                     # Workspace-scoped Prisma data access layer
│   │   │   ├── audit-event.repository.ts
│   │   │   ├── branch.repository.ts
│   │   │   ├── integration.repository.ts
│   │   │   ├── protected-pattern.repository.ts
│   │   │   ├── refresh-token.repository.ts
│   │   │   ├── repository.repository.ts
│   │   │   ├── settings.repository.ts
│   │   │   ├── snapshot.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   └── workspace.repository.ts
│   │   ├── routes/                           # Express route definitions
│   │   │   ├── activity.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── branch.routes.ts
│   │   │   ├── index.ts                      # Root API router (/api)
│   │   │   ├── integration.routes.ts
│   │   │   ├── metrics.routes.ts
│   │   │   ├── repository.routes.ts
│   │   │   ├── rules.routes.ts
│   │   │   ├── settings.routes.ts
│   │   │   └── webhook.routes.ts
│   │   ├── services/                         # Core domain business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── branch.service.ts
│   │   │   ├── integration.service.ts
│   │   │   ├── metrics.service.ts
│   │   │   ├── rules.service.ts
│   │   │   ├── settings.service.ts
│   │   │   └── webhook.service.ts
│   │   ├── app.ts                            # Express application setup
│   │   └── server.ts                         # HTTP listener & graceful shutdown
│   ├── tests/                                # Automated Vitest test suite
│   │   ├── auth.test.ts
│   │   ├── branches.test.ts
│   │   ├── prune-restore.test.ts
│   │   ├── rules.test.ts
│   │   └── setup.ts
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── branchpruner---automated-git-hygiene-controller-frontend/  # React frontend
│   ├── src/
│   │   ├── api/                              # Live API client layer
│   │   │   ├── client.ts                     # Fetch wrapper with cookie credentials & token rotation
│   │   │   └── index.ts                      # Strongly-typed endpoint bindings
│   │   ├── components/
│   │   │   ├── Dashboard.tsx                 # Master state controller connected to live API
│   │   │   ├── DashboardView.tsx             # Remediation table, metrics cards & recovery log
│   │   │   ├── IntegrationsView.tsx          # VCS & Slack webhook controls
│   │   │   ├── LoginScreen.tsx               # Form validation & OAuth login connected to backend
│   │   │   ├── Modal.tsx                     # Prune confirmation dialog
│   │   │   ├── RulesView.tsx                 # Guardrails & staleness slider
│   │   │   ├── SplashScreen.tsx              # Introductory splash screen
│   │   │   └── ToastContainer.tsx            # Live notification toasts with undo triggers
│   │   ├── App.tsx                           # Root app with session recovery
│   │   └── types.ts                          # Shared data structures
│   ├── package.json
│   └── vite.config.ts                        # Vite proxy configuration for /api -> localhost:3001
├── docker-compose.yml                        # Root Postgres docker container
└── README.md                                 # Full system documentation
```

---

## 2. Quickstart & Setup Guide

### Prerequisites
- Node.js 20 or higher
- Docker & Docker Compose (optional for local database container)

### Step 1: Start PostgreSQL
```bash
docker-compose up -d postgres
```

### Step 2: Initialize Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
```

*Demo User Credentials:*
- **Email:** `demo@branchpruner.dev`
- **Password:** `GitHygiene2025!`

### Step 3: Run Backend Server
```bash
npm run dev
```
The backend starts at `http://localhost:3001`.
- **API Base:** `http://localhost:3001/api`
- **Swagger UI OpenAPI Docs:** `http://localhost:3001/docs`
- **Health Check:** `http://localhost:3001/health`

### Step 4: Run Frontend Client
In a separate terminal:
```bash
cd branchpruner---automated-git-hygiene-controller-frontend
npm install --legacy-peer-deps
npm run dev
```
Open `http://localhost:3000` (or `http://localhost:5173`) in your browser.

---

## 3. Frontend Action to Backend Endpoint Mapping

| Frontend UI Action | UI Location | HTTP Method & Endpoint | Payload / Params | Behavior & Invariants |
|---|---|---|---|---|
| **Sign In** | Login Screen | `POST /api/auth/login` | `{ email, password }` | Validates credentials via Argon2; sets 15m `access_token` and 7d `refresh_token` httpOnly cookies. |
| **OAuth Login** | Login Screen | `GET /api/auth/github` or `GET /api/auth/google` | Query params | In mock mode, immediately sets session cookies and logs in demo user. |
| **Instant Demo Bypass** | Login Screen | `POST /api/auth/login` | `{ email: "demo@branchpruner.dev", password: "GitHygiene2025!" }` | One-click login into seeded demo environment. |
| **Restore Session** | App Mount | `GET /api/me` | None (cookie auth) | Returns active user profile with initials and role. |
| **Sign Out** | Sidebar Bottom | `POST /api/auth/logout` | None | Revokes refresh token in database and clears session cookies. |
| **Dry-Run Toggle** | Top Header Bar | `PATCH /api/settings` | `{ dryRun: boolean }` | Enforces dry-run server-side for all prune and restore operations. |
| **Filter by Repository** | Remediation Toolbar | `GET /api/pending-branches?repoId=<id>` | `repoId` | Filters flagged branches by repository ID or all. |
| **Search Branches** | Remediation Toolbar | `GET /api/pending-branches?search=<term>` | `search` | Case-insensitive matching on branch name or author. |
| **Sort Pending Branches** | Remediation Toolbar | `GET /api/pending-branches?sort=<key>&order=asc\|desc` | `sort=timeLeft\|staleness\|branchName` | Sorts branches by urgency (<48h), days stale, or alphabetical. |
| **Notify Slack** | Action Button on Branch Row | `POST /api/pending-branches/:id/notify-slack` | None | Posts alert to configured Slack channel; returns 409 if Slack is disconnected; updates `warnedAt`. |
| **Keep Branch** | Action Button on Branch Row | `POST /api/pending-branches/:id/keep` | None | Sets `status=kept`, sets `keptUntil = now + staleAfterDays`; returns `{ undoToken, undoExpiresAt (10s) }`. |
| **Undo Keep** | Toast Button | `POST /api/pending-branches/:id/undo-keep` | `{ undoToken }` | Restores branch to `flagged` status with original deadline; returns 410 if 10s token expired. |
| **Prune Branch** | Confirmation Modal | `POST /api/pending-branches/:id/prune` | `{ confirm: true }` + `Idempotency-Key` header | **Dry-Run:** Returns simulation without changes. **Live:** Creates archive ref -> Deletes remote branch -> Writes Snapshot & AuditEvent (rolls back on failure). |
| **1-Click Restore** | Recovery Log Row | `POST /api/activity/:id/restore` | None | Recreates remote branch from archived commit SHA. Returns 409 if branch already exists on remote. |
| **Connect / Disconnect VCS** | VCS & Webhooks Tab | `POST /api/integrations/:provider/connect`<br>`DELETE /api/integrations/:provider` | Provider name (`github`, `gitlab`, `slack`) | Connects/disconnects integrations with AES-256-GCM encrypted tokens at rest. |
| **Change Slack Channel** | VCS & Webhooks Tab | `PATCH /api/integrations/slack` | `{ channel: string }` | Updates target alert channel. |
| **Send Test Slack Alert** | VCS & Webhooks Tab | `POST /api/integrations/slack/test` | None | Dispatches connectivity test message to configured channel. |
| **Add Protected Pattern** | Rules & Guardrails Tab | `POST /api/rules/protected-branches` | `{ pattern: string }` | Validates wildcard glob (`release/*`), rejects duplicates (422), retroactively protects matching flagged branches. |
| **Delete Protected Pattern** | Rules & Guardrails Tab | `DELETE /api/rules/protected-branches/:id` | None | Deletes pattern; rejects deletion of presets `main` and `master` (400). |
| **Adjust Staleness Slider** | Rules & Guardrails Tab | `PATCH /api/settings` | `{ staleAfterDays: number (14-180) }` | Updates inactivity threshold criteria for subsequent repository scans. |

---

## 4. Curl Examples for Every Endpoint

### 1. Authentication
```bash
# Login (sets access_token and refresh_token cookies)
curl -i -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@branchpruner.dev","password":"GitHygiene2025!"}'

# Get Authenticated User Profile
curl -s http://localhost:3001/api/me \
  --cookie "access_token=<JWT_TOKEN>"

# Refresh Access Token
curl -i -X POST http://localhost:3001/api/auth/refresh \
  --cookie "refresh_token=<REFRESH_TOKEN>"

# Logout
curl -i -X POST http://localhost:3001/api/auth/logout \
  --cookie "refresh_token=<REFRESH_TOKEN>"
```

### 2. Metrics & Dashboard
```bash
# Dashboard Statistics
curl -s http://localhost:3001/api/metrics \
  --cookie "access_token=<JWT_TOKEN>"

# Repositories for Filter Dropdown
curl -s http://localhost:3001/api/repositories \
  --cookie "access_token=<JWT_TOKEN>"
```

### 3. Pending Remediation Branches
```bash
# List Pending Branches (with pagination, sort, search)
curl -s "http://localhost:3001/api/pending-branches?sort=timeLeft&order=asc&page=1&limit=20" \
  --cookie "access_token=<JWT_TOKEN>"

# Dispatch Slack Warning for Branch
curl -i -X POST http://localhost:3001/api/pending-branches/<BRANCH_ID>/notify-slack \
  --cookie "access_token=<JWT_TOKEN>"

# Keep Branch (Whitelist with 10s undo window)
curl -i -X POST http://localhost:3001/api/pending-branches/<BRANCH_ID>/keep \
  --cookie "access_token=<JWT_TOKEN>"

# Undo Keep (Within 10 seconds)
curl -i -X POST http://localhost:3001/api/pending-branches/<BRANCH_ID>/undo-keep \
  -H "Content-Type: application/json" \
  -d '{"undoToken":"<UNDO_TOKEN>"}' \
  --cookie "access_token=<JWT_TOKEN>"

# Prune Remote Branch (Supports Idempotency-Key header)
curl -i -X POST http://localhost:3001/api/pending-branches/<BRANCH_ID>/prune \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: req-12345" \
  -d '{"confirm":true}' \
  --cookie "access_token=<JWT_TOKEN>"
```

### 4. Recovery Log & Ref Restoration
```bash
# List Recent Activity Snapshots
curl -s "http://localhost:3001/api/activity?page=1&limit=20" \
  --cookie "access_token=<JWT_TOKEN>"

# 1-Click Restore Branch from Snapshot
curl -i -X POST http://localhost:3001/api/activity/<SNAPSHOT_ID>/restore \
  --cookie "access_token=<JWT_TOKEN>"
```

### 5. Integrations & Webhooks
```bash
# List Integrations
curl -s http://localhost:3001/api/integrations \
  --cookie "access_token=<JWT_TOKEN>"

# Connect Integration
curl -i -X POST http://localhost:3001/api/integrations/github/connect \
  --cookie "access_token=<JWT_TOKEN>"

# Disconnect Integration
curl -i -X DELETE http://localhost:3001/api/integrations/github \
  --cookie "access_token=<JWT_TOKEN>"

# Update Slack Notification Channel
curl -i -X PATCH http://localhost:3001/api/integrations/slack \
  -H "Content-Type: application/json" \
  -d '{"channel":"#engineering-alerts"}' \
  --cookie "access_token=<JWT_TOKEN>"

# Public GitHub Push Webhook (HMAC verified)
curl -i -X POST http://localhost:3001/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: push" \
  -H "x-hub-signature-256: sha256=<HMAC_SIGNATURE>" \
  -d '{"ref":"refs/heads/feat/checkout-v2-redesign","after":"b9821a","repository":{"full_name":"org/core-api"}}'
```

### 6. Rules & Settings
```bash
# List Protected Wildcard Patterns
curl -s http://localhost:3001/api/rules/protected-branches \
  --cookie "access_token=<JWT_TOKEN>"

# Add Protected Pattern
curl -i -X POST http://localhost:3001/api/rules/protected-branches \
  -H "Content-Type: application/json" \
  -d '{"pattern":"hotfix/*"}' \
  --cookie "access_token=<JWT_TOKEN>"

# Delete Protected Pattern
curl -i -X DELETE http://localhost:3001/api/rules/protected-branches/<PATTERN_ID> \
  --cookie "access_token=<JWT_TOKEN>"

# Get Settings
curl -s http://localhost:3001/api/settings \
  --cookie "access_token=<JWT_TOKEN>"

# Update Settings (toggle dryRun, change staleness threshold 14-180 days)
curl -i -X PATCH http://localhost:3001/api/settings \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false,"staleAfterDays":45,"autoPrune":true}' \
  --cookie "access_token=<JWT_TOKEN>"
```

---

## 5. Technology Rationale & Dataset Analysis

### Technology Choices & Rationale
1. **Node.js 20 + Strict TypeScript (`strict: true`)**
   - *Why*: Industry standard for enterprise backend APIs. Node.js non-blocking I/O handles high-throughput webhook bursts and concurrent API calls efficiently. Strict compiler flags (`noImplicitAny`, `strictNullChecks`) prevent runtime type errors.
2. **Express + Zod Validation**
   - *Why*: Lightweight, battle-tested HTTP engine. Zod provides type-safe schema validation at boundaries, rejecting invalid payloads before controller execution with structured error details.
3. **Prisma ORM + PostgreSQL**
   - *Why*: Multi-tenant schema design with relational integrity (cascading deletes, unique composite constraints on `[workspaceId, fullName]` and `[repositoryId, name]`). Prisma transactions (`$transaction`) guarantee atomicity for the Prune Flow (creating snapshot and marking branch pruned simultaneously).
4. **pg-boss (Scheduled & Background Jobs)**
   - *Why*: Provides reliable queue orchestration directly on Postgres using `SKIP LOCKED` table locking. Avoids managing a separate Redis cluster while providing cron scheduling, automatic retries, and failure backoffs.
5. **Argon2 + JWT & Rotating Refresh Tokens in httpOnly Cookies**
   - *Why*: Argon2 is the winner of the Password Hashing Competition (PHC), far superior to bcrypt in resisting GPU-based attacks. Dual-token authentication with 15-minute access tokens and rotating refresh tokens in `httpOnly`, `SameSite=Lax` cookies prevents XSS token theft and defends against CSRF.
6. **Git Provider Abstraction (`GitHubProvider`, `GitLabProvider`, `MockProvider`)**
   - *Why*: Decouples controller and business logic from specific VCS vendors. `MockProvider` enables seamless end-to-end local development and zero-configuration CI/CD testing without real access tokens.
7. **AES-256-GCM Token Encryption at Rest**
   - *Why*: Authenticated encryption with associated data (AEAD) ensures VCS tokens stored in the database cannot be decrypted or tampered with even if database dumps are compromised.

### Datasets Used in Prototype
- **Tracked Repositories:** 5 microservice and infrastructure repositories (`org/core-api`, `org/web-client`, `org/infra-terraform`, `org/auth-service`, `org/billing-pipeline`).
- **Pending Remediation Branches:** 10+ realistic branches across distinct engineering categories (`feature`, `spike`, `chore`, `fix`, `experiment`, `temp`) with varied staleness (34 to 148 days) and deadlines (including critical branches under 14h, 22h, and 38h).
- **Zero-Loss Recovery Snapshots:** 5 historical snapshots with immutable commit hashes and archive refs (`refs/branchpruner/archive/...`) illustrating 1-click restore functionality.
- **Safety Guardrails:** Pre-configured core branch presets (`main`, `master`) and wildcard glob patterns (`release/*`, `hotfix/*`, `prod-v*`).

### Recommended Future Improvements
1. **GitHub App Webhook Multi-Tenant Installation:** Upgrade from Personal Access Tokens to GitHub App installations with fine-grained repository permissions and automatic webhook delivery validation.
2. **Prometheus / OpenTelemetry Metrics Export:** Add `/metrics/prometheus` endpoint exposing branch cleanup velocity and API latency for Datadog or Grafana dashboards.
3. **Draft Pull Request Detection:** Extend the staleness evaluator to cross-reference branches with open or draft Pull Requests before flagging.

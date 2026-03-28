# AGENTS.md -- PetSwipe Flywheel Operating Manual

Single source of truth for every AI coding agent working on the PetSwipe project.
Read this file at session start and after every context compaction.

---

## Rule 0: Override Prerogative

The human operator's instructions override everything in this file. If a human tells
you to do something that contradicts a rule below, follow the human.

---

## Rule 1: Core Safety Rules

1. **Never delete files** without explicit human permission.
2. **No destructive git commands**: `git reset --hard`, `git clean -fd`, `rm -rf`, `git push --force` are forbidden unless the human explicitly requests them.
3. **All work happens on the main branch** unless the human instructs otherwise.
4. **No script-based code changes**: always edit files manually through your editor tools. Do not generate and execute sed/awk/perl one-liners to modify source code.
5. **No file proliferation**: do not create `mainV2.ts`, `app-backup.ts`, or similar variants. Edit in place.
6. **Compiler and lint checks after every change**: run the appropriate validation command (see Validation Guidance below) before declaring work complete.
7. **Multi-agent awareness**: never stash, revert, or overwrite changes made by other agents. Treat other agents' uncommitted and committed work as your own. If you encounter a merge conflict, stop and notify the human.

---

## Project Overview

PetSwipe is a full-stack pet adoption platform. Users browse adoptable pets via a swipe
interface, match with pets they like, and connect with shelters. The codebase spans a
Next.js frontend, an Express API backend, Kubernetes manifests, Terraform IaC, and
operational scripts.

### Repo Map

| Path | Purpose |
|------|---------|
| `frontend/pages/` | Next.js Pages Router -- main UI routes and API routes |
| `frontend/components/` | Shared layout, Navbar, chart wrapper, shadcn UI primitives |
| `frontend/components/ui/` | 46 shadcn/Radix UI primitives (button, card, dialog, form, table, etc.) |
| `backend/src/routes/` | Express route definitions: auth, chat, matches, pets, swipes, users |
| `backend/src/controllers/` | Request handlers: authController, chatController, matchController, petController, swipeController, userController |
| `backend/src/services/` | Business logic: geocodeService, imageService, userService |
| `backend/src/entities/` | TypeORM entities: Pet, User (AppUser), Match, Swipe |
| `backend/src/middlewares/` | auth.ts (JWT verification), errorHandler.ts |
| `backend/src/app.ts` | Express app setup, route mounting, Swagger, health endpoints |
| `k8s/base/` | Default Kubernetes stack |
| `k8s/overlays/production/` | Production Kustomize overlay |
| `terraform/` | AWS-oriented IaC + optional Vault/Consul/Nomad modules |
| `scripts/` | Deployment and operations scripts |
| `mcp_server/` | MCP (Model Context Protocol) server for AI-assisted features |
| `docs/` | DEPLOYMENT.md, DEVOPS_GUIDE.md, and other operator docs |

---

## Stack and Architecture

### Frontend

- **Framework**: Next.js (Pages Router, not App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui primitives (Radix UI based), 46 components in `frontend/components/ui/`
- **Animation**: Framer Motion
- **Charts**: Recharts (wrapped in `frontend/components/`)
- **Data fetching**: SWR, Axios
- **Forms**: React Hook Form + Zod validation
- **Theming**: next-themes (light/dark)
- **Icons**: Lucide React

### Backend

- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL (Supabase-hosted or AWS RDS)
- **Auth**: JWT bearer tokens -- issued at login, verified by `backend/src/middlewares/auth.ts`
- **API docs**: Swagger UI at `/docs`, OpenAPI JSON at `/api-docs.json`
- **Health**: `/health` (liveness), `/ready` (readiness)
- **File handling**: Multer (upload), Sharp (image processing)
- **Logging**: Morgan

### Auth Flow

1. Client sends credentials to `POST /api/auth/login`.
2. Backend validates and returns a JWT.
3. Client stores the token and sends it as `Authorization: Bearer <token>` on subsequent requests.
4. `authMiddleware` in `backend/src/middlewares/auth.ts` extracts and verifies the token.
5. Verified user ID is attached to `req.user` for downstream handlers.

### API Resource Routes

| Prefix | Router file | Controller |
|--------|-------------|------------|
| `/api/auth` | `routes/auth.ts` | `authController.ts` |
| `/api/pets` | `routes/pets.ts` | `petController.ts` |
| `/api/swipes` | `routes/swipes.ts` | `swipeController.ts` |
| `/api/matches` | `routes/matches.ts` | `matchController.ts` |
| `/api/users` | `routes/users.ts` | `userController.ts` |
| `/api/chat` | `routes/chat.ts` | `chatController.ts` |

### Infrastructure

- **Containers**: Docker (multi-stage builds)
- **Orchestration**: Kubernetes (base + production overlay via Kustomize)
- **IaC**: Terraform targeting AWS (ECS/Fargate, RDS, S3, ALB, CloudFront, WAF)
- **Secrets**: HashiCorp Vault (optional module)
- **Service mesh**: Consul (optional module)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + AWS CloudWatch

---

## Commands That Matter

### Frontend

| Command | Purpose |
|---------|---------|
| `cd frontend && npm run dev` | Start dev server |
| `cd frontend && npm run build` | Production build |
| `cd frontend && npm run start` | Serve production build |
| `cd frontend && npx eslint <files>` | Lint specific touched files (preferred) |

Do NOT rely on `cd frontend && npm run lint` -- it invokes `next lint` which is less
reliable for incremental validation in this repo.

### Backend

| Command | Purpose |
|---------|---------|
| `cd backend && npm run dev` | Start dev server with hot reload |
| `cd backend && npm run build` | Compile TypeScript |
| `cd backend && npm test` | Run test suite |
| `cd backend && npm run migrate` | Run TypeORM migrations |

### Infrastructure and Deployment

| Command | Purpose |
|---------|---------|
| `make preflight` | Full preflight check |
| `make tf-preflight ENV=production` | Terraform validation |
| `make k8s-preflight` | Kubernetes manifest validation |
| `make k8s-render` | Render base Kubernetes manifests |
| `make k8s-render-prod` | Render production overlay |
| `make release-bundle` | Build release artifact bundle |

---

## Validation Guidance

**Always validate after changes.** Choose the right scope:

- **Frontend-only changes**: `cd frontend && npx eslint <touched files>`. For larger changes, also run `npm run build` to catch type errors.
- **Backend-only changes**: `cd backend && npm run build` to verify compilation. Run `npm test` if test files exist for the touched area.
- **Infra-only changes**: `make preflight`, `make tf-preflight`, `make k8s-preflight`, or `kubectl kustomize` render checks. Do not make deployment claims you cannot verify.
- **Docs-only changes**: confirm that all commands, file paths, and architecture statements still match the actual repo contents.
- **Cross-cutting changes**: validate both frontend and backend. Check that API contracts match between layers.

---

## Flywheel Coordination

The Flywheel methodology uses three core tools for multi-agent coordination.

### Beads (br) -- Task Tracking

Beads live in `.beads/` as JSONL files with a dependency graph. Each bead is a discrete
unit of work with an ID, status, description, and optional dependencies.

| Command | Purpose |
|---------|---------|
| `br list` | List all beads and their statuses |
| `br ready` | Show beads whose dependencies are satisfied |
| `br show <id>` | Display full bead details |
| `br update <id> --status in_progress` | Claim a bead -- mark it as in progress |
| `br close <id>` | Mark a bead as complete |

**Rules**: ALWAYS mark a bead as `in_progress` before starting work on it. ALWAYS
close the bead when the work is done and committed.

### Bead Viewer (bv) -- Priority Analysis

Bead Viewer provides machine-readable triage and planning. ONLY use `--robot-*` flags.

| Command | Purpose |
|---------|---------|
| `bv --robot-triage` | Full priority analysis of all open beads |
| `bv --robot-next` | Single highest-priority bead to work on next |
| `bv --robot-plan` | Parallel execution tracks for multiple agents |

### Agent Mail (am) -- Inter-Agent Communication

Agent Mail is the coordination bus between concurrent agents.

| Action | How |
|--------|-----|
| Register | Register with Agent Mail at session start |
| Claim bead | Send a claim message using the bead ID as thread anchor: `[br-XXX]` |
| Reserve files | Announce which files you intend to edit before editing them |
| Progress updates | Send status messages so other agents can see your progress |
| Release reservations | After committing, release file reservations |
| Check inbox | Read and respond to messages from other agents |

File reservations are **advisory, not rigid locks**. Respect them. If another agent has
reserved a file, coordinate before editing it.

---

## Bead Workflow

Execute beads in this order:

1. **Triage**: Run `bv --robot-triage` or `bv --robot-next` to identify the highest-leverage bead.
2. **Claim**: Send a claim via Agent Mail with `[br-XXX]` as the thread anchor. Run `br update <id> --status in_progress`.
3. **Reserve**: Announce the files you plan to edit via Agent Mail.
4. **Implement**: Make the code changes. Follow the code quality standards below.
5. **Validate**: Run the appropriate compiler/lint/test commands.
6. **Self-review**: Do a fresh-eyes review of every file you touched (see Self-Review Protocol).
7. **Close**: Run `br close <id>`. Release file reservations via Agent Mail.
8. **Commit**: Commit with a clear message referencing the bead ID.
9. **Next**: Return to step 1.

---

## Agent Mail Coordination

- **Register immediately** at session start. Other agents need to know you exist.
- **Use bead IDs as thread identifiers**: all messages about bead 42 go in thread `[br-042]`.
- **Reserve files before editing**: send a reservation message listing the files you will touch. This prevents two agents from editing the same file simultaneously.
- **Release reservations after commit**: once your changes are committed, release the files.
- **Announce claims**: when you claim a bead, announce it so other agents do not duplicate work.
- **Check your inbox**: read and respond to messages from other agents. They may have questions, conflicts, or handoff information.
- **Advisory locks**: file reservations are cooperative, not enforced. If you must edit a reserved file, coordinate with the reserving agent first.

---

## Post-Compaction Protocol

After any context compaction: **IMMEDIATELY reread this AGENTS.md file.**

Compaction wipes operational knowledge -- the rules, the repo map, the workflow, the
caveats. The re-read restores all of it. Do not proceed with any work until you have
re-read this file.

---

## Self-Review Protocol

After completing each bead, perform a fresh-eyes review:

1. Re-read every file you created or modified.
2. Check for bugs, off-by-one errors, and unhandled edge cases.
3. Verify error handling is present and meaningful.
4. Look for similar patterns elsewhere in the codebase that may need the same fix.
5. Run compiler/lint checks one final time.
6. Confirm that no `console.log` statements were left in production code paths.
7. If you touched API routes, verify the Swagger annotations still match the implementation.

---

## Code Quality Standards

- **TypeScript strict**: use strict typing where possible. Avoid `any` unless interfacing with an untyped library.
- **Async/await**: prefer `async/await` over raw `.then()` promise chains.
- **Use existing UI primitives**: the 46 shadcn components in `frontend/components/ui/` cover most UI needs. Do not create duplicate components.
- **Match existing style**: follow the patterns already established in the file you are editing. Do not impose a new style.
- **Mobile responsiveness**: PetSwipe is mobile-first. Test layouts at small viewports.
- **Theme support**: test with both light and dark themes via next-themes.
- **No console.log in production**: the backend has debug `console.log` calls that should be removed, not added to. Use proper logging (Morgan) or remove debug output.
- **Import organization**: group imports by external packages, then internal modules, then relative paths.
- **Error boundaries**: frontend pages should handle loading and error states gracefully.

---

## Known Caveats

- **Root `npm run lint`** is a Prettier write command, not an ESLint check. Do not use it as a linter.
- **Pre-existing lint debt**: broad lint or typecheck runs may fail on files you did not touch. Report pre-existing failures clearly and separately from your own changes.
- **Auth middleware debug log**: `backend/src/middlewares/auth.ts` contains a `console.log(token)` statement that leaks tokens to stdout. Remove it if you are working in that file.
- **No backend test files**: the backend test infrastructure exists but no test files have been written yet. If you add tests, follow the Mocha/Chai pattern indicated by the project dependencies.
- **Frontend Leaflet warnings**: `no-explicit-any` ESLint warnings from Leaflet map usage are pre-existing. Do not fix them unless specifically asked.
- **Production deployment placeholders**: the repo contains deployment artifacts, but real operator values are required for `.env.production`, `terraform/backend.hcl`, `terraform/environments/*.tfvars`, and Kubernetes hostnames/images/secrets before any real deployment.
- **Entity naming**: the User entity file is `User.ts` but the TypeORM entity class is `AppUser`. Use `AppUser` in code references.

---

## Documentation Sync

When your changes affect any of the following, update the relevant docs in the same task:

- User-visible pages, routes, or workflows
- API endpoints or auth behavior
- Deployment flows, preflight steps, or release scripts
- Kubernetes or Terraform configuration
- New operational requirements or validation commands

Docs to consider updating:

| File | Covers |
|------|--------|
| `README.md` | Project overview, quickstart, feature list |
| `ARCHITECTURE.md` | System design, component interactions, data flow |
| `docs/DEPLOYMENT.md` | Deployment procedures and environment setup |
| `docs/DEVOPS_GUIDE.md` | DevOps practices, CI/CD, monitoring |
| `k8s/README.md` | Kubernetes deployment instructions |
| `terraform/README.md` | Terraform module documentation |

---

## Session Management

Agent sessions are logged in `.agent-sessions/`. At the end of every session:

1. **File remaining work**: create new beads for any incomplete or discovered work.
2. **Run quality gates**: execute the validation commands for every area you touched.
3. **Update bead statuses**: close completed beads, update in-progress beads with notes.
4. **Commit and push**: commit all changes with clear messages referencing bead IDs.
5. **Verify clean state**: run `git status` and confirm no uncommitted changes remain.

## Repository Expectations

PetSwipe is a full-stack pet adoption application with:

- a Next.js Pages Router frontend in `frontend/`
- an Express + TypeORM backend in `backend/`
- Kubernetes manifests in `k8s/`
- Terraform infrastructure in `terraform/`
- deployment and ops scripts in `scripts/`

Treat this file as the root Codex instruction layer for the entire repository.

## Working Agreements

- Inspect the affected area before editing. Do not rely on stale architectural assumptions.
- Keep changes scoped. Do not clean up unrelated files unless the user asked.
- When product behavior, API behavior, deployment behavior, or operational commands change, update the relevant docs in the same task unless the user says otherwise.
- Prefer targeted validation for the touched area instead of broad repo-wide commands when known repo debt would create noise.
- Distinguish new breakage from pre-existing repo issues in your final report.

## Repo Map

- `frontend/pages/` contains the main UI routes and frontend API routes.
- `frontend/components/` contains shared layout, navbar, chart wrapper, and UI primitives.
- `backend/src/routes/`, `controllers/`, `services/`, and `entities/` are the main backend layers.
- `backend/src/app.ts` defines routes, health endpoints, and Swagger/OpenAPI exposure.
- `k8s/base/` contains the main Kubernetes resources; `k8s/overlays/production/` contains the production overlay.
- `terraform/` contains the AWS-oriented IaC stack and optional Vault/Consul/Nomad modules.

## Commands That Matter

### Frontend

- Dev: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Start: `cd frontend && npm run start`
- Preferred linting: `cd frontend && npx eslint <touched files>`

Do not assume `cd frontend && npm run lint` is the best incremental validator for this repo.

### Backend

- Dev: `cd backend && npm run dev`
- Build: `cd backend && npm run build`
- Test: `cd backend && npm test`
- Migrations: `cd backend && npm run migrate`

### Infra / Deployment

- `make preflight`
- `make tf-preflight ENV=production`
- `make k8s-preflight`
- `make k8s-render`
- `make k8s-render-prod`
- `make release-bundle`

## Validation Guidance

- Frontend changes: prefer targeted `npx eslint` on touched files.
- Backend changes: use `npm run build` and targeted tests when practical.
- Infra changes: use render and preflight commands instead of hand-wavy deployment claims.
- Docs changes: confirm the commands, file paths, and architecture statements still match the repo.

## Known Caveats

- Root `npm run lint` is a Prettier write command, not an ESLint check.
- Broad lint or typecheck failures may come from existing repo debt. Be explicit about that.
- Production deployment artifacts exist, but real operator values are still required for `.env.production`, `terraform/backend.hcl`, `terraform/environments/*.tfvars`, and Kubernetes placeholders.

## Documentation Sync

Consider updating these when behavior changes:

- `README.md`
- `ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/DEVOPS_GUIDE.md`
- `k8s/README.md`
- `terraform/README.md`

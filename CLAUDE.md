# PetSwipe Claude Code Memory

## Purpose

PetSwipe is a full-stack pet adoption application with:

- a Next.js frontend in `frontend/`
- an Express + TypeORM backend in `backend/`
- Kubernetes manifests in `k8s/`
- Terraform infrastructure in `terraform/`
- deployment and operations scripts in `scripts/`
- major operator docs in `README.md`, `ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/DEVOPS_GUIDE.md`, `k8s/README.md`, and `terraform/README.md`

Use this file for always-on project context. Use project skills in `.claude/skills/` for larger workflows.

## Working Style

- Inspect the affected area before editing. Do not assume the repo still matches older architectural descriptions.
- Keep changes scoped. Do not "clean up" unrelated files unless the user asked.
- When product behavior, deployment behavior, or user-visible surfaces change, update the relevant docs in the same task.
- Prefer targeted validation over broad repo-wide commands when the repo has known pre-existing issues.
- Be explicit when a failure is caused by existing repo debt rather than the current change.

## Repo Map

- `frontend/pages/` is the main UI surface. This repo uses the Next.js Pages Router, not the App Router.
- `frontend/components/` contains shared UI including `Navbar`, `Layout`, the shared chart wrapper, and shadcn-style UI primitives.
- `backend/src/routes/`, `controllers/`, `entities/`, and `services/` are the main backend touchpoints.
- `backend/src/app.ts` defines API routes, health endpoints, and Swagger/OpenAPI exposure.
- `k8s/base/` contains the default Kubernetes stack and `k8s/overlays/production/` contains the production overlay.
- `terraform/` contains the AWS-oriented IaC stack plus optional Vault/Consul/Nomad modules.

## Commands That Matter

### Frontend

- Dev: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Start: `cd frontend && npm run start`
- Prefer targeted linting: `cd frontend && npx eslint <touched files>`

`frontend/package.json` still defines `npm run lint` as `next lint`, but targeted `npx eslint` has been more reliable for incremental validation in this repo.

### Backend

- Dev: `cd backend && npm run dev`
- Build: `cd backend && npm run build`
- Test: `cd backend && npm test`
- Migrations: `cd backend && npm run migrate`

### Infra / Deployment

- Preflight: `make preflight`
- Terraform preflight: `make tf-preflight ENV=production`
- Kubernetes preflight: `make k8s-preflight`
- Render Kubernetes base: `make k8s-render`
- Render Kubernetes production overlay: `make k8s-render-prod`
- Build release artifact bundle: `make release-bundle`

## Validation Guidance

- Frontend-only changes: validate with targeted `npx eslint` on touched files.
- Backend-only changes: use `npm run build` and targeted tests when practical.
- Infra-only changes: prefer `make preflight`, `make tf-preflight`, `make k8s-preflight`, `kubectl kustomize ...`, and render checks instead of making unsupported deployment claims.
- Docs-only changes: verify that commands, paths, and architecture statements match the current repo.

## Known Repo Caveats

- Root `npm run lint` is a Prettier write command, not an ESLint check.
- The repo has known pre-existing validation debt in some areas. If a broad lint or typecheck fails outside the touched files, report that clearly instead of masking it.
- Production deployment artifacts exist in the repo, but the project is not truly deployable until real operator values are supplied for files like `.env.production`, `terraform/backend.hcl`, `terraform/environments/*.tfvars`, and Kubernetes hostnames/images/secrets.

## Documentation Sync Rules

If you change any of the following, update docs in the same task unless the user says otherwise:

- user-visible pages, routes, or workflows
- API endpoints or auth behavior
- deployment flows, preflight steps, release scripts, or Kubernetes/Terraform posture
- new operational requirements or validation commands

At minimum, consider whether `README.md`, `ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/DEVOPS_GUIDE.md`, `k8s/README.md`, or `terraform/README.md` need updates.

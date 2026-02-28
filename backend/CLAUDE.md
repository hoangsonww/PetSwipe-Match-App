# Backend Memory

## Scope

These instructions apply to work inside `backend/`.

## Backend Architecture

- Express app setup is in `backend/src/app.ts`.
- Entry/bootstrap behavior is in `backend/src/index.ts` and `backend/src/bootstrap.ts`.
- Route modules live in `backend/src/routes/`.
- Controllers live in `backend/src/controllers/`.
- TypeORM entities live in `backend/src/entities/`.
- Services live in `backend/src/services/`.

## API / Runtime Notes

- Health endpoints matter for deployment:
  - `/health`
  - `/ready`
- Swagger/OpenAPI is exposed from `backend/src/app.ts` at:
  - `/api-docs.json`
  - `/docs`
- Keep route/controller/entity changes coherent. If an endpoint changes, verify related docs and schema expectations.

## How To Work Here

- Prefer minimal, coherent changes across route, controller, service, entity, and validation layers.
- Do not claim a backend change is fully production-ready without considering health endpoints, migrations, environment variables, and deployment docs.
- If a change affects API behavior, update the relevant docs in `README.md` and supporting deployment/architecture docs when necessary.

## Validation

- `cd backend && npm run build`
- `cd backend && npm test`
- For DB-affecting work, also consider migration status and `npm run migrate`

## Known Caveat

- Broad backend validation may still surface pre-existing repo issues. Distinguish current-task regressions from existing debt.

## Backend Expectations

These instructions apply inside `backend/`.

## Architecture

- App setup lives in `backend/src/app.ts`.
- Startup/bootstrap behavior lives in `backend/src/index.ts` and `backend/src/bootstrap.ts`.
- Route modules live in `backend/src/routes/`.
- Controllers live in `backend/src/controllers/`.
- TypeORM entities live in `backend/src/entities/`.
- Services live in `backend/src/services/`.

## Runtime Notes

- Health endpoints matter for deployment:
  - `/health`
  - `/ready`
- Swagger/OpenAPI is exposed at:
  - `/api-docs.json`
  - `/docs`

## Working Agreements

- Keep route, controller, service, entity, and docs changes coherent.
- If API behavior changes, update the relevant docs instead of leaving drift behind.
- Be careful with startup, health, and migration implications when changing backend behavior.

## Validation

- `cd backend && npm run build`
- `cd backend && npm test`
- For migration-sensitive work: `cd backend && npm run migrate`

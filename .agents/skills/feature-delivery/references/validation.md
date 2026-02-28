# Validation Matrix

## Frontend

- Preferred: `cd frontend && npx eslint <touched files>`
- Build when needed: `cd frontend && npm run build`

## Backend

- `cd backend && npm run build`
- `cd backend && npm test`
- Migration-sensitive work: consider `cd backend && npm run migrate`

## Infra

- `make preflight`
- `make tf-preflight ENV=production`
- `make k8s-preflight`
- `make k8s-render`
- `make k8s-render-prod`

## Docs

- Re-read the touched docs and confirm commands, paths, and claims match the current repo

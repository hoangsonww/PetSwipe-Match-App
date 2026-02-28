# Validation Playbook

## Frontend

- Fastest reliable option: `cd frontend && npx eslint <touched files>`
- Build only when route wiring, config, or bundle-sensitive behavior changes: `cd frontend && npm run build`

## Backend

- Build: `cd backend && npm run build`
- Tests: `cd backend && npm test`
- Migration-sensitive work: `cd backend && npm run migrate`

## Infra

- `make preflight`
- `make tf-preflight ENV=production`
- `make k8s-preflight`
- `make k8s-render`
- `make k8s-render-prod`

## Docs

- Check exact commands, file paths, deployment claims, and architectural descriptions against the current repo

## Reporting

- Say what passed
- Say what you could not run
- Say which failures are pre-existing if applicable

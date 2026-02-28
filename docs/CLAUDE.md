# Docs Memory

## Scope

These instructions apply to work inside `docs/`.

## Documentation Standard

- Keep docs aligned with the current repo, not with aspirational architecture.
- Prefer exact commands, exact paths, and exact file names.
- When the repo has placeholders or external prerequisites, state that clearly instead of implying full deployability.

## Key Documents

- `README.md` is the public-facing master overview.
- `ARCHITECTURE.md` should describe the actual current system shape.
- `docs/DEPLOYMENT.md` and `docs/DEVOPS_GUIDE.md` should match real scripts, Make targets, and infra behavior.
- `k8s/README.md` and `terraform/README.md` should remain operationally correct.

## How To Work Here

- If you change code, ask whether the docs that describe that area now need updating.
- If you change deployment scripts or infra posture, update both the specialized docs and any top-level summary docs that mention them.
- Avoid inflated "enterprise-grade" language unless the repo actually supports the claim end-to-end.

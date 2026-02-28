# Codex Setup For PetSwipe

This repository now includes a project-specific Codex setup built around three layers:

- instruction layering via `AGENTS.md`
- reusable skills via `.agents/skills/`
- multi-agent roles via `.codex/config.toml`

## Files

### Instruction layering

- `AGENTS.md`
- `frontend/AGENTS.md`
- `backend/AGENTS.md`
- `k8s/AGENTS.md`
- `terraform/AGENTS.md`
- `docs/AGENTS.md`

These give Codex broad repo guidance at the root and more specific rules when work moves into a major subsystem.

### Skills

Skills live under `.agents/skills/`:

- `feature-delivery`
- `frontend-polish`
- `backend-api-change`
- `infra-release-readiness`
- `docs-sync`
- `review`

### Multi-agent roles

Project roles are declared in `.codex/config.toml` and use config layers in `.codex/agents/`.

## Why This Setup

- `AGENTS.md` keeps always-on guidance concise and layered by directory.
- Skills handle reusable workflows without bloating every session.
- Multi-agent roles support deeper review, exploration, and specialized work when Codex multi-agent is enabled.

## How To Use

- Start Codex from the repository root for full project context.
- Start Codex from a subsystem directory when you want the deeper `AGENTS.md` for that area to take precedence.
- Invoke a skill explicitly with `$skill-name` when you want a specific workflow.
- Use the multi-agent roles when a task benefits from isolated exploration, review, or documentation verification.

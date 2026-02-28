# Claude Code Setup For PetSwipe

This repository now includes a project-specific Claude Code extension layer designed for the way PetSwipe is actually built and deployed.

## What Is Included

### Always-on memory

- `CLAUDE.md`
- `frontend/CLAUDE.md`
- `backend/CLAUDE.md`
- `k8s/CLAUDE.md`
- `terraform/CLAUDE.md`
- `docs/CLAUDE.md`

These keep the default session context small but accurate. The root file carries repo-wide guidance. The path-specific files load when work moves into those areas.

### Skills

Project skills live in `.claude/skills/`:

- `/feature-delivery`
- `/frontend-polish`
- `/backend-api-change`
- `/infra-release-readiness`
- `/docs-sync`
- `/review`

These are meant for reusable workflows, not always-on memory.

### Subagents

Project subagents live in `.claude/agents/`:

- `frontend-ux-specialist`
- `backend-api-specialist`
- `infra-deployment-auditor`
- `docs-curator`
- `petswipe-reviewer`

Use them when a task benefits from isolation or parallel exploration.

## Why There Are No Project Hooks Or MCP Servers Yet

This setup intentionally stays portable and low-noise.

- Hooks were not added because this repo already has enough validation complexity that noisy automatic hook output would get in the way.
- MCP servers were not added because they would require external service dependencies and credentials that are not intrinsic to the repo.
- A plugin package was not added because the immediate goal is to make Claude Code work well inside this repository first.

## Recommended Usage

- Use the default Claude session for ordinary work.
- Invoke a skill when the task matches a reusable workflow.
- Reach for subagents when the task involves deep file reading, large reviews, or isolated frontend/backend/infra analysis.
- Keep `CLAUDE.md` files concise and move repeatable procedures into skills instead of bloating always-on memory.

# Codex Setup For PetSwipe

This repository now includes a project-specific Codex setup built around four layers:

- instruction layering via `AGENTS.md`
- reusable skills via `.agents/skills/`
- multi-agent roles via `.codex/config.toml`
- execution rules via `.codex/rules/default.rules`

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
- `testing-and-validation`
- `map-geocoding-debug`
- `navigation-and-page-structure`
- `planner-and-insights-pages`
- `deployment-claims-audit`

Additional subtree-local skills live closer to the code they support:

- `frontend/.agents/skills/`
- `backend/.agents/skills/`
- `k8s/.agents/skills/`
- `terraform/.agents/skills/`
- `docs/.agents/skills/`

### Multi-agent roles

Project roles are declared in `.codex/config.toml` and use config layers in `.codex/agents/`.

Current roles:

- `explorer`
- `reviewer`
- `frontend_ux`
- `backend_api`
- `infra_auditor`
- `docs_curator`
- `test_guard`
- `map_debugger`

### Rules

Project execution rules live in `.codex/rules/default.rules`.

They currently:

- forbid `grep` in favor of `rg`
- require prompts for `terraform apply` and `terraform destroy`
- require prompts for mutating `kubectl` commands
- require prompts for `rm -rf`

## Why This Setup

- `AGENTS.md` keeps always-on guidance concise and layered by directory.
- Skills handle reusable workflows without bloating every session.
- Multi-agent roles support deeper review, exploration, and specialized work when Codex multi-agent is enabled.

## How To Use

- Start Codex from the repository root for full project context.
- Start Codex from a subsystem directory when you want the deeper `AGENTS.md` for that area to take precedence.
- Invoke a skill explicitly with `$skill-name` when you want a specific workflow.
- Use the multi-agent roles when a task benefits from isolated exploration, review, or documentation verification.

## Verification

Useful checks after changing this setup:

- `codex --ask-for-approval never "Summarize the current instructions."`
- `codex --cd frontend --ask-for-approval never "Show which instruction files are active."`
- `codex --cd backend --ask-for-approval never "Show which instruction files are active."`
- `codex execpolicy check --pretty --rules .codex/rules/default.rules -- terraform apply -var-file=environments/production.tfvars`

Restart Codex after changing `.codex/config.toml`, rules files, or skill folders if the new behavior does not appear immediately.

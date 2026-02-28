---
name: review
description: Bug-focused PetSwipe review workflow emphasizing regressions, deployment risk, missing validation, and stale docs.
---

Use this skill when the user asks for a review or when a high-risk change needs structured scrutiny.

## Workflow

1. Review for correctness and regression risk first.
2. Check deployment, validation, and doc-sync impact second.
3. Prefer concrete findings over broad commentary.
4. If there are no findings, say so explicitly and mention residual uncertainty.

## Output Standard

- Findings first
- Highest severity first
- File references whenever possible
- Brief open questions or residual risks after findings

Use the `petswipe-reviewer` subagent when you want isolated review context.

@references/review-checklist.md

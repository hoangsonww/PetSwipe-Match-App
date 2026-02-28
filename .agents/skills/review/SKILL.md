---
name: review
description: Bug-focused PetSwipe review workflow emphasizing regressions, deployment risk, missing validation, stale docs, and user-visible breakage. Use when the user asks for a review or when a risky change needs structured scrutiny.
---

Use this skill for review work in PetSwipe.

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

Read `references/review-checklist.md` before finalizing.

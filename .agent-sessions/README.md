# Agent Sessions

This directory tracks agent work sessions for the PetSwipe project under the Flywheel methodology.

## Structure

```
.agent-sessions/
  sessions.jsonl        # Session log (one JSON object per line)
  README.md             # This file
```

## Session Format

Each line in `sessions.jsonl` is a JSON object:

```json
{
  "session_id": "s-001",
  "agent_name": "ScarletCave",
  "agent_type": "claude-code|codex|gemini",
  "started_at": "ISO timestamp",
  "ended_at": "ISO timestamp or null",
  "beads_claimed": ["br-010", "br-011"],
  "beads_completed": ["br-010"],
  "commits": ["abc1234"],
  "files_touched": ["backend/src/middlewares/auth.ts"],
  "notes": "Optional free-form notes about the session"
}
```

## Workflow

1. Agent registers at session start (creates a session entry with started_at)
2. Agent updates beads_claimed as it picks up work
3. Agent updates beads_completed as it closes beads
4. Agent logs commits as it pushes
5. At session end, agent sets ended_at and writes final notes

## Coordination

- Sessions are append-only. Never modify existing session entries.
- Use Agent Mail for real-time coordination, sessions for durable history.
- After a session, review `sessions.jsonl` to see what was accomplished.

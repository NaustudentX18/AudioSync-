# AudioSync — Agent Swarm Rules

## Core Principles
- One Orchestrator stays in the main thread.
- All agents work on **one task at a time**.
- Every agent **must** update `TODO.md` when starting and finishing a task.
- No agent works on more than one file/task simultaneously.
- Visual work (banner, screenshots, demo) can run in parallel with code work.

## Workflow
1. Check `TODO.md` before claiming a task.
2. Claim the task by adding your name + "IN PROGRESS".
3. Complete the task.
4. Update `TODO.md` with status + any blockers.
5. Move to the next task only after the previous one is marked complete.

## Phase Order (Do Not Skip)
Phase 0 → Phase 1 → Phase 3 (visuals can start early) → Phase 2 → Phase 4

## Communication
- Keep updates short and factual.
- If blocked, update TODO.md immediately with the blocker.

---
name: t3-code-thread-access
description: >-
  Read T3 Code threads from local sqlite, or create a thread via the local
  orchestration API when explicitly requested. Use when the user asks to read
  another T3 thread or spawn a new T3 thread.
---

# T3 Code thread access

Live install is `~/.t3` (not `~/Library/Application Support`). History is
`~/.t3/userdata/state.sqlite` — query it read-only. Origin and port are in
`~/.t3/userdata/server-runtime.json` (often `http://127.0.0.1:3773`).

Read model: `projection_projects`, `projection_threads`,
`projection_thread_messages`, `projection_turns`. Soft-deleted projects and
threads have `deleted_at`; select messages and turns by those live `thread_id`s.
Copy `project_id` and `model_selection_json` from a sibling thread.

SQLite reads need no session. HTTP does:

- `GET /api/orchestration/threads/<threadId>`
- `POST /api/orchestration/dispatch`

Bare `GET /api/orchestration/threads` is the SPA, not a list. Cookie name is
`auth.sessionCookieName` from `GET /api/auth/session`. No cookie: `npx t3 pair`,
then `POST /api/auth/browser-session` with `{ "credential": "<token>" }`. The
raw pairing secret exists only in that mint response.

Command schemas: https://github.com/pingdotgg/t3code/blob/main/packages/contracts/src/orchestration.ts

Create is two dispatches with distinct `commandId`s: `thread.create`, then
`thread.turn.start`. Reusing a `commandId` is a no-op. A 2xx means the intent
committed, not that the agent finished. Unused `branch` / `worktreePath` are
`null`. Create only on an explicit request.

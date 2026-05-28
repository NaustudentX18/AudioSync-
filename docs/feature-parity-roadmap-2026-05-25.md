# Feature Parity Roadmap (Bridge Phase)

## Phase 6 — Market Parity Bridge (P0/P1)

### 6.1 Sync reliability engine [P0]
- Add durable sync state machine for:
  - progress
  - bookmarks
  - queue
  - playback settings
- Add conflict strategy (LWW + conflict log export)
- Add retry/backoff + dead-letter queue for repeated failures
- Validation:
  - deterministic merge tests
  - offline->online replay tests

### 6.2 Queue + collection playback [P0]
- Queue CRUD: enqueue next, remove, reorder
- Play collection (unfinished-first, then complete)
- Resume queue position after restart
- Validation:
  - queue reducer tests
  - Playwright queue behavior flow

### 6.3 Per-book playback profiles [P0]
- Persist per-book speed, rewind, volume normalize flag, preferred voice
- Add interruption-aware auto-rewind scaling by pause duration
- Validation:
  - per-book settings persistence tests
  - playback resume profile tests

### 6.4 Offline download manager [P1]
- Download states: queued/downloading/paused/failed/completed
- Retry/resume and storage usage controls
- Validation:
  - download state transition tests
  - quota guard tests

### 6.5 Metadata normalization [P1]
- Series + narrator + chapter normalization helpers
- Missing-cover recovery pipeline
- Validation:
  - metadata parser fixtures
  - edge-case import tests

### 6.6 Platform shell expansion [P1]
- Car/wearable/widget integration plan + staged implementation
- Keep PWA-first baseline and avoid regressions

## Delivery gates
Each feature line is done only when:
1. unit tests pass,
2. e2e critical path passes,
3. docs updated (`TODO.md` + roadmap),
4. no false claims in README.

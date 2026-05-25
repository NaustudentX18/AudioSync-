# AudioSync — Live Task Board

**Last Updated**: Just now
**Status**: Phase 1 — Core Playback (Complete) + Phase 6 — Sync Layer (In Progress)

## Phase 0 — Foundation ✅ COMPLETE
- [x] AGENTS.md + TODO.md
- [x] .github templates
- [x] docs/architecture.md
- [x] src/lib/library.ts
- [x] src/lib/tts.ts
- [x] src/lib/gemini.ts
- [x] src/App.tsx + Player component

## Phase 1 — Core Playback ✅ COMPLETE
- [x] Basic audio player with Kokoro TTS playback
- [x] Library management + file import
- [x] Real audio playback (Web Audio API + streaming)
- [x] Chapter navigation
- [x] Playback speed / sleep timer
- [x] State management (Zustand or Context)

## Phase 2 — Intelligence Layer
- [ ] Chapter detection (Gemini)
- [ ] Book summarization UI
- [ ] Smart bookmarks

## Phase 3 — Polish & Visuals
- [ ] PWA + offline support
- [ ] Theme system
- [ ] Banner + demo video + screenshots

## Phase 4 — Testing & Release
- [ ] Test suite
- [ ] Final README + docs
- [ ] Deployment templates

## Phase 6 — Sync Layer (Current Focus)
- [x] Sync retry queue with localStorage persistence
- [x] Conflict log viewer UI with per-field diff
- [x] Conflict resolution (keep-local / keep-remote / merge)
- [x] Export conflicts as JSON + clear all
- [x] Auto-retry processing with configurable max retries
- [ ] Real backend sync integration

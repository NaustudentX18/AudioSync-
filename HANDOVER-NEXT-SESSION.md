# AudioSync — Handover Notes for Next Session

**Session Date:** 2026-05-25
**Status:** Research complete · Implementation starting
**Next Session Priority:** Phase 1 — Core Player Foundation (Weeks 1–2)

---

## What Was Accomplished This Session

### 1. Repo Makeover & Visual Assets
- Created professional visual assets: logo (PNG + SVG), banner (376 KB), 5 screenshots, demo video + GIF
- Rewrote README.md with hero section, badges, feature grid, screenshot gallery, tech stack table, getting started guide
- Added CI/CD workflows: `.github/workflows/ci.yml` + `release.yml`
- Fixed PWA workbox cache (5 MB for wasm files), generated PWA icons
- **Commit:** `7126dd1` — pushed to GitHub (https://github.com/NaustudentX18/AudioSync-)

### 2. Agent Swarm Research (5 Workstreams)
Spawned 5 parallel research agents to produce detailed implementation roadmaps:

| Stream | File | Size | Key Topics |
|--------|------|------|------------|
| Advanced TTS | `docs/research/stream-1-tts.md` | 34 KB | Kokoro.js, voice cloning, SSML, multi-speaker, emotion, phoneme timing |
| AI Intelligence | `docs/research/stream-2-ai.md` | 25 KB | Chapter detection, summarization, NER, vocabulary scoring, quizzes, RAG |
| Player Experience | `docs/research/stream-3-player.md` | 54 KB | Waveform, chapters, bookmarks, gestures, accessibility, sleep timer |
| Library & Management | `docs/research/stream-4-library.md` | 62 KB | EPUB/MOBI/PDF, view modes, smart collections, OPDS, search |
| Tech & Polish | `docs/research/stream-5-tech.md` | 47 KB | Performance, PWA, IndexedDB, Web Vitals, i18n, Sentry, CI/CD |

**Total research:** ~222 KB of implementation-ready documentation.

### 3. Master Roadmap Synthesis
- Created `docs/roadmap-detailed.md` (48 KB, 948 lines) — unified roadmap across all 5 streams
- 5 implementation phases, ~50 features, effort estimates, risk register, open questions
- Timeline: **13 weeks with 2 developers in parallel** (14–20 weeks sequential)
- Key differentiators identified: TTS-native quote bookmarks, AI chapter detection, WCAG 2.2 AA target

### 4. Documentation Updates
- README.md: added full "📋 Detailed Roadmap" section (5 phases, effort table, research links, risk register, success metrics, competitor matrix)
- TODO.md: restructured to match research phases, added research complete section
- All changes committed as `c1d6739` and pushed to GitHub ✅

---

## Current Repo State

### Git Log (Latest 3 Commits)

```
c1d6739 docs: add detailed roadmap + 5 research streams
7126dd1 chore: full repo makeover — assets, CI, docs, PWA icons
9cef4e4 docs: ultimate polished professional landing page + complete roadmap
```

### File Structure (Key Additions)

```
AudioSync-/
├── docs/
│   ├── research/
│   │   ├── research-plan.md
│   │   ├── stream-1-tts.md
│   │   ├── stream-2-ai.md
│   │   ├── stream-3-player.md
│   │   ├── stream-4-library.md
│   │   └── stream-5-tech.md
│   └── roadmap-detailed.md
├── assets/
│   ├── logo.png / logo.svg
│   ├── banner.png
│   ├── library.png / player.png / voices.png / intelligence.png / settings.png
│   ├── demo.mp4 / demo-small.gif
├── README.md (rewritten with detailed roadmap)
├── TODO.md (restructured)
├── .github/workflows/ci.yml
├── .github/workflows/release.yml
└── public/pwa-*.png (PWA icons)
```

### GitHub Live Status

All assets verified:
- ✅ `docs/roadmap-detailed.md` — HTTP 200
- ✅ `docs/research/stream-1-tts.md` — HTTP 200
- ✅ `assets/logo.png` — HTTP 200
- ✅ `assets/banner.png` — HTTP 200
- ✅ `assets/demo-small.gif` — HTTP 200

---

## Key Decisions Made This Session

| Decision | Rationale |
|----------|-----------|
| Spawn 5 parallel research agents | Parallelization reduced research time from ~2 hours to ~15 minutes |
| Use Kokoro.js as primary TTS | Offline-first, GPU-accelerated, 54 voices, phoneme timing available |
| Waveform in Web Worker initially | Avoid blocking main thread; server-side only if library >500 books |
| Phoneme alignment + graceful degradation | `getTimestamps()` sufficient for v1; MFA backend for v2 if needed |
| Opt-in cloud sync | Privacy-first default |
| PWA before Electron | Web-first; desktop wrapper only if users request it |
| Paraglide for i18n | Type-safe translations, better than i18next for TypeScript |
| Dexie.js for IndexedDB | Simplifies schema versioning and queries |
| Sentry for error monitoring | Industry standard, good React integration |

---

## What's Next — Implementation Priority

### Immediate Next Steps (Phase 1 — Weeks 1–2)

**Priority order within Phase 1:**

1. **Dexie.js schema setup** (shared infrastructure)
   - Install `dexie`
   - Create `src/lib/db.ts` with `AudioSyncDB` class
   - Tables: `books`, `sessions`, `covers`, `audioChunks`, `bookmarks`
   - This unblocks Phase 1.3 (reading position resume)

2. **Waveform + canvas rendering** (1.1)
   - Pre-compute peaks in Web Worker
   - Canvas render loop with `requestAnimationFrame`
   - Click/drag to seek
   - Chapter markers overlay

3. **Chapter navigation UI** (1.2)
   - Chapter list component (collapsible sidebar)
   - Jump controls (prev/next chapter buttons + gestures)
   - Chapter title overlay on change
   - AI fallback: Gemini structured output for chapter detection

4. **Reading position resume** (1.3)
   - Save/load `lastPosition` per book in IndexedDB
   - Restore on book open
   - "Continue Listening" shelf in library

5. **Sleep timer** (1.4)
   - Duration presets (15/30/45/60/90 min)
   - Chapter-boundary stop option
   - Fade-out (5-second linear)

6. **Playback speed** (1.5)
   - Speed slider: 0.5×–3×
   - Smart rewind (10s default on speed change)
   - Clamp to 0.75×–2× for quality (warn beyond)

7. **Media Session API** (1.6)
   - Lock screen metadata (title, author, chapter)
   - Play/pause/skip/seek handlers
   - Background playback on mobile

---

## Critical Context for Next Developer

### Architecture Patterns

- **State:** Zustand stores (`src/stores/`)
  - `usePlayerStore`: playback state, current book, position, speed
  - `useLibraryStore`: book list, view mode, collections, search
  - `useSettingsStore`: TTS voice, API keys, theme
  - `useBookmarkStore`: bookmark CRUD

- **TTS:** `src/lib/tts.ts` — Kokoro.js wrapper
  - `generateSpeech(text, voice, speed)` → `Blob`
  - `getTimestamps(text, voice)` → word-level timing for highlight sync
  - Voice pack management in IndexedDB

- **AI:** `src/lib/gemini.ts` — Gemini integration
  - `detectChapters(text)` → chapter list
  - `summarizeChapter(text, level)` → summary
  - `answerQuestion(question, context)` → answer

### Shared Infrastructure (Build First)

```typescript
// src/lib/db.ts — Dexie.js schema
import Dexie from 'dexie';

export class AudioSyncDB extends Dexie {
  books!: Table<BookRecord>;
  sessions!: Table<ListeningSession>;
  covers!: Table<{ id: string; blob: Blob }>;
  audioChunks!: Table<AudioChunk>;
  bookmarks!: Table<Bookmark>;

  constructor() {
    super('AudioSyncDB');
    this.version(1).stores({
      books: 'id, title, author, addedAt, *tags, contentHash',
      sessions: '++id, bookId, startTime',
      covers: 'id',
      audioChunks: 'id, bookId, chapterIndex, chunkIndex, createdAt',
      bookmarks: 'id, bookId, position, createdAt',
    });
  }
}
```

### Important Files to Read Before Starting

| File | Why |
|------|-----|
| `docs/roadmap-detailed.md` | Master roadmap with all phases, risks, open questions |
| `docs/research/stream-3-player.md` | Waveform + chapter nav implementation details |
| `src/App.tsx` | Current app structure, tab routing, state wiring |
| `src/lib/tts.ts` | Existing TTS integration (Kokoro.js) |
| `src/lib/gemini.ts` | Existing AI integration |
| `src/lib/library.ts` | Current library CRUD (minimal stub) |
| `AGENTS.md` | Agent conventions, coding style, model reference |

---

## Open Questions Requiring User Input

| ID | Question | Impact |
|----|----------|--------|
| Q1 | Waveform: Web Worker or server-side? | Architecture decision |
| Q2 | Quote bookmark precision: phoneme or MFA? | Accuracy vs complexity |
| Q3 | Sleep timer: chapter end, boundary, or both? | UX decision |
| Q4 | Smart rewind: 10 seconds default? | Industry standard confirmation |
| Q5 | Cloud sync: opt-in or opt-out? | Privacy model |
| Q6 | Deployment: PWA, Electron, or both? | Platform strategy |

---

## Success Metrics for v1.0

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Bundle size (gzip) | < 300 KB |
| LCP | ≤ 2.5 s on 3G |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| WCAG 2.2 AA | All critical paths pass |
| Test coverage | ≥ 70% |

---

## Quick Start for Next Session

```bash
cd /home/pi/AudioSync-
git pull origin main
npm install
npm run dev
```

Read `docs/roadmap-detailed.md` Section 3 (Implementation Phases) and start Phase 1.1 (waveform).

---

## Reference Links

- **GitHub Repo:** https://github.com/NaustudentX18/AudioSync-
- **Master Roadmap:** `docs/roadmap-detailed.md`
- **Research Streams:** `docs/research/`
- **Existing Code:** `src/App.tsx`, `src/lib/tts.ts`, `src/lib/gemini.ts`, `src/lib/library.ts`
- **Kokoro.js Docs:** https://github.com/hexgrad/Kokoro
- **epubix (EPUB parser):** https://www.npmjs.com/package/epubix
- **Dexie.js (IndexedDB):** https://dexie.org/

---

*End of handover notes. Ready to implement Phase 1.*

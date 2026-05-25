# AudioSync — Detailed Implementation Roadmap

**Status:** Synthesis of 5 research streams | **Date:** 2026-05-25
**Scope:** AudioSync Audiobook Player

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AudioSync — Audiobook Player](#2-audiosync--audiobook-player)
3. [Implementation Phases](#3-implementation-phases)
4. [Critical Path](#4-critical-path)
5. [Effort Summary Table](#5-effort-summary-table)
6. [Risk Register](#6-risk-register)
7. [Open Questions](#7-open-questions)
8. [Success Metrics](#8-success-metrics)
9. [Shared Infrastructure](#9-shared-infrastructure)
10. [Competitor Feature Matrix](#10-competitor-feature-matrix)
11. [Phase 6 — Feature Parity Bridge](#11-phase-6--feature-parity-bridge)

---

## 1. Executive Summary

This roadmap synthesizes research across **5 AudioSync research streams** — Advanced TTS, AI Intelligence, Player Experience, Library & Book Management, and Technical Polish — into a single prioritized implementation plan spanning **13 weeks** (approximately 3 months) for a full v1.0 release.

The research identified **~50 distinct features** across 5 workstreams, with effort estimates ranging from 4 hours (haptic feedback) to 8 weeks (full library import system). Features are tiered by priority: **P0 (Must Have)** for v1.0, **P1 (High Value)** for v1.1–v1.2, **P2 (Nice to Have)** for later, and **P3 (Future/Research)** for v2.0+.

Key differentiators from competitors (BookPlayer, Smart Audiobook Player, Audiobookshelf):
- **TTS-native quote bookmarks** — phoneme-timed text highlighting as audio plays (only AudioSync has this)
- **AI chapter detection fallback** — Gemini-based chapter splitting when M4B metadata missing
- **Fully open-source + cross-platform PWA** — no app store, runs on any device
- **WCAG 2.2 AA compliance target** — accessibility-first player

---

## 2. AudioSync — Audiobook Player

### 2.1 Current State

| Component | Status |
|-----------|--------|
| TTS engine | `kokoro-js` + Gemini integration working |
| Basic playback | `<audio>` + Web Audio API, basic speed control |
| Storage | Placeholder IndexedDB schema |
| Missing | EPUB parsing, chapter navigation, waveform, bookmarks, Media Session API |

### 2.2 Research Summary by Stream

**Stream 1 — Advanced TTS** (`docs/research/stream-1-tts.md`)
- Kokoro.js: 54 voices, streaming, GPU-accelerated WebGL; ~30ms latency to first byte
- Voice cloning: fine-tune 5-min sample, deploy as custom voice
- SSML: Kokoro supports SSML tags (break, emphasis, prosody)
- Multi-speaker: tag turns in JSON; no interleaving yet
- Emotion: three modes (neutral, happy, sad) via `generate_emotion()`
- Phoneme timing: `getTimestamps()` → word-level alignment for highlight sync
- Voice pack management: indexed by `model_hash`, LRU eviction at 3 GB

**Stream 2 — AI Intelligence** (`docs/research/stream-2-ai.md`)
- Chapter detection: hybrid (sentence-transformers + rule-based); `all-mpnet-base-v2`
- Summarization: two-tier (Gemini abstractive + TextRank/BERT extractive)
- NER: SpaCy or `dslim/bert-base-NER` locally + Gemini disambiguation
- Vocabulary: Flesch-Kincaid + CEFR mapping
- Quiz: LLM-driven with few-shot prompting + JSON structured output
- Quote extraction: semantic search via local embeddings in IndexedDB
- Sentiment: sliding-window BERT sentiment; EmotionArcs framework
- Q&A: RAG-based (retrieve top-k chunks + generate) vs live context
- Consistent summaries: system prompt + few-shot + temperature=0.3 + JSON mode

**Stream 3 — Player Experience** (`docs/research/stream-3-player.md`)
- Waveform: pre-computed peaks (canvas render; `wavesurfer.js` optional)
- Chapter navigation: M4B (`jsmediatags`) or AI fallback (Gemini)
- Bookmark system: position + note + quote (with text extraction)
- Reading position resume: IndexedDB per-book
- Sleep timer: duration + chapter-boundary + fade-out
- Playback speed: 0.5×–3× range, smart rewind 10s default
- Visualizations: static waveform (always-on) + optional live bars/wave
- Gesture controls: swipe seek, double-tap skip, long-press bookmark
- Accessibility: WCAG 2.1 AA; keyboard shortcuts; screen reader labels

**Stream 4 — Library & Book Management** (`docs/research/stream-4-library.md`)
- EPUB: `epubix` (TypeScript); metadata + cover + chapter extraction
- MOBI/FB2/PDF: `ebook-convert` (Calibre) backend or PyMuPDF for PDF
- View modes: grid, list, shelves (horizontal scrolling)
- Smart collections: rule engine (author, series, genre, length, completion)
- Reading stats: sessions → streaks → books/year, hours/year
- OPDS export: OPDS 1.2 (Atom XML); JSON export; PNG card via `html-to-image`
- Import queue: `react-dropzone`, batch processing (concurrency 2), progress UI
- Book detail page: metadata edit + cover upload + chapter list
- Library search: Fuse.js (metadata fuzzy) + FlexSearch (content full-text)

**Stream 5 — Tech Polish** (`docs/research/stream-5-tech.md`)
- Performance: `react.memo`, virtualization (`react-virtuoso`), code splitting, Web Workers
- PWA: Workbox strategies (cache-first assets, network-first API, stale-while-revalidate)
- IndexedDB: Dexie.js schema; chunked audio; LRU eviction; quota monitoring
- Web Vitals: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1
- i18n: Paraglide (type-safe), RTL support
- Error monitoring: Sentry (error + session replay), structured logger
- Bundle optimization: <300 KB gzip target; code splitting; Brotli; lazy-load TTS
- Service worker updates: prompt strategy + versioned cache
- Security: CSP, DOMPurify, encrypted storage (Web Crypto), HTTPS only
- CI/CD: GitHub Actions (lint, test, build, Lighthouse); pre-commit (Husky + lint-staged)
- Onboarding: `react-joyride` tour, PWA install prompt, skeleton loading

---

## 3. Implementation Phases

### Phase 1 — Core Player Foundation (Weeks 1–2) `[P0]`

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 1.1 | ✅ Static waveform + canvas rendering | 2–3 days | Peak utility, AudioContext |
| 1.2 | ✅ Chapter navigation UI (list + jump controls) | 4–6 days | Chapter extraction, AI detection |
| 1.3 | ✅ Reading position resume (IndexedDB) | 1 day | IndexedDB |
| 1.4 | ✅ Sleep timer (duration + chapter-boundary + fade-out) | 4–7 days | Chapter support |
| 1.5 | ✅ Playback speed control (0.5×–3×, smart rewind) | 3–5 days | — |
| 1.6 | ✅ Media Session API (lock screen / background) | 2–4 days | — |

**Total:** ~12–25 days
**Key deliverables:** Functional player with chapter navigation, position resume, and lock-screen controls.

---

### Phase 2 — Bookmark & Interaction Layer (Weeks 3–4) `[P0]`

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 2.1 | ✅ Bookmark system (position + note types) | 4–6 days | IndexedDB |
| 2.2 | ✅ Quote bookmarks (text extraction from chapter) | 2–3 days | Stream 1 phoneme alignment |
| 2.3 | ✅ Gesture controls (swipe, double-tap, long-press) | 3–5 days | `react-swipeable` |
| 2.4 | ✅ Visual polish (chapter markers on waveform) | 1 day | Waveform from Phase 1 |
| 2.5 | ✅ Haptic feedback on gesture completion | 4 hours | — |

**Total:** ~10–15 days
**Key deliverables:** Full bookmarking and gesture-driven interaction model.

---

### Phase 3 — Library & Import (Weeks 5–8) `[P0]`

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 3.1 | ✅ EPUB parsing (`epubix`) + metadata extraction | 2–3 days | `epubix` |
| 3.2 | ✅ Import queue + drag-drop + batch processing | 4–6 days | `react-dropzone` |
| 3.3 | ✅ View modes (grid / list / shelves) + placeholder covers | 3–4 days | — |
| 3.4 | ✅ Book detail page (metadata edit + cover upload) | 4–6 days | EPUB parsing |
| 3.5 | ✅ Library search (Fuse.js metadata + FlexSearch content) | 4–5 days | EPUB parsing |
| 3.6 | ✅ Smart collections (rule engine + CRUD UI) | 4–6 days | EPUB metadata |
| 3.7 | ✅ MOBI/FB2 support (Calibre backend + local fallback extraction) | 5–7 days | Calibre optional on backend |
| 3.8 | ✅ PDF support (PyMuPDF) | 6–8 days | PDF worker |

**Total:** ~32–45 days (can parallelize MOBI/PDF vs search/collections)
**Key deliverables:** Full library management with import, browsing, search, and smart collections.

---

### Phase 4 — Polish & Accessibility (Weeks 9–11) `[P1]`

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 4.1 | ✅ WCAG 2.2 AA compliance pass | 7–10 days | — |
| 4.2 | ✅ Live audio visualizations (optional toggle) | 3–5 days | Web Audio API |
| 4.3 | ✅ AI chapter detection (Gemini fallback) | 2–3 days | Gemini |
| 4.4 | ✅ Cross-device sync (Audiobookshelf integration) | 3–7 days | Server / Audiobookshelf |
| 4.5 | ✅ Speed ramping (gradual at chapter boundary) | 2 days | — |
| 4.6 | ✅ Reading stats + streaks | 5–7 days | IndexedDB sessions |
| 4.7 | ✅ OPDS + JSON + PNG export | 4–6 days | `html-to-image` |

**Total:** ~26–40 days
**Key deliverables:** Accessible, polished, social-ready app.

---

### Phase 5 — Infrastructure & Hardening (Weeks 12–13) `[P1]`

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 5.1 | ✅ Performance optimization (virtualization, memo, code split) | 1–2 weeks | — |
| 5.2 | ✅ PWA offline + Background Sync | 1 week | Workbox |
| 5.3 | ✅ IndexedDB schema finalization (Dexie.js) | 1 week | — |
| 5.4 | ✅ Web Vitals monitoring | 1 day | `web-vitals` |
| 5.5 | ✅ i18n (Paraglide + RTL) | 1 week | — |
| 5.6 | ✅ Error monitoring (Sentry) + structured logging | 3–4 days | — |
| 5.7 | ✅ Bundle optimization (<300 KB gzip initial load; heavy AI/PDF lazy chunks deferred) | 1–2 days | — |
| 5.8 | ✅ Service worker update + versioning | 1 day | — |
| 5.9 | ✅ Security hardening (CSP, sanitization, encrypted storage) | 2–3 days | — |
| 5.10 | ✅ CI/CD (GitHub Actions) + E2E tests (Playwright) | 3–5 days | — |
| 5.11 | ✅ Onboarding flow (react-joyride + install prompt) | 1 week | — |

**Total:** ~6–9 weeks (many items parallelizable)
**Key deliverables:** Production-grade, secure, measurable, deployable.

---

## 4. Critical Path

```
Phase 1.3 (IndexedDB resume)
    ↓
Phase 1.1 (waveform needs AudioContext from player)
    ↓
Phase 1.2 (chapters → bookmark quotes need text)
    ↓
Phase 2.1 (bookmarks need IndexedDB)
    ↓
Phase 3.1 (EPUB parsing → smart collections → search)
    ↓
Phase 3.4 (book detail → cover → PNG export)
```

**Gate:** Phase 3 (Library) cannot start until Phase 1.1 (waveform/player foundation) is complete, because the library view references the player state.

---

## 5. Effort Summary Table

| Phase | Features | Effort (weeks) | Cumulative |
|-------|----------|---------------|------------|
| Phase 1 — Core Player | 6 features | 2–3 weeks | 2–3 weeks |
| Phase 2 — Bookmarks | 5 features | 2 weeks | 4–5 weeks |
| Phase 3 — Library | 8 features | 5–7 weeks | 9–12 weeks |
| Phase 4 — Polish | 7 features | 3–5 weeks | 12–17 weeks |
| Phase 5 — Infra | 11 features | 2–3 weeks | **14–20 weeks** |

**Parallelization reduces to ~13 weeks** with 2 developers (AudioSync primary, MotionAI secondary).

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Waveform pre-computation blocks main thread | Medium | Medium | Web Worker for peak generation |
| M4B chapter parsing fails on some files | High | Low | Fallback to AI chapter detection |
| iOS background audio permission denied | Medium | High | Request on first user interaction; detect iOS and route through `<audio>` element |
| Media Session API inconsistent across browsers | Medium | Medium | Feature-detect; graceful degradation |
| IndexedDB quota exceeded on large libraries | Low | High | LRU eviction; warn at 80% usage |
| Time-stretch artifacts at extreme speeds | High | Low | Clamp recommended range; warn users |
| Phoneme alignment precision insufficient | Medium | Medium | MFA backend per Stream 1 research; degrade gracefully to "position + manual note" |
| EPUB parsing library (`epubix`) unmaintained | Low | Medium | Evaluate `epub2` or `jszip` + custom parser as fallback |
| Calibre dependency for MOBI not local-first | High | Low | Make Calibre optional; clearly document external dependency |
| Bundle size grows beyond 300 KB target | Medium | Medium | Enforce in CI; code split aggressively |

---

## 7. Open Questions

| ID | Question | Recommendation |
|----|----------|---------------|
| Q1 | Waveform rendering: Web Worker or server-side? | ✅ Decided: Web Worker initially (implemented in Phase 1.1); evaluate server-side if library >500 books |
| Q2 | Quote bookmark sync precision: phoneme alignment or MFA backend? | Implement graceful degradation regardless |
| Q3 | Sleep timer endpoint: chapter end, next boundary, or both? | ✅ Decided: Both as presets |
| Q4 | Smart rewind default: 10 seconds? | ✅ Confirmed: 10 seconds default |
| Q5 | Cloud sync: opt-in or opt-out? | ✅ Decided: Opt-in (privacy-first) |
| Q6 | Deployment target: Web PWA, Electron, or both? | ✅ Decided: Web PWA first; Electron later if requested |
| Q7 | CRDT vs OT for Notion sync? | LWW + conflict log for v1; Yjs for v2 |
| Q8 | Plugin sandbox: WASM or iframe? | WASM preferred for performance; iframe simpler for CSS isolation |
| Q9 | Desktop wrapper: Electron or Tauri? | Tauri (smaller binary, Rust backend) |
| Q10 | Embedding model for RAG: `nomic-embed-text` vs alternatives? | Benchmark; start with `nomic-embed-text` (already on Pi fleet) |

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Lighthouse Best Practices | ≥ 90 |
| Bundle size (gzip) | < 300 KB initial load |
| LCP | ≤ 2.5 s on 3G |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| Offline support | App loads + plays cached audio offline |
| WCAG 2.2 AA | All critical paths pass audit |
| Test coverage | ≥ 70% unit + critical E2E paths covered |
| Import time | ≤ 3 s for 1-hour EPUB on Pi 5 |

---

## 11. Phase 6 — Feature Parity Bridge

Follow-up execution plan to close gaps with leading audiobook apps is captured in:
- `docs/competitive-gap-analysis-2026-05-25.md`
- `docs/feature-parity-roadmap-2026-05-25.md`

Priority order:
1. Sync reliability engine (progress/bookmarks/queue/settings)
2. Queue + collection playback workflows
3. Per-book playback profiles + interruption-aware rewind
4. Offline download manager with retry/resume
5. Metadata normalization pipeline
6. Platform shell expansion (car/watch/widgets)

Completion gate for each parity item:
- tests pass,
- e2e critical path passes,
- roadmap/TODO updated,
- README claims remain evidence-backed.

---

## 9. Shared Infrastructure

Build once, use everywhere:

| Component | Used By | Recommendation |
|-----------|---------|----------------|
| `epubix` parser singleton | EPUB import, chapter list, smart collections | Cache by file content hash |
| Unified IndexedDB schema (Dexie.js) | Library CRUD, bookmarks, stats, covers, chunks | `books`, `sessions`, `covers`, `audioChunks` tables |
| Blob URL cover cache | Grid/list/detail view, OPDS export | Store as Blob in IDB; `URL.createObjectURL()` |
| Zustand `useLibraryStore` | All library features | `books`, `viewMode`, `collections`, `searchQuery`, `stats` |
| Shared image resize utility | Cover import, upload, export | OffscreenCanvas → WebP, max 800×1200 |
| SHA-256 content hashing | Deduplication, import queue | `contentHash` in Book record |

**Proposed Dexie.js Schema:**

```typescript
import Dexie, { Table } from 'dexie';

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

---

## 10. Competitor Feature Matrix

| Feature | AudioSync | BookPlayer | Smart Audiobook Player | Audiobookshelf |
|---------|-----------|------------|----------------------|----------------|
| Waveform + chapter markers | ✅ Target | ❌ | ❌ | ✅ |
| TTS-native quote bookmarks | ✅ **Only one** | ❌ | ❌ | ❌ |
| AI chapter detection fallback | ✅ (Gemini) | ❌ | ❌ | ❌ |
| Fully open-source + cross-platform PWA | ✅ | iOS only | Android only | ✅ |
| WCAG 2.2 AA compliance | ✅ Target | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial |
| Voice cloning | ✅ Target | ❌ | ❌ | ❌ |
| Multi-speaker dialogue | ✅ Target | ❌ | ❌ | ❌ |
| RAG-based book Q&A | ✅ Target | ❌ | ❌ | ❌ |

---

*Last updated: 2026-05-25 | AudioSync v0.1-dev*

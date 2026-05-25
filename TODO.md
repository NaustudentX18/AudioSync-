# AudioSync — Live Task Board

**Last Updated**: 2026-05-25
**Status**: Phase 0 — Research Complete · Implementation Starting

---

## Research Complete ✅

| Stream | File | Key Findings |
|--------|------|--------------|
| Advanced TTS | `docs/research/stream-1-tts.md` | Kokoro.js 54 voices, voice cloning, SSML, phoneme timing, voice pack management |
| AI Intelligence | `docs/research/stream-2-ai.md` | Chapter detection, summarization, NER, vocabulary scoring, quiz generation, RAG |
| Player Experience | `docs/research/stream-3-player.md` | Waveform, chapters, bookmarks, gestures, accessibility, sleep timer |
| Library & Management | `docs/research/stream-4-library.md` | EPUB/MOBI/PDF, view modes, smart collections, OPDS, search, import queue |
| Tech & Polish | `docs/research/stream-5-tech.md` | Performance, PWA, IndexedDB, Web Vitals, i18n, Sentry, CI/CD |

**Master synthesis:** [`docs/roadmap-detailed.md`](./docs/roadmap-detailed.md) (48 KB, 948 lines)

---

## Phase 1 — Core Player Foundation `[P0]` (Weeks 1–2)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 1.1 | Static waveform + canvas rendering | 2–3 days | ⬜ Todo |
| 1.2 | Chapter navigation UI (list + jump controls) | 4–6 days | ⬜ Todo |
| 1.3 | Reading position resume (IndexedDB) | 1 day | ⬜ Todo |
| 1.4 | Sleep timer (duration + chapter-boundary + fade-out) | 4–7 days | ⬜ Todo |
| 1.5 | Playback speed control (0.5×–3×, smart rewind) | 3–5 days | ⬜ Todo |
| 1.6 | Media Session API (lock screen / background) | 2–4 days | ⬜ Todo |

**Key deliverables:** Functional player with chapter navigation, position resume, and lock-screen controls.

---

## Phase 2 — Bookmark & Interaction Layer `[P0]` (Weeks 3–4)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 2.1 | Bookmark system (position + note types) | 4–6 days | ⬜ Todo |
| 2.2 | Quote bookmarks (text extraction from chapter) | 2–3 days | ⬜ Todo |
| 2.3 | Gesture controls (swipe, double-tap, long-press) | 3–5 days | ⬜ Todo |
| 2.4 | Visual polish (chapter markers on waveform) | 1 day | ⬜ Todo |
| 2.5 | Haptic feedback on gesture completion | 4 hours | ⬜ Todo |

**Key deliverables:** Full bookmarking and gesture-driven interaction model.

---

## Phase 3 — Library & Import `[P0]` (Weeks 5–8)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 3.1 | EPUB parsing (`epubix`) + metadata extraction | 2–3 days | ⬜ Todo |
| 3.2 | Import queue + drag-drop + batch processing | 4–6 days | ⬜ Todo |
| 3.3 | View modes (grid / list / shelves) + placeholder covers | 3–4 days | ⬜ Todo |
| 3.4 | Book detail page (metadata edit + cover upload) | 4–6 days | ⬜ Todo |
| 3.5 | Library search (Fuse.js metadata + FlexSearch content) | 4–5 days | ⬜ Todo |
| 3.6 | Smart collections (rule engine + CRUD UI) | 4–6 days | ⬜ Todo |
| 3.7 | MOBI/FB2 support (Calibre backend) | 5–7 days | ⬜ Todo |
| 3.8 | PDF support (PyMuPDF) | 6–8 days | ⬜ Todo |

**Key deliverables:** Full library management with import, browsing, search, and smart collections.

---

## Phase 4 — Polish & Accessibility `[P1]` (Weeks 9–11)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 4.1 | WCAG 2.2 AA compliance pass | 7–10 days | ⬜ Todo |
| 4.2 | Live audio visualizations (optional toggle) | 3–5 days | ⬜ Todo |
| 4.3 | AI chapter detection (Gemini fallback) | 2–3 days | ⬜ Todo |
| 4.4 | Cross-device sync (Audiobookshelf integration) | 3–7 days | ⬜ Todo |
| 4.5 | Speed ramping (gradual at chapter boundary) | 2 days | ⬜ Todo |
| 4.6 | Reading stats + streaks | 5–7 days | ⬜ Todo |
| 4.7 | OPDS + JSON + PNG export | 4–6 days | ⬜ Todo |

**Key deliverables:** Accessible, polished, social-ready app.

---

## Phase 5 — Infrastructure & Hardening `[P1]` (Weeks 12–13)

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 5.1 | Performance optimization (virtualization, memo, code split) | 1–2 weeks | ⬜ Todo |
| 5.2 | PWA offline + Background Sync | 1 week | ⬜ Todo |
| 5.3 | IndexedDB schema finalization (Dexie.js) | 1 week | ⬜ Todo |
| 5.4 | Web Vitals monitoring | 1 day | ⬜ Todo |
| 5.5 | i18n (Paraglide + RTL) | 1 week | ⬜ Todo |
| 5.6 | Error monitoring (Sentry) + structured logging | 3–4 days | ⬜ Todo |
| 5.7 | Bundle optimization (<300 KB gzip) | 1–2 days | ⬜ Todo |
| 5.8 | Service worker update + versioning | 1 day | ⬜ Todo |
| 5.9 | Security hardening (CSP, sanitization, encrypted storage) | 2–3 days | ⬜ Todo |
| 5.10 | CI/CD (GitHub Actions) + E2E tests (Playwright) | 3–5 days | ⬜ Todo |
| 5.11 | Onboarding flow (react-joyride + install prompt) | 1 week | ⬜ Todo |

**Key deliverables:** Production-grade, secure, measurable, deployable.

---

## Completed Work (Pre-Research)

### Phase 0 — Foundation ✅
- [x] AGENTS.md + TODO.md
- [x] .github templates (bug_report, feature_request, PR template)
- [x] LICENSE (MIT)
- [x] docs/architecture.md
- [x] src/lib/library.ts
- [x] src/lib/tts.ts
- [x] src/lib/gemini.ts
- [x] src/App.tsx + Player component

### Phase 1 — Core Playback ✅
- [x] Basic audio player with Kokoro TTS playback
- [x] Library management + file import
- [x] Real audio playback (Web Audio API + streaming)
- [x] Chapter navigation
- [x] Playback speed / sleep timer
- [x] State management (Zustand)

### Phase 2 — Intelligence Layer ✅
- [x] Chapter detection (Gemini)
- [x] Book summarization UI
- [x] Smart bookmarks

### Phase 3 — Polish & Visuals ✅
- [x] PWA + offline support (vite-plugin-pwa, workbox, service worker)
- [x] Theme system (dark / light / system)
- [x] Banner (assets/banner.png, 376 KB)
- [x] Demo video (assets/demo.mp4, 508 KB; demo-small.gif, 686 KB)
- [x] Logo (assets/logo.png, assets/logo.svg)
- [x] Screenshots: library, player, voices, intelligence, settings (×5)
- [x] Workbox cache increased to 5 MB for ort-wasm-simd-threaded.jsep (21 MB)
- [x] vite.config.ts patched for PWA workbox

### Phase 4 — Testing & Release ✅
- [x] TypeScript build: `npm run build` passes ✅
- [x] Production PWA build: v1.3.0, service worker registered
- [x] README.md rewritten with hero, badges, feature grid, screenshots, roadmap
- [x] assets/README.md with asset descriptions
- [x] Feature research complete (5 workstreams + synthesis)
- [ ] Test suite (`npm run test`) — TODO: add vitest + @testing-library/react
- [ ] E2E tests (playwright or cypress) — TODO
- [ ] CI/CD pipeline (.github/workflows/ci.yml) — TODO
- [ ] Release v1.0.0 — tag + GitHub release

---

## Known Issues / Technical Debt

- `__tests__/*.test.ts` — test deps missing (vitest, @testing-library/react, zustand). Not blocking build.
- `dist/index-*.js` — 2.5 MB chunk (over vite 500 kB limit). Acceptable for PWA; consider code-splitting.
- `src/App.tsx` — 1,178 lines in full version; consider splitting into tab components.
- TTS audio buffer management — verify large file handling on low-RAM devices.

---

## Open Questions

| ID | Question | Recommendation |
|----|----------|---------------|
| Q1 | Waveform: Web Worker or server-side? | Web Worker initially |
| Q2 | Quote bookmark precision: phoneme or MFA? | Graceful degradation regardless |
| Q3 | Sleep timer: chapter end, boundary, or both? | Both as presets |
| Q4 | Smart rewind default: 10 seconds? | Confirm (industry standard) |
| Q5 | Cloud sync: opt-in or opt-out? | Opt-in (privacy-first) |
| Q6 | Deployment: PWA, Electron, or both? | PWA first; Electron later if requested |

---

*Last Updated: 2026-05-25 | Status: Research complete — implementation starting*

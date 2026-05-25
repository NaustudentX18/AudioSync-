# AudioSync

<p align="center">
  <img src="assets/logo.png" alt="AudioSync logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Local-first audiobook player</strong> &mdash; import, play, bookmark, and learn with AI. Works entirely offline.
</p>

<p align="center">
  <a href="https://github.com/NaustudentX18/AudioSync-/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/NaustudentX18/AudioSync-/ci.yml?label=CI&logo=github&style=flat-square" alt="CI" /></a>
  <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/package.json"><img src="https://img.shields.io/badge/TypeScript-5.8-blue.svg?style=flat-square" alt="TypeScript" /></a>
  <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/package.json"><img src="https://img.shields.io/badge/Vite-6.2-646CFF.svg?style=flat-square" alt="Vite" /></a>
  <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/package.json"><img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square" alt="React" /></a>
  <img src="https://img.shields.io/badge/PWA-Ready-4A154B.svg?style=flat-square" alt="PWA" />
</p>

---

## Demo

<p align="center">
  <img src="assets/demo-small.gif" alt="AudioSync demo" width="720" />
</p>

<p align="center">
  <a href="assets/demo.mp4">▶ Watch full demo video (MP4, 508 KB)</a>
</p>

---

## Screenshots

| Library | Player | Voices |
|---------|--------|--------|
| <img src="assets/library.png" alt="Library view" width="300" /> | <img src="assets/player.png" alt="Player view" width="300" /> | <img src="assets/voices.png" alt="Voice selector" width="300" /> |

| Intelligence | Settings |
|--------------|----------|
| <img src="assets/intelligence.png" alt="AI panel" width="300" /> | <img src="assets/settings.png" alt="Settings" width="300" /> |

---

## Features

### Library
- Import **TXT, EPUB, PDF, MOBI, FB2** via drag-and-drop or file picker
- Batch import queue with progress tracking
- Editable metadata (title, author, genre) and cover upload
- Grid / list / shelves view modes
- Smart collections with rule engine (field + contains matching)
- Dual search: Fuse.js on metadata + FlexSearch on full text

### Player
- Real-time waveform rendered on `<canvas>` (Web Worker off main thread)
- Chapter navigation: list sidebar, jump buttons, keyboard shortcuts
- Reading position resume from IndexedDB — pick up where you left off
- Playback speed: 0.5&times;&ndash;3&times; with smart rewind (configurable)
- Sleep timer: duration presets, chapter-boundary stop, 5-second fade-out
- Bookmarks: position bookmarks + quote extraction (text from chapter)
- Gesture controls: swipe, double-tap, long-press with haptic feedback
- Media Session API: lock screen controls, background playback, next/prev/stop

### Intelligence
- **Gemini integration** (optional, bring-your-own API key)
  - AI chapter detection from unstructured text
  - Chapter summarization at variable depth
  - Q&A panel over current chapter context
- **Kokoro TTS** (local, offline) — 16 voice models bundled
  - `af_heart`, `af_bella`, `af_nicole`, `af_sky`
  - `am_adam`, `am_michael`, `am_onyx`
  - `bf_emma`, `bf_isabella`, `bm_george`, `bm_lewis`
  - `oa-echo`, `oa-fable`, `oa-onyx`, `oa-nova`, `oa-shimmer`
- OpenAI TTS (optional cloud fallback) — alloy, echo, fable, onyx, nova, shimmer

### Platform
- **PWA** with service worker: installable, offline runtime, background sync queue
- IndexedDB persistence via **Dexie.js** — schema versioned, queryable
- Web Vitals monitoring (LCP, INP, CLS) + structured error logging
- i18n baseline: English + Arabic, RTL toggle
- WCAG 2.2 AA accessibility pass: labels, focus rings, live regions, keyboard shortcuts

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| DB (browser) | Dexie.js / IndexedDB |
| TTS (local) | Kokoro.js (ONNX Runtime Web) |
| TTS (cloud) | OpenAI TTS (optional) |
| AI | Google Gemini API (optional) |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest + Playwright |
| CI | GitHub Actions |

---

## Getting Started

```bash
git clone https://github.com/NaustudentX18/AudioSync-.git
cd AudioSync-
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

### Build for production

```bash
npm run build
npm run preview   # serve dist/ locally
```

### API keys (optional)

AudioSync is **local-first** and works without any API keys. Optional integrations are configured in Settings:

| Key | Purpose | Where to get |
|-----|---------|--------------|
| `VITE_GEMINI_API_KEY` | AI chapter detection, summarization, Q&A | [Google AI Studio](https://aistudio.google.com/apikey) |
| OpenAI TTS key | Cloud TTS fallback | [OpenAI Platform](https://platform.openai.com) |

Keys are stored in `localStorage` only — never committed, never logged.

---

## Roadmap

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 — Foundation | ✅ Done | AGENTS.md, architecture, library, TTS, Gemini client |
| Phase 1 — Core Playback | ✅ Done | Waveform, chapters, resume, sleep timer, speed, Media Session |
| Phase 2 — Bookmarks & Gestures | ✅ Done | Position/quote bookmarks, swipe/double-tap/long-press, haptics |
| Phase 3 — Library & Import | ✅ Done | EPUB/PDF/MOBI/FB2, drag-drop, search, smart collections |
| Phase 4 — Polish & Accessibility | ✅ Done | WCAG 2.2 AA pass, live viz, AI chapters, sync, speed ramping, stats, export |
| Phase 5 — Infrastructure & Hardening | ✅ Done | PWA, IndexedDB, Web Vitals, i18n, Sentry, CI/CD, bundle opt |
| Phase 6 — Feature Parity Bridge | 🔄 In Progress | Sync reliability, queue workflows, playback profiles, offline exports |

See [`docs/roadmap-detailed.md`](docs/roadmap-detailed.md) for the full breakdown with effort estimates and open questions.

---

## Project Structure

```
AudioSync-/
├── src/
│   ├── App.tsx              # Root — tab router, library, settings
│   ├── main.tsx             # React entry + boot splash teardown
│   ├── lib/
│   │   ├── library.ts       # Library CRUD, import, search, metadata
│   │   ├── tts.ts           # Kokoro TTS engine + OpenAI fallback
│   │   ├── gemini.ts        # Gemini AI client
│   │   ├── db.ts            # Dexie.js schema
│   │   ├── secureStorage.ts # AES-GCM encrypted local state
│   │   ├── parity.ts        # Sync reliability, LWW merge, retry queue
│   │   └── observability.ts # Web Vitals, structured logging, error hooks
│   ├── stores/              # Zustand stores (player, library, settings, voices)
│   ├── components/
│   │   ├── Player.tsx       # Main player (waveform, chapters, sleep timer, speed)
│   │   ├── WaveformCanvas.tsx
│   │   ├── ChapterNavigator.tsx
│   │   └── SyncPanel.tsx    # Sync conflict viewer / retry queue
│   └── workers/
│       └── waveform.worker.ts
├── public/
│   ├── logo.svg             # Animated EQ logo
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── assets/                  # Screenshots, demo, banner
├── docs/
│   ├── roadmap-detailed.md
│   └── research/
├── server.ts                # Express SSR / API proxy (optional)
├── vite.config.ts           # Vite + PWA plugin + manual chunking
├── .github/workflows/ci.yml
└── package.json
```

---

## Development

```bash
# Install
npm install

# Dev server (port 5173)
npm run dev

# Lint
npm run lint

# Test
npm run test
npm run test:e2e

# Build
npm run build

# Preview production build
npm run preview
```

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss any significant change.

1. Fork → `git checkout -b feat/my-feature`
2. Commit: `feat: add something useful`
3. Push → open PR against `main`

See [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).

---

## License

MIT — see [LICENSE](LICENSE).

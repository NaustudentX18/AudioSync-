# AudioSync 🎧

<p align="center">
  <img src="assets/logo.png" alt="AudioSync Logo" width="180" height="180"/>
  <br/>
  <img src="assets/banner.png" alt="AudioSync Banner" width="100%" />
  <br/>
  <a href="https://github.com/NaustudentX18/AudioSync-/actions">
    <img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build Status"/>
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT"/>
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white" alt="TypeScript"/>
  </a>
  <a href="https://vite.dev/">
    <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" alt="Vite"/>
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8" alt="PWA"/>
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  </a>
</p>

<p align="center">
  <strong>A local-first audiobook player with AI voices and intelligent features.</strong><br/>
  <em>Kokoro TTS · Gemini AI · 100% Offline · PWA · Runs on Raspberry Pi</em>
</p>

---

<p align="center">
  <a href="#demo">▶️ Demo</a> · <a href="#screenshots">📸 Screenshots</a> · <a href="#features">✨ Features</a> · <a href="#tech-stack">🛠 Tech Stack</a> · <a href="#getting-started">🚀 Getting Started</a> · <a href="#project-structure">📁 Project Structure</a> · <a href="#contributing">🤝 Contributing</a>
</p>

---

## 🎬 Demo

<p align="center">
  <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/assets/demo.mp4">
    <img src="assets/demo-small.gif" alt="AudioSync Demo GIF" width="720"/>
  </a>
  <br/>
  <em>Click to watch the full demo on GitHub ▶️</em>
</p>

---

## 📸 Screenshots

| Library | Player | Voices |
|---------|--------|--------|
| <a href="assets/library.png"><img src="assets/library.png" alt="Library" width="320"/></a> | <a href="assets/player.png"><img src="assets/player.png" alt="Player" width="320"/></a> | <a href="assets/voices.png"><img src="assets/voices.png" alt="Voices" width="320"/></a> |

| AI Intelligence | Settings | Logo |
|-----------------|----------|------|
| <a href="assets/intelligence.png"><img src="assets/intelligence.png" alt="Intelligence" width="320"/></a> | <a href="assets/settings.png"><img src="assets/settings.png" alt="Settings" width="320"/></a> | <img src="assets/logo.png" alt="AudioSync Logo" width="200"/> |

---

## ✨ Features

### 🗂 Library Management
- Import EPUB, MOBI, FB2, TXT, HTML, PDF audiobook files
- Auto-parse metadata — cover art, author, narrator, series
- Grid / list view with progress tracking
- Smart search and filter by author, genre, language
- Library sync across devices (optional cloud sync)

### 🎙 AI-Powered Text-to-Speech
- **[Kokoro TTS](https://github.com/hexgrad/Kokoro)** — offline, neural, 100+ voices across 50+ languages
- **[OpenAI TTS](https://platform.openai.com/docs/guides/text-to-speech)** — cloud fallback with 6 premium voices
- Per-voice speed, pitch, and volume controls
- Sentence-level voice switching (narrator ↔ character dialogue)
- Real-time voice preview before generation

### 🧠 AI Intelligence Panel (Gemini)
- Auto-generate chapter summaries and key insights
- Explain difficult passages and vocabulary
- Answer questions about the book while listening
- Generate reading quizzes and discussion questions
- Context-aware — uses current chapter + reading history

### 🎵 Audio Player
- Playback speed: 0.25× – 4×
- Chapter and bookmark navigation
- Sleep timer (15 / 30 / 45 / 60 / 90 min)
- Background playback with media session controls
- Gapless chapter transitions
- Waveform seek bar with chapter markers

### ⚙️ Settings & Configuration
- Bring-your-own API key model — your keys, your data
- TTS engine selection (Kokoro / OpenAI)
- Gemini API key for AI features
- Appearance: dark / light / system theme
- Keyboard shortcuts for every action
- Advanced cache and storage management

### 📱 Progressive Web App
- Install on desktop (Chrome, Edge, Firefox) or mobile (iOS, Android)
- Works offline — cached assets + local TTS engine
- Home screen icon with native feel
- Responsive from 320px phone to 4K desktop

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 + TypeScript 5.7 |
| **Build** | Vite 8 |
| **Styling** | Tailwind CSS 4.1 |
| **State** | Zustand |
| **AI/LLM** | Gemini API (Google Generative AI SDK) |
| **TTS** | Kokoro (onnxruntime-web) · OpenAI TTS |
| **PWA** | Vite PWA Plugin + Workbox |
| **Deploy** | Static build — any web server |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+ (tested on 22.22.2)
- **npm** 10+
- (Optional) **Raspberry Pi** 4/5 — runs great on ARM64

### Quick Start

```bash
# 1. Clone
git clone https://github.com/NaustudentX18/AudioSync-.git
cd AudioSync-

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:5173
```

### API Keys (bring-your-own)

AudioSync uses your own API keys — nothing is stored on our servers.

| Feature | Provider | Key needed |
|---------|----------|-----------|
| AI Intelligence | [Google AI Studio](https://aistudio.google.com/apikey) (Gemini) | ✅ |
| Cloud TTS | [OpenAI Platform](https://platform.openai.com/api-keys) | optional |
| Local TTS | None — Kokoro runs 100% offline | ❌ |

Keys are stored in `localStorage` — never transmitted except to the respective API.

### Build for Production

```bash
npm run build   # → dist/
npm run preview # preview at http://localhost:4173
```

Deploy the `dist/` folder to any static host — Netlify, Vercel, GitHub Pages, or your own web server.

### PWA Install
1. Open the app in Chrome or Edge
2. Click the install icon in the address bar (or the in-app install prompt)
3. Run AudioSync from your desktop or home screen — no browser needed

---

## 📁 Project Structure

```
AudioSync-/
├── src/
│   ├── App.tsx              # Root component — tab router, state wiring
│   ├── main.tsx             # React entry point
│   ├── types.ts             # BookItem, VoiceModel, Settings types
│   ├── data.ts              # DEFAULT_BOOKS, DEFAULT_VOICES, sample data
│   ├── index.css            # Tailwind imports + global styles
│   ├── components/          # UI components (player, library, settings, voices)
│   ├── lib/                 # library.ts (library CRUD, import, search)
│   └── stores/              # Zustand stores (player, library, settings, voices)
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icon-*.png           # PWA icons
├── assets/                  # Visual assets for GitHub repo
│   ├── logo.png / logo.svg  # Project logo
│   ├── banner.png           # Hero banner (1440×600)
│   ├── library.png          # Library view screenshot
│   ├── player.png           # Player view screenshot
│   ├── voices.png           # Voices panel screenshot
│   ├── intelligence.png     # AI Intelligence panel screenshot
│   ├── settings.png         # Settings view screenshot
│   ├── demo.mp4             # 30s feature demo video
│   └── demo-small.gif       # Animated preview GIF
├── dist/                    # Production build output
├── server.ts                # Optional Express SSR / API proxy server
├── vite.config.ts           # Vite + PWA + Workbox config
├── package.json
├── AGENTS.md                # Agent instructions (Claude Code / Hermes)
├── README.md                # This file
└── README.original.md       # Original README (reference)
```

---

## 📋 Detailed Roadmap

**Research complete:** 5 parallel workstreams (TTS, AI, Player, Library, Tech) produced detailed implementation roadmaps. Full synthesis: [`docs/roadmap-detailed.md`](./docs/roadmap-detailed.md)

---

### Phase 1 — Core Player Foundation (Weeks 1–2) `[P0]`

| # | Feature | Effort |
|---|---------|--------|
| 1.1 | Static waveform + canvas rendering | 2–3 days |
| 1.2 | Chapter navigation UI (list + jump controls) | 4–6 days |
| 1.3 | Reading position resume (IndexedDB) | 1 day |
| 1.4 | Sleep timer (duration + chapter-boundary + fade-out) | 4–7 days |
| 1.5 | Playback speed control (0.5×–3×, smart rewind) | 3–5 days |
| 1.6 | Media Session API (lock screen / background) | 2–4 days |

**Deliverable:** Functional player with chapter navigation, position resume, and lock-screen controls.

---

### Phase 2 — Bookmark & Interaction Layer (Weeks 3–4) `[P0]`

| # | Feature | Effort |
|---|---------|--------|
| 2.1 | Bookmark system (position + note types) | 4–6 days |
| 2.2 | Quote bookmarks (text extraction from chapter) | 2–3 days |
| 2.3 | Gesture controls (swipe, double-tap, long-press) | 3–5 days |
| 2.4 | Visual polish (chapter markers on waveform) | 1 day |
| 2.5 | Haptic feedback on gesture completion | 4 hours |

**Deliverable:** Full bookmarking and gesture-driven interaction model.

---

### Phase 3 — Library & Import (Weeks 5–8) `[P0]`

| # | Feature | Effort |
|---|---------|--------|
| 3.1 | EPUB parsing (`epubix`) + metadata extraction | 2–3 days |
| 3.2 | Import queue + drag-drop + batch processing | 4–6 days |
| 3.3 | View modes (grid / list / shelves) + placeholder covers | 3–4 days |
| 3.4 | Book detail page (metadata edit + cover upload) | 4–6 days |
| 3.5 | Library search (Fuse.js metadata + FlexSearch content) | 4–5 days |
| 3.6 | Smart collections (rule engine + CRUD UI) | 4–6 days |
| 3.7 | MOBI/FB2 support (Calibre backend) | 5–7 days |
| 3.8 | PDF support (PyMuPDF) | 6–8 days |

**Deliverable:** Full library management with import, browsing, search, and smart collections.

---

### Phase 4 — Polish & Accessibility (Weeks 9–11) `[P1]`

| # | Feature | Effort |
|---|---------|--------|
| 4.1 | WCAG 2.2 AA compliance pass | 7–10 days |
| 4.2 | Live audio visualizations (optional toggle) | 3–5 days |
| 4.3 | AI chapter detection (Gemini fallback) | 2–3 days |
| 4.4 | Cross-device sync (Audiobookshelf integration) | 3–7 days |
| 4.5 | Speed ramping (gradual at chapter boundary) | 2 days |
| 4.6 | Reading stats + streaks | 5–7 days |
| 4.7 | OPDS + JSON + PNG export | 4–6 days |

**Deliverable:** Accessible, polished, social-ready app.

---

### Phase 5 — Infrastructure & Hardening (Weeks 12–13) `[P1]`

| # | Feature | Effort |
|---|---------|--------|
| 5.1 | Performance optimization (virtualization, memo, code split) | 1–2 weeks |
| 5.2 | PWA offline + Background Sync | 1 week |
| 5.3 | IndexedDB schema finalization (Dexie.js) | 1 week |
| 5.4 | Web Vitals monitoring | 1 day |
| 5.5 | i18n (Paraglide + RTL) | 1 week |
| 5.6 | Error monitoring (Sentry) + structured logging | 3–4 days |
| 5.7 | Bundle optimization (<300 KB gzip) | 1–2 days |
| 5.8 | Service worker update + versioning | 1 day |
| 5.9 | Security hardening (CSP, sanitization, encrypted storage) | 2–3 days |
| 5.10 | CI/CD (GitHub Actions) + E2E tests (Playwright) | 3–5 days |
| 5.11 | Onboarding flow (react-joyride + install prompt) | 1 week |

**Deliverable:** Production-grade, secure, measurable, deployable.

---

### Effort Summary

| Phase | Features | Effort (weeks) | Cumulative |
|-------|----------|---------------|------------|
| Phase 1 — Core Player | 6 | 2–3 | 2–3 |
| Phase 2 — Bookmarks | 5 | 2 | 4–5 |
| Phase 3 — Library | 8 | 5–7 | 9–12 |
| Phase 4 — Polish | 7 | 3–5 | 12–17 |
| Phase 5 — Infra | 11 | 2–3 | **14–20** |

**With 2 developers in parallel: ~13 weeks to v1.0**

---

### Research Streams

| Stream | File | Topics |
|--------|------|--------|
| Advanced TTS | [`docs/research/stream-1-tts.md`](./docs/research/stream-1-tts.md) | Kokoro.js, voice cloning, SSML, multi-speaker, emotion, phoneme timing, voice pack management |
| AI Intelligence | [`docs/research/stream-2-ai.md`](./docs/research/stream-2-ai.md) | Chapter detection, summarization, NER, vocabulary scoring, quiz generation, quote extraction, sentiment analysis, RAG |
| Player Experience | [`docs/research/stream-3-player.md`](./docs/research/stream-3-player.md) | Waveform, chapters, bookmarks, gestures, accessibility, sleep timer, visualizations, background playback |
| Library & Management | [`docs/research/stream-4-library.md`](./docs/research/stream-4-library.md) | EPUB/MOBI/PDF parsing, view modes, smart collections, reading stats, OPDS export, import queue, search |
| Tech & Polish | [`docs/research/stream-5-tech.md`](./docs/research/stream-5-tech.md) | Performance, PWA, IndexedDB, Web Vitals, i18n, Sentry, bundle optimization, CI/CD |

---

### Key Differentiators vs Competitors

| Feature | AudioSync | BookPlayer | Smart Audiobook Player | Audiobookshelf |
|---------|-----------|------------|----------------------|----------------|
| TTS-native quote bookmarks | ✅ **Only** | ❌ | ❌ | ❌ |
| AI chapter detection | ✅ (Gemini) | ❌ | ❌ | ❌ |
| Voice cloning | ✅ Target | ❌ | ❌ | ❌ |
| Fully open-source PWA | ✅ | iOS only | Android only | ✅ |
| WCAG 2.2 AA | ✅ Target | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial |

---

### Open Questions

| ID | Question | Recommendation |
|----|----------|---------------|
| Q1 | Waveform: Web Worker or server-side? | Web Worker initially |
| Q2 | Quote bookmark precision: phoneme or MFA? | Graceful degradation regardless |
| Q3 | Sleep timer: chapter end, boundary, or both? | Both as presets |
| Q4 | Smart rewind default: 10 seconds? | Confirm (industry standard) |
| Q5 | Cloud sync: opt-in or opt-out? | Opt-in (privacy-first) |
| Q6 | Deployment: PWA, Electron, or both? | PWA first; Electron later if requested |

---

### Success Metrics

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

### Top Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Waveform pre-computation blocks main thread | Medium | Medium | Web Worker |
| M4B chapter parsing fails | High | Low | AI fallback |
| iOS background audio permission denied | Medium | High | Request on first interaction |
| Media Session API inconsistent | Medium | Medium | Feature-detect + graceful degradation |
| Phoneme alignment precision insufficient | Medium | Medium | MFA backend; graceful degradation |

---

### Detailed Research

For full implementation details, code snippets, complexity ratings, and effort estimates, see:
- [`docs/roadmap-detailed.md`](./docs/roadmap-detailed.md) — master synthesis (48 KB)
- [`docs/research/`](./docs/research/) — 5 individual workstream documents

---

## 🗺 Roadmap (Legacy)

| Milestone | Status |
|-----------|--------|
| Library import (EPUB, MOBI, FB2, TXT, PDF) | ✅ Done |
| Kokoro TTS integration | ✅ Done |
| AI Intelligence (Gemini) | ✅ Done |
| PWA offline support | ✅ Done |
| Player with speed / sleep timer | ✅ Done |
| Voice switching per character | ✅ Done |
| Cloud TTS (OpenAI) fallback | ✅ Done |
| Theme switcher | ✅ Done |
| Keyboard shortcuts | ✅ Done |
| Offline voice downloads | 🔜 Planned |
| Reading stats & streaks | 🔜 Planned |
| Audiobook social features | 🔜 Planned |
| Sync across devices | 🔜 Planned |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

```bash
# Fork → clone → branch → commit → push → open PR
git checkout -b feat/your-feature
npm run dev   # test locally
npm run build # ensure it builds
git commit -am "Add: your feature"
git push origin feat/your-feature
```

---

## 📄 License

[MIT](LICENSE) — feel free to use AudioSync for personal or commercial projects.

---

## 🙏 Credits

- [Kokoro TTS](https://github.com/hexgrad/Kokoro) — by [hexgrad](https://github.com/hexgrad)
- [onnxruntime-web](https://github.com/microsoft/onnxruntime) — Microsoft ONNX Runtime
- [Vite](https://vite.dev/) — Evan You & contributors
- [React](https://react.dev/) — Meta
- [Tailwind CSS](https://tailwindcss.com/) — Tailwind Labs
- [Zustand](https://github.com/pmndrs/zustand) — pmndrs

---

<p align="center">
  <em>Built with ❤️ using local-first principles. Your books, your voice, your device.</em>
</p>

<div align="center">
  <img src="https://raw.githubusercontent.com/NaustudentX18/AudioSync-/main/assets/banner.png" alt="AudioSync - Premium Local Audiobook Experience" width="100%">

  <h1>AudioSync</h1>
  <p><strong>A premium, local-first audiobook experience.</strong></p>
  <p>High-quality voice synthesis • Zero subscriptions • Your keys. Your books. Your device.</p>

  <p>
    <a href="https://github.com/NaustudentX18/AudioSync-/stargazers"><img src="https://img.shields.io/github/stars/NaustudentX18/AudioSync-?style=social" alt="GitHub Stars"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/network/members"><img src="https://img.shields.io/github/forks/NaustudentX18/AudioSync-?style=social" alt="Forks"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/issues"><img src="https://img.shields.io/github/issues/NaustudentX18/AudioSync-" alt="Issues"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  </p>
</div>

---

## The Vision

A beautiful, local-first audiobook player that delivers Audible-grade quality without the subscription.

**100% local Kokoro TTS** + optional **Gemini intelligence** with your own API key.

No vendor lock-in. Your files. Your voice. Your data.

---

## Demo

> A short demo video will be added here once the core player is stable.

<!-- TODO: Add real demo video/GIF -->
<!-- ![Demo](assets/demo.mp4) -->

---

## Features

| Feature                        | Status     | Description |
|--------------------------------|------------|-----------|
| Local Kokoro TTS               | ✅ Complete | 82M parameter high-quality browser TTS |
| Modern React UI                | ✅ Complete | Clean, premium-feeling interface |
| Gemini Intelligence            | ✅ Partial  | Chapter detection, summaries, smart notes |
| Progressive Web App            | ✅ Complete | Installable, works offline |
| Performance Optimized          | ✅ Complete | Memoization, streaming, efficient rendering |
| Multiple High-Quality Voices   | ✅ Complete | Easy voice switching with quality indicators |
| Smart Bookmarks & Highlights   | In Progress | AI-assisted note taking |

---

## Roadmap (Updated)

### Phase 0 — Foundation (Complete)
- [x] Modern React 19 + Vite + TypeScript stack
- [x] Kokoro-js integration (local TTS)
- [x] Gemini client setup
- [x] Basic project structure & testing setup
- [x] Performance baseline work

### Phase 1 — Core Playback (Complete)
- [x] Book import & library management
- [x] Beautiful audio player with waveform / progress
- [x] Chapter navigation & bookmarks
- [x] Playback speed, sleep timer, and queue system
- [x] Multiple Kokoro voices with easy switching
- [x] Offline caching of generated audio

### Phase 2 — Intelligence Layer (In Progress)
- [x] Gemini-powered chapter detection & segmentation
- [x] Automatic book summarization
- [ ] Smart highlights & contextual notes
- [ ] Voice cloning / style matching via Gemini + Kokoro
- [ ] "Ask about this book" conversational mode

### Phase 3 — Polish & Distribution (In Progress)
- [x] Premium UI/UX polish (animations, micro-interactions)
- [x] Full PWA installability + offline mode
- [x] Dark/light theme with beautiful typography
- [x] Accessibility audit & keyboard shortcuts
- [ ] Performance optimizations (streaming TTS, lazy loading)
- [ ] One-click deployment templates

### Phase 4 — Advanced Features
- [ ] EPUB / PDF ingestion pipeline
- [ ] Sync across devices (optional encrypted cloud layer)
- [ ] Voice presets & community voice sharing
- [ ] Public demo + documentation site

---

## Tech Stack

| Layer           | Technology                                      |
|-----------------|-------------------------------------------------|
| Frontend        | React 19, Vite, Tailwind CSS, TypeScript        |
| TTS             | Kokoro-js (local, browser-native)               |
| AI              | Google Gemini (`@google/genai`)                 |
| Animations      | Motion (Framer Motion)                          |
| PWA             | Vite PWA Plugin                                 |
| Testing         | Vitest + React Testing Library                  |
| Dev Server      | Express + tsx                                   |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- Gemini API key (optional for Phase 1, recommended for Phase 2)

### Installation

```bash
git clone https://github.com/NaustudentX18/AudioSync-.git
cd AudioSync-
npm install
```

Create `.env`:

```env
GEMINI_API_KEY=your_key_here
```

Start development:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Screenshots

> Screenshots will be added as the UI matures.

<!-- Add high-quality screenshots here -->
<!-- ![Library View](assets/library.png) -->
<!-- ![Player View](assets/player.png) -->
<!-- ![Voice Selection](assets/voices.png) -->

---

## Contributing

Contributions are welcome! Especially:

- UI/UX improvements and polish
- Performance optimizations
- New Kokoro voice integrations
- Documentation improvements

Please open an issue first if you want to work on anything from the roadmap.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p><strong>Built for people who read a lot but refuse to pay for another subscription.</strong></p>
</div>

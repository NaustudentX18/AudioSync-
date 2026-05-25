<div align="center">
  <img src="assets/banner.png" alt="AudioSync - Premium Local Audiobook Experience" width="100%">

  <h1>AudioSync</h1>
  <p><strong>A premium, local-first audiobook experience.</strong></p>
  <p>High-quality voice synthesis • Zero subscriptions • Your keys. Your books. Your device.</p>

  <p>
    <a href="https://github.com/NaustudentX18/AudioSync-/stargazers"><img src="https://img.shields.io/github/stars/NaustudentX18/AudioSync-?style=social" alt="GitHub Stars"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/network/members"><img src="https://img.shields.io/github/forks/NaustudentX18/AudioSync-?style=social" alt="Forks"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/issues"><img src="https://img.shields.io/github/issues/NaustudentX18/AudioSync-" alt="Issues"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
    <a href="https://github.com/NaustudentX18/AudioSync-/actions"><img src="https://img.shields.io/github/actions/workflow/status/NaustudentX18/AudioSync-/ci.yml" alt="CI Status"></a>
  </p>
</div>

---

## The Problem

You love high-quality audiobooks.  
You hate paying for yet another subscription when you already have too many.

**AudioSync** is the solution: a beautiful, modern audiobook player that runs **entirely locally**, uses **open-source TTS**, and only asks for your own API keys when you want advanced intelligence.

---

## Vision

Deliver an **Audible-grade experience** without the recurring cost:

- 100% local, high-quality voice synthesis via Kokoro
- Smart AI features powered by your own Gemini key
- Premium, installable PWA experience
- No vendor lock-in — your files, your voice, your data

---

## Demo

> A short demo video will be added here once the core player reaches a stable state.

<!-- TODO: Add real demo video/GIF -->
<!-- ![Demo](assets/demo.mp4) -->

---

## Features (Current & Planned)

| Feature                        | Status         | Description |
|--------------------------------|----------------|-----------|
| Local Kokoro TTS               | In Progress    | 82M parameter high-quality browser TTS |
| Modern React UI                | In Progress    | Clean, premium-feeling interface |
| Gemini Intelligence Layer      | Planned        | Chapter detection, summaries, smart notes |
| Progressive Web App            | Planned        | Installable + full offline support |
| Performance Optimizations      | In Progress    | Memoization, streaming, efficient rendering |
| Multiple High-Quality Voices   | Planned        | Easy voice switching with quality indicators |
| Smart Bookmarks & Highlights   | Planned        | AI-assisted note taking |

---

## Roadmap

### Phase 0 — Foundation (Current)
- [x] Modern React 19 + Vite + TypeScript foundation
- [x] Kokoro-js local TTS integration
- [x] Google Gemini client setup
- [x] Testing infrastructure (Vitest)
- [x] Initial performance work

### Phase 1 — Core Playback Experience
- [ ] Book library management & import
- [ ] Beautiful audio player with waveform/progress
- [ ] Chapter navigation & bookmarking
- [ ] Playback controls (speed, sleep timer, queue)
- [ ] Voice selection & quality ratings

### Phase 2 — Intelligence Layer
- [ ] Automatic chapter detection via Gemini
- [ ] Book summarization
- [ ] Contextual highlights & notes
- [ ] Conversational "Ask the book" mode

### Phase 3 — Polish & Experience
- [ ] Full PWA installability + offline caching
- [ ] Premium animations & micro-interactions
- [ ] Accessibility audit & keyboard shortcuts
- [ ] Refined typography and dark/light themes

### Phase 4 — Advanced & Distribution
- [ ] EPUB / PDF ingestion pipeline
- [ ] Optional encrypted cross-device sync
- [ ] Voice preset sharing
- [ ] Public demo deployment

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
- Node.js 20+
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

Start development server:

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

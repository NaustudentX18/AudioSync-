# AudioSync — Architecture Decisions

## Tech Stack
- React 19 + Vite + TypeScript
- Tailwind CSS
- Kokoro-js for local TTS
- Google Gemini for intelligence features
- Framer Motion for animations
- Vite PWA Plugin

## Key Design Decisions

### 1. Local-First TTS
All voice synthesis runs in the browser using Kokoro. No audio is sent to any server.

### 2. BYO-Key Intelligence
Gemini features are optional and require the user's own API key. The app never ships with keys.

### 3. PWA Priority
The app must be installable and work offline after initial load.

### 4. Performance Focus
We prioritize low latency voice generation and smooth UI over feature bloat.

## Folder Structure
```
src/
├── components/
├── lib/           # library.ts, tts.ts, gemini.ts
├── stores/        # state management
├── types/
└── utils/
```

# AudioSync — Feature Research Plan

**Objective:** Research super-detailed feature implementations to take AudioSync from a solid player to a world-class audiobook app.

## Research Workstreams

### Stream 1: Advanced TTS
- Voice cloning / fine-tuning (Coqui XTTS-v2, ElevenLabs Instant Clone, OpenVoice)
- SSML support (pauses, emphasis, pitch, rate per word/phrase)
- Multi-speaker dialogue (character switching within paragraph)
- Emotion/expressiveness controls
- Phoneme-level timing alignment with chapter text
- Background noise reduction / speech enhancement
- Offline voice pack management and lazy loading
- TTS quality comparison benchmarks for local vs cloud

### Stream 2: AI Intelligence
- Chapter detection accuracy: sentence-transformers vs Gemini vs hybrid
- Summarization: abstractive (Gemini) vs extractive (TextRank/BERT) for different reading levels
- Named Entity Recognition for character/location/setting extraction
- Vocabulary difficulty scoring (CEFR levels, Flesch-Kincaid)
- Reading comprehension quiz generation
- Quote extraction + chapter lookup
- Book sentiment analysis over time
- AI Q&A: RAG over book content vs live context window
- Prompt engineering for consistent chapter summaries

### Stream 3: Player Experience
- Waveform/spectrogram rendering (Web Audio API + Canvas + wasm)
- Chapter markers on waveform (clickable, draggable)
- Bookmark types: chapter, position, note, quote
- Reading position sync: per-device, per-book resume
- Background playback: Media Session API, lock screen controls
- Sleep timer with fade-out + smart stop (chapter boundary)
- Playback speed: AI-assisted speed ramp (gradual speedup)
- Audio visualization modes (bars, wave, particles)
- Podcast-style chapter title display (Now Playing overlay)
- Gesture controls (swipe for speed, long-press for bookmark)

### Stream 4: Library & Book Management
- EPUB parsing: Spine extraction, cover art, metadata fallback chain
- MOBI/FB2: library handling (mobi → epub via calibre?)
- PDF audiobook support (text extraction + TTS)
- Library view modes: grid (covers), list (details), shelves (collections)
- Smart collections: by author, series, genre, language, length
- Reading stats: books/year, hours/year, streaks, completion rate
- Book sharing: export reading list as OPDS, book info as JSON/PNG card
- Import queue: drag-drop folder, batch processing
- Book detail page: metadata editor, cover art upload, chapter list editor
- Library search: full-text, fuzzy title, voice filter

### Stream 5: Technical & Polish
- Code-splitting strategy: route-based (lazy load intelligence panel, player)
- Bundle analysis: identify heavy deps (ort-wasm, zustand, react icons)
- Offline-first architecture: IndexedDB for library, cache API for voices
- Service worker: background sync for book imports, pre-cache strategy
- Accessibility: WCAG 2.1 AA, keyboard nav, screen reader labels
- Internationalization: i18n framework selection, locale files structure
- Theming: system dark/light, custom accent color, per-book cover-dominant theme
- Analytics: privacy-first, self-hosted option (Plausible, Umami)
- Error boundaries: graceful degradation for TTS/API failures
- Performance: Core Web Vitals targets, memory limits for TTS

## Output Format

Each stream writes findings to `docs/research/stream-N-name.md` with:
1. Current best practices and state-of-the-art
2. Implementation complexity (Low/Med/High)
3. Dependencies and libraries
4. Code snippets or pseudocode
5. Risk/blocker notes
6. Effort estimate (story points or hours)

## Orchestration

- One orchestrator agent: creates this plan, writes final roadmap
- 5 parallel agents: one per stream, write to their stream file
- After all 5 complete: orchestrator reads all, writes `docs/roadmap-detailed.md`
- Final: update README.md, TODO.md, commit and push

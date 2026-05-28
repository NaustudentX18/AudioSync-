# Stream 3: Player Experience — Feature Research

**Objective:** Research super-detailed feature implementations to take AudioSync from a solid player to a world-class audiobook app.

**Date:** 2026-05-25
**Status:** Research Complete
**Current Baseline:** AudioSync has basic TTS playback (Kokoro), voice selection, speed control, and play/pause. No chapter support, bookmarks, waveform, background playback, or advanced UI features.

---

## Table of Contents

1. [State of the Art (2025–2026)](#1-state-of-the-art-2025--2026)
2. [Feature Deep-Dive](#2-feature-deep-dive)
   - 2.1 [Waveform / Spectrogram Rendering](#21-waveform--spectrogram-rendering)
   - 2.2 [Chapter Navigation & Markers](#22-chapter-navigation--markers)
   - 2.3 [Bookmark System (Position, Note, Quote)](#23-bookmark-system-position-note-quote)
   - 2.4 [Reading Position Sync & Resume](#24-reading-position-sync--resume)
   - 2.5 [Background Playback & Media Session API](#25-background-playback--media-session-api)
   - 2.6 [Sleep Timer with Fade-Out & Smart Stop](#26-sleep-timer-with-fade-out--smart-stop)
   - 2.7 [Playback Speed Control](#27-playback-speed-control)
   - 2.8 [Audio Visualization Modes](#28-audio-visualization-modes)
   - 2.9 [Gesture Controls](#29-gesture-controls)
   - 2.10 [Accessibility (WCAG 2.1 AA)](#210-accessibility-wcag-21-aa)
3. [Implementation Roadmap](#3-implementation-roadmap)
4. [Risks & Blockers](#4-risks--blockers)
5. [Market Leaders: Feature Comparison](#5-market-leaders-feature-comparison)

---

## 1. State of the Art (2025–2026)

### 1.1 Market Overview

The audiobook player market in 2025–2026 is mature but fragmented. Dedicated players compete with general-purpose music apps that have added audiobook support. The gap between basic playback and premium experience is defined by **chapter intelligence**, **bookmarking depth**, and **listening analytics**.

**Three Player Categories:**

| Category | Examples | Strengths | Weaknesses |
|----------|----------|-----------|------------|
| **Dedicated Audiobook Apps** | BookPlayer (iOS), Smart Audiobook Player (Android), Voice (Android), Audiobookshelf | Chapter support, bookmarks, sleep timer, stats | Platform-specific, varying UI quality |
| **General-Purpose + Audiobook Mode** | Audible, Libro.fm, Libby | Massive catalogs, Whispersync, community | Subscription lock-in, limited file format support |
| **Self-Hosted / Open-Source** | Audiobookshelf, Bookava, Cozy (Linux) | Full library control, no tracking, open | Setup complexity, smaller feature sets |

**Key Differentiators in 2026:**
- **Smart sleep timers** that stop at chapter boundaries (Audible, BookPlayer)
- **Cross-device sync** (Whispersync, Audiobookshelf cloud sync)
- **Playback speed ramping** (gradual speed increase over time)
- **Gesture controls** for eyes-free operation
- **Listening statistics** (hours/year, streaks, completion rate)
- **Volume boost / audio normalization** for quiet narrations

---

### 1.2 Leading Open-Source Players

#### BookPlayer (iOS, Open-Source)
- **Stars:** ~3,200 GitHub
- **License:** GPL-3.0
- **Key Features:**
  - Chapter navigation with jump-to-chapter UI
  - Sleep timer with adjustable duration + end-of-chapter stop
  - Smart rewind (configurable rewind on resume)
  - Volume boost (hardware-level audio gain)
  - Lock screen / Control Center integration
  - Cloud sync (BookPlayer Pro, paid)
  - Apple Watch standalone playback
  - VoiceOver accessibility
  - 20+ language translations

#### Smart Audiobook Player (Android, Closed-Source)
- **Installs:** 1M+ on Google Play
- **Key Features:**
  - Chapter bookmarking (automatic + manual)
  - Swipe gestures for chapter navigation
  - Adjustable rewind/forward intervals (1s–1min)
  - Playback speed: 0.5x–4.0x
  - Volume normalization
  - Automatic scanning/organization of library
  - Sleep timer with shake-to-extend
  - Cover art + metadata editing
  - Library search + filtering

#### Voice (Android, Open-Source)
- **Stars:** ~2,000 GitHub
- **License:** Apache-2.0
- **Key Features:**
  - Minimalist, reliability-focused design
  - Bookmark + note-taking
  - Playback speed control
  - Chapter navigation
  - Widget support
  - No tracking, no ads
  - F-Droid distribution

#### Audiobookshelf (Cross-Platform, Open-Source)
- **Stars:** ~12,000 GitHub
- **License:** MIT
- **Key Features:**
  - Self-hosted server + mobile apps (iOS/Android beta)
  - Streaming all audio formats on-the-fly (no pre-conversion)
  - Full library management with series/author/genre
  - Listening stats + streaks
  - Progress sync across devices (cloud or self-hosted)
  - Sleep timer
  - Cast support (Chromecast, AirPlay)
  - Podcast support (RSS feed auto-download)
  - eBook companion (read + listen)

---

### 1.3 Audiobook-Specific Demands

Audiobook players have unique requirements not found in music players:

| Demand | Why It Matters |
|--------|----------------|
| **Chapter granularity** | Books are 8–50+ hours; chapters are the primary navigation unit |
| **Resume accuracy** | Listeners need to return to exact word, not approximate timestamp |
| **Sleep timer with chapter awareness** | Stopping mid-sentence is jarring; chapter boundaries are natural breaks |
| **Speed control without pitch shift** | Narration must remain intelligible at 1.5x–3x speed |
| **Bookmark richness** | Not just position — notes, quotes, and context matter |
| **Progress motivation** | Stats and streaks drive engagement and completion |
| **Long-session comfort** | Volume normalization prevents ear fatigue over hours |

---

## 2. Feature Deep-Dive

### 2.1 Waveform / Spectrogram Rendering

#### Overview

Waveform visualization serves two purposes in audiobook players:
1. **Progress indicator** — shows current position, chapter boundaries, and remaining time
2. **Navigation affordance** — click/drag to seek; waveform preview before jumping

**Waveform types:**
- **Static waveform:** Pre-computed peaks; fast rendering, low memory; shows structure but not live audio
- **Live waveform:** Real-time frequency/waveform data via Web Audio API; higher CPU, more engaging
- **Spectrogram:** Frequency heatmap over time; useful for music, overkill for speech

#### Implementation Options

**Option A: Pre-computed Peaks (Low Complexity, Recommended)**
- Generate waveform data during book import/processing
- Store as downsampled array (1 peak per 100–1000 samples)
- Render on `<canvas>` with simple bar or line drawing
- Pros: Zero runtime CPU, instant render, works offline
- Cons: Requires pre-processing step

```typescript
interface WaveformData {
  peaks: number[];      // Normalized 0–1 amplitude values
  duration: number;     // Total audio duration in seconds
  sampleRate: number;   // Peaks per second
}

// Pre-compute during import (Python or WASM)
async function generateWaveform(audioBuffer: AudioBuffer): Promise<WaveformData> {
  const rawData = audioBuffer.getChannelData(0);
  const samplesPerPeak = Math.floor(rawData.length / 1000);
  const peaks: number[] = [];

  for (let i = 0; i < rawData.length; i += samplesPerPeak) {
    let max = 0;
    for (let j = 0; j < samplesPerPeak && (i + j) < rawData.length; j++) {
      max = Math.max(max, Math.abs(rawData[i + j]));
    }
    peaks.push(max);
  }

  return { peaks, duration: audioBuffer.duration, sampleRate: 1000 };
}

// Render on canvas
function renderWaveform(canvas: HTMLCanvasElement, data: WaveformData, progress: number) {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / data.peaks.length;

  ctx.clearRect(0, 0, width, height);

  data.peaks.forEach((peak, i) => {
    const x = i * barWidth;
    const barHeight = peak * height;
    const isPlayed = (i / data.peaks.length) < progress;

    ctx.fillStyle = isPlayed ? '#f59e0b' : '#3f3f46';
    ctx.fillRect(x, (height - barHeight) / 2, barWidth - 1, barHeight);
  });
}
```

**Option B: Real-time Web Audio API Analyser (Medium Complexity)**
- Connect `<audio>` or `AudioBufferSourceNode` to `AnalyserNode`
- Read `getByteFrequencyData()` in `requestAnimationFrame` loop
- Pros: No pre-processing, shows live audio; Cons: Higher CPU, not persistent

```typescript
class LiveWaveform {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private rafId: number;

  constructor(audioElement: HTMLAudioElement) {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioElement);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  start(canvas: HTMLCanvasElement) {
    const draw = () => {
      this.analyser.getByteFrequencyData(this.dataArray);
      // Render frequency bars...
      this.rafId = requestAnimationFrame(draw);
    };
    draw();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }
}
```

**Option C: wavesurfer.js Integration (Low Complexity)**
- Use [`wavesurfer.js`](https://wavesurfer.xyz/) — battle-tested, 14k stars
- Supports peaks, regions (chapters), markers (bookmarks), zoom, and interaction
- Pros: Feature-complete, actively maintained; Cons: Extra bundle size (~30 KB min)

```typescript
import WaveSurfer from 'wavesurfer.js';

const ws = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#3f3f46',
  progressColor: '#f59e0b',
  cursorColor: '#f59e0b',
  height: 80,
  normalize: true,
  minPxPerSec: 50,
});

// Add chapter regions
ws.on('ready', () => {
  chapters.forEach(ch => {
    ws.addRegion({
      start: ch.startTime,
      end: ch.endTime,
      color: 'rgba(245, 158, 11, 0.1)',
      drag: false,
      click: () => seekTo(ch.startTime),
    });
  });
});
```

#### Recommendation

**Phase 1:** Pre-computed peaks + canvas rendering. Compute peaks during book import (or on-demand in a Web Worker). Store in IndexedDB alongside audio blobs.

**Phase 2:** Add `wavesurfer.js` for richer interaction (zoom, drag-to-seek, chapter regions) once core features stabilize.

#### Implementation Complexity

| Approach | Complexity | Effort | Bundle Impact |
|----------|------------|--------|---------------|
| Pre-computed peaks + canvas | Low | 2–3 days | None |
| wavesurfer.js | Low | 1–2 days | ~30 KB |
| Real-time Web Audio | Medium | 3–5 days | None |
| Spectrogram (3D/Three.js) | High | 1+ weeks | ~50+ KB |

---

### 2.2 Chapter Navigation & Markers

#### Overview

Chapters are the **primary navigation structure** for audiobooks. Unlike music playlists (user-created), chapters are **inferred from the book's structure** — from file splits, embedded metadata, or AI-generated detection.

**Chapter data sources (priority order):**
1. **M4B embedded chapters** — iTunes-style `©chp` atoms; most reliable
2. **File split detection** — multiple files in a folder with sequential names
3. **CD-style split** — fixed duration per "track" (old method)
4. **AI chapter detection** — LLM or ML model infers chapter boundaries from text

#### M4B Chapter Parsing

M4B files embed chapter metadata in `moov.udta.meta.ilst` atoms. JavaScript can extract this via `jsmediatags` or similar:

```typescript
import jsmediatags from 'jsmediatags';

interface Chapter {
  title: string;
  startTime: number;   // seconds
  endTime: number;     // seconds
  index: number;
}

async function readM4BChapters(file: File): Promise<Chapter[]> {
  const tags = await jsmediatags.read(file, {
    onSuccess: (tag) => {
      // Chapter data in tag.tags.chapters (if library supports it)
      // Or parse manually from '©chp' atoms via binary parsing
    }
  });
  return [];
}
```

For more robust parsing, use [`m4b-util`](https://github.com/sandreas/m4b-tool) concepts ported to JS, or delegate to a Python backend with `ffprobe`.

#### AI Chapter Detection (Fallback)

When chapters are unavailable, use the Gemini integration already in AudioSync (Stream 2 research):

```typescript
async function detectChaptersAI(text: string): Promise<Chapter[]> {
  const prompt = `Split this book text into chapters. Return JSON array of {title, startOffset}. Look for "Chapter N" headings and natural section breaks.`;
  const response = await gemini.generate(prompt, text.substring(0, 50000)); // First 50k chars
  return JSON.parse(response);
}
```

#### Chapter UI Components

```typescript
// Chapter list panel
function ChapterList({ chapters, currentTime, onSeek }: ChapterListProps) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {chapters.map((ch, i) => (
        <button
          key={i}
          onClick={() => onSeek(ch.startTime)}
          className={`w-full text-left px-4 py-3 hover:bg-zinc-800 ${
            currentTime >= ch.startTime && currentTime < ch.endTime
              ? 'bg-amber-500/10 border-l-2 border-amber-500'
              : ''
          }`}
        >
          <div className="text-sm font-medium">{ch.title || `Chapter ${i + 1}`}</div>
          <div className="text-xs text-zinc-500">
            {formatTime(ch.startTime)} — {formatTime(ch.endTime)}
          </div>
        </button>
      ))}
    </div>
  );
}

// Chapter jump controls
function ChapterControls({ chapters, currentTime, onNext, onPrev }: ChapterControlsProps) {
  const currentChapter = chapters.findIndex(ch =>
    currentTime >= ch.startTime && currentTime < ch.endTime
  );

  return (
    <div className="flex gap-2">
      <button onClick={onPrev} disabled={currentChapter === 0}>
        ◀ Previous Chapter
      </button>
      <span className="py-2 text-sm text-zinc-400">
        Chapter {currentChapter + 1} of {chapters.length}
      </span>
      <button onClick={onNext} disabled={currentChapter === chapters.length - 1}>
        Next Chapter ▶
      </button>
    </div>
  );
}
```

#### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| M4B chapter extraction | Low | 1 day |
| File-split detection | Low | 4 hours |
| AI chapter detection | Medium | 2 days (uses existing Gemini) |
| Chapter list UI | Low | 1 day |
| Chapter jump controls | Low | 4 hours |
| Chapter-aware seeking | Low | 4 hours |
| **Overall** | **Low-Medium** | **4–6 days** |

---

### 2.3 Bookmark System (Position, Note, Quote)

#### Overview

Bookmarks in audiobook players are richer than "save position." They carry **context**: why the listener saved it, what they thought, and which text passage it corresponds to.

**Bookmark types (industry standard):**

| Type | Description | Use Case |
|------|-------------|----------|
| **Position** | Pure timestamp/position | "I'll come back to this exact spot" |
| **Note** | Timestamp + user text | "This reminds me of..." |
| **Quote** | Timestamp + highlighted text | "Great quote: '...'" |
| **Chapter** | Jump to chapter start | Quick chapter review |

#### BookPlayer Feature Set (Open-Source Leader)

BookPlayer supports:
- **Smart rewind:** configurable rewind on resume (5s, 10s, 30s)
- **Bookmark categories:** visual organization
- **Note editing:** rich text attached to position
- **Chapter bookmarks:** auto-generated at chapter starts
- **Sharing:** export bookmarks as text/JSON

#### Implementation Design

```typescript
interface Bookmark {
  id: string;
  bookId: string;
  type: 'position' | 'note' | 'quote';
  position: number;       // seconds
  chapterIndex?: number;
  note?: string;          // User's note text
  quoteText?: string;     // Highlighted passage text
  createdAt: Date;
  updatedAt: Date;
  color?: string;         // Visual tag
}

interface BookmarkStore {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  getBookmarksForBook: (bookId: string) => Bookmark[];
}

// Storage: IndexedDB
const DB_NAME = 'audiosync-bookmarks';
const STORE_NAME = 'bookmarks';

async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await openDB(DB_NAME, 1);
  await db.put(STORE_NAME, {
    ...bookmark,
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
  });
}
```

**Quote extraction** (when text source is available):
```typescript
async function createQuoteBookmark(
  bookId: string,
  position: number,
  chapterText: string,
  windowSeconds: 10   // Extract ±windowSeconds around position
): Promise<Bookmark> {
  // Use chapter text + position to extract quote
  const charOffset = Math.floor((position / chapterDuration) * chapterText.length);
  const start = Math.max(0, charOffset - 200);
  const end = Math.min(chapterText.length, charOffset + 200);
  const quoteText = chapterText.substring(start, end).replace(/\s+/g, ' ').trim();

  return {
    id: crypto.randomUUID(),
    bookId,
    type: 'quote',
    position,
    quoteText: `"${quoteText}..."`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

#### Quote Sync with TTS Text

When TTS is generating speech from text, the player can extract word-level timestamps (via Stream 1's phoneme alignment research) to enable **precise quote selection** by clicking text in the transcript view.

#### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Position bookmark | Low | 4 hours |
| Note bookmark | Low | 4 hours |
| Quote bookmark (text extraction) | Medium | 1 day |
| Bookmark UI (list, edit, delete) | Medium | 2 days |
| IndexedDB persistence | Low | 1 day |
| **Overall** | **Medium** | **4–6 days** |

---

### 2.4 Reading Position Sync & Resume

#### Overview

Position sync saves and restores the listener's exact playback position across sessions and devices. This is table stakes for audiobook apps — listeners expect to pick up where they left off, even after days or weeks.

**Two sync scopes:**

| Scope | Storage | Use Case |
|-------|---------|----------|
| **Per-device** | IndexedDB / localStorage | Single device, offline-first |
| **Cross-device** | Cloud (user's own backend or Audiobookshelf) | Multi-device library sync |

#### Per-Device Resume (Minimum Viable)

Store the last position per book in IndexedDB with a `lastPlayedAt` timestamp:

```typescript
interface PlaybackProgress {
  bookId: string;
  position: number;         // seconds
  chapterIndex: number;
  percentage: number;       // 0–100
  lastPlayedAt: string;     // ISO date
  totalDuration: number;
}

// Save on pause/stop
async function saveProgress(progress: PlaybackProgress): Promise<void> {
  const db = await openDB('audiosync-progress', 1);
  await db.put('progress', progress, progress.bookId);
}

// Restore on book open
async function getProgress(bookId: string): Promise<PlaybackProgress | null> {
  const db = await openDB('audiosync-progress', 1);
  return await db.get('progress', bookId);
}
```

**Resume logic:**
```typescript
// When user opens a book
const progress = await getProgress(bookId);
if (progress && Date.now() - new Date(progress.lastPlayedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
  // Resume if listened to within last 7 days
  audioPlayer.seek(progress.position);
  showToast(`Resumed at ${formatTime(progress.position)}`);
} else {
  // Fresh start or stale resume — ask user
  showResumePrompt(progress);
}
```

#### Cross-Device Sync (Advanced)

Sync progress via Audiobookshelf server or user's own cloud storage:

```typescript
interface SyncPayload {
  bookId: string;
  position: number;
  deviceId: string;
  timestamp: string;
}

// Push progress to server
async function syncProgressToServer(payload: SyncPayload): Promise<void> {
  await fetch(`${AUDIOBOOKSHELF_URL}/api/me/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Poll for remote progress updates (when app resumes)
async function pollRemoteProgress(bookId: string): Promise<void> {
  const response = await fetch(`${AUDIOBOOKSHELF_URL}/api/me/progress/${bookId}`);
  const remote = await response.json();
  // Compare timestamps; use most recent
  if (remote.timestamp > localProgress.lastPlayedAt) {
    await seekTo(remote.position);
  }
}
```

**Conflict resolution:** Use `last-write-wins` with timestamps, or prompt user when positions diverge significantly.

#### Smart Rewind

Smart rewind restarts playback a few seconds before the saved position to re-establish context:

```typescript
const SMART_REWIND_SECONDS = 10; // Configurable: 5, 10, 15, 30

async function resumeWithSmartRewind(bookId: string): Promise<void> {
  const progress = await getProgress(bookId);
  const rewindPosition = Math.max(0, progress.position - SMART_REWIND_SECONDS);
  await seekTo(rewindPosition);
  showToast(`Rewound ${SMART_REWIND_SECONDS}s for context`);
}
```

BookPlayer and Smart Audiobook Player both support this as a user-configurable setting.

#### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Per-device IndexedDB resume | Low | 1 day |
| Smart rewind | Low | 4 hours |
| Cross-device server sync | Medium | 3–5 days |
| Conflict resolution UI | Medium | 1 day |
| Stale-resume detection | Low | 4 hours |
| **Overall** | **Low-Medium** | **3–7 days** |

---

### 2.5 Background Playback & Media Session API

#### Overview

Background playback allows audio to continue when the browser/app is in the background or the device screen is locked. On mobile, this requires **Media Session API** integration to surface lock-screen controls.

**Media Session API** provides:
- Lock screen / notification media controls (play, pause, skip, seek)
- Metadata display (title, author, cover art)
- Handles media button events from headsets/bluetooth
- Background playback continuation (on supported platforms)

#### Implementation

```typescript
class MediaSessionManager {
  private book: BookItem | null = null;

  setup(book: BookItem, audioElement: HTMLAudioElement) {
    this.book = book;

    // Set metadata
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: book.title,
        author: book.author,
        artwork: [
          { src: book.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      // Set action handlers
      navigator.mediaSession.setActionHandler('play', () => audioElement.play());
      navigator.mediaSession.setActionHandler('pause', () => audioElement.pause());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          audioElement.currentTime = details.seekTime;
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        // Jump to previous chapter or rewind 30s
        jumpToPreviousChapter();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Jump to next chapter or skip 30s
        jumpToNextChapter();
      });
    }

    // Sync Media Session state with audio element
    audioElement.addEventListener('play', () => {
      navigator.mediaSession.playbackState = 'playing';
    });
    audioElement.addEventListener('pause', () => {
      navigator.mediaSession.playbackState = 'paused';
    });
  }

  updatePosition(currentTime: number, duration: number) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioElement.playbackRate,
        position: currentTime,
      });
    }
  }

  updateChapter(chapterTitle: string) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapterTitle,
        author: this.book?.author,
        artwork: [{ src: this.book?.coverUrl || '', sizes: '512x512' }],
      });
    }
  }
}
```

**Background playback for TTS-generated audio:**

AudioSync generates audio via TTS, so the flow is:
1. TTS generates audio buffer → decode to `AudioBuffer`
2. Schedule playback via `AudioBufferSourceNode`
3. For background continuity: use `HTMLAudioElement` with blob URL instead of Web Audio API for longer content

```typescript
// For long-form TTS playback, prefer <audio> element
function playTTSLongForm(audioBlob: Blob) {
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  audio.play();

  // Media Session handles background + lock screen
  mediaSessionManager.setup(currentBook, audio);
}
```

#### iOS Considerations

iOS Safari has stricter background audio rules:
- User must have interacted with the page (tap/click)
- Audio must be "dominant" (user-visible playback controls)
- Silent autoplay is blocked

Mitigation: Ensure `audio.play()` is called inside a user gesture handler, and the player UI is visible.

#### Implementation Complexity

| Sub-Feature | Complexity | Effort | Platform Notes |
|-------------|------------|--------|----------------|
| Basic Media Session metadata | Low | 1 day | ChromeOS, Android, Safari 15.4+ |
| Action handlers (play/pause/seek) | Low | 4 hours | All modern browsers |
| Position state updates | Low | 4 hours | — |
| Chapter-adaptive next/prev | Medium | 1 day | Custom logic |
| Background audio permission | Low | 2 hours | iOS: requires user gesture |
| **Overall** | **Low** | **2–4 days** | — |

---

### 2.6 Sleep Timer with Fade-Out & Smart Stop

#### Overview

A sleep timer automatically stops playback after a set duration. Premium implementations add:
- **Fade-out:** Gradually reduce volume over the last N seconds
- **Chapter-boundary stop:** End at a natural chapter break instead of mid-sentence
- **Shake-to-extend:** Physical gesture adds more time (Audible feature)
- **End of chapter + time combo:** Stop at whichever comes first

#### Smart Stop: Chapter Boundary

```typescript
interface SleepTimer {
  mode: 'duration' | 'chapter' | 'chapter-or-duration';
  durationMinutes?: number;  // For duration mode
  fadeSeconds: number;        // Fade-out duration
}

async function setupSleepTimer(settings: SleepTimer): Promise<void> {
  if (settings.mode === 'duration') {
    setTimeout(() => fadeOutAndStop(settings.fadeSeconds), settings.durationMinutes * 60 * 1000);
  } else if (settings.mode === 'chapter') {
    const chapters = getCurrentBookChapters();
    const currentChapter = getCurrentChapterIndex();
    const chapterEndTime = chapters[currentChapter + 1]?.startTime ?? Infinity;
    const timeToChapterEnd = chapterEndTime - getCurrentTime();
    setTimeout(() => fadeOutAndStop(settings.fadeSeconds), timeToChapterEnd * 1000);
  } else if (settings.mode === 'chapter-or-duration') {
    // Use whichever comes first
    const durationMs = (settings.durationMinutes ?? 30) * 60 * 1000;
    const chapters = getCurrentBookChapters();
    const chapterEndTime = chapters[getCurrentChapterIndex() + 1]?.startTime ?? Infinity;
    const timeToChapterEnd = (chapterEndTime - getCurrentTime()) * 1000;
    const actualTimeout = Math.min(durationMs, timeToChapterEnd);
    setTimeout(() => fadeOutAndStop(settings.fadeSeconds), actualTimeout);
  }
}

async function fadeOutAndStop(fadeSeconds: number): Promise<void> {
  const audio = getAudioElement();
  const startVolume = audio.volume;
  const steps = fadeSeconds * 10; // 10 steps per second
  const stepDuration = (fadeSeconds * 1000) / steps;
  const volumeStep = startVolume / steps;

  for (let i = 0; i < steps; i++) {
    await sleep(stepDuration);
    audio.volume = Math.max(0, startVolume - volumeStep * (i + 1));
  }

  audio.pause();
  audio.volume = startVolume; // Reset for next playback
}
```

#### Fade-Out Quality Considerations

- **Linear fade** is perceptually uneven; use **exponential fade** for natural-sounding volume reduction
- **Minimum audible floor:** Fade to ~5% volume (not 0%) to avoid sudden cutoff perception
- **Chapter boundary + fade combo:** Begin fade 10s before chapter end, complete at boundary

```typescript
function exponentialFade(audio: HTMLAudioElement, fadeSeconds: number): Promise<void> {
  return new Promise((resolve) => {
    const startVolume = audio.volume;
    const fadeStart = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - fadeStart) / 1000;
      const progress = Math.min(1, elapsed / fadeSeconds);
      // Exponential decay: volume = start * (1 - t)^2 or similar
      audio.volume = startVolume * Math.pow(1 - progress, 2);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(animate);
  });
}
```

#### Shake-to-Extend

On mobile devices, detect device shake via `DeviceMotionEvent`:

```typescript
function enableShakeToExtend(onExtend: () => void): void {
  let lastAccel = { x: 0, y: 0, z: 0 };
  const shakeThreshold = 15; // m/s²

  window.addEventListener('devicemotion', (e) => {
    const accel = e.accelerationIncludingGravity!;
    const delta = Math.abs(accel.x! - lastAccel.x!) +
                  Math.abs(accel.y! - lastAccel.y!) +
                  Math.abs(accel.z! - lastAccel.z!);
    if (delta > shakeThreshold) {
      onExtend(); // Add 15 minutes
    }
    lastAccel = { x: accel.x!, y: accel.y!, z: accel.z! };
  });
}
```

**iOS requires permission:** `DeviceMotionEvent.requestPermission()` on iOS 13+.

#### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Duration-based timer | Low | 4 hours |
| Chapter-boundary stop | Low | 4 hours |
| Exponential fade-out | Low | 4 hours |
| Chapter-or-duration combo | Medium | 1 day |
| Shake-to-extend (mobile) | Medium | 2 days |
| Timer UI (presets, custom) | Low | 1 day |
| **Overall** | **Low-Medium** | **4–7 days** |

---

### 2.7 Playback Speed Control

#### Overview

Playback speed control is one of the most-used features in audiobook apps. Listeners commonly speed up to 1.25x–2.0x to consume books faster. Key requirements:
- **No pitch distortion** — voice must remain intelligible at higher speeds
- **Wide range:** 0.5x (slow, learning) to 3.0x+ (speed listening)
- **Preset speeds:** Quick-select buttons for common speeds (0.75x, 1x, 1.25x, 1.5x, 2x, 3x)
- **Per-book speed memory:** Remember speed per book

#### Speed Control Without Pitch Distortion

Modern browsers handle this natively via `AudioBufferSourceNode.playbackRate` or `<audio>.playbackRate`:

```typescript
// HTMLAudioElement approach (simpler, better for long-form)
const audio = new Audio(url);
audio.playbackRate = 1.5; // 1.5x speed, pitch automatically preserved

// Web Audio API approach
const source = audioContext.createBufferSource();
source.playbackRate.value = 1.5;
source.connect(audioContext.destination);
```

**Pitch preservation is automatic** in both HTML5 Audio and Web Audio API as of modern browser versions. The `playbackRate` property uses time-stretching algorithms (typically `SoundTouch` or ` Rubber Band` in browsers) to preserve pitch.

**Caveats:**
- Below ~0.5x or above ~3.0x, quality degrades noticeably
- Very short utterances (< 100ms) suffer most from time-stretching artifacts
- Some older browsers (pre-2020) did not preserve pitch — check [caniuse](https://caniuse.com/playback-rate)

#### Per-Book Speed Memory

```typescript
interface BookSettings {
  bookId: string;
  speed: number;
  volume: number;
  smartRewindSeconds: number;
  lastPosition: number;
}

const bookSettings = new Map<string, BookSettings>();

function saveBookSettings(bookId: string, settings: Partial<BookSettings>): void {
  const current = bookSettings.get(bookId) ?? { bookId, speed: 1, volume: 1, smartRewindSeconds: 10, lastPosition: 0 };
  bookSettings.set(bookId, { ...current, ...settings });
  localStorage.setItem(`book-settings-${bookId}`, JSON.stringify(bookSettings.get(bookId)));
}

function getBookSettings(bookId: string): BookSettings {
  const stored = localStorage.getItem(`book-settings-${bookId}`);
  if (stored) return JSON.parse(stored);
  return { bookId, speed: 1, volume: 1, smartRewindSeconds: 10, lastPosition: 0 };
}
```

#### AI-Assisted Speed Ramping (Phase 3)

Gradually increase playback speed over time to help listeners build speed tolerance:

```typescript
interface SpeedRamp {
  enabled: boolean;
  startSpeed: number;    // e.g., 1.0x
  targetSpeed: number;   // e.g., 1.5x
  rampDurationMinutes: number; // e.g., 60 minutes
  startAtSessionMinute: number; // Begin ramping after X min of listening
}

function applySpeedRamp(ramp: SpeedRamp, sessionMinutes: number): number {
  if (!ramp.enabled || sessionMinutes < ramp.startAtSessionMinute) {
    return ramp.startSpeed;
  }
  const effectiveMinutes = sessionMinutes - ramp.startAtSessionMinute;
  const progress = Math.min(1, effectiveMinutes / ramp.rampDurationMinutes);
  const speed = ramp.startSpeed + (ramp.targetSpeed - ramp.startSpeed) * progress;
  return Math.round(speed * 100) / 100; // Round to 2 decimal places
}
```

#### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Basic speed control (0.5x–3x) | Low | 4 hours |
| Preset speed buttons UI | Low | 1 day |
| Per-book speed memory | Low | 4 hours |
| AI-assisted speed ramping | Medium | 2 days |
| **Overall** | **Low-Medium** | **3–5 days** |

---

### 2.8 Audio Visualization Modes

#### Overview

Audio visualizations add visual engagement during playback. They're most useful for music players; audiobook players use them sparingly (waveform/progress bar is the primary visualization).

**Visualization modes:**

| Mode | Description | Use in Audiobook Player |
|------|-------------|------------------------|
| **Waveform / Wave bar** | Frequency bars over time | Primary progress indicator |
| **Oscilloscope (wave)** | Real-time waveform trace | Secondary "now playing" visual |
| **Spectrogram** | Frequency heatmap over time | Music/voice distinction (advanced) |
| **Particles / 3D** | Particle system reacting to audio | Theatrical, battery-intensive |

#### Recommended Modes for AudioSync

**Mode 1: Static Waveform (Primary)**
- Pre-computed peaks (see Section 2.1)
- Rendered on canvas
- Shows chapter boundaries as colored regions

**Mode 2: Live Frequency Bars (Optional Polish)**
- Real-time via `AnalyserNode`
- Low CPU when running at ~30fps
- Visual interest without being distracting

```typescript
class AudioVisualizer {
  private analyser: AnalyserNode;
  private canvas: HTMLCanvasElement;
  private rafId: number;
  private mode: 'bars' | 'wave' | 'none';

  constructor(audioElement: HTMLAudioElement, canvas: HTMLCanvasElement, mode: 'bars' | 'wave' | 'none') {
    this.mode = mode;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioElement);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.canvas = canvas;
  }

  start() {
    if (this.mode === 'none') return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx = this.canvas.getContext('2d')!;

    const draw = () => {
      this.rafId = requestAnimationFrame(draw);

      if (this.mode === 'bars') {
        this.analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const barWidth = (this.canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * this.canvas.height;
          ctx.fillStyle = `rgb(${barHeight + 100}, 158, 11)`; // Amber tint
          ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      } else if (this.mode === 'wave') {
        this.analyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();

        const sliceWidth = this.canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * this.canvas.height) / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }
    };
    draw();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }
}
```

#### Battery Impact

| Mode | CPU Impact | Battery Impact | Recommended |
|------|------------|----------------|-------------|
| None | 0% | 0% | Default for books |
| Static waveform | 0% | 0% | Primary (always show) |
| Live bars | ~2–5% | Moderate | Optional toggle |
| Live wave | ~2–5% | Moderate | Optional toggle |
| 3D particles | ~10–15% | High | Not recommended |

**Recommendation:** Static waveform always on (pre-computed). Live visualizations are optional, disabled by default, and can be toggled off for battery saving.

#### Implementation Complexity

| Mode | Complexity | Effort |
|------|------------|--------|
| Static waveform (peaks + canvas) | Low | 2–3 days |
| Live frequency bars | Low | 1 day |
| Live oscilloscope wave | Low | 1 day |
| Mode toggle UI | Low | 1 day |
| **Overall** | **Low** | **3–5 days** |

---

### 2.9 Gesture Controls

#### Overview

Gesture controls enable **eyes-free operation** — critical for runners, commuters, and bedtime listening where touching the screen is inconvenient or impossible.

**Common gestures in audiobook players:**

| Gesture | Action | Prevalence |
|---------|--------|------------|
| **Swipe left/right** | Seek backward/forward (chapter or time) | High |
| **Double-tap left/right** | Skip -30s / +30s | High |
| **Long press** | Create bookmark at current position | High |
| **Swipe up/down** | Volume up/down | Medium |
| **Two-finger tap** | Play/pause | Medium |
| **Shake** | Extend sleep timer | Medium (mobile only) |

#### Gesture Implementation

Use a gesture library or raw touch event handlers:

```typescript
import { useSwipeable } from 'react-swipeable'; // Popular, well-maintained

function GesturePlayer({ onSeek, onBookmark, onPlayPause }) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onSeek(-30),  // Rewind 30s
    onSwipedRight: () => onSeek(30),  // Forward 30s
    onSwipedUp: () => onVolumeChange(0.1),
    onSwipedDown: () => onVolumeChange(-0.1),
    trackMouse: true,  // Also works on desktop for testing
    preventScrollOnSwipe: true,
  });

  return (
    <div {...handlers} className="gesture-area" onDoubleClick={onBookmark}>
      {/* Player UI */}
    </div>
  );
}
```

**Long-press bookmark:**
```typescript
function useLongPress(callback: () => void, ms: number = 500) {
  const timerRef = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    timerRef.current = setTimeout(callback, ms);
  }, [callback, ms]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { onMouseDown: start, onMouseUp: cancel, onTouchStart: start, onTouchEnd: cancel };
}

// Usage
const { onMouseDown: startBookmarkPress } = useLongPress(() => {
  showToast('Bookmark created');
  createBookmark(getCurrentPosition());
}, 800);
```

#### Smart Audiobook Player Gesture Features

Smart Audiobook Player (Android) includes:
- Swipe between **library, player, and bookmarks** tabs
- Swipe on seek bar for fine-grained seeking
- Configurable gesture actions in settings
- Volume buttons seek when screen is off (headset control)

#### Haptic Feedback

Add haptic feedback on gesture completion for better user experience:

```typescript
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const intensity = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
    navigator.vibrate(intensity);
  }
}
```

#### Implementation Complexity

| Gesture | Complexity | Effort |
|---------|------------|--------|
| Swipe left/right (seek) | Low | 1 day |
| Double-tap skip | Low | 4 hours |
| Long-press bookmark | Low | 4 hours |
| Swipe up/down (volume) | Low | 4 hours |
| Shake (sleep timer extend) | Medium | 1 day (mobile permission) |
| Settings UI for gesture config | Medium | 2 days |
| **Overall** | **Low-Medium** | **3–5 days** |

---

### 2.10 Accessibility (WCAG 2.1 AA)

#### Overview

Accessibility in audiobook players is **especially critical** — many users rely on audio content precisely because of visual impairments, dyslexia, or other reading difficulties. A poor accessibility implementation defeats the purpose.

**WCAG 2.1 AA requirements relevant to AudioSync:**

| Principle | Guideline | Player-Specific Requirement |
|-----------|-----------|----------------------------|
| **Perceivable** | 1.1 Text Alternatives | All icons have `aria-label`; cover art has alt text |
| | 1.2 Time-based Media | Pause/stop controls; no auto-playing audio without user action |
| | 1.3 Adaptable | Semantic HTML; logical tab order |
| | 1.4 Distinguishable | Color contrast ratio ≥ 4.5:1; no color-only indicators |
| **Operable** | 2.1 Keyboard Accessible | All controls reachable via keyboard; no keyboard traps |
| | 2.2 Enough Time | Sleep timer is user-initiated; no time limits on reading |
| | 2.3 Seizures | No flashing content (≤ 3 flashes/second) |
| | 2.4 Navigable | Skip links, descriptive page titles, focus visible |
| | 2.5 Input Modalities | Gesture alternatives via buttons; not gesture-only |
| **Understandable** | 3.1 Readable | Language declared (`lang="en"`); consistent navigation |
| | 3.2 Predictable | Consistent UI; no unexpected context changes |
| | 3.3 Input Assistance | Error messages are descriptive |
| **Robust** | 4.1 Compatible | Valid HTML; ARIA used correctly |

#### Keyboard Navigation Plan

```typescript
// Global keyboard shortcuts
const KEYBOARD_SHORTCUTS = {
  'Space': 'playPause',
  'ArrowLeft': 'rewind10',
  'ArrowRight': 'forward10',
  'ArrowUp': 'volumeUp',
  'ArrowDown': 'volumeDown',
  'b': 'addBookmark',
  'n': 'addNote',
  'c': 'nextChapter',
  'v': 'previousChapter',
  's': 'toggleSleepTimer',
  ',': 'decreaseSpeed',
  '.': 'increaseSpeed',
  'm': 'muteToggle',
};

function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const action = KEYBOARD_SHORTCUTS[e.key];
      if (action && handlers[action]) {
        e.preventDefault();
        handlers[action]();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
```

**Minimum keyboard support:**
- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys for seeking (when player focused)
- Focus visible on all interactive elements

#### Screen Reader Support

```typescript
// Accessible player controls
<button
  onClick={handlePlayPause}
  aria-label={isPlaying ? 'Pause' : 'Play'}
  aria-pressed={isPlaying}
  className="play-button"
>
  {isPlaying ? '⏸ Pause' : '▶ Play'}
</button>

// Progress bar with live region
<div role="slider"
     aria-label="Playback position"
     aria-valuemin="0"
     aria-valuemax={duration}
     aria-valuenow={currentTime}
     aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
     onKeyDown={handleSeekKeyboard}
>
  <div className="progress-fill" style={{ width: `${percentComplete}%` }} />
</div>

// Live region for status updates
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>
```

**Screen reader testing matrix:**
- NVDA (Firefox, Windows)
- JAWS (Chrome, Windows)
- VoiceOver (Safari, macOS/iOS)
- TalkBack (Chrome, Android)

#### Color Contrast Requirements

WCAG 2.1 AA requires:
- **Normal text (< 18pt):** contrast ratio ≥ 4.5:1
- **Large text (≥ 18pt or 14pt bold):** contrast ratio ≥ 3:1
- **UI components:** contrast ratio ≥ 3:1

Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) during design.

#### Implementation Complexity

| Accessibility Feature | Complexity | Effort |
|----------------------|------------|--------|
| Semantic HTML + ARIA labels | Low | 2 days |
| Keyboard navigation (all controls) | Low | 2 days |
| Focus visible styling | Low | 1 day |
| Screen reader testing + fixes | Medium | 3 days |
| Color contrast audit | Low | 1 day |
| **Overall** | **Medium** | **7–10 days** |

---

## 3. Implementation Roadmap

### 3.1 Prioritized Feature Matrix

| Feature | Complexity | Effort | Priority | Dependencies |
|---------|------------|--------|----------|--------------|
| **Waveform visualization (static)** | Low | 2–3 days | P1 | Peak generation utility |
| **Chapter navigation UI** | Low-Medium | 4–6 days | P1 | Chapter extraction, AI detection |
| **Bookmark system (position + note)** | Medium | 4–6 days | P1 | IndexedDB |
| **Reading position resume** | Low | 1 day | P1 | IndexedDB |
| **Media Session API (lock screen)** | Low | 2–4 days | P1 | — |
| **Sleep timer (duration + chapter)** | Low-Medium | 4–7 days | P1 | Chapter support |
| **Playback speed control** | Low-Medium | 3–5 days | P1 | — |
| **Bookmark quotes (text sync)** | Medium | 2–3 days | P2 | Stream 1 phoneme alignment |
| **Gesture controls (swipe/long-press)** | Low-Medium | 3–5 days | P2 | Gesture library |
| **Cross-device position sync** | Medium | 3–7 days | P2 | Server / Audiobookshelf |
| **Audio visualization modes (live)** | Low | 3–5 days | P3 | Web Audio API |
| **AI chapter detection (fallback)** | Medium | 2–3 days | P3 | Gemini (already integrated) |
| **Shake-to-extend sleep timer** | Medium | 2 days | P3 | DeviceMotion API (mobile) |
| **Speed ramping** | Medium | 2 days | P3 | — |
| **WCAG 2.1 AA compliance** | Medium | 7–10 days | P1 (compliance) | — |

### 3.2 Recommended Implementation Order

```
Phase 1 (Weeks 1–2) — Core Player Foundation
├─ Static waveform + canvas rendering
├─ Chapter navigation UI (list + jump controls)
├─ Reading position resume (IndexedDB)
├─ Sleep timer (duration + chapter-boundary)
├─ Playback speed control (0.5x–3x)
└─ Media Session API (lock screen controls)

Phase 2 (Weeks 3–4) — Bookmark & Interaction Layer
├─ Bookmark system (position + note types)
├─ Quote bookmarks (text extraction from chapter)
├─ Gesture controls (swipe seek, long-press bookmark)
├─ Smart rewind (configurable)
└─ Visual polish (chapter markers on waveform)

Phase 3 (Weeks 5–6) — Polish & Accessibility
├─ WCAG 2.1 AA compliance pass
├─ Live audio visualizations (optional toggle)
├─ AI chapter detection (fallback)
├─ Cross-device sync (Audiobookshelf integration)
├─ Speed ramping
└─ Shake-to-extend (mobile)

Phase 4 (Ongoing) — Advanced Features
├─ Audiobookshelf deep integration (catalog sync, library browsing)
├─ Reading statistics (hours/year, streaks)
├─ Book sharing / export features
├─ Chromecast / AirPlay support
└─ Apple Watch / Wear OS companion
```

---

## 4. Risks & Blockers

### 4.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Waveform pre-computation blocks main thread** | Medium | Medium | Use Web Worker for peak generation |
| **M4B chapter parsing fails on some files** | High | Low | Fallback to AI chapter detection; file-split detection |
| **iOS background audio permission denied** | Medium | High | Request permission on first user interaction; document limitation |
| **Media Session API inconsistent across browsers** | Medium | Medium | Feature-detect; graceful degradation on unsupported browsers |
| **Gesture conflicts with native scrolling** | High | Low | Use `preventScrollOnSwipe`; gesture threshold tuning |
| **IndexedDB storage quota exceeded** | Low | High | Implement LRU eviction; warn users before import |
| **Time-stretch artifacts at extreme speeds** | High | Low | Clamp recommended range to 0.75x–2.5x; document quality tradeoffs |
| **Haptic API not available on desktop** | High | Low | Feature-detect; gracefully degrade |

### 4.2 Blockers

1. **Chapter metadata extraction from M4B requires binary parsing or external tool**
   - Blocking: Chapter navigation for M4B files
   - Mitigation: Use `jsmediatags` library + `ffprobe` for robust extraction; fall back to AI detection

2. **PWA background playback on iOS requires native audio element (not Web Audio)**
   - Blocking: TTS-generated audio via Web Audio cannot continue in background on iOS
   - Mitigation: Route long-form playback through `<audio>` blob URLs instead of `AudioBufferSourceNode`; detect iOS and switch path

3. **No existing phoneme alignment in current AudioSync**
   - Blocking: Precise quote bookmark text extraction
   - Mitigation: Implement MFA backend (Python) per Stream 1 research; quote bookmarks degrade gracefully to "position + manual note"

4. **Accessibility audit not yet performed**
   - Blocking: WCAG 2.1 AA compliance certification
   - Mitigation: Schedule dedicated audit sprint; use axe-core automated testing + manual screen reader testing

### 4.3 Open Questions

- **Should chapter markers be embedded in the waveform itself, or shown as a separate chapter list?** Recommendation: Both — waveform shows structure, chapter list shows titles.
- **Should bookmarks sync to the cloud by default, or require explicit user opt-in?** Recommendation: Opt-in to respect privacy-first architecture.
- **Should the sleep timer stop at the end of the current chapter, the next chapter boundary, or offer both?** Recommendation: Offer both as presets.
- **What's the right default for smart rewind?** Recommendation: 10 seconds (industry standard from BookPlayer, Smart Audiobook Player).
- **Should waveform rendering happen in the main thread or a Web Worker?** Recommendation: Pre-computed peaks in Worker; canvas rendering on main thread (fast enough).

---

## 5. Market Leaders: Feature Comparison

### Feature Matrix (2026)

| Feature | AudioSync (Current) | AudioSync (Target) | BookPlayer | Smart Audiobook Player | Audiobookshelf |
|---------|--------------------|--------------------|-----------|----------------------|----------------|
| **Core Playback** |
| Play/Pause | ✅ | ✅ | ✅ | ✅ | ✅ |
| Seek/Scrub | ⚠️ Basic | ✅ Waveform | ✅ | ✅ | ✅ |
| Speed Control | ✅ Basic | ✅ 0.5x–3x | ✅ | ✅ | ✅ |
| Chapter Navigation | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Bookmarks** |
| Position | ❌ | ✅ | ✅ | ✅ | ✅ |
| Notes | ❌ | ✅ | ✅ | ✅ | ✅ |
| Quotes | ❌ | ✅ (Phase 2) | ❌ | ❌ | ❌ |
| **Reading Position** |
| Resume | ⚠️ Manual | ✅ Auto | ✅ | ✅ | ✅ |
| Per-book memory | ❌ | ✅ | ✅ | ✅ | ✅ |
| Smart rewind | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cross-device sync | ❌ | ✅ (Phase 3) | ✅ (Pro) | ❌ | ✅ |
| **Sleep Timer** |
| Duration | ❌ | ✅ | ✅ | ✅ | ✅ |
| Chapter boundary | ❌ | ✅ | ✅ | ✅ | ✅ |
| Fade-out | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Background/Lock Screen** |
| Media Session API | ❌ | ✅ | ✅ | ✅ | ✅ |
| Background playback | ⚠️ Partial | ✅ | ✅ | ✅ | ✅ |
| **Audio Quality** |
| Volume boost | ❌ | TBD | ✅ | ✅ | ✅ |
| Loudness normalization | ❌ | TBD | ❌ | ✅ | ✅ |
| **UI/UX** |
| Waveform | ❌ | ✅ | ❌ | ❌ | ✅ |
| Chapter markers | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gesture controls | ❌ | ✅ (Phase 2) | ❌ | ✅ | ❌ |
| Sleep timer | ❌ | ✅ | ✅ | ✅ | ✅ |
| Listening stats | ❌ | ✅ (Phase 4) | ❌ | ❌ | ✅ |
| **Accessibility** |
| Keyboard navigation | ❌ | ✅ | ✅ | ✅ | ✅ |
| Screen reader support | ❌ | ✅ | ✅ | ✅ | ✅ |
| WCAG 2.1 AA | ❌ | ✅ (Target) | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial |
| **Platform** |
| PWA / Offline | ✅ | ✅ | ❌ (iOS only) | ❌ (Android only) | ✅ |
| Wearable | ❌ | TBD | ✅ (Watch) | ❌ | ❌ |
| Chromecast/AirPlay | ❌ | TBD | ❌ | ❌ | ✅ |

### Key Gaps & Opportunities

1. **Waveform + chapter markers on waveform** — No open-source player (BookPlayer, Voice) offers this; Audiobookshelf does. Differentiator.
2. **TTS-native quote bookmarks** — Sync with text transcript; no existing player has this because they use pre-recorded audio. Differentiator.
3. **AI chapter detection** — Using Gemini (already in AudioSync) as fallback when chapters are missing. Advantage over competitors.
4. **Fully open-source + cross-platform PWA** — BookPlayer is iOS-only; Smart Audiobook Player is Android-only. AudioSync can be both + web.

---

## Appendix: Key Libraries & Resources

### Audio Playback & Visualization

| Library | Purpose | Size | Notes |
|---------|---------|------|-------|
| **wavesurfer.js** | Waveform renderer + regions | ~30 KB | Industry standard; regions for chapters |
| **Web Audio API** | Native browser audio | 0 KB | `AudioContext`, `AnalyserNode`, `AudioBufferSourceNode` |
| **Media Session API** | Lock screen + background | 0 KB | Native browser API |

### Audiobook Metadata & Chapters

| Library | Purpose | Language | Notes |
|---------|---------|----------|-------|
| **jsmediatags** | M4B/MP3 tag reading | JS | Browser-compatible; reads ID3/MP4 atoms |
| **m4b-tool** (reference) | M4B chapter manipulation | Rust | Algorithm reference for JS port |
| **ffprobe** | Audio format probing | CLI | Call from backend; most robust chapter extraction |

### Gesture & Interaction

| Library | Purpose | Size | Notes |
|---------|---------|------|-------|
| **react-swipeable** | Swipe gestures | ~3 KB | React hooks; touch + mouse |
| **use-gesture** | Advanced gestures | ~8 KB | Pinch, rotate, pan, swipe |
| ** Hammer.js** | Touch gesture library | ~12 KB | Mature; vanilla JS |

### Storage & Sync

| Library | Purpose | Notes |
|---------|---------|-------|
| **idb (localForage)** | IndexedDB wrapper | Simple promise-based API |
| **Dexie.js** | IndexedDB ORM | Rich query API, migrations |
| **Workbox** | Service worker caching | Already in AudioSync via Vite PWA |

### Accessibility

| Tool | Purpose |
|------|---------|
| **axe-core** | Automated a11y testing |
| **eslint-plugin-jsx-a11y** | Linting for React accessibility |
| **NVDA / JAWS** | Screen reader testing (Windows) |
| **VoiceOver** | Screen reader testing (macOS/iOS) |
| **TalkBack** | Screen reader testing (Android) |

### Benchmarking & Design

| Resource | Purpose |
|----------|---------|
| **BookPlayer GitHub** | Feature reference, open-source implementation patterns |
| **Smart Audiobook Player (Google Play)** | UX patterns, feature expectations |
| **Audiobookshelf Docs** | Sync protocols, library management |
| **WebAIM WCAG Checklist** | Compliance verification |
| **Material Design Audio Player Guidelines** | Design patterns |

---

*Document generated: 2026-05-25 | AudioSync Research — Stream 3: Player Experience*

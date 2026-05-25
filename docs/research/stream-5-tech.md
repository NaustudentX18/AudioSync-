# Stream 5: Tech/Polish Features — Feature Research

**Project:** AudioSync — Local-first audiobook player  
**Research Date:** 2026-05-25  
**Status:** Research Complete — Ready for Implementation Planning

---

## Overview

This document covers research for **Stream 5: Tech/Polish** features — the technical refinements, performance optimizations, and quality-of-life improvements that elevate AudioSync from a functional player to a polished, production-grade PWA. These features focus on developer experience, user experience, offline reliability, accessibility, and operational excellence.

The current baseline: AudioSync has core playback working but lacks performance optimization, comprehensive error monitoring, accessibility audit, internationalization, and developer tooling.

---

## Table of Contents

1. [Performance Optimization (React & Rendering)](#1-performance-optimization-react--rendering)
2. [PWA Offline Architecture & Caching Strategies](#2-pwa-offline-architecture--caching-strategies)
3. [IndexedDB Storage Optimization](#3-indexeddb-storage-optimization)
4. [Web Vitals & Performance Monitoring](#4-web-vitals--performance-monitoring)
5. [Accessibility (WCAG 2.2 AA Compliance)](#5-accessibility-wcag-22-aa-compliance)
6. [Internationalization (i18n) & Localization](#6-internationalization-i18n--localization)
7. [Error Monitoring & Session Replay](#7-error-monitoring--session-replay)
8. [Bundle Size Optimization](#8-bundle-size-optimization)
9. [Service Worker Update & Versioning Strategy](#9-service-worker-update--versioning-strategy)
10. [Security Hardening](#10-security-hardening)
11. [Developer Experience & CI/CD](#11-developer-experience--cicd)
12. [Onboarding & First-Run Experience](#12-onboarding--first-run-experience)

---

## 1. Performance Optimization (React & Rendering)

### 1.1 State of the Art (2025–2026)

React 19 (released 2025) introduces significant performance improvements:
- **Compiler-level optimizations:** Automatic memoization where possible, reducing need for manual `React.memo`
- **Actions:** Simplified async operations with built-in pending/error states
- **use() hook:** Read resources (promises, context) during render without useEffect
- **Transitions:** Mark non-urgent updates as transitions to keep UI responsive

However, manual optimizations remain critical for large-list rendering, expensive computations, and preventing unnecessary re-renders.

### 1.2 Key Techniques for AudioSync

#### React.memo for Component Memoization

Wrap expensive components that receive props that don't change often:

```typescript
// LibraryBookCard renders for each book in the library
const LibraryBookCard = React.memo(function LibraryBookCard({
  book,
  onPlay,
  onSelect
}: LibraryBookCardProps) {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if book data changed
  return prevProps.book.id === nextProps.book.id &&
         prevProps.book.progress === nextProps.book.progress &&
         prevProps.onPlay === nextProps.onPlay;
});
```

**When to use:** Grid/list items, player controls, chapter list entries.  
**Complexity:** Low. **Effort:** 2–4 hours to audit and memoize top re-render candidates.

#### useMemo for Expensive Computations

Cache results of expensive calculations (e.g., filtering/sorting library, computing statistics):

```typescript
function LibraryView({ books, filter, sortBy }: LibraryViewProps) {
  // Recomputes only when books/filter/sortBy changes
  const processedBooks = useMemo(() => {
    return books
      .filter(b => matchesFilter(b, filter))
      .sort((a, b) => compareBooks(a, b, sortBy));
  }, [books, filter, sortBy]);

  return <BookGrid books={processedBooks} />;
}
```

**When to use:** Library filtering/sorting, stats computation, waveform data processing.  
**Complexity:** Low. **Effort:** 2–3 hours.

#### useCallback for Stable Function References

Prevent child re-renders by stabilizing callback references:

```typescript
function LibraryPage() {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  // Stable reference unless selectedBook changes
  const handleSelectBook = useCallback((bookId: string) => {
    setSelectedBook(bookId);
  }, []); // No deps = never changes

  return (
    <BookList
      books={books}
      onSelect={handleSelectBook} // Child won't re-render unnecessarily
    />
  );
}
```

**Complexity:** Low. **Effort:** 1–2 hours.

#### Virtualization for Long Lists

Render only visible items in long lists (library, chapter list, bookmarks):

**Leading solution: `react-virtuoso`** (2025: 4.5k stars, actively maintained, handles variable heights)

```typescript
import { Virtuoso } from 'react-virtuoso';

function VirtualizedLibrary({ books }: { books: Book[] }) {
  return (
    <Virtuoso
      style={{ height: '100vh' }}
      totalCount={books.length}
      itemContent={(index) => (
        <LibraryBookCard book={books[index]} />
      )}
      overscan={200} // Pre-render 200px outside viewport
    />
  );
}
```

**Alternative:** `@tanstack/react-virtual` (headless, more control).

**Complexity:** Medium. **Effort:** 2–3 days to integrate and tune for library + chapter lists.  
**Impact:** Massive for libraries with 500+ books. Eliminates DOM bloat.

#### Code Splitting & Lazy Loading

Split routes and heavy components:

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const PlayerView = lazy(() => import('./views/PlayerView'));
const LibraryView = lazy(() => import('./views/LibraryView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/player" element={<PlayerView />} />
        <Route path="/library" element={<LibraryView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
    </Suspense>
  );
}
```

Lazy load heavy libraries (waveform, PDF viewer):

```typescript
const Waveform = lazy(() => import('./components/Waveform'));
const PDFViewer = lazy(() => import('./components/PDFViewer'));
```

**Complexity:** Low-Medium. **Effort:** 1–2 days to identify and lazy load non-critical components.  
**Bundle impact:** Initial load reduction of 30–50%.

#### Web Worker for Heavy Processing

Offload expensive work (audio processing, PDF extraction, waveform generation) to Web Workers:

```typescript
// worker.ts
self.onmessage = async (e: MessageEvent<{ audio: ArrayBuffer }>) => {
  const { audio } = e.data;
  const peaks = await computeWaveformPeaks(audio);
  self.postMessage({ peaks });
};

// main thread
const worker = new Worker(new URL('./waveformWorker.ts', import.meta.url));
worker.postMessage({ audio: audioBuffer });
worker.onmessage = (e) => {
  const { peaks } = e.data;
  setWaveformData(peaks);
};
```

**When to use:** Waveform generation, PDF text extraction, audio encoding.  
**Complexity:** Medium. **Effort:** 2–3 days per worker.

#### Debouncing & Throttling

Limit expensive operations (search input, scroll events, resize handlers):

```typescript
import { useDebouncedCallback } from 'use-debounce';

function SearchBar() {
  const [query, setQuery] = useState('');

  // Only fires 300ms after user stops typing
  const onSearch = useDebouncedCallback((value: string) => {
    performSearch(value);
  }, 300);

  return <input onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }} />;
}
```

**Complexity:** Low. **Effort:** 1 day to add debouncing to search and resize handlers.

---

### 1.3 Implementation Roadmap

| Priority | Feature | Complexity | Effort |
|----------|---------|------------|--------|
| P0 | React.memo + useMemo audit | Low | 1 day |
| P0 | Code splitting (routes) | Low | 1 day |
| P1 | Virtualization (library, chapters) | Medium | 2–3 days |
| P1 | Debouncing (search, resize) | Low | 4 hours |
| P2 | Web Workers (waveform, PDF) | Medium | 3–5 days |
| P2 | React 19 migration (if not already) | Medium | 3–5 days |

**Overall Complexity:** Low–Medium  
**Total Effort:** 1–2 weeks

---

### 1.4 Risks & Blockers

- **Virtualization complexity:** Variable-height items (book descriptions) need careful measurement. Use `react-virtuoso`'s `context` property for dynamic heights.
- **Code splitting trade-offs:** Too many splits increase HTTP requests. Balance with manual chunks (`rollupOptions.output.manualChunks`).
- **Web Worker debugging:** Workers can't access DOM. Use `postMessage` and `console.log` in worker; devtools support exists but is limited.

---

## 2. PWA Offline Architecture & Caching Strategies

### 2.1 State of the Art (2025–2026)

PWAs rely on three core technologies: **Service Workers**, **Cache API**, and **Background Fetch API**. The 2025 best practice is a **multi-strategy caching approach** that balances freshness, offline capability, and bandwidth usage.

**Key strategies:**

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Cache-first** | Serve from cache, fall back to network | Static assets (JS, CSS, images, fonts) |
| **Network-first** | Fetch from network, cache on success | API data, dynamic content |
| **Stale-while-revalidate** | Return cached immediately, update in background | Content that changes but can be stale briefly |
| **Cache-only** | Only serve from cache (precached) | App shell, core UI |
| **Network-only** | Always fetch from network | Non-cacheable requests (analytics, payment) |

### 2.2 Implementation for AudioSync

#### AudioSync Caching Strategy Matrix

```typescript
// vite.config.ts with VitePWA
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW', // Or 'injectManifest' for custom SW
      workbox: {
        // Cache static assets with cache-first
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Audio files: cache-first with background update
          {
            urlPattern: /\/api\/audio\/.*\.mp3$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'generated-audio',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // API calls: network-first with cache fallback
          {
            urlPattern: /^https:\/\/api\.audiosync\.dev\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      },
      manifest: {
        name: 'AudioSync',
        short_name: 'AudioSync',
        description: 'Local-first audiobook player with AI TTS',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
```

#### Precaching with InjectManifest (Advanced)

For full control over service worker lifecycle, use `injectManifest` strategy:

```typescript
// public/sw.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache static assets (injected by VitePWA build)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// App shell: cache-first
registerRoute(
  ({ request }) => request.destination === 'document',
  new CacheFirst({
    cacheName: 'app-shell',
    plugins: [new CacheableResponsePlugin({ statuses: [200] })]
  })
);

// Audio blobs: stale-while-revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/audio/'),
  new StaleWhileRevalidate({
    cacheName: 'audio-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
      })
    ]
  })
);

// Background sync for failed uploads
import { BackgroundSyncPlugin } from 'workbox-background-sync';
const bgSyncPlugin = new BackgroundSyncPlugin('audioQueue', {
  maxRetentionTime: 60 * 60 * 24 // 24 hours
});
```

### 2.3 Offline-First Data Flow

```typescript
// IndexedDB for library + bookmarks (offline-first)
interface AudioSyncDB {
  books: Book[];              // Metadata only (text/cover)
  audioCache: AudioBlob[];    // Generated TTS audio blobs
  bookmarks: Bookmark[];
  settings: UserSettings;
  queue: UploadQueue[];       // Pending sync operations
}

// Service Worker + Background Sync API
// When offline, queue writes; sync when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'audio-sync') {
    event.waitUntil(syncQueuedWrites());
  }
});
```

### 2.4 Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| VitePWA basic setup | Low | 2 hours |
| Runtime caching config | Low | 1 day |
| Precaching (injectManifest) | Medium | 2–3 days |
| Background Sync API | Medium | 2 days |
| Offline fallback page | Low | 4 hours |
| Cache versioning + cleanup | Low | 1 day |

**Overall Complexity:** Medium  
**Effort Estimate:** 1 week

---

### 2.5 Risks & Blockers

- **Cache invalidation:** Updating precached assets requires service worker version bump. Use `workbox-window` to detect updates and prompt user.
- **Background Sync support:** Not all browsers support it (Safari partial). Implement graceful degradation.
- **Storage quotas:** Browsers limit IndexedDB + Cache API (typically 50–80% of disk). Monitor usage and implement LRU eviction.
- **Audio blob storage:** Large audiobooks (10+ hours) can be 1–5 GB. Implement chunked caching and user-configurable cache limits.

---

## 3. IndexedDB Storage Optimization

### 3.1 State of the Art (2025–2026)

IndexedDB is the browser's primary client-side database. For audiobooks, it stores:
- Book metadata (title, author, cover)
- Generated TTS audio blobs
- Bookmarks and reading position
- User settings and preferences

**Key libraries (2025):**

| Library | Bundle | Features | Maintenance |
|---------|--------|----------|-------------|
| **idb** (by Jake Archibald) | ~3 KB | Promise-based, minimal, typed | Active |
| **Dexie.js** | ~12 KB | ORM-like, query API, observability | Active |
| **@tanstack/db** | ~8 KB | Reactive, sync, server integration | New (2025) |

**Recommended: `idb`** for simplicity, or **Dexie.js** for complex queries and reactivity.

### 3.2 Schema Design for AudioSync

```typescript
// Using Dexie.js for reactive queries
import Dexie, { Table } from 'dexie';

export interface Book {
  id: string;                    // UUID
  title: string;
  author: string;
  coverUrl?: string;             // Blob URL or base64
  duration: number;              // seconds
  chapters: Chapter[];
  addedAt: Date;
  lastPlayed?: Date;
  progress: number;              // 0–1
}

export interface AudioChunk {
  id: string;
  bookId: string;
  chapterIndex: number;
  chunkIndex: number;            // Sequential chunk for streaming
  blob: Blob;                    // MP3/Opus audio
  duration: number;              // seconds
  createdAt: Date;
}

export interface Bookmark {
  id: string;
  bookId: string;
  position: number;              // seconds
  chapterIndex?: number;
  note?: string;
  quoteText?: string;
  color?: string;
  createdAt: Date;
}

class AudioSyncDB extends Dexie {
  books!: Table<Book>;
  audioChunks!: Table<AudioChunk>;
  bookmarks!: Table<Bookmark>;

  constructor() {
    super('AudioSyncDB');
    this.version(1).stores({
      books: 'id, title, author, addedAt, lastPlayed',
      audioChunks: 'id, bookId, chapterIndex, chunkIndex, createdAt',
      bookmarks: 'id, bookId, position, createdAt'
    });
  }

  // Reactive query: live-updating book list
  getBooks() {
    return this.books.toArray();
  }

  // Get audio chunks for a chapter (streaming)
  async getChapterAudio(bookId: string, chapterIndex: number) {
    return this.audioChunks
      .where(['bookId', 'chapterIndex'])
      .equals([bookId, chapterIndex])
      .sortBy('chunkIndex');
  }
}

export const db = new AudioSyncDB();
```

### 3.3 Chunked Audio Storage Strategy

For long audiobooks, store audio in **5–10 minute chunks** instead of a single blob:

**Benefits:**
- Enables streaming playback (no full download required)
- Easier cache eviction (remove old chunks)
- Parallel fetching (multiple chunks at once)
- Resumable playback (re-fetch failed chunks)

```typescript
interface ChunkedAudioManager {
  // Fetch and cache a chunk
  getChunk(bookId: string, chapterIndex: number, chunkIndex: number): Promise<Blob>;

  // Prefetch next 3 chunks while playing
  prefetch(bookId: string, chapterIndex: number, currentChunk: number): Promise<void>;

  // Evict least-recently-used chunks when storage is full
  evictLRU(maxSizeBytes: number): Promise<void>;
}
```

### 3.4 Storage Quota Management

```typescript
async function getStorageQuota(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return { usage: 0, quota: 0 };
}

async function evictOldestChunks(targetSize: number): Promise<void> {
  const chunks = await db.audioChunks
    .orderBy('createdAt') // Oldest first
    .toArray();

  let freed = 0;
  for (const chunk of chunks) {
    if (freed >= targetSize) break;
    await db.audioChunks.delete(chunk.id);
    freed += chunk.blob.size;
  }
}
```

---

### 3.5 Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Schema design | Low | 4 hours |
| CRUD operations | Low | 1 day |
| Chunked audio storage | Medium | 2–3 days |
| Storage quota + eviction | Medium | 2 days |
| Reactive queries (Dexie) | Low | 4 hours |

**Overall Complexity:** Medium  
**Effort Estimate:** 1 week

---

### 3.6 Risks & Blockers

- **Quota limits:** Mobile browsers may have strict quotas (as low as 10% of disk). Always check quota before writing and handle `QuotaExceededError`.
- **Blob memory leaks:** Blobs stored in IndexedDB can consume significant memory. Revoke object URLs when no longer needed.
- **Index corruption:** IndexedDB can corrupt on abrupt shutdown. Wrap critical operations in retry logic.
- **Encryption:** If adding sync (Phase 4), encrypt data before storing (Web Crypto API).

---

## 4. Web Vitals & Performance Monitoring

### 4.1 Core Web Vitals (2025)

Google's **Core Web Vitals** are the standardized metrics for user experience:

| Metric | Threshold (Good) | Description |
|--------|-----------------|-------------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | Loading performance (when main content appears) |
| **FID** (First Input Delay) | ≤ 100ms | Interactivity (time to first response) |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | Visual stability (unexpected layout shifts) |

**2025 updates:** INP (Interaction to Next Paint) is replacing FID as the official interaction metric in March 2025.

| Metric | Threshold (Good) | Description |
|--------|-----------------|-------------|
| **INP** | ≤ 200ms | Responsiveness to all interactions throughout page lifespan |
| **FCP** | ≤ 1.8s | First Contentful Paint (first visual feedback) |
| **TTFB** | ≤ 800ms | Time to First Byte (server response time) |

### 4.2 Implementation with web-vitals

```typescript
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function initPerformanceMonitoring() {
  // Send to analytics
  const sendToAnalytics = (metric: Metric) => {
    const body = JSON.stringify(metric);
    (navigator.sendBeacon && navigator.sendBeacon('/api/analytics/vitals', body)) ||
      fetch('/api/analytics/vitals', { body, method: 'POST', keepalive: true });
  };

  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

**Target for AudioSync:** LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 on mid-range hardware (Pi 5, mobile).

### 4.3 Custom Performance Marks

Instrument key user flows with User Timing API:

```typescript
// Measure book import time
performance.mark('book-import-start');
await importBook(file);
performance.mark('book-import-end');
performance.measure('book-import', 'book-import-start', 'book-import-end');

// Measure TTS generation latency
performance.mark('tts-start');
const audio = await generateTTS(text);
performance.mark('tts-end');
performance.measure('tts-generation', 'tts-start', 'tts-end');

// Report to analytics
const measures = performance.getEntriesByType('measure');
for (const m of measures) {
  console.log(`${m.name}: ${m.duration}ms`);
}
```

### 4.4 Implementation Complexity

**Complexity:** Low. **Effort:** 1 day to integrate `web-vitals` + custom marks + analytics endpoint.

---

## 5. Accessibility (WCAG 2.2 AA Compliance)

### 5.1 WCAG 2.2 Principles (2025)

WCAG 2.2 (released October 2023) adds 9 new success criteria. AudioSync must meet **WCAG 2.2 Level AA**:

| Principle | Guideline | Key Requirements for AudioSync |
|-----------|-----------|-------------------------------|
| **Perceivable** | Text alternatives | Alt text for icons, audio controls |
| | Captions & transcripts | TTS is audio; provide transcript view |
| | Audio control | Play/pause, volume, speed visible and accessible |
| | Contrast | 4.5:1 for normal text, 3:1 for large text |
| **Operable** | Keyboard accessible | All player controls via keyboard |
| | Enough time | No auto-advance without user control; pause/stop for timers |
| | Seizure safe | No flashing > 3 times/sec |
| | Navigable | Logical heading order, skip links, focus management |
| **Understandable** | Readable | Language attribute on `<html>` |
| | Predictable | Consistent navigation, no unexpected context changes |
| **Robust** | Compatible | Valid HTML, ARIA properly used |

### 5.2 Key Implementation Patterns

#### Keyboard Navigation

```typescript
// Player controls: keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        rewind(10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        forward(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        adjustVolume(0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        adjustVolume(-0.1);
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### Skip Links & Focus Management

```typescript
// Skip to main content link (hidden until focused)
<a href="#main" className="skip-link">Skip to main content</a>

// Manage focus in modals/dialogs
function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Trap focus inside modal
      modalRef.current?.focus();
    }
  }, [isOpen]);

  return isOpen ? (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      {children}
    </div>
  ) : null;
}
```

#### ARIA Labels & Live Regions

```typescript
// Play button with accessible label
<button
  onClick={togglePlay}
  aria-label={isPlaying ? 'Pause' : 'Play'}
  aria-pressed={isPlaying}
>
  {isPlaying ? <PauseIcon /> : <PlayIcon />}
</button>

// Announce player state changes
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {isPlaying ? `Playing: ${currentBook.title}` : 'Paused'}
</div>
```

#### Focus Indicators

```css
/* Visible focus rings for keyboard users */
*:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
}

/* Disable outline for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### 5.3 Screen Reader Testing

Test with:
- **NVDA** (Windows, free)
- **JAWS** (Windows, commercial)
- **VoiceOver** (macOS/iOS, built-in)
- **TalkBack** (Android, built-in)

### 5.4 Color Contrast

Use `@tailwindcss/forms` + custom color tokens meeting 4.5:1 contrast. Tailwind's default zinc palette generally meets AA for text sizes ≥14px.

```css
/* Custom contrast checking (dev only) */
@media (prefers-contrast: high) {
  :root {
    --text-primary: #ffffff;
    --bg-primary: #000000;
  }
}
```

### 5.5 Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Keyboard shortcuts | Low | 1 day |
| ARIA labels + roles | Low | 2 days |
| Focus management | Medium | 2 days |
| Skip links + landmarks | Low | 4 hours |
| Color contrast audit | Low | 4 hours |
| Screen reader testing | Low | 1 day |

**Overall Complexity:** Low–Medium  
**Effort Estimate:** 1 week

---

## 6. Internationalization (i18n) & Localization

### 6.1 State of the Art (2025)

**Recommended: `next-intl`** (if using Next.js) or **`i18next`** (framework-agnostic). For Vite/React without Next.js:

| Library | Bundle | Type-safe | Features |
|---------|--------|-----------|----------|
| **i18next** + **react-i18next** | ~8 KB | No (manual) | Mature, ICU message format, plugins |
| **@inlang/paraglide** | ~5 KB | Yes | Type-safe, Vite/Rollup plugin |
| **lingui** | ~6 KB | Yes | Macro-based, message extraction |

**Recommended for AudioSync:** **Paraglide** (2025: type-safe, minimal bundle, great Vite integration).

### 6.2 Implementation with Paraglide

```typescript
// Setup: npx @inlang/paraglide@latest init
// messages/en.json
{
  "app.title": "AudioSync",
  "player.play": "Play",
  "player.pause": "Pause",
  "player.speed": "Speed",
  "library.empty": "Your library is empty. Import a book to get started."
}

// messages/fr.json (French)
{
  "app.title": "AudioSync",
  "player.play": "Lire",
  "player.pause": "Pause",
  "player.speed": "Vitesse",
  "library.empty": "Votre bibliothèque est vide."
}

// Usage in components
import * as m from '../paraglide/messages';

function PlayButton({ isPlaying }: { isPlaying: boolean }) {
  return (
    <button>
      {isPlaying ? m.player_pause() : m.player_play()}
    </button>
  );
}
```

### 6.3 RTL Support

For Arabic, Hebrew, Persian:

```css
/* RTL-aware layout */
[dir="rtl"] .player-controls {
  flex-direction: row-reverse;
}

[dir="rtl"] .chapter-list {
  padding-right: 0;
  padding-left: 1rem;
}

/* Logical properties (preferred) */
.player-controls {
  gap: 1rem;
  margin-inline-start: 1rem; /* vs margin-left */
  padding-inline: 1rem;
}
```

### 6.4 Date/Time Formatting

Use `@formatjs/intl` for locale-aware date/time:

```typescript
import { format } from '@formatjs/intl';

function formatReadingTime(minutes: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'minute',
    maximumFractionDigits: 0
  }).format(minutes);
}
```

### 6.5 Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Paraglide setup + Vite plugin | Low | 1 day |
| Extract strings to message files | Low | 2 days |
| RTL layout adjustments | Medium | 2 days |
| Locale switcher UI | Low | 1 day |
| Pluralization + ICU messages | Low | 1 day |

**Overall Complexity:** Low–Medium  
**Effort Estimate:** 1 week

---

### 6.6 Risks & Blockers

- **Translation quality:** Machine translation is insufficient for premium product. Budget for professional translation or community contributions.
- **Text expansion:** German, Russian can be 30% longer than English. Test UI layouts with long strings.
- **Audio TTS + i18n:** TTS voices need to match UI language. If user switches UI to French but book is English, TTS should stay English unless French voice available.

---

## 7. Error Monitoring & Session Replay

### 7.1 Sentry vs. LogRocket (2025 Comparison)

| Feature | Sentry | LogRocket |
|---------|--------|-----------|
| **Unhandled errors** | ✅ Automatic | ⚠️ Requires manual capture |
| **Session replay** | ✅ (with sanitization) | ✅ (more features) |
| **Rage click detection** | ✅ (2024+) | ✅ (better UX) |
| **Source maps** | ✅ Wizard (easy) | ✅ CLI (manual) |
| **Performance monitoring** | ✅ Full tracing | ✅ Limited |
| **Backend support** | ✅ All languages | ❌ Frontend-only |
| **Pricing** | Free tier (5k errors/mo) | Free tier (1k sessions/mo) |
| **Self-hosted** | ✅ (open source) | ❌ |

**Recommendation for AudioSync:** **Sentry** — better error capture, backend support if adding FastAPI later, easier source maps, free tier sufficient for small projects.

### 7.2 Sentry Integration

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0, // 100% in dev; reduce to 0.1 in production
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% on errors
  beforeSend(event, hint) {
    // Strip PII (user data, book titles if private)
    if (event.user) {
      delete event.user.ip_address;
    }
    if (event.request?.query_string?.includes('api_key')) {
      event.request.query_string = '[REDACTED]';
    }
    return event;
  }
});
```

**Source maps with Vite:**

```bash
npx @sentry/wizard@latest -i sourcemaps
# Select: Vite
# Creates sentry.properties + vite plugin config
```

```typescript
// vite.config.ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: 'your-org',
      project: 'audiosync'
    })
  ]
});
```

### 7.3 Structured Logging

For client-side logs that need to be debugged:

```typescript
// Structured logger (log levels + context)
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId: string;
}

class Logger {
  private sessionId = crypto.randomUUID();

  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    console[level](message, context); // Dev console

    // Send to backend in production (batched)
    if (import.meta.env.PROD && level === 'error') {
      fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
    }
  }

  error(message: string, error: Error) {
    this.log('error', message, { error: error.message, stack: error.stack });
    Sentry.captureException(error);
  }
}

export const logger = new Logger();
```

### 7.4 Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Sentry setup + config | Low | 4 hours |
| Source maps pipeline | Low-Medium | 1 day |
| PII sanitization | Low | 4 hours |
| Structured logger | Low | 1 day |
| Backend log endpoint | Low | 1 day |

**Overall Complexity:** Low  
**Effort Estimate:** 3–4 days

---

## 8. Bundle Size Optimization

### 8.1 Current Baseline & Target

Target: **< 300 KB gzip** for initial load (app shell + critical code). Current baseline unknown — measure first with:

```bash
npm run build
npx vite-bundle-visualizer  # or rollup-plugin-visualizer
```

### 8.2 Tree Shaking & Dead Code Elimination

**Vite/Rollup** already tree-shakes ES modules. Ensure:
- Use ES module imports (`import`) over CommonJS (`require`)
- Avoid `import * as` (imports entire module)
- Mark side-effect-free modules in `package.json`:

```json
{
  "sideEffects": false
}
```

### 8.3 Code Splitting Strategies

```typescript
// vite.config.ts — manual chunks
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-tts': ['@ricky0123/vad-web', 'kokoro-js'], // TTS libs
          'vendor-db': ['dexie', 'idb'], // Storage
        }
      }
    }
  }
});
```

### 8.4 Compression

Enable gzip + Brotli in production:

```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({ algorithm: 'gzip' }),
    viteCompression({ algorithm: 'brotliCompress' })
  ]
});
```

Serves `.br` files automatically if browser supports Brotli (most do).

### 8.5 Dynamic Imports for Heavy Dependencies

```typescript
// Instead of: import { Kokoro } from 'kokoro-js';
// Lazy load TTS engine only when needed
const loadTTS = async () => {
  const { Kokoro } = await import('kokoro-js');
  return new Kokoro();
};
```

### 8.6 Image Optimization

```typescript
// Convert covers to WebP on import, serve optimized sizes
function optimizeCover(file: File): Promise<Blob> {
  return createImageBitmap(file).then(bitmap => {
    const canvas = new OffscreenCanvas(400, 600);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, 400, 600);
    return canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  });
}
```

### 8.7 Implementation Complexity

**Complexity:** Low. **Effort:** 1–2 days to configure Vite, add compression, split chunks, and audit with visualizer.

---

## 9. Service Worker Update & Versioning Strategy

### 9.1 The Update Problem

Service workers are **sticky** — once installed, they persist until the browser detects a new version. Standard approach: update `sw.js` → browser downloads new SW → waits for all tabs to close → activates.

**Problem:** Users keep the app open for hours (listening to audiobooks). They won't see the update until they close all tabs.

### 9.2 Workbox Update Strategies

**Option A: `autoUpdate` (VitePWA default)**

```typescript
// VitePWA config
VitePWA({
  registerType: 'autoUpdate', // Prompt user when new version available
  workbox: {
    skipWaiting: 'auto', // New SW activates immediately (risky)
    clientsClaim: true   // New SW takes control immediately
  }
})
```

**Behavior:** New SW installs in background, activates immediately, takes control of all clients. Risks: breaking active playback.

**Option B: `prompt` + manual update (Safer)**

```typescript
import { Workbox } from 'workbox-window';

const wb = new Workbox('/sw.js');

wb.addEventListener('waiting', () => {
  // Show toast: "Update available. Refresh now?"
  if (confirm('New version available. Update now?')) {
    wb.messageSkipWaiting();
    window.location.reload();
  }
});
```

**Option C: Background update + seamless reload**

```typescript
// In app.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      // Check for updates every 5 minutes
      const interval = setInterval(() => {
        reg.update();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    });
  }
}, []);
```

### 9.3 Cache Versioning

Always version your caches to avoid stale content:

```typescript
const CACHE_VERSION = 'v2';
const CACHE_NAME = `audiosync-${CACHE_VERSION}`;

// On SW update, delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('audiosync-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});
```

### 9.4 Implementation Complexity

**Complexity:** Low. **Effort:** 1 day to implement update flow + versioning.

---

## 10. Security Hardening

### 10.1 Content Security Policy (CSP)

Define a strict CSP header to prevent XSS:

```typescript
// Express/FastAPI backend
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' https://cdn.sentry.io https://cdn.lr-intake.com",
    "style-src 'self' 'unsafe-inline'", // Tailwind needs inline
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '));
  next();
});
```

### 10.2 Input Sanitization

Sanitize user-uploaded book text, filenames, and notes:

```typescript
import DOMPurify from 'dompurify';

function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML for notes
    ALLOWED_ATTR: []
  });
}
```

### 10.3 Secure Storage

- **IndexedDB:** Not encrypted by default. For sensitive data (user API keys), use `chrome.storage.local` (Chrome) or encrypt before storing (Web Crypto API).
- **localStorage:** Avoid — synchronous, no encryption, easy XSS target.

```typescript
// Encrypt sensitive data with Web Crypto API
async function encryptAndStore(key: string, data: string): Promise<void> {
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    await getEncryptionKey(), // Derived from user passphrase
    new TextEncoder().encode(data)
  );
  await indexedDB.set('encrypted_' + key, encrypted);
}
```

### 10.4 HTTPS Only

- Deploy to HTTPS-only hosts (Vercel, Cloudflare Pages, GitHub Pages with custom domain + HTTPS)
- Set `Strict-Transport-Security` header:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```

### 10.5 Dependency Auditing

```bash
# Check for known vulnerabilities
npm audit

# Use Dependabot (GitHub) or Renovate for automated PRs
```

### 10.6 Implementation Complexity

**Complexity:** Low–Medium. **Effort:** 2–3 days to implement CSP, sanitization, encrypted storage, and audit setup.

---

## 11. Developer Experience & CI/CD

### 11.1 Testing Stack

**Unit Tests:** Vitest (already in package.json)
- Component tests with React Testing Library
- Hook/unit tests for business logic

```typescript
// Example: Book filter logic
import { describe, it, expect } from 'vitest';
import { filterBooks } from './library';

describe('filterBooks', () => {
  it('filters by author', () => {
    const books = [{ title: 'Book1', author: 'Asimov' }, { title: 'Book2', author: 'Heinlein' }];
    expect(filterBooks(books, { author: 'Asimov' })).toHaveLength(1);
  });
});
```

**E2E Tests:** Playwright (2025: best-in-class, supports mobile + desktop)
- Critical paths: import book, play/pause, chapter navigation, bookmark creation

```typescript
// tests/e2e/player.spec.ts
import { test, expect } from '@playwright/test';

test('plays audiobook and creates bookmark', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Import Book');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.epub');
  await page.click('button:has-text("Play")');
  await expect(page.locator('[aria-label="Pause"]')).toBeVisible();
  await page.click('button:has-text("Bookmark")');
  await expect(page.locator('.bookmark-list')).toContainText('Bookmark created');
});
```

### 11.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:e2e
      - run: npm run build
      - run: npm run preview & npx wait-on http://localhost:4173

  lighthouse:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: http://localhost:4173
          budgetPath: ./lighthouse-budget.json
```

### 11.3 Pre-commit Hooks

```bash
# .husky/pre-commit
npm install --save-dev husky lint-staged
npx husky init

# package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### 11.4 Implementation Complexity

**Complexity:** Medium. **Effort:** 3–5 days to set up CI, write initial tests, pre-commit hooks.

---

## 12. Onboarding & First-Run Experience

### 12.1 State of the Art

Best-in-class onboarding for PWAs (2025):
- **Guided tour** (1–2 screens, non-blocking)
- **Permission requests** at point-of-use (not upfront)
- **Progressive disclosure** — show basic features first, advanced later
- **Skip option** always available
- **Skeleton screens** while content loads

### 12.2 AudioSync First-Run Flow

```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for spotlight
  action?: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'import',
    title: 'Import Your First Book',
    description: 'Drag and drop an EPUB, PDF, or TXT file, or use the button below.',
    target: '[data-tour="import"]',
    action: () => fileInputRef.current?.click()
  },
  {
    id: 'tts-voice',
    title: 'Choose a Voice',
    description: 'Pick from 54+ Kokoro voices. Tap the voice icon in the player to change.',
    target: '[data-tour="voice-select"]'
  },
  {
    id: 'offline',
    title: 'Works Offline',
    description: 'AudioSync caches your books and generated audio. Install the app for the best experience.',
    target: '[data-tour="install"]',
    action: () => triggerInstallPrompt()
  }
];

// First-run detection
function useFirstRun() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding };
}
```

### 12.3 Guided Tour Library

**Recommended: `react-joyride`** (mature, customizable, keyboard accessible)

```typescript
import Joyride from 'react-js-joyride';

<Joyride
  steps={onboardingSteps}
  continuous={true}
  showSkipButton={true}
  showProgress={true}
  spotlightClicks={true}
  styles={{
    options: { zIndex: 10000, primaryColor: '#f59e0b' }
  }}
  callback={(data) => {
    if (data.status === 'finished') {
      completeOnboarding();
    }
  }}
/>
```

### 12.4 Skeleton Loading

Show skeleton placeholders while books import:

```typescript
function BookSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] bg-zinc-800 rounded-xl" />
      <div className="mt-2 h-4 bg-zinc-800 rounded w-3/4" />
      <div className="mt-1 h-3 bg-zinc-800 rounded w-1/2" />
    </div>
  );
}
```

### 12.5 Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| First-run detection | Low | 2 hours |
| Guided tour (react-joyride) | Low | 1 day |
| PWA install prompt | Low | 1 day |
| Skeleton loading states | Low | 1 day |
| Welcome email/summary | Medium | 2 days |

**Overall Complexity:** Low–Medium  
**Effort Estimate:** 1 week

---

## 13. Summary: Implementation Roadmap

| Stream | Features | Total Effort |
|--------|----------|-------------|
| **5.1 Performance** | React.memo, virtualization, code splitting, Web Workers | 1–2 weeks |
| **5.2 PWA Offline** | Service worker strategies, caching, Background Sync | 1 week |
| **5.3 IndexedDB** | Schema design, chunked audio, quota management | 1 week |
| **5.4 Web Vitals** | Core Web Vitals monitoring + analytics | 1 day |
| **5.5 A11y** | WCAG 2.2 AA compliance, keyboard nav, ARIA | 1 week |
| **5.6 i18n** | Paraglide + RTL support | 1 week |
| **5.7 Error Monitoring** | Sentry + structured logging | 3–4 days |
| **5.8 Bundle Optimization** | Tree shaking, compression, lazy loading | 1–2 days |
| **5.9 SW Updates** | Versioning, auto-update, seamless reload | 1 day |
| **5.10 Security** | CSP, sanitization, encrypted storage | 2–3 days |
| **5.11 CI/CD** | GitHub Actions, E2E tests, pre-commit hooks | 3–5 days |
| **5.12 Onboarding** | First-run flow, guided tour, install prompt | 1 week |

**Total Effort:** ~6–9 weeks (can parallelize some workstreams)

**Recommended Phasing:**
- **Phase 1 (Week 1–2):** Performance + Bundle Optimization + Web Vitals (speed + size)
- **Phase 2 (Week 3–4):** PWA Offline + IndexedDB + SW Updates (offline reliability)
- **Phase 3 (Week 5–6):** A11y + i18n (usability)
- **Phase 4 (Week 7):** Error Monitoring + Security + CI/CD (operational excellence)
- **Phase 5 (Week 8):** Onboarding (polish)

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| **Lighthouse Performance** | ≥ 90 |
| **Lighthouse Accessibility** | ≥ 95 |
| **Lighthouse Best Practices** | ≥ 90 |
| **Lighthouse SEO** | ≥ 90 |
| **Bundle size (gzip)** | < 300 KB initial |
| **LCP** | ≤ 2.5s on 3G |
| **INP** | ≤ 200ms |
| **CLS** | ≤ 0.1 |
| **Offline support** | App loads + plays cached audio offline |
| **WCAG 2.2 AA** | All critical paths pass audit |

---

## References

- [MDN: Caching — Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox)
- [WCAG 2.2 Overview (W3C WAI)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [web-vitals library](https://github.com/GoogleChrome/web-vitals)
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/vite/)
- [React Performance Optimization (DEV Community, 2025)](https://dev.to/amaresh_adak/react-performance-optimization-from-slow-to-lightning-fast-complete-guide-2025-19hl)
- [Paraglide i18n](https://inlang.com/documentation/paraglide)
- [Dexie.js Documentation](https://dexie.org/)
- [react-virtuoso](https://virtuoso.dev/)

---

**Document Status:** Complete — Ready for implementation planning and task breakdown.

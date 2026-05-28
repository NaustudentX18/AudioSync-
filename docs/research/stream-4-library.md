# Stream 4: Library & Book Management — Feature Research

**Project:** AudioSync — Local-first audiobook player
**Research Date:** 2026-05-25
**Status:** Research Complete — Ready for Implementation Planning

---

## Overview

This document covers research for **Stream 4: Library & Book Management** features as defined in `docs/research/research-plan.md`. Each section covers the state-of-the-art, implementation complexity, dependencies, code snippets, risk notes, and effort estimates. The current AudioSync library is minimal — a `Library` class storing `Book[]` with title, author, filePath, and addedAt. No metadata extraction, view modes, collections, or statistics exist.

---

## Table of Contents

1. [EPUB Parsing: Spine, Cover Art, Metadata](#1-epub-parsing-spine-cover-art-metadata)
2. [MOBI/FB2: Library Handling](#2-mobifb2-library-handling)
3. [PDF Audiobook Support](#3-pdf-audiobook-support)
4. [Library View Modes: Grid, List, Shelves](#4-library-view-modes-grid-list-shelves)
5. [Smart Collections](#5-smart-collections)
6. [Reading Stats](#6-reading-stats)
7. [Book Sharing: OPDS + JSON/PNG Export](#7-book-sharing-opds--jsonpng-export)
8. [Import Queue: Drag-Drop + Batch Processing](#8-import-queue-drag-drop--batch-processing)
9. [Book Detail Page: Metadata Editor + Cover Upload](#9-book-detail-page-metadata-editor--cover-upload)
10. [Library Search: Full-Text + Fuzzy Title](#10-library-search-full-text--fuzzy-title)

---

## 1. EPUB Parsing: Spine, Cover Art, Metadata

**Goal:** Extract complete metadata, cover art, chapter spine, and table of contents from EPUB files entirely client-side.

### State of the Art

EPUB is the dominant format for digital books (EPUB 3.3 is the current W3C standard, January 2026). An EPUB file is a ZIP archive containing:
- `META-INF/container.xml` — points to the root OPF file
- `*.opf` (Open Package Format) — metadata, manifest (resource list), spine (reading order)
- `toc.ncx` or `nav.xhtml` — table of contents
- `OEBPS/` or `EPUB/` — HTML content files, images (including cover)

Metadata fields: `dc:title`, `dc:creator` (author), `dc:language`, `dc:identifier` (ISBN), `dc:publisher`, `dc:date`, `dc:description`, `dc:subject` (tags/genre).

### Library Comparison

| Library | Format | Browser | Node | Metadata | Cover | Spine | Charset | Last Updated |
|---------|--------|---------|------|----------|-------|-------|----------|-------------|
| **epub.js** (futurepress) | JS | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | Active (v0.3+) |
| **epubix** | TypeScript | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 2025-10 |
| **@lingo-reader/epub-parser** | TS | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 2026-04 |
| **epub-metadata-parser** | JS | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 2024 |
| **jw-epub-parser** | JS | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 2022 |

**Recommended: `epubix`** (TypeScript, actively maintained Oct 2025, clean API for metadata + spine + cover extraction in one call) or **`epub.js`** (most mature, battle-tested, 8k+ stars).

### Metadata Fallback Chain

When importing an EPUB, build a cascading metadata resolver:

```
1. OPF <meta> tags (dc:title, dc:creator, dc:language, etc.)
2. META-INF/container.xml defaults
3. Filename as title fallback (strip .epub)
4. User-editable "unknown" placeholder for missing fields
```

For cover art:
```
1. OPF <meta name="cover"> → resolve to manifest item → extract image
2. First <img> in the first content document
3. First image in the manifest
4. No cover — generate gradient placeholder from title initial
```

### Implementation

```typescript
import { Epub } from 'epubix';

interface ParsedBookMeta {
  title: string;
  author: string;
  language: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  subjects: string[];  // genres/tags
  coverUrl?: string;   // data:image/* base64
  chapters: Chapter[];
  spine: SpineItem[];
}

interface Chapter {
  id: string;
  title: string;
  href: string;
  level: number;
}

interface SpineItem {
  idref: string;
  linear: boolean;
}

async function parseEPUB(file: File): Promise<ParsedBookMeta> {
  const arrayBuffer = await file.arrayBuffer();
  const book = await Epub(arrayBuffer);

  const meta = book.meta;
  const toc = book.toc;           // chapters + hierarchy
  const spine = book.spine;       // reading order

  // Cover art
  const cover = book.cover;
  const coverUrl = cover
    ? `data:${cover.mediaType};base64,${cover.data.toString('base64')}`
    : undefined;

  // Extract chapters from TOC
  const chapters: Chapter[] = toc.map(item => ({
    id: item.id,
    title: item.title,
    href: item.href,
    level: item.level || 0,
  }));

  // Spine items
  const spineItems: SpineItem[] = spine.map(s => ({
    idref: s.id,
    linear: s.linear !== false,
  }));

  return {
    title: meta.title || file.name.replace(/\.epub$/i, ''),
    author: Array.isArray(meta.creator) ? meta.creator[0] : (meta.creator || 'Unknown Author'),
    language: meta.language || 'en',
    isbn: meta.isbn,
    publisher: meta.publisher,
    publishedDate: meta.date,
    description: meta.description,
    subjects: meta.subjects || [],
    coverUrl,
    chapters,
    spine: spineItems,
  };
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| EPUB file reading + unzip | Low | 4 hours |
| Metadata extraction (OPF) | Low | 4 hours |
| Cover art extraction | Low-Medium | 1 day |
| Spine / reading order | Low | 4 hours |
| TOC / chapter list | Low | 4 hours |
| Metadata fallback chain | Low | 4 hours |
| **Overall** | **Low** | **2–3 days** |

### Dependencies

```
npm install epubix          # primary: metadata + spine + cover
# or
npm install epub            # alternative (epub.js)
```

### Risks

- **EPUB 2 vs EPUB 3:** epubix supports both but EPUB 3 features (nav.xhtml, media overlays) may differ. Test with both formats.
- **ZIP bomb protection:** Validate EPUB file size before parsing. Cap at ~500 MB.
- **Cover art memory:** Base64-encoded covers bloat IndexedDB. Resize large images to max 400×600 px before storing.
- **Broken EPUBs:** Some publisher EPUBs have malformed OPF. Wrap in try/catch and fall back to filename-based book record.

---

## 2. MOBI/FB2: Library Handling

**Goal:** Accept MOBI and FB2 files in the library. Convert or extract text for TTS playback.

### State of the Art

**MOBI** is Amazon's legacy format (pre-EPUB). It is a proprietary variant of the PalmDOC format. FB2 (FictionBook 2) is an open XML-based Russian format common on book-sharing sites.

Both formats are not natively supported by JavaScript libraries. The standard solution is **server-side conversion via Calibre**, or using a WebAssembly port of ebook-convert tools.

### Conversion Options

| Option | Approach | Pros | Cons | Complexity |
|--------|----------|------|------|------------|
| **Calibre CLI (server-side)** | `ebook-convert input.mobi output.epub` | Highest fidelity, supports all formats | Requires Python + Calibre on server; not client-side | Low (backend) |
| **mobi-js (WASM)** | Pure JS/WASM mobi parser | Client-side possible | Unmaintained since 2018, limited FB2 support | Medium |
| **FB2 → XML parsing** | Parse FB2 XML directly | FB2 is plain XML, straightforward | Only handles FB2, not MOBI | Low |
| **Accept and warn** | Add to library, label as "unsupported for text extraction" | Zero implementation | Poor UX | None |

### Recommended Approach: Hybrid

**Phase 1 (Low — 1 day):** Accept MOBI and FB2 files. Extract what metadata is possible (filename, file size). Store in library but mark as `needsConversion: true`. Show user a notice: "This format requires conversion. Convert to EPUB for best experience."

**Phase 2 (Medium — 3 days):** Add a FastAPI backend endpoint for Calibre conversion:
```
POST /api/convert
  input: File (mobi/fb2)
  output_format: "epub"
  → returns converted EPUB blob
```

Client uploads MOBI/FB2, backend runs `ebook-convert`, returns EPUB which is then parsed normally.

**Phase 3 (Low — 1 day):** For FB2 only, add a pure JS parser (FB2 is XML):
```typescript
// FB2 structure: <FictionBook> → <body> → <section> → <p>
function parseFB2(text: string): ParsedBookMeta {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const title = doc.querySelector('book-title')?.textContent ?? '';
  const author = doc.querySelector('author > first-name')?.textContent + ' ' +
                 doc.querySelector('author > last-name')?.textContent ?? '';
  const sections = Array.from(doc.querySelectorAll('section')).map(s => ({
    title: s.querySelector('title')?.textContent ?? '',
    text: s.textContent ?? '',
  }));
  return { title, author, chapters: sections, ... };
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Accept MOBI/FB2 in file input | Low | 2 hours |
| FB2 XML parsing (client-side) | Low | 1 day |
| Calibre conversion backend endpoint | Medium | 3 days |
| Conversion queue / async handling | Medium | 2 days |
| **Overall (Phase 1+2)** | **Medium** | **5–7 days** |

### Dependencies

```json
{
  "server-side": {
    "calibre": "system package (apt install calibre)",
    "fastapi-file-conversion": "existing backend"
  },
  "client-side FB2": {
    "fb2-parser": "custom (FB2 is plain XML)"
  }
}
```

### Risks

- **Calibre licensing:** Calibre is GPL v3. If you ship a combined work with Calibre's Python code, you must open-source your backend. If it's a separate service called via subprocess, GPL may not apply to your code — consult legal advice.
- **Calibre on Raspberry Pi:** The AudioSync host is a Pi. Calibre works on ARM but conversion is slow (~10–30 seconds/book). Consider showing a progress indicator.
- **FB2 cover art:** FB2 stores cover as a base64-encoded binary within the XML. Must decode and present as image.

---

## 3. PDF Audiobook Support

**Goal:** Extract text from PDF files and feed it to TTS for audiobook playback. Handle scanned PDFs (OCR) and text PDFs differently.

### State of the Art

PDF text extraction has three tiers:

| Tier | Method | Tool | Accuracy | Speed |
|------|--------|------|----------|-------|
| **Text PDF** | Direct text layer extraction | pdf-parse, pdf.js | ~99% | Fast |
| **Scanned PDF** | OCR → text | pdf.js + Tesseract.js | ~85–95% | Slow |
| **Hybrid** | Try text extraction first; fall back to OCR | pdf-parse + Tesseract.js | ~99% | Medium |

**pdf-parse** (by `galkahana`) is the most popular pure JS PDF text extractor (17M+ weekly downloads). Works in both browser and Node.js with zero native dependencies.

**Tesseract.js** (by `naptha`) is a WebAssembly port of Google Tesseract OCR. Can run in-browser but model files are ~20 MB per language.

### Recommended Approach

```typescript
interface PDFExtractionResult {
  text: string;
  pageCount: number;
  pages: { pageNum: number; text: string }[];
  isScanned: boolean;  // heuristic: very low text per page → likely scanned
}

async function extractPDFText(file: File): Promise<PDFExtractionResult> {
  // Tier 1: Fast text extraction
  const arrayBuffer = await file.arrayBuffer();
  const data = await (pdfParse as any)(arrayBuffer);

  const text = data.text.trim();
  const pageCount = data.numpages || 1;
  const isScanned = text.length < pageCount * 50;  // < 50 chars/page = likely scanned

  if (text.length > 0 && !isScanned) {
    return { text, pageCount, pages: paginateText(text, pageCount), isScanned: false };
  }

  // Tier 2: OCR for scanned PDFs (server-side preferred)
  if (isScanned) {
    const ocrText = await ocrPDF(arrayBuffer, pageCount);
    return { text: ocrText, pageCount, pages: paginateText(ocrText, pageCount), isScanned: true };
  }

  return { text: '', pageCount: 0, pages: [], isScanned: false };
}
```

**OCR Implementation (Server-side, Medium Complexity):**
```python
# FastAPI endpoint — use PyMuPDF + pytesseract or pypdf + Tesseract
from fastapi import FastAPI
from pypdf import PdfReader
import pytesseract
from PIL import Image
import io

@app.post("/api/pdf/ocr")
async def ocr_pdf(file: UploadFile):
    reader = PdfReader(io.BytesIO(await file.read()))
    pages = []
    for page in reader.pages:
        if page.extract_text().strip():  # has text layer
            pages.append(page.extract_text())
        else:  # scanned — render to image + OCR
            img = page.to_image()
            text = pytesseract.image_to_string(img)
            pages.append(text)
    return {"pages": pages, "text": "\n\n".join(pages)}
```

### Page-to-Chapter Mapping

For PDFs without chapter metadata, use AI to detect chapters:
```typescript
async function detectPDFChapters(text: string): Promise<Chapter[]> {
  // Use existing Gemini chapter detection (Stream 2 research)
  // Heuristic: split every N pages, ask Gemini to find chapter boundaries
  const pageSize = Math.ceil(text.length / 50);  // ~50 pages per chunk
  const chunks = chunkText(text, pageSize);
  const boundaries = await gemini.detectChapters(chunks.join('\n\n'));
  return boundaries;
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Text PDF extraction (pdf-parse) | Low | 1 day |
| Scanned PDF detection heuristic | Low | 4 hours |
| OCR backend (Tesseract/PyMuPDF) | Medium | 2–3 days |
| Page-to-chapter AI detection | Medium | 2 days |
| PDF thumbnail / cover generation | Low | 1 day |
| **Overall** | **Medium** | **6–8 days** |

### Dependencies

```json
{
  "client": {
    "pdf-parse": "^1.1.1"     // pure JS text extraction
  },
  "server": {
    "pypdf": ">=3.0",          // OR PyMuPDF (faster, more accurate)
    "pytesseract": ">=0.3",    // OCR fallback
    "Pillow": ">=9.0"          // image processing for OCR
  }
}
```

### Risks

- **PDF complexity:** Some PDFs use custom encoding, embedded fonts, or layered content that defeats text extraction. Always implement a fallback.
- **OCR accuracy:** Tesseract accuracy varies wildly by scan quality, font, and language. Consider user-configurable language packs.
- **Large PDFs:** 500-page PDFs produce 200k+ words of text. Chunk TTS generation to avoid memory exhaustion.
- **Tesseract on Pi:** OCR on Raspberry Pi is slow (~30 seconds per page). Use a queued background job with progress bar.

---

## 4. Library View Modes: Grid, List, Shelves

**Goal:** Support three visual presentation modes for the book library: grid (cover-first), list (details-first), and shelves (collections-first).

### State of the Art

Modern audiobook and e-book apps universally support at least two view modes:

| App | Grid | List | Shelves/Collections |
|----|------|------|-------------------|
| **Audible** | ✅ Cover grid | ✅ List | ❌ |
| **Audiobookshelf** | ✅ Cover grid | ✅ List | ✅ Custom shelves |
| **BookPlayer (iOS)** | ✅ Cover grid | ✅ List | ✅ Collections |
| **Smart Audiobook Player** | ✅ Cover grid | ✅ List | ✅ Folders/shelves |
| **Calibre** | ✅ Cover grid | ✅ Details | ✅ Virtual shelves |

### View Mode Comparison

| Mode | Best For | Key Fields | UX Pattern |
|------|----------|------------|------------|
| **Grid** | Browsing by cover art | Cover (240×360), title (2 lines), author, duration | CSS Grid, 2–4 columns, 16:9 aspect ratio |
| **List** | Sorting/filtering by metadata | Title, author, series, duration, progress, last played | Table or flex stack, sortable headers |
| **Shelves** | Organized collections | Shelf name, book count, cover thumbnails | Horizontal scroll, draggable reorder |

### Implementation

```typescript
type ViewMode = 'grid' | 'list' | 'shelves';

interface BookCardProps {
  book: Book;
  viewMode: ViewMode;
  onClick: () => void;
}

// Grid view: cover-dominant card
function GridView({ books, onBookClick }: { books: Book[]; onBookClick: (b: Book) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {books.map(book => (
        <button
          key={book.id}
          onClick={() => onBookClick(book)}
          className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 hover:ring-2 hover:ring-amber-500 transition-all"
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <PlaceholderCover title={book.title} />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="text-sm font-medium truncate">{book.title}</div>
            <div className="text-xs text-zinc-400 truncate">{book.author || 'Unknown'}</div>
          </div>
          {book.progress !== undefined && book.progress > 0 && (
            <div className="absolute bottom-0 left-0 h-1 bg-amber-500" style={{ width: `${book.progress * 100}%` }} />
          )}
        </button>
      ))}
    </div>
  );
}

// List view: detail-dominant rows
function ListView({ books, onBookClick }: { books: Book[]; onBookClick: (b: Book) => void }) {
  return (
    <div className="space-y-1">
      {books.map(book => (
        <button
          key={book.id}
          onClick={() => onBookClick(book)}
          className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors text-left"
        >
          {book.coverUrl && (
            <img src={book.coverUrl} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{book.title}</div>
            <div className="text-sm text-zinc-400 truncate">
              {book.author || 'Unknown'} {book.series ? `· ${book.series}` : ''}
            </div>
          </div>
          <div className="text-xs text-zinc-500 font-mono flex-shrink-0">
            {book.duration ? formatDuration(book.duration) : '—'}
          </div>
          {book.progress !== undefined && (
            <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden flex-shrink-0">
              <div className="h-full bg-amber-500" style={{ width: `${book.progress * 100}%` }} />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// Shelves view: collection cards
function ShelvesView({ shelves, onShelfClick }: { shelves: Shelf[]; onShelfClick: (s: Shelf) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {shelves.map(shelf => (
        <div
          key={shelf.id}
          onClick={() => onShelfClick(shelf)}
          className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer"
        >
          <h3 className="text-lg font-semibold mb-2">{shelf.name}</h3>
          <div className="text-sm text-zinc-400 mb-4">{shelf.bookIds.length} books</div>
          <div className="flex gap-2 overflow-hidden">
            {shelf.books.slice(0, 4).map(book => (
              book.coverUrl ? (
                <img key={book.id} src={book.coverUrl} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />
              ) : (
                <div key={book.id} className="w-10 h-14 rounded bg-zinc-800 flex-shrink-0" />
              )
            ))}
            {shelf.books.length > 4 && (
              <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">
                +{shelf.books.length - 4}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### View Mode Switching

```typescript
// In Library store
const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  viewMode: 'grid' as ViewMode,
  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
    localStorage.setItem('library-view-mode', mode);  // persist preference
  },
  // ...
}));

// Toggle UI
<div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
  {(['grid', 'list', 'shelves'] as ViewMode[]).map(mode => (
    <button
      key={mode}
      onClick={() => setViewMode(mode)}
      className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
        viewMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
      }`}
    >
      {mode === 'grid' ? '⊞' : mode === 'list' ? '☰' : '⊡'} {mode}
    </button>
  ))}
</div>
```

### Placeholder Cover Art

When no cover is available, generate a gradient placeholder:
```typescript
function PlaceholderCover({ title, author }: { title: string; author?: string }) {
  // Hash title to pick consistent color
  const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  const gradient = `linear-gradient(135deg, hsl(${hue}, 40%, 25%) 0%, hsl(${hue + 40}, 30%, 15%) 100%)`;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: gradient }}>
      <span className="text-4xl font-bold text-white/30 select-none">
        {title.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| View mode toggle + persistence | Low | 4 hours |
| Grid view component | Low | 1 day |
| List view component | Low | 1 day |
| Shelves view component | Low | 1 day |
| Placeholder cover art | Low | 4 hours |
| View mode in toolbar | Low | 2 hours |
| **Overall** | **Low** | **3–4 days** |

### Dependencies

```json
{
  // No new deps needed — use existing Tailwind classes
}
```

### Risks

- **Cover art loading:** Remote covers (from OpenLibrary, Google Books API) need caching. Use IndexedDB with TTL (7 days) to avoid re-fetching.
- **Aspect ratio consistency:** Book covers vary (2:3 standard, 1:1 for square). Use `aspect-[2/3]` with `object-cover` to normalize.
- **Shelves layout:** Horizontal shelf scrolling requires careful touch/wheel handling. Use `overflow-x-auto` with `scroll-snap` for smooth UX.

---

## 5. Smart Collections

**Goal:** Automatically organize books into dynamic "shelves" based on metadata rules — by author, series, genre, language, length, or completion status — without manual curation.

### State of the Art

Smart collections (a.k.a. "smart shelves," "dynamic collections," "saved searches") are a standard feature in personal library apps:

| App | Smart Collections | Rules Engine |
|----|------------------|--------------|
| **Calibre** | ✅ Virtual libraries / tags | Tag matching, custom columns |
| **Audiobookshelf** | ✅ Series, author, genre auto-group | Auto-organize settings |
| **BookFusion** | ✅ Smart Queries (title, author, series, tags, status) | SQL-like query builder |
| **Leto** | ✅ Smart collections by multiple params | Rule builder UI |

### Collection Rule Types

| Rule Type | Example | Implementation |
|-----------|---------|----------------|
| **Author match** | All books by "Brandon Sanderson" | `book.author.includes(query)` |
| **Series match** | All books in "Stormlight Archive" | `book.seriesName === query` |
| **Genre / subject** | All "Sci-Fi" or "Fantasy" | `book.subjects.some(s => s.includes(query))` |
| **Language** | All German books | `book.language === 'de'` |
| **Length** | Books longer than 10 hours | `book.duration! >= 36000` |
| **Completion** | Currently reading or finished | `book.progress > 0` or `book.progress >= 0.95` |
| **Unread** | Never started | `book.progress === undefined \|\| book.progress === 0` |
| **Recently added** | Added in the last 30 days | `Date.now() - book.addedAt < 30d` |
| **Custom tag** | User-applied tag | `book.tags.includes(tag)` |

### Implementation

```typescript
type RuleOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';

interface CollectionRule {
  field: 'author' | 'seriesName' | 'subjects' | 'language' | 'duration' | 'progress' | 'addedAt';
  operator: RuleOperator;
  value: string | number | [number, number];
}

interface SmartCollection {
  id: string;
  name: string;
  rules: CollectionRule[];
  matchAll: boolean;  // true = AND, false = OR
  icon?: string;
  color?: string;
}

function matchRule(book: Book, rule: CollectionRule): boolean {
  const field = book[rule.field];
  const val = rule.value;

  switch (rule.operator) {
    case 'equals': return field === val;
    case 'contains': return String(field).toLowerCase().includes(String(val).toLowerCase());
    case 'gt': return Number(field) > Number(val);
    case 'lt': return Number(field) < Number(val);
    case 'gte': return Number(field) >= Number(val);
    case 'lte': return Number(field) <= Number(val);
    case 'between': return Number(field) >= (val as [number, number])[0] && Number(field) <= (val as [number, number])[1];
    default: return false;
  }
}

function getBooksForCollection(books: Book[], collection: SmartCollection): Book[] {
  return books.filter(book =>
    collection.matchAll
      ? collection.rules.every(rule => matchRule(book, rule))
      : collection.rules.some(rule => matchRule(book, rule))
  );
}

// Default smart collections
const DEFAULT_COLLECTIONS: SmartCollection[] = [
  { id: 'all', name: 'All Books', rules: [], matchAll: true },
  { id: 'currently-reading', name: 'Currently Reading', rules: [{ field: 'progress', operator: 'gt', value: 0 }, { field: 'progress', operator: 'lt', value: 0.95 }], matchAll: true },
  { id: 'unread', name: 'Unread', rules: [{ field: 'progress', operator: 'equals', value: 0 }], matchAll: true },
  { id: 'finished', name: 'Finished', rules: [{ field: 'progress', operator: 'gte', value: 0.95 }], matchAll: true },
  { id: 'recent', name: 'Recently Added', rules: [{ field: 'addedAt', operator: 'gte', value: Date.now() - 30 * 86400000 }], matchAll: true },
  { id: 'long', name: 'Long Books (10h+)', rules: [{ field: 'duration', operator: 'gte', value: 36000 }], matchAll: true },
];
```

### Persistence

Store collections in IndexedDB (or localStorage for small libraries):
```typescript
interface SmartCollectionStore {
  collections: SmartCollection[];
  addCollection(collection: SmartCollection): void;
  updateCollection(id: string, updates: Partial<SmartCollection>): void;
  removeCollection(id: string): void;
  getBooks(id: string): Book[];
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Rule engine (filter function) | Low | 1 day |
| Collection CRUD UI | Medium | 2 days |
| Default collections seeding | Low | 4 hours |
| Collection reordering | Low | 4 hours |
| Live collection counts | Low | 4 hours |
| **Overall** | **Low-Medium** | **4–6 days** |

### Dependencies

```json
{}
// Pure TypeScript — no external deps needed
```

### Risks

- **Performance with large libraries:** Re-evaluating 500+ books against 10+ collections on every state change can cause jank. Use `useMemo` with dependency tracking.
- **Rule expressiveness:** Users may want complex rules (AND/OR nesting). Start with flat rule lists; add nested groups in v2.
- **Series name consistency:** Series names vary ("Stormlight Archive" vs "The Stormlight Archive"). Consider fuzzy matching or canonicalize with ISBN-based lookup (OpenLibrary API).

---

## 6. Reading Stats

**Goal:** Track and display reading statistics — total books finished, hours listened, current streak, completion rate, and reading velocity.

### State of the Art

Leading book-tracking apps (2025–2026) surface these statistics:

| Stat | Definition | Used By |
|------|------------|---------|
| **Books / Year** | Count of books completed in calendar year | Goodreads, StoryGraph, Bookly |
| **Hours / Year** | Total listening/reading hours per year | Audiobookshelf, Bookly |
| **Current Streak** | Consecutive days with any listening activity | Bookly, StoryGraph |
| **Completion Rate** | % of started books that reach 100% | BookTracker, Notion templates |
| **Average Speed** | Words/min or hours/book over time | StoryGraph, personal dashboards |
| **Longest Session** | Single-session listening duration | Bookly |
| **Genre Breakdown** | Hours per genre/category | StoryGraph, Calibre |

### Data Model

```typescript
interface ListeningSession {
  id: string;
  bookId: string;
  startTime: number;    // Date.now()
  endTime?: number;
  durationMs: number;
  positionStart: number;  // seconds into book
  positionEnd: number;
}

interface ReadingStats {
  // Lifetime
  totalBooksFinished: number;
  totalHoursListened: number;
  totalSessions: number;
  // Time-based
  booksThisYear: number;
  hoursThisYear: number;
  // Streaks
  currentStreak: number;        // consecutive days
  longestStreak: number;
  lastListeningDate: string | null;  // YYYY-MM-DD
  // Performance
  averageSessionMinutes: number;
  averageBooksPerMonth: number;
  // Genre breakdown
  genreHours: Record<string, number>;
}
```

### Streak Calculation

```typescript
function computeStreak(sessions: ListeningSession[]): { current: number; longest: number } {
  if (sessions.length === 0) return { current: 0, longest: 0 };

  // Get unique listening dates (YYYY-MM-DD), sorted descending
  const dates = [...new Set(
    sessions.map(s => new Date(s.startTime).toISOString().split('T')[0])
  )].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let today = new Date().toISOString().split('T')[0];
  let yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  for (let i = 0; i < dates.length; i++) {
    const expectedDate = i === 0 ? today : subDays(today, i);

    if (dates[i] === expectedDate || (i === 0 && dates[i] === yesterday)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
      if (i === 0) currentStreak = tempStreak;
    } else if (dates[i] < expectedDate) {
      // Streak broken
      break;
    }
  }

  return { current: currentStreak, longest: longestStreak };
}
```

### Stat Persistence

Record a session entry on every play/pause/stop event:
```typescript
// In the player store
const onPause = () => {
  if (sessionStartTime) {
    const session: ListeningSession = {
      id: crypto.randomUUID(),
      bookId: currentBook.id,
      startTime: sessionStartTime,
      endTime: Date.now(),
      durationMs: Date.now() - sessionStartTime,
      positionStart: sessionStartPosition,
      positionEnd: currentPosition,
    };
    saveSession(session);
    recalculateStats();
  }
};
```

### UI Design

```tsx
function StatsOverview({ stats }: { stats: ReadingStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Books Finished" value={stats.totalBooksFinished} sub={`${stats.booksThisYear} this year`} icon="📚" />
      <StatCard label="Hours Listened" value={Math.round(stats.totalHoursListened)} sub={`${Math.round(stats.hoursThisYear)}h this year`} icon="⏱️" />
      <StatCard label="Current Streak" value={`${stats.currentStreak} days`} sub={`Longest: ${stats.longestStreak}`} icon="🔥" />
      <StatCard label="Completion Rate" value={`${Math.round(stats.completionRate * 100)}%`} sub={`of books started`} icon="✅" />
    </div>
  );
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Session recording (on play/pause) | Low | 1 day |
| Stats calculation engine | Medium | 2 days |
| Streak algorithm | Medium | 1 day |
| Stats UI components | Low | 1 day |
| Annual/monthly aggregations | Medium | 1 day |
| Genre breakdown | Medium | 1 day |
| **Overall** | **Medium** | **5–7 days** |

### Dependencies

```json
{
  "date-fns": "^3.0.0"  // date manipulation, or use native Temporal (ES2024+)
}
```

### Risks

- **Streak edge cases:** Timezone handling — sessions at 11 PM local vs 1 AM UTC. Normalize all dates to user's local timezone.
- **Session accuracy:** Pausing/resuming within 2 seconds shouldn't create a new session. Debounce with a 5-second threshold.
- **Data growth:** 1 hour/day × 365 days = ~3,650 sessions/year. IndexedDB handles this easily but consider periodic cleanup of sessions older than 2 years.
- **Privacy:** Stats are personal. Store only in IndexedDB, never sync to cloud without explicit opt-in.

---

## 7. Book Sharing: OPDS + JSON/PNG Export

**Goal:** Allow users to export their library as an OPDS catalog (for use in other e-reader apps) or as individual book cards (JSON metadata, PNG cover + info image).

### State of the Art

**OPDS (Open Publication Distribution System)** is the open standard for ebook catalogs, maintained by the OPDS community. Used by Calibre, Calibre Web, Koreader, FBReader, and all major open-source e-readers.

| Version | Status | Format | Notes |
|---------|--------|--------|-------|
| **OPDS 1.2** | Stable | Atom XML + Acquisition feeds | Widespread support |
| **OPDS 2.0** | Draft (active) | JSON + Readium Web Publication Manifest | Newer clients; not yet universal |

### OPDS 1.2 Export (Recommended)

OPDS 1.2 uses Atom XML feeds. The structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:dc="http://purl.org/dc/terms/">
  <title>AudioSync Library</title>
  <link rel="self" href="/opds/catalog.xml"/>
  <link rel="start" href="/opds/root.xml"/>
  <updated>2026-05-25T12:00:00Z</updated>
  <entry>
    <title>The Way of Kings</title>
    <author><name>Brandon Sanderson</name></author>
    <dc:language>en</dc:language>
    <dc:identifier isbn="9780765365279">9780765365279</dc:identifier>
    <summary>A fantasy epic...</summary>
    <link rel="http://opds-spec.org/image" href="/covers/way-of-kings.jpg" type="image/jpeg"/>
    <link rel="http://opds-spec.org/acquisition" href="/books/way-of-kings.epub" type="application/epub+zip"/>
  </entry>
</feed>
```

```typescript
interface OPDSBook {
  title: string;
  author: string;
  language: string;
  isbn?: string;
  summary?: string;
  coverUrl?: string;
  downloadUrl: string;
  format: string;
}

function generateOPDSFeed(books: Book[], baseUrl: string): string {
  const entries = books.map(book => `
  <entry>
    <title>${escapeXml(book.title)}</title>
    <author><name>${escapeXml(book.author || 'Unknown')}</name></author>
    ${book.isbn ? `<dc:identifier isbn="${book.isbn}">${book.isbn}</dc:identifier>` : ''}
    ${book.language ? `<dc:language>${book.language}</dc:language>` : ''}
    ${book.description ? `<summary>${escapeXml(book.description)}</summary>` : ''}
    ${book.coverUrl ? `<link rel="http://opds-spec.org/image" href="${baseUrl}/covers/${book.id}.jpg" type="image/jpeg"/>` : ''}
    <link rel="http://opds-spec.org/acquisition" href="${baseUrl}/download/${book.id}" type="${book.format}"/>
  </entry>`).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:dc="http://purl.org/dc/terms/">
  <title>AudioSync Library</title>
  <link rel="self" href="${baseUrl}/opds/catalog.xml"/>
  <updated>${new Date().toISOString()}</updated>
  <id>urn:uuid:${crypto.randomUUID()}</id>
${entries}
</feed>`;
}
```

### JSON Export

```typescript
interface LibraryExport {
  version: 1;
  exportedAt: string;
  books: BookMetadata[];
}

function exportLibraryJSON(books: Book[]): string {
  const exportData: LibraryExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    books: books.map(b => ({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      language: b.language,
      seriesName: b.seriesName,
      seriesIndex: b.seriesIndex,
      genres: b.genres,
      duration: b.duration,
      addedAt: b.addedAt.toISOString(),
      coverUrl: b.coverUrl,
    })),
  };
  return JSON.stringify(exportData, null, 2);
}
```

### PNG Card Export (Book Info Card)

Use `html-to-image` or `html2canvas` to render a styled book info card as PNG:

```typescript
import { toPng } from 'html-to-image';

function generateBookCardPNG(book: Book): Promise<string> {
  const node = document.getElementById(`book-card-${book.id}`);
  if (!node) throw new Error('Card not found');

  const dataUrl = await toPng(node, {
    quality: 0.95,
    pixelRatio: 2,      // 2x for retina
    backgroundColor: '#18181b',  // zinc-900
  });
  return dataUrl;
}

// UI: styled card component
function BookInfoCard({ book }: { book: Book }) {
  return (
    <div id={`book-card-${book.id}`} className="w-[400px] p-6 bg-zinc-900 rounded-2xl">
      <div className="flex gap-4">
        {book.coverUrl && <img src={book.coverUrl} className="w-20 h-30 rounded-lg object-cover" />}
        <div>
          <h2 className="text-xl font-bold">{book.title}</h2>
          <p className="text-zinc-400">{book.author}</p>
          {book.seriesName && <p className="text-sm text-amber-500">{book.seriesName}</p>}
        </div>
      </div>
      <div className="mt-4 text-xs text-zinc-500">
        AudioSync • {book.duration ? formatDuration(book.duration) : 'Unknown duration'}
      </div>
    </div>
  );
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| OPDS 1.2 XML feed | Medium | 2 days |
| JSON export (library snapshot) | Low | 4 hours |
| PNG card export (html-to-image) | Low-Medium | 1 day |
| Share dialog / download triggers | Low | 1 day |
| **Overall** | **Medium** | **4–6 days** |

### Dependencies

```json
{
  "html-to-image": "^1.11.11",    // DOM → PNG
  // OPDS: no external dep — pure XML string building
}
```

### Risks

- **OPDS 2.0 vs 1.2:** Start with OPDS 1.2 (Atom XML) for widest compatibility. OPDS 2.0 (JSON) is still a draft and adoption is limited.
- **Cross-origin covers in OPDS:** If covers are data URLs, the OPDS XML file becomes bloated. Use absolute URLs or inline base64 sparingly.
- **Book file access:** OPDS acquisition links require the actual book file to be downloadable. AudioSync stores files locally; for OPDS export, either bundle files or provide placeholder links.
- **PNG rendering:** `html-to-image` has limitations with CSS Grid, Flexbox gaps, and cross-origin images. Test thoroughly and provide a fallback.

---

## 8. Import Queue: Drag-Drop + Batch Processing

**Goal:** Allow users to drop a folder (or select multiple files) to bulk-import books, with progress feedback and error handling for individual file failures.

### State of the Art

Modern file import UX in 2025–2026:
- **Drag-and-drop zone:** Full-workspace drop zone that accepts folders (`webkitdirectory`) and multiple files
- **Batch queue:** Process files one at a time (or in limited parallelism) to avoid memory exhaustion
- **Progress feedback:** Per-file and overall progress bars
- **Error handling:** Individual file failures don't block the queue; report and continue
- **File-type detection:** Accept `.epub`, `.mobi`, `.fb2`, `.pdf`, `.txt` with MIME-type + extension fallback

### Drag-and-Drop Library

**`react-dropzone`** is the de-facto standard (28k+ stars):
```typescript
import { useDropzone } from 'react-dropzone';

function LibraryImportZone({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/epub+zip': ['.epub'],
      'application/x-mobipocket-ebook': ['.mobi'],
      'application/fb2': ['.fb2'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    // Folder upload — requires webkitdirectory flag
    onDrop: (acceptedFiles) => {
      onFilesSelected(acceptedFiles);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 hover:border-zinc-600'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-4xl mb-3">📚</div>
      <p className="text-zinc-300 font-medium">
        {isDragActive ? 'Drop your books here…' : 'Drop books or click to browse'}
      </p>
      <p className="text-sm text-zinc-500 mt-2">
        EPUB, MOBI, FB2, PDF, TXT · Multiple files & folders supported
      </p>
    </div>
  );
}
```

### Batch Queue Processor

```typescript
interface ImportTask {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: Book;
  error?: string;
}

class ImportQueue {
  private queue: ImportTask[] = [];
  private concurrency = 2;  // process 2 files simultaneously

  async enqueue(files: File[]) {
    this.queue = files.map(file => ({ file, status: 'pending' }));
    this.process();
  }

  private async process() {
    while (this.queue.some(t => t.status === 'pending')) {
      const batch = this.queue.filter(t => t.status === 'pending').slice(0, this.concurrency);
      await Promise.all(batch.map(task => this.processTask(task)));
    }
  }

  private async processTask(task: ImportTask) {
    task.status = 'processing';
    this.emit('progress', this.getProgress());

    try {
      task.result = await importBook(task.file);  // parse + add to library
      task.status = 'done';
    } catch (err) {
      task.error = err.message;
      task.status = 'error';
    }

    this.emit('progress', this.getProgress());
  }

  private getProgress() {
    const total = this.queue.length;
    const done = this.queue.filter(t => t.status === 'done' || t.status === 'error').length;
    return { total, done, percent: (done / total) * 100 };
  }
}
```

### Import Progress UI

```tsx
function ImportProgress({ queue }: { queue: ImportTask[] }) {
  const progress = useDerivedValue(() => ({
    total: queue.length,
    done: queue.filter(t => t.status === 'done').length,
    errors: queue.filter(t => t.status === 'error').length,
  }), [queue]);

  return (
    <div className="mt-4 p-4 bg-zinc-900 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Importing…</span>
        <span className="text-xs text-zinc-500">{progress.done}/{progress.total}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${(progress.done / progress.total) * 100}%` }}
        />
      </div>
      {progress.errors > 0 && (
        <p className="text-xs text-red-400 mt-2">{progress.errors} file(s) failed to import</p>
      )}
    </div>
  );
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| react-dropzone integration | Low | 1 day |
| Batch queue processor | Medium | 2 days |
| Progress bar UI | Low | 1 day |
| Error handling + per-file retry | Low-Medium | 1 day |
| Folder upload (webkitdirectory) | Low | 4 hours |
| **Overall** | **Medium** | **4–6 days** |

### Dependencies

```json
{
  "react-dropzone": "^14.2.3"
}
```

### Risks

- **Memory pressure:** Importing 50 EPUB files simultaneously will exhaust memory. Limit concurrency to 2–3 files.
- **Folder upload depth:** `webkitdirectory` returns files with `webkitRelativePath`. Reconstruct subfolder structure in the library or flatten — document the choice.
- **Duplicate detection:** Users may re-import the same file. Deduplicate by content hash (SHA-256 of file buffer) before adding.
- **Abort/retry:** Allow canceling the queue mid-process. Allow retrying failed items individually.

---

## 9. Book Detail Page: Metadata Editor + Cover Upload

**Goal:** A dedicated view for each book showing full metadata, chapter list, playback info, and allowing inline editing of metadata fields and cover art upload.

### State of the Art

Major audiobook players all have a "book info" or "details" screen:

| App | Metadata Edit | Cover Upload | Chapter Editor |
|----|--------------|-------------|----------------|
| **Audible** | ❌ Read-only | ❌ | ❌ |
| **Audiobookshelf** | ✅ All fields | ✅ From device | ✅ Reorder, rename |
| **BookPlayer** | ✅ Title/author/description | ✅ | ❌ |
| **Calibre** | ✅ Full metadata editor | ✅ | ✅ Chapter editor plugin |

### Book Detail View

```tsx
function BookDetailView({ book, onUpdate }: { book: Book; onUpdate: (updates: Partial<Book>) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(book);

  const handleSave = async () => {
    await onUpdate(form);
    setEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header: cover + primary info */}
      <div className="flex gap-6">
        <div className="flex-shrink-0">
          {book.coverUrl ? (
            <img src={book.coverUrl} className="w-40 h-60 rounded-xl object-cover shadow-lg" />
          ) : (
            <PlaceholderCover title={book.title} className="w-40 h-60 rounded-xl" />
          )}
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-zinc-800 rounded-lg px-3 py-2" />
              <input value={form.author || ''} onChange={e => setForm({ ...form, author: e.target.value })} className="w-full bg-zinc-800 rounded-lg px-3 py-2" />
              <input value={form.seriesName || ''} onChange={e => setForm({ ...form, seriesName: e.target.value })} className="w-full bg-zinc-800 rounded-lg px-3 py-2" placeholder="Series name" />
              <input type="number" value={form.seriesIndex || ''} onChange={e => setForm({ ...form, seriesIndex: Number(e.target.value) })} className="w-full bg-zinc-800 rounded-lg px-3 py-2" placeholder="Series number" />
              <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-zinc-800 rounded-lg px-3 py-2 h-24" />
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold">{book.title}</h1>
              <p className="text-zinc-400 mt-1">{book.author || 'Unknown Author'}</p>
              {book.seriesName && <p className="text-sm text-amber-500 mt-1">{book.seriesName} {book.seriesIndex ? `#${book.seriesIndex}` : ''}</p>}
              {book.description && <p className="text-sm text-zinc-500 mt-3">{book.description}</p>}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="px-4 py-2 bg-amber-500 text-black rounded-lg font-medium">
              {editing ? 'Save' : 'Edit Info'}
            </button>
            {editing && <button onClick={() => setEditing(false)} className="px-4 py-2 bg-zinc-700 rounded-lg">Cancel</button>}
          </div>
        </div>
      </div>

      {/* Cover upload */}
      <div className="border-t border-zinc-800 pt-6">
        <h3 className="text-lg font-semibold mb-3">Cover Art</h3>
        <CoverUpload currentCover={book.coverUrl} onUploaded={url => onUpdate({ coverUrl: url })} />
      </div>

      {/* Chapter list */}
      <div className="border-t border-zinc-800 pt-6">
        <h3 className="text-lg font-semibold mb-3">Chapters ({book.chapters?.length || 0})</h3>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {book.chapters?.map((ch, i) => (
            <div key={ch.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50">
              <span className="text-zinc-500 text-sm font-mono w-8">{i + 1}.</span>
              <span className="flex-1 text-sm">{ch.title || `Chapter ${i + 1}`}</span>
              <button className="text-xs text-amber-500 hover:text-amber-400">Play</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Cover Upload

```typescript
function CoverUpload({ currentCover, onUploaded }: { currentCover?: string; onUploaded: (url: string) => void }) {
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    async onDrop([file]) {
      const dataUrl = await fileToDataUrl(file);
      onUploaded(dataUrl);
    },
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-600">
      <input {...getInputProps()} />
      {currentCover ? (
        <img src={currentCover} className="mx-auto max-h-48 rounded-lg" />
      ) : (
        <p className="text-zinc-400">Drop cover image here or click to browse</p>
      )}
    </div>
  );
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Book detail page layout | Medium | 2 days |
| Inline metadata editing form | Low | 1 day |
| Cover upload (dropzone) | Low | 4 hours |
| Chapter list display | Low | 1 day |
| Series / genre field addition | Low | 4 hours |
| **Overall** | **Medium** | **4–6 days** |

### Dependencies

```json
{
  "react-dropzone": "^14.2.3"   // already in project for import queue
}
```

### Risks

- **Cover image size:** User-uploaded images can be 10+ MB. Resize to max 800×1200 px and compress to JPEG quality 0.85 before storing in IndexedDB.
- **Series detection from EPUB:** EPUB metadata may not include series info. Allow manual entry and persist to IndexedDB.
- **Epub chapter editor complexity:** Reordering EPUB chapters requires modifying the spine order and potentially the NCX/nav. For v1, support display + rename only; reorder in v2.

---

## 10. Library Search: Full-Text + Fuzzy Title

**Goal:** Enable fast, typo-tolerant search across book title, author, series, and description. Support full-text search when book content is extracted (EPUB/PDF).

### State of the Art

Search in personal library apps falls into two categories:

| Category | Tool | Use Case | Offline |
|----------|------|----------|---------|
| **Fuzzy search** | Fuse.js, FlexSearch | Title/author typo tolerance | ✅ |
| **Full-text search** | FlexSearch (indexed), Lunr.js | Search within book content | ✅ |
| **Hybrid** | MiniSearch, Orama | Metadata + content | ✅ |

### Fuse.js for Metadata Search

Fuse.js is the most popular fuzzy-search library for JavaScript:
- Zero dependencies, 7.4 kB (basic) or 8.6 kB (full) gzipped
- Bitap algorithm for fuzzy matching
- Token-based scoring with IDF
- Weighted keys, nested objects, logical expressions

```typescript
import Fuse from 'fuse.js';

interface BookSearchIndex {
  books: Book[];
  fuse: Fuse<Book>;
  init: () => Promise<void>;
  search: (query: string, limit?: number) => Book[];
  dispose: () => void;
}

class BookSearchIndex {
  private fuse: Fuse<Book> | null = null;

  async init(books: Book[]) {
    this.fuse = new Fuse(books, {
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'author', weight: 0.3 },
        { name: 'description', weight: 0.1 },
      ],
      includeScore: true,
      threshold: 0.35,          // 0 = exact, 1 = match anything
      ignoreFieldNorm: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,   // enables field:value syntax
    });
  }

  search(query: string, limit = 20): Book[] {
    if (!this.fuse) return [];
    const results = this.fuse.search(query, { limit });
    return results.map(r => r.item);
  }

  dispose() {
    this.fuse = null;
  }
}
```

**Fuse.js configuration key options:**
- `threshold: 0.0` — exact matches only
- `threshold: 0.3` — 1 typo per word (recommended for titles)
- `threshold: 0.6` — fuzzy, matches word fragments
- `distance: 100` — max edit distance for matching
- `minMatchCharLength: 2` — minimum chars to match (prevents noise)

### Full-Text Search (EPUB/PDF Content)

When EPUB text is extracted, index it for full-text search. **FlexSearch** is the best choice for in-browser full-text search (faster than Lunr.js, smaller than Elasticlunr):

```typescript
import FlexSearch from 'flexsearch';

interface ContentSearchIndex {
  index: FlexSearch.Index;
  docStore: Map<number, { bookId: string; chapterIndex: number; text: string }>;
  addBook: (bookId: string, chapters: { text: string }[]) => void;
  search: (query: string) => Array<{ bookId: string; chapterIndex: number; text: string; score: number }>;
}

class ContentSearchIndex {
  private index: FlexSearch.Index;
  private docStore = new Map<number, { bookId: string; chapterIndex: number; text: string }>();
  private counter = 0;

  constructor() {
    this.index = new FlexSearch.Index({
      tokenize: 'forward',
      threshold: 3,
      depth: 1,
      async: true,   // non-blocking search
    });
  }

  addBook(bookId: string, chapters: { text: string }[]) {
    chapters.forEach((ch, idx) => {
      const docId = this.counter++;
      this.index.add(docId, ch.text);
      this.docStore.set(docId, { bookId, chapterIndex: idx, text: ch.text });
    });
  }

  async search(query: string) {
    const results = await this.index.search(query);
    return results.map((docId: number) => ({
      ...this.docStore.get(docId)!,
      score: 0,  // FlexSearch async doesn't return scores directly
    }));
  }
}
```

### Combined Search (Metadata + Content)

```typescript
function combinedSearch(query: string, books: Book[]): Book[] {
  // 1. Metadata search (Fuse.js)
  const metadataResults = metaSearchIndex.search(query);

  // 2. Content search (FlexSearch) → resolve to book IDs
  const contentHits = await contentSearchIndex.search(query);
  const contentBookIds = new Set(contentHits.map(h => h.bookId));

  // 3. Merge: content hits rank higher, then metadata hits
  const scored = new Map<string, number>();
  contentBookIds.forEach(id => scored.set(id, (scored.get(id) || 0) + 10));  // content match = +10
  metadataResults.forEach((b, i) => scored.set(b.id, (scored.get(b.id) || 0) + (10 - i)));  // metadata rank

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => books.find(b => b.id === id)!)
    .filter(Boolean);
}
```

### Search UI

```tsx
function LibrarySearch({ books }: { books: Book[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const metaIndex = useRef<BookSearchIndex | null>(null);

  useEffect(() => {
    metaIndex.current = new BookSearchIndex();
    metaIndex.current.init(books);
    return () => metaIndex.current?.dispose();
  }, [books]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      const metaResults = metaIndex.current?.search(query) ?? [];
      setResults(metaResults);
      setSearching(false);
    }, 100);  // debounce
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search title, author, series…"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <SearchIcon className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500" />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.map(book => (
            <button key={book.id} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 text-left">
              {book.coverUrl && <img src={book.coverUrl} className="w-8 h-12 rounded object-cover" />}
              <div>
                <div className="font-medium">{book.title}</div>
                <div className="text-xs text-zinc-400">{book.author}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|-------------|------------|--------|
| Fuse.js metadata index | Low | 1 day |
| FlexSearch content index | Medium | 2 days |
| Combined search + merge | Medium | 1 day |
| Search UI with debounce | Low | 1 day |
| **Overall** | **Medium** | **4–5 days** |

### Dependencies

```json
{
  "fuse.js": "^7.0.0",
  "flexsearch": "^0.7.43"
}
```

### Risks

- **Index rebuild:** When books are added/removed, the Fuse.js index must be rebuilt. Use `useEffect` with `[books.length]` dependency. FlexSearch supports incremental `add()` / `remove()` — prefer incremental updates.
- **Memory:** FlexSearch indexes text content, which can be large for 50+ books. Cap at 50 chars per document for metadata-only search, or use FlexSearch's memory optimization profile.
- **Search performance:** Debounce input by 100–150ms to avoid re-indexing on every keystroke. Use Web Workers for FlexSearch content indexing to keep UI responsive.
- **Full-text on Pi:** Indexing large books on a Raspberry Pi is slow. Show a progress indicator and consider pre-indexing during book import.

---

## Feature Priority Matrix

| Feature | Complexity | Effort | Impact | Priority |
|---------|-----------|--------|--------|----------|
| EPUB Parsing (epubix) | Low | 2–3 days | High | **P0** |
| Library View Modes | Low | 3–4 days | High | **P0** |
| Import Queue + Drag-Drop | Medium | 4–6 days | High | **P0** |
| Book Detail Page | Medium | 4–6 days | High | **P0** |
| Library Search (Fuse.js) | Medium | 4–5 days | High | **P0** |
| Smart Collections | Low-Medium | 4–6 days | Medium | **P1** |
| Reading Stats | Medium | 5–7 days | Medium | **P1** |
| PDF Support | Medium | 6–8 days | Medium | **P1** |
| MOBI/FB2 Conversion | Medium | 5–7 days | Low-Medium | **P2** |
| Book Sharing (OPDS/JSON/PNG) | Medium | 4–6 days | Low | **P2** |

### Critical Path

1. **EPUB Parsing** — foundation for all library features; unlock metadata, chapters, covers
2. **Import Queue** — unlock bulk ingestion; without this, users can only add one book at a time
3. **View Modes** — immediate UX win; basic grid + list can work with minimal metadata
4. **Book Detail Page** — enable metadata editing; depends on EPUB parsing
5. **Smart Collections** — build on the metadata extracted in step 1
6. **Library Search** — depends on having real metadata (step 1)
7. **Reading Stats** — independent; can start as soon as sessions are tracked
8. **PDF Support** — separate extraction pipeline; can be developed in parallel
9. **MOBI/FB2 Conversion** — lower priority; depends on Calibre backend
10. **Book Sharing** — polish feature; lowest priority

---

## Shared Infrastructure Recommendations

Several features share common building blocks. Build these first to reduce total effort:

| Shared Component | Used By | Recommendation |
|-----------------|---------|----------------|
| **`epubix` parser instance** | EPUB import, chapter list, smart collections metadata | Wrap in a singleton `EPUBParser` class; cache parsed results by file hash |
| **IndexedDB schema** | Library CRUD, bookmarks, stats, covers, smart collections | Unified `books` store with full `Book` schema; `sessions` store for stats; `covers` store (IDB Blob store, not base64) |
| **Blob URL cover cache** | Grid view, list view, detail view, OPDS export | Store covers as Blobs in IndexedDB; convert to `URL.createObjectURL()` for display |
| **Zustand `useLibraryStore`** | All library features | One store with `books`, `viewMode`, `collections`, `searchQuery`, `stats`; subscribe with selectors for granular updates |
| **Cover resize utility** | EPUB import, cover upload, OPDS export | Shared `resizeImage(file, maxWidth, maxHeight)` using OffscreenCanvas |
| **File deduplication** | Import queue, library sync | SHA-256 hash of `ArrayBuffer`; store `contentHash` in Book record; dedupe on import |

### Proposed IndexedDB Schema

```typescript
// Unified schema using Dexie.js (recommended IndexedDB wrapper)
import Dexie, { Table } from 'dexie';

export class AudioSyncDB extends Dexie {
  books!: Table<BookRecord>;
  sessions!: Table<ListeningSession>;
  covers!: Table<{ id: string; blob: Blob }>;

  constructor() {
    super('AudioSyncDB');
    this.version(1).stores({
      books: 'id, title, author, addedAt, *tags, contentHash',
      sessions: '++id, bookId, startTime',
      covers: 'id',
    });
  }
}

export const db = new AudioSyncDB();
```

---

## Risk & Blocker Notes

- **EPUB cover art in Safari:** Safari may refuse to render base64-encoded images in `<img>` tags inside shadow DOM or with certain CSP settings. Test cover rendering across browsers; fall back to `URL.createObjectURL(blob)` for Safari.
- **IndexedDB quota:** A 500-book library with covers stored as Blobs can reach 200–500 MB. Browsers typically allow 50–80% of disk space for IndexedDB. Monitor quota with `navigator.storage.estimate()` and warn users at 80%.
- **Full-text search on Pi:** Indexing large EPUBs (200k+ words) with FlexSearch on a Raspberry Pi will block the main thread for several seconds. Always use `FlexSearch.Index({ async: true })` and show a "Searching…" indicator.
- **MOBI/FB2 server-side dependency:** If Calibre is required for MOBI conversion, AudioSync is no longer "local-first only." Consider making Calibre an optional external service and clearly document the trade-off.
- **File path portability:** Current `filePath: string` in `Book` schema is not portable across devices. For true portability, use `contentHash` + optional `originalFilename`. Remove `filePath` from the persisted schema in a future migration.
- **OPDS server requirement:** OPDS feeds require an HTTP server. AudioSync is a client-side app. Either: (a) bundle an Express server, (b) use a data: URL OPDS export as a file download, or (c) require users to serve via a local HTTP server.
- **Statistics privacy:** Reading stats are highly personal. All stats data must stay in IndexedDB. If cloud sync is ever added (Electron wrapper or server), stats must be opt-in only, with full user control over what is shared.
- **Folder upload permission:** The `webkitdirectory` attribute requires user gesture (cannot be triggered programmatically). The user must manually click a "Import Folder" button, not an auto-drop handler.
- **Cover art copyright:** If users import commercial audiobooks, cover art may be copyrighted. Allow users to upload custom cover art; don't scrape covers from Amazon/Google Books without a clear fair-use justification.
- **Large book handling:** A 50-hour audiobook's text extraction produces ~150k words (~900 KB of text). TTS generation for such books must be chunked and streamed to avoid freezing the browser.

---

*Document: docs/research/stream-4-library.md | AudioSync Project*

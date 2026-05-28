import FlexSearch from 'flexsearch';
import Fuse from 'fuse.js';
import { z } from 'zod';
import { db } from './db';
import { parseEpubFile } from './epub';

export const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  coverUrl: z.string().optional(),
  filePath: z.string(),
  duration: z.number().optional(),
  addedAt: z.date(),
  chapters: z.array(z.string()).optional(),
  genre: z.string().optional(),
  tags: z.array(z.string()).optional(),
  format: z.string().optional(),
  content: z.string().optional(),
});

export type Book = z.infer<typeof BookSchema>;
export type SmartCollection = {
  id: string;
  name: string;
  rule: { field: 'author' | 'genre' | 'title' | 'format'; contains: string };
};

function parseBasicChapters(content: string): string[] {
  const chapterRegex = /(?:chapter\s+\d+[:\-.\s]*)/gi;
  const sections = content
    .split(chapterRegex)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sections.length <= 1) return ['Chapter 1'];
  return sections.map((_, i) => `Chapter ${i + 1}`);
}

async function parsePdfText(file: File): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist');
    const arr = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: arr }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ');
      if (text.trim()) pages.push(text.trim());
    }
    return pages.join('\n\n');
  } catch {
    return '';
  }
}

function parseFb2Text(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseMobiText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoders = ['utf-8', 'windows-1252'] as const;
  let best = '';

  for (const encoding of decoders) {
    try {
      const decoded = new TextDecoder(encoding).decode(bytes);
      const normalized = normalizeExtractedText(decoded);
      if (normalized.length > best.length) best = normalized;
    } catch {
      // continue with next decoder
    }
  }

  // Fallback heuristic: extract long printable runs from binary payload.
  if (best.length < 200) {
    const chars = Array.from(bytes)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ' '))
      .join('');
    const printable = normalizeExtractedText(chars);
    if (printable.length > best.length) best = printable;
  }

  return best;
}

function inferFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';
  if (['epub', 'pdf', 'mobi', 'fb2', 'txt'].includes(ext)) return ext;
  return 'unknown';
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function normalizeMetadata(title: string, author?: string): { title: string; author?: string; tags: string[] } {
  const cleanTitle = title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanAuthor = author ? toTitleCase(author.replace(/_/g, ' ').trim()) : undefined;
  const tags: string[] = [];

  // Series extraction heuristic: "Series Name - Book Title"
  const seriesMatch = cleanTitle.match(/^(.+?)\s[-:]\s(.+)$/);
  if (seriesMatch) {
    tags.push(`series:${seriesMatch[1].trim().toLowerCase()}`);
  }

  // Narrator heuristic: "(Narrated by X)"
  const narratorMatch = cleanTitle.match(/\(narrated by ([^)]+)\)/i);
  if (narratorMatch) {
    tags.push(`narrator:${narratorMatch[1].trim().toLowerCase()}`);
  }

  return { title: cleanTitle, author: cleanAuthor, tags };
}

function normalizeChapterList(chapters: string[], content: string): string[] {
  const cleaned = chapters.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length > 1) return cleaned;
  const fallback = parseBasicChapters(content);
  return fallback.length ? fallback : ['Chapter 1'];
}

export class Library {
  private books: Book[] = [];
  private collections: SmartCollection[] = [];
  private contentIndex = new FlexSearch.Document<{ id: string; content: string }>({
    document: { id: 'id', index: ['content'] },
    tokenize: 'forward',
  });

  private async persistBooks(): Promise<void> {
    await db.books.clear();
    await db.books.bulkPut(this.books);
  }

  async loadFromDB(): Promise<void> {
    const existing = await db.books.toArray();
    this.books = existing.map((b) => ({ ...b, addedAt: new Date(b.addedAt) }));
    this.rebuildIndexes();
  }

  private rebuildIndexes(): void {
    this.contentIndex = new FlexSearch.Document<{ id: string; content: string }>({
      document: { id: 'id', index: ['content'] },
      tokenize: 'forward',
    });

    for (const b of this.books) {
      this.contentIndex.add({ id: b.id, content: b.content ?? b.title });
    }
  }

  async addBook(file: File): Promise<Book> {
    const format = inferFormat(file.name);
    let raw = await file.text().catch(() => '');
    let title = file.name.replace(/\.[^/.]+$/, '');
    let author: string | undefined;
    let chapters = parseBasicChapters(raw);

    if (format === 'epub') {
      try {
        const epub = await parseEpubFile(file);
        title = epub.title || title;
        author = epub.author || author;
        chapters = epub.chapters.length ? epub.chapters : chapters;
        raw = epub.contentText || raw;
      } catch {
        // graceful fallback to baseline parsing
      }
    } else if (format === 'pdf') {
      const extracted = await parsePdfText(file);
      if (extracted) {
        raw = extracted;
        chapters = parseBasicChapters(raw);
      }
    } else if (format === 'fb2') {
      const extracted = parseFb2Text(raw);
      if (extracted) {
        raw = extracted;
        chapters = parseBasicChapters(raw);
      }
    } else if (format === 'mobi') {
      const extracted = await parseMobiText(file);
      if (extracted) {
        raw = extracted;
        chapters = parseBasicChapters(raw);
      }
    }

    const normalized = normalizeMetadata(title, author);
    chapters = normalizeChapterList(chapters, raw);

    const book: Book = {
      id: crypto.randomUUID(),
      title: normalized.title,
      author: normalized.author,
      filePath: file.name,
      addedAt: new Date(),
      chapters,
      format,
      tags: normalized.tags,
      content: raw,
    };
    this.books.push(book);
    this.contentIndex.add({ id: book.id, content: raw || book.title });
    await db.books.put(book);
    return book;
  }

  async addBooksBatch(files: File[], concurrency = 2): Promise<Book[]> {
    const queue = [...files];
    const created: Book[] = [];

    const worker = async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        const book = await this.addBook(next);
        created.push(book);
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
    return created;
  }

  searchBooks(query: string): Book[] {
    const q = query.trim();
    if (!q) return this.getBooks();

    const fuse = new Fuse(this.books, {
      keys: ['title', 'author', 'filePath', 'genre', 'format'],
      threshold: 0.4,
      includeScore: true,
    });

    const metaMatches = fuse.search(q).map((r) => r.item.id);
    const contentMatchesRaw = this.contentIndex.search(q, { limit: 20 });
    const contentIds = new Set<string>();
    for (const group of contentMatchesRaw) {
      const result = group.result as string[];
      result.forEach((id) => contentIds.add(id));
    }

    const idSet = new Set([...metaMatches, ...contentIds]);
    return this.getBooks().filter((b) => idSet.has(b.id));
  }

  getBooks(): Book[] {
    return [...this.books].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  }

  async updateBook(id: string, patch: Partial<Book>): Promise<Book | null> {
    const idx = this.books.findIndex((b) => b.id === id);
    if (idx < 0) return null;
    this.books[idx] = { ...this.books[idx], ...patch, id: this.books[idx].id };
    await db.books.put(this.books[idx]);
    this.rebuildIndexes();
    return this.books[idx];
  }

  async removeBook(id: string): Promise<void> {
    this.books = this.books.filter((b) => b.id !== id);
    await db.books.delete(id);
    this.rebuildIndexes();
  }

  createCollection(name: string, field: SmartCollection['rule']['field'], contains: string): SmartCollection {
    const collection: SmartCollection = {
      id: crypto.randomUUID(),
      name,
      rule: { field, contains },
    };
    this.collections.push(collection);
    return collection;
  }

  getCollections(): SmartCollection[] {
    return [...this.collections];
  }

  resolveCollectionBooks(collectionId: string): Book[] {
    const collection = this.collections.find((c) => c.id === collectionId);
    if (!collection) return [];
    const q = collection.rule.contains.toLowerCase();

    return this.books.filter((b) => {
      const value = String((b as Record<string, unknown>)[collection.rule.field] ?? '').toLowerCase();
      return value.includes(q);
    });
  }

  async exportForSync(): Promise<string> {
    const payload = {
      exportedAt: new Date().toISOString(),
      books: this.getBooks(),
      collections: this.getCollections(),
    };
    return JSON.stringify(payload);
  }
}

export const library = new Library();

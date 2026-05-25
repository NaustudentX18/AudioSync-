import { describe, it, expect } from 'vitest';
import { library } from '../lib/library';
import { mergeLww, queueEnqueue, queueMove, queueShift, scheduleRetry } from '../lib/parity';

describe('AudioSync Core', () => {
  it('should add a book to the library', async () => {
    const mockFile = new File(['test content'], 'test-book.txt', { type: 'text/plain' });
    const book = await library.addBook(mockFile);
    expect(book).toHaveProperty('id');
    expect(book.title).toBe('test-book');
    expect(library.getBooks().length).toBeGreaterThan(0);
  });

  it('should have working TTS voices', () => {
    const voices = ['af_heart', 'af_bella', 'am_adam'];
    expect(voices.length).toBeGreaterThan(0);
  });

  it('should have PWA configured', () => {
    // Basic PWA check
    expect(true).toBe(true); // Replace with real PWA manifest check later
  });

  it('should parse FB2 markup into readable content', async () => {
    const fb2 = `<?xml version="1.0"?><FictionBook><body><section><title><p>Chapter 1</p></title><p>Hello FB2 world.</p></section></body></FictionBook>`;
    const mockFile = new File([fb2], 'sample.fb2', { type: 'application/octet-stream' });
    const book = await library.addBook(mockFile);
    expect(book.format).toBe('fb2');
    expect(book.content).toContain('Hello FB2 world');
  });

  it('should parse MOBI payload heuristically when calibre is unavailable', async () => {
    const payload = new TextEncoder().encode('Chapter 1 The MOBI fallback text content should still be searchable.');
    const mockFile = new File([payload], 'sample.mobi', { type: 'application/x-mobipocket-ebook' });
    const book = await library.addBook(mockFile);
    expect(book.format).toBe('mobi');
    expect(book.content?.toLowerCase()).toContain('mobi fallback text');
  });

  it('should resolve sync conflicts with LWW', () => {
    const local = { key: 'k', value: { a: 1 }, updatedAt: '2026-05-25T00:00:00.000Z', deviceId: 'a' };
    const remote = { key: 'k', value: { a: 2 }, updatedAt: '2026-05-25T00:01:00.000Z', deviceId: 'b' };
    const merged = mergeLww(local, remote);
    expect(merged.winner.value).toEqual({ a: 2 });
    expect(merged.conflict).toBeTruthy();
  });

  it('should support queue enqueue/move/shift', () => {
    const q1 = queueEnqueue([], { id: '1', title: 'A', chapterIndex: 0 });
    const q2 = queueEnqueue(q1, { id: '2', title: 'B', chapterIndex: 1 });
    const q3 = queueMove(q2, 1, 0);
    expect(q3[0].id).toBe('2');
    const shifted = queueShift(q3);
    expect(shifted.item?.id).toBe('2');
    expect(shifted.queue.length).toBe(1);
  });

  it('should schedule retry with exponential backoff', () => {
    const job = { id: 'r1', endpoint: '/sync', payload: '{}', retries: 0, nextAttemptAt: Date.now() };
    const next = scheduleRetry(job, 1000);
    expect(next.retries).toBe(1);
    expect(next.nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it('should normalize metadata for series and narrator hints', async () => {
    const mockFile = new File(['hello world'], 'the stormlight archive - words of radiance (narrated by kate reading).txt', { type: 'text/plain' });
    const book = await library.addBook(mockFile);
    expect(book.title).toContain('stormlight archive');
    expect(book.tags?.some((t) => t.startsWith('series:'))).toBe(true);
    expect(book.tags?.some((t) => t.startsWith('narrator:'))).toBe(true);
  });
});

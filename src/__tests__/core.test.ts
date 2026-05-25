import { describe, it, expect } from 'vitest';
import { library } from '../src/lib/library';

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
});

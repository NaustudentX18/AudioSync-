import { z } from 'zod';

export const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  coverUrl: z.string().optional(),
  filePath: z.string(),
  duration: z.number().optional(),
  addedAt: z.date(),
});

export type Book = z.infer<typeof BookSchema>;

export class Library {
  private books: Book[] = [];

  async addBook(file: File): Promise<Book> {
    // TODO: Implement actual file handling + metadata extraction
    const book: Book = {
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      filePath: file.name,
      addedAt: new Date(),
    };
    this.books.push(book);
    return book;
  }

  getBooks(): Book[] {
    return [...this.books];
  }

  removeBook(id: string): void {
    this.books = this.books.filter(b => b.id !== id);
  }
}

export const library = new Library();

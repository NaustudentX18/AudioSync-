import Dexie, { type Table } from 'dexie';
import type { Book } from './library';

export interface AppSetting {
  key: string;
  value: string;
}

export interface BookmarkRow {
  id: string;
  payload: string;
}

class AudioSyncDB extends Dexie {
  books!: Table<Book, string>;
  settings!: Table<AppSetting, string>;
  bookmarks!: Table<BookmarkRow, string>;

  constructor() {
    super('audiosync-db');
    this.version(1).stores({
      books: 'id, title, author, genre, format, addedAt',
      settings: 'key',
      bookmarks: 'id',
    });
  }
}

export const db = new AudioSyncDB();

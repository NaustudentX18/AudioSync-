import React, { useState } from 'react';
import { Player } from './components/Player';
import SyncPanel from './components/SyncPanel';
import { library, Book } from './lib/library';

export default function App() {
  const [books, setBooks] = useState<Book[]>(library.getBooks());
  const [status, setStatus] = useState("Ready");

  const handleAddBook = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.epub,.pdf';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setStatus("Importing book...");
      try {
        const book = await library.addBook(file);
        setBooks([...library.getBooks()]);
        setStatus(`Added: ${book.title}`);
        setTimeout(() => setStatus("Ready"), 2000);
      } catch (error) {
        setStatus("Import failed");
      }
    };
    
    input.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold tracking-[-2px]">AudioSync</h1>
            <p className="text-zinc-400 mt-1">Local-first audiobook experience</p>
          </div>
          <button 
            onClick={handleAddBook}
            className="px-6 py-3 bg-white text-black rounded-2xl font-semibold hover:bg-zinc-200 active:bg-zinc-300 transition-all flex items-center gap-2"
          >
            + Add Book
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <Player />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Library</h2>
                <span className="text-xs text-zinc-500 font-mono">{books.length} books</span>
              </div>

              {books.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400">No books yet</p>
                  <p className="text-xs text-zinc-500 mt-2">Click "Add Book" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {books.map((book) => (
                    <div 
                      key={book.id} 
                      className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all"
                    >
                      <div className="font-medium">{book.title}</div>
                      {book.author && <div className="text-sm text-zinc-400">{book.author}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-zinc-400 font-mono">{status}</span>
          </div>
        </div>

        <div className="mt-8">
          <SyncPanel />
        </div>
      </div>
    </div>
  );
}

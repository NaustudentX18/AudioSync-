import React from 'react';
import { Player } from './components/Player';
import { library } from './lib/library';

export default function App() {
  const [books, setBooks] = React.useState(library.getBooks());

  const handleAddBook = async () => {
    // Placeholder - real file picker will be added in Phase 1
    alert('File picker coming in next iteration');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">AudioSync</h1>
        <button 
          onClick={handleAddBook}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-medium"
        >
          Add Book
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Player />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Library ({books.length})</h2>
          {books.length === 0 ? (
            <p className="text-zinc-400">No books yet. Add one to get started.</p>
          ) : (
            <div className="space-y-2">
              {books.map(book => (
                <div key={book.id} className="p-4 bg-zinc-900 rounded-lg">
                  {book.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

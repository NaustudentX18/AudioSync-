import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { library, Book, SmartCollection } from './lib/library';
import { getEncryptedItem, setEncryptedItem } from './lib/secureStorage';
import { detectPlatformShellCapabilities, mergeLww, scheduleRetry, type PlatformShellCapabilities, type RetryJob, type SyncEnvelope } from './lib/parity';

const Player = lazy(() => import('./components/Player').then((m) => ({ default: m.Player })));

type LibraryView = 'grid' | 'list' | 'shelves';
type Lang = 'en' | 'ar';

function initialsFromTitle(title: string): string {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'BK'
  );
}

const I18N: Record<Lang, Record<string, string>> = {
  en: { title: 'AudioSync', subtitle: 'Local-first audiobook experience', addBooks: '+ Add Book(s)', smartCollection: '+ Smart Collection', library: 'Library', detail: 'Book Detail' },
  ar: { title: 'أوديو سينك', subtitle: 'تجربة كتب صوتية محلية أولاً', addBooks: '+ إضافة كتب', smartCollection: '+ مجموعة ذكية', library: 'المكتبة', detail: 'تفاصيل الكتاب' },
};

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState('Ready');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<LibraryView>('grid');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [collections, setCollections] = useState<SmartCollection[]>(library.getCollections());
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [syncOptIn, setSyncOptIn] = useState(localStorage.getItem('audiosync_sync_optin') === 'true');
  const [lang, setLang] = useState<Lang>((localStorage.getItem('audiosync_lang') as Lang) || 'en');
  const [showOnboarding, setShowOnboarding] = useState(localStorage.getItem('audiosync_onboarded') !== 'true');
  const [capabilities, setCapabilities] = useState<{['ebook-convert']?: boolean; ['pdftotext']?: boolean}>({});
  const [platformCaps, setPlatformCaps] = useState<PlatformShellCapabilities | null>(null);

  useEffect(() => {
    void (async () => {
      await library.loadFromDB();
      setBooks(library.getBooks());
      const restored = await getEncryptedItem('audiosync_sync_optin_enc', 'audiosync-local-secret').catch(() => null);
      if (restored) setSyncOptIn(restored === 'true');
      const capRes = await fetch('/api/capabilities').catch(() => null);
      if (capRes && capRes.ok) {
        const cap = await capRes.json();
        setCapabilities(cap.tools || {});
      }
      setPlatformCaps(detectPlatformShellCapabilities());
    })();
  }, []);

  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get('action');
    if (action === 'play-next' || action === 'bookmark' || action === 'rewind') {
      window.dispatchEvent(new CustomEvent('audiosync:quick-action', { detail: action }));
      setStatus(`Quick action: ${action}`);
    }
  }, []);

  const selectedBook = useMemo(() => books.find((book) => book.id === selectedBookId) ?? null, [books, selectedBookId]);

  const collectionBooks = useMemo(() => {
    if (!activeCollectionId) return null;
    return library.resolveCollectionBooks(activeCollectionId);
  }, [activeCollectionId, books]);

  const visibleBooks = useMemo(() => (collectionBooks ? collectionBooks : library.searchBooks(query)), [books, query, collectionBooks]);

  const listenedSeconds = Number(localStorage.getItem('audiosync_stats_seconds') || '0');
  const streakDays = Number(localStorage.getItem('audiosync_stats_streak') || '0');

  useEffect(() => {
    localStorage.setItem('audiosync_sync_optin', String(syncOptIn));
    void setEncryptedItem('audiosync_sync_optin_enc', String(syncOptIn), 'audiosync-local-secret');
  }, [syncOptIn]);

  useEffect(() => {
    localStorage.setItem('audiosync_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = I18N[lang];

  const importFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setStatus(`Importing ${files.length} book(s)...`);
    try {
      await library.addBooksBatch(files, 2);
      setBooks(library.getBooks());
      setStatus(`Imported ${files.length} book(s)`);
      setTimeout(() => setStatus('Ready'), 2000);
    } catch {
      setStatus('Import failed');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      void importFiles(acceptedFiles);
    },
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {},
    accept: {
      'text/plain': ['.txt'],
      'application/epub+zip': ['.epub'],
      'application/pdf': ['.pdf'],
      'application/x-mobipocket-ebook': ['.mobi'],
      'application/octet-stream': ['.fb2'],
    },
    multiple: true,
  });

  const handleAddBook = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.epub,.pdf,.mobi,.fb2';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      await importFiles(files);
    };
    input.click();
  };

  const updateSelectedBook = async (patch: Partial<Book>) => {
    if (!selectedBookId) return;
    await library.updateBook(selectedBookId, patch);
    setBooks(library.getBooks());
  };

  const addCollection = () => {
    const name = prompt('Collection name', 'Sci-Fi');
    const field = prompt('Rule field: title|author|genre|format', 'genre') as 'title' | 'author' | 'genre' | 'format' | null;
    const contains = prompt('Contains text', 'sci');
    if (!name || !field || !contains) return;
    library.createCollection(name, field, contains);
    setCollections(library.getCollections());
    setStatus(`Collection created: ${name}`);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audiosync-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOpds = () => {
    const entries = books.map((b) => `<entry><title>${b.title}</title><id>${b.id}</id><updated>${b.addedAt.toISOString()}</updated></entry>`).join('');
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>AudioSync OPDS</title>${entries}</feed>`;
    const blob = new Blob([xml], { type: 'application/atom+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audiosync-opds.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPngCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('AudioSync Library Snapshot', 60, 100);
    ctx.font = '28px sans-serif';
    books.slice(0, 10).forEach((b, i) => ctx.fillText(`${i + 1}. ${b.title}`, 80, 170 + i * 40));
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'audiosync-library-card.png';
    a.click();
  };

  const exportSyncBundle = async () => {
    if (!syncOptIn) {
      setStatus('Sync export blocked: opt-in required');
      return;
    }
    const payload = await library.exportForSync();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audiosync-sync-bundle.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Sync bundle exported');
  };

  const syncToAudiobookshelf = async () => {
    if (!syncOptIn) {
      setStatus('Audiobookshelf sync blocked: opt-in required');
      return;
    }

    try {
      const payload = JSON.parse(await library.exportForSync());
      const localEnvelope: SyncEnvelope<Record<string, unknown>> = {
        key: 'library-sync',
        value: payload as Record<string, unknown>,
        updatedAt: new Date().toISOString(),
        deviceId: 'audiosync-web',
      };
      const remoteSnapshot = localStorage.getItem('audiosync_last_remote_sync');
      if (remoteSnapshot) {
        try {
          const remoteEnvelope = JSON.parse(remoteSnapshot) as SyncEnvelope<Record<string, unknown>>;
          const merged = mergeLww(localEnvelope, remoteEnvelope);
          if (merged.conflict) {
            const existing = JSON.parse(localStorage.getItem('audiosync_sync_conflicts') || '[]') as unknown[];
            localStorage.setItem('audiosync_sync_conflicts', JSON.stringify([...existing, merged.conflict]));
          }
        } catch {
          // ignore malformed prior envelope
        }
      }
      const response = await fetch('/api/sync/audiobookshelf/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, dryRun: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Sync failed');
      localStorage.setItem('audiosync_last_remote_sync', JSON.stringify(localEnvelope));
      if (data.pushed) {
        setStatus(`Audiobookshelf sync pushed (${data.count} items)`);
      } else {
        setStatus(`Audiobookshelf mapped (${data.count} items) - manual import required`);
      }
    } catch (error) {
      const retry: RetryJob = scheduleRetry({
        id: crypto.randomUUID(),
        endpoint: '/api/sync/audiobookshelf/push',
        payload: await library.exportForSync(),
        retries: 0,
        nextAttemptAt: Date.now(),
        lastError: String(error),
      });
      const pending = JSON.parse(localStorage.getItem('audiosync_sync_retry_jobs') || '[]') as RetryJob[];
      localStorage.setItem('audiosync_sync_retry_jobs', JSON.stringify([...pending, retry]));
      setStatus(`Audiobookshelf sync failed: ${String(error)}`);
    }
  };

    const completeOnboarding = () => {
    localStorage.setItem('audiosync_onboarded', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      {showOnboarding && <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"><div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full"><h2 className="text-xl font-semibold mb-2">Welcome to AudioSync</h2><ol className="text-sm text-zinc-300 list-decimal pl-4 space-y-1 mb-4"><li>Add books from your device.</li><li>Press Play Voice in player panel.</li><li>Use bookmarks and chapter navigation.</li><li>Enable sync opt-in only if you want exports.</li></ol><button onClick={completeOnboarding} className="px-4 py-2 rounded bg-white text-black font-semibold">Start</button></div></div>}

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 gap-2 flex-wrap">
          <div><h1 className="text-5xl font-bold tracking-[-2px]">{t.title}</h1><p className="text-zinc-400 mt-1">{t.subtitle}</p></div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="px-2 py-2 text-sm rounded border border-zinc-700 bg-zinc-900" aria-label="Language selector"><option value="en">English</option><option value="ar">العربية</option></select>
            <label className="text-xs flex items-center gap-1 border border-zinc-700 rounded px-2 py-2"><input type="checkbox" checked={syncOptIn} onChange={(e) => setSyncOptIn(e.target.checked)} />Sync opt-in</label>
            <button onClick={addCollection} className="px-4 py-3 border border-zinc-700 rounded-2xl text-sm hover:border-zinc-500">{t.smartCollection}</button>
            <button onClick={handleAddBook} className="px-6 py-3 bg-white text-black rounded-2xl font-semibold hover:bg-zinc-200 active:bg-zinc-300 transition-all flex items-center gap-2">{t.addBooks}</button>
          </div>
        </header>

        <div {...getRootProps()} className={`mb-4 border rounded-xl p-4 text-sm cursor-pointer ${isDragActive ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900'}`}>
          <input {...getInputProps()} />
          {isDragActive ? 'Drop files to import…' : 'Drag and drop books here, or click to select files'}
        </div>

        <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs flex gap-3 flex-wrap">
          <span>Calibre: {capabilities['ebook-convert'] ? 'available' : 'missing'}</span>
          <span>PDF extract: {capabilities['pdftotext'] ? 'available' : 'missing'}</span>
          <span>Stats: {Math.floor(listenedSeconds / 60)} min listened</span><span>Streak: {streakDays} day(s)</span>
          <button onClick={exportJson} className="underline">Export JSON</button><button onClick={exportOpds} className="underline">Export OPDS</button><button onClick={exportPngCard} className="underline">Export PNG</button><button onClick={() => void exportSyncBundle()} className="underline">Sync Export</button><button onClick={() => void syncToAudiobookshelf()} className="underline">Audiobookshelf Sync</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('audiosync:quick-action', { detail: 'play-next' }))} className="underline">Quick: Next</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('audiosync:quick-action', { detail: 'bookmark' }))} className="underline">Quick: Bookmark</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('audiosync:quick-action', { detail: 'rewind' }))} className="underline">Quick: Rewind</button>
          {platformCaps && <span>Platform: media={platformCaps.mediaSession ? 'yes' : 'no'} · touch={platformCaps.touch ? 'yes' : 'no'} · sw={platformCaps.serviceWorker ? 'yes' : 'no'}</span>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-6"><Suspense fallback={<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-400">Loading player...</div>}><Player /></Suspense></div>
          <div className="xl:col-span-3">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex justify-between items-center mb-3 gap-2"><h2 className="text-xl font-semibold">{t.library}</h2><span className="text-xs text-zinc-500 font-mono">{visibleBooks.length} shown</span></div>
              <input value={query} onChange={(e) => { setActiveCollectionId(null); setQuery(e.target.value); }} placeholder="Search title, author, file..." className="w-full mb-3 px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800" aria-label="Search library" />
              <div className="flex gap-1 mb-3 flex-wrap"><button onClick={() => setActiveCollectionId(null)} className={`px-2 py-1 text-xs rounded border ${activeCollectionId === null ? 'border-amber-500 text-amber-300' : 'border-zinc-800 text-zinc-300'}`}>All</button>{collections.map((collection) => <button key={collection.id} onClick={() => setActiveCollectionId(collection.id)} className={`px-2 py-1 text-xs rounded border ${activeCollectionId === collection.id ? 'border-amber-500 text-amber-300' : 'border-zinc-800 text-zinc-300'}`}>{collection.name}</button>)}</div>
              <div className="flex gap-1 mb-4">{(['grid', 'list', 'shelves'] as const).map((mode) => <button key={mode} onClick={() => setView(mode)} className={`px-2 py-1 text-xs rounded border ${view === mode ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-zinc-800 text-zinc-300'}`}>{mode}</button>)}</div>
              {visibleBooks.length === 0 ? <div className="text-center py-12"><p className="text-zinc-400">No books yet</p><p className="text-xs text-zinc-500 mt-2">Click "Add Book(s)" to get started</p></div> : <div className={view === 'grid' ? 'grid grid-cols-2 gap-2' : view === 'shelves' ? 'space-y-3 overflow-x-auto' : 'space-y-2'}>{visibleBooks.map((book) => <button key={book.id} onClick={() => setSelectedBookId(book.id)} className={`text-left p-3 bg-zinc-950 rounded-xl border transition-all ${selectedBookId === book.id ? 'border-amber-500' : 'border-zinc-800 hover:border-zinc-700'}`}><div className="mb-2 h-20 rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden">{book.coverUrl ? <img src={book.coverUrl} alt={`${book.title} cover`} className="w-full h-full object-cover" /> : <span className="text-sm font-semibold text-zinc-300 tracking-wider">{initialsFromTitle(book.title)}</span>}</div><div className="font-medium text-sm truncate">{book.title}</div>{book.author && <div className="text-xs text-zinc-400 truncate">{book.author}</div>}<div className="text-[10px] text-zinc-500 mt-1">{(book.chapters?.length ?? 1).toString()} chapters · {book.format ?? 'unknown'}</div></button>)}</div>}
            </div>
          </div>

          <div className="xl:col-span-3">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold mb-3">{t.detail}</h2>
              {!selectedBook ? <div className="text-sm text-zinc-500">Select a book to edit metadata.</div> : <div className="space-y-2"><input value={selectedBook.title} onChange={(e) => void updateSelectedBook({ title: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800" placeholder="Title" /><input value={selectedBook.author ?? ''} onChange={(e) => void updateSelectedBook({ author: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800" placeholder="Author" /><input value={selectedBook.genre ?? ''} onChange={(e) => void updateSelectedBook({ genre: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800" placeholder="Genre" /><label className="block text-xs text-zinc-400">Cover Upload</label><input type="file" accept="image/*" className="w-full text-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const dataUrl = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }); void updateSelectedBook({ coverUrl: dataUrl }); }} />{selectedBook.coverUrl && <img src={selectedBook.coverUrl} alt="cover" className="w-full h-28 object-cover rounded" />}</div>}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center"><div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full border border-zinc-800"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /><span className="text-xs text-zinc-400 font-mono">{status}</span></div></div>

        <div className="mt-8">
          <SyncPanel />
        </div>
      </div>
    </div>
  );
}

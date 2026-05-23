import React, { useState, useEffect } from "react";
import { BookItem, UserSettings, SortOption } from "./types";
import { DEFAULT_BOOKS } from "./data";
import BookDetailView from "./components/BookDetailView";
import ImportContentForm from "./components/ImportContentForm";
import VoiceConfiguration from "./components/VoiceConfiguration";
import { 
  Home, Compass, BookMarked, Settings, Sparkles, UploadCloud, 
  Search, BookOpen, Clock, HelpCircle, FileText, Link2, Camera, 
  Trash2, Play, ChevronRight, User, CircleHelp, Download, Flame, Moon, Timer 
} from "lucide-react";

interface DailyReadingStats {
  words: number;
  minutes: number;
}

interface DailyGoalModel {
  streak: number;
  lastReadDate: string | null;
  dailyStats: Record<string, DailyReadingStats>;
  dailyGoalMinutes: number;
}

const getLocalDateString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function App() {
  // Navigation active state
  const [activeTab, setActiveTab] = useState<"home" | "explore" | "import" | "library" | "voices">("home");
  
  // Library book items state (persisted)
  const [books, setBooks] = useState<BookItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_books_shelf_v1");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return DEFAULT_BOOKS;
  });

  // Client user preferences and secrets state (persisted)
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_settings_v1");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {
      elevenlabsKey: "",
      openaiKey: "",
      preferredEngine: "webspeech",
      selectedVoiceId: "ws-en-us-neural",
      playbackSpeed: 1.0,
    };
  });

  // Search query filter
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sub tab horizontal bar in Home screen ("For you" | "Featured")
  const [homeSubTab, setHomeSubTab] = useState<"for-you" | "featured">("for-you");

  // Selected book for active fullscreen listening mode
  const [activeBook, setActiveBook] = useState<BookItem | null>(null);

  // Library sorting state ('recent' | 'alphabetical' | 'progress')
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Online / Offline State detection
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const effectiveOffline = !isOnline || isOfflineSimulated;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  // Daily goals tracker state
  const [goalState, setGoalState] = useState<DailyGoalModel>(() => {
    const defaultGoal = {
      streak: 0,
      lastReadDate: null,
      dailyStats: {},
      dailyGoalMinutes: 15
    };
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_daily_goal_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.lastReadDate) {
            const todayStr = getLocalDateString();
            if (parsed.lastReadDate !== todayStr) {
              const lastRead = new Date(parsed.lastReadDate);
              const today = new Date(todayStr);
              // reset time to midnight to calculate clear days diff
              lastRead.setHours(0,0,0,0);
              today.setHours(0,0,0,0);
              const diffTime = Math.abs(today.getTime() - lastRead.getTime());
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 1) {
                parsed.streak = 0; // streak broken as more than 1 day has passed
              }
            }
          }
          return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultGoal;
  });

  // Export downloading states
  const [exportingBook, setExportingBook] = useState<BookItem | null>(null);
  const [exportParagraphIndex, setExportParagraphIndex] = useState<number>(-1);

  // Helper: Trigger file download in client browser
  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sync state stores back to browser LocalStorage
  useEffect(() => {
    localStorage.setItem("aura_books_shelf_v1", JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem("aura_settings_v1", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("aura_daily_goal_v2", JSON.stringify(goalState));
  }, [goalState]);

  // Handle recording progress from vocal players
  const handleRecordReading = (words: number, seconds: number) => {
    setGoalState(prev => {
      const today = getLocalDateString();
      const currentStats = prev.dailyStats[today] || { words: 0, minutes: 0 };
      const minutesRead = seconds / 60;
      
      const updatedStats = {
        words: currentStats.words + words,
        minutes: currentStats.minutes + minutesRead
      };

      // Streak update calculation flow
      let newStreak = prev.streak;
      const lastRead = prev.lastReadDate;

      if (!lastRead) {
        newStreak = 1; // first reading block
      } else if (lastRead !== today) {
        const lastReadDateObj = new Date(lastRead);
        const todayDateObj = new Date(today);
        lastReadDateObj.setHours(0,0,0,0);
        todayDateObj.setHours(0,0,0,0);
        const diffTime = Math.abs(todayDateObj.getTime() - lastReadDateObj.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak = prev.streak + 1; // consecutive day
        } else if (diffDays > 1) {
          newStreak = 1; // broke streak, restart at 1
        }
      }

      return {
        ...prev,
        streak: newStreak,
        lastReadDate: today,
        dailyStats: {
          ...prev.dailyStats,
          [today]: updatedStats
        }
      };
    });
  };

  const handleUpdateDailyGoal = (targetMinutes: number) => {
    setGoalState(prev => ({
      ...prev,
      dailyGoalMinutes: targetMinutes
    }));
  };

  const handleSimulateOneMinRead = () => {
    // Generate ~150 random words structure
    const dummyWords = 150;
    const dummySeconds = 60;
    handleRecordReading(dummyWords, dummySeconds);
  };

  // Handle adding new custom books
  const handleAddNewBook = (newBook: BookItem) => {
    setBooks(prev => [newBook, ...prev]);
    // Automatically transition list view and play!
    setActiveBook(newBook);
  };

  // Update book metrics (reading bookmark progress)
  const handleUpdateBookProgress = (bookId: string, progressSeconds: number) => {
    setBooks(prev => prev.map(book => {
      if (book.id === bookId) {
        return { ...book, progressSeconds: Math.min(progressSeconds, book.durationSeconds) };
      }
      return book;
    }));
  };

  // Action: deletion handle
  const handleDeleteBook = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this book from your private library shelf?")) {
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (activeBook?.id === bookId) {
        setActiveBook(null);
      }
    }
  };

  // Action: clear all state and reset standard shelf
  const handleResetRestoreDefaults = () => {
    if (confirm("Restore original classic library bookshelf? This will clear custom uploaded data.")) {
      setBooks(DEFAULT_BOOKS);
      setActiveBook(null);
      setActiveTab("home");
    }
  };

  // Filter books based on active search text query
  const filteredBooks = books.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q));
  });

  const sortedAndFilteredBooks = React.useMemo(() => {
    const list = [...filteredBooks];
    if (sortBy === "alphabetical") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "progress") {
      list.sort((a, b) => {
        const pctA = a.durationSeconds > 0 ? (a.progressSeconds / a.durationSeconds) : 0;
        const pctB = b.durationSeconds > 0 ? (b.progressSeconds / b.durationSeconds) : 0;
        return pctB - pctA; // completed progress first
      });
    } else {
      // "recent" (default)
      list.sort((a, b) => {
        const dateA = new Date(a.dateAdded || 0).getTime();
        const dateB = new Date(b.dateAdded || 0).getTime();
        return dateB - dateA; // newest added books at the top
      });
    }
    return list;
  }, [filteredBooks, sortBy]);

  const continueListeningItems = books.filter(b => b.progressSeconds > 0 && b.progressSeconds < b.durationSeconds);
  const unstartedItems = books.filter(b => b.progressSeconds === 0);

  // Quick prompt templates to test AI storytelling inside Explore
  const EXPLORE_SUGGESTIONS = [
    {
      title: "Myth of the Lost City",
      prompt: "Compose an epic mythical prologue about Atlantis, focusing on advanced technology drowned in deep violet oceans under silent neon moonbeams.",
      style: "Dramatic, orchestral narration, high-contrast wording",
      authorAddress: "Epic Storyteller",
    },
    {
      title: "The Alchemy of Tea",
      prompt: "Draft an immersive, warm historical reflection explaining how tea leaves shaped dynasties, Zen philosophy, and quiet afternoon tea rooms.",
      style: "Warm, meditative, informative zen tone",
      authorAddress: "Zen Scholar",
    },
    {
      title: "Sailing Beyond Europa",
      prompt: "Write a high-concept sci-fi logs stream from an interstellar biologist drilling through the icy mantle of Jupiter's moon Europa, discovering aquatic alien bioluminescence.",
      style: "Mysterious sci-fi log, clinical but evocative style",
      authorAddress: "Science Officer",
    }
  ];

  const handleGenerateExploreSuggestion = async (sug: typeof EXPLORE_SUGGESTIONS[0]) => {
    setActiveTab("import");
    // We auto-fill prompt fields inside uploader which acts as a guide, or we can notify them.
  };

  const todayStr = getLocalDateString();
  const todayStats = goalState.dailyStats[todayStr] || { words: 0, minutes: 0 };
  const todayMinutes = todayStats.minutes;
  const todayWords = todayStats.words;

  const weekDays = React.useMemo(() => {
    const list = [];
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Start from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const current = new Date();
      current.setDate(current.getDate() - i);
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      list.push({
        label: labels[current.getDay()],
        dayNum: current.getDate(),
        dateStr
      });
    }
    return list;
  }, [goalState.dailyStats]);

  return (
    <div id="aura-reader-app" className="min-h-screen pb-20 pt-4 px-4 sm:px-6 md:pb-6 md:pt-6 flex flex-col justify-between max-w-7xl mx-auto">
      {/* Top Brand Navigation header */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-900/40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveBook(null); setActiveTab("home"); }}>
          {/* Custom vector branding logo */}
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:rotate-6 transition-all flex items-center justify-center text-white font-bold font-display text-lg shadow-[0_4px_12px_rgba(99,102,241,0.35)]">
            A
          </div>
          <div>
            <h1 className="font-display font-bold tracking-widest text-[#f0ede6] text-sm uppercase">AuraReader</h1>
            <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Bring Your Own Key</span>
          </div>
        </div>

        {/* Global Key Status Indicators */}
        <div className="flex items-center gap-3">
          {effectiveOffline && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-mono font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              OFFLINE MODE (API DISABLED)
            </div>
          )}

          {/* Simulate Offline Trigger */}
          <button
            onClick={() => setIsOfflineSimulated(prev => !prev)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all border cursor-pointer ${
              isOfflineSimulated 
                ? "bg-rose-950 text-rose-300 border-rose-800" 
                : "bg-zinc-950 text-zinc-500 border-zinc-850 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
            title="Simulate / Trigger offline sandbox mode"
          >
            {isOfflineSimulated ? "Go Online" : "Simulate Offline"}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-full bg-zinc-950 border border-zinc-800/80 text-[10px] font-mono font-medium">
            <span className="px-2 py-0.5 rounded-full text-zinc-400">Keys:</span>
            <span className={`px-2 py-0.5 rounded-full ${settings.openaiKey && !effectiveOffline ? "bg-teal-950 text-teal-300" : "bg-zinc-900 text-zinc-500"}`}>
              {settings.openaiKey && !effectiveOffline ? "OpenAI ON" : "OpenAI Off"}
            </span>
            <span className={`px-2 py-0.5 rounded-full ${settings.elevenlabsKey && !effectiveOffline ? "bg-indigo-950 text-indigo-300" : "bg-zinc-900 text-zinc-500"}`}>
              {settings.elevenlabsKey && !effectiveOffline ? "ElevenLabs ON" : "ElevenLabs Off"}
            </span>
          </div>

          <button
            onClick={() => { setActiveBook(null); setActiveTab("voices"); }}
            className="p-2 border border-zinc-800 rounded-full bg-zinc-900/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Configure Speech Studio"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Section */}
      <main className="flex-1">
        {activeBook ? (
          // Fullscreen active reading deck
          <BookDetailView
            book={activeBook}
            settings={settings}
            onBack={() => setActiveBook(null)}
            onUpdateBookProgress={handleUpdateBookProgress}
            onRecordReading={handleRecordReading}
            effectiveOffline={effectiveOffline}
          />
        ) : (
          /* SECTION TAB: HOME SCREEN (CLONE OF ELEVENLABS.IO IN-APP VIEW) */
          activeTab === "home" ? (
            <div className="space-y-8 animate-fade-in">
              {/* Daily Reading Goal Card */}
              <div id="daily-reading-dashboard" className="p-5.5 rounded-3xl bg-zinc-900 border border-zinc-800/80 space-y-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-inner">
                      <Flame className="w-6 h-6 fill-amber-500/15" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-display font-bold text-zinc-100 text-sm uppercase tracking-wide">Daily Reading Journey</h4>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          goalState.streak > 0 
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse" 
                            : "bg-zinc-800 text-zinc-500 border border-zinc-750"
                        }`}>
                          🔥 {goalState.streak} Day habit streak
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] mt-1 pr-4">
                        Build a powerful listening routine. Read books and transcripts to maintain your daily target and log reading milestones.
                      </p>
                    </div>
                  </div>

                  {/* Goal configuration bar */}
                  <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-2 rounded-2xl border border-zinc-850 self-start md:self-center shrink-0">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 px-1.5 uppercase tracking-wide">Daily Target:</span>
                    {[5, 15, 30, 45].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleUpdateDailyGoal(mins)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          goalState.dailyGoalMinutes === mins
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                    
                    <button
                      onClick={handleSimulateOneMinRead}
                      className="ml-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-850 text-[10.5px] text-indigo-400 hover:text-white rounded-xl font-bold cursor-pointer transition-all shrink-0 uppercase tracking-tight"
                      title="Simulate 1 min of audiobook reading"
                    >
                      + 1m Read
                    </button>
                  </div>
                </div>

                {/* Performance grids */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1.5">
                  {/* Circular gauge */}
                  <div className="md:col-span-5 lg:col-span-4 bg-zinc-950/80 p-4 rounded-2xl flex items-center justify-between border border-zinc-850 shadow-inner">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Progress Today</span>
                      <span className="text-xl font-display font-extrabold text-[#fefaee] tracking-tight block">
                        {todayMinutes.toFixed(1)} <span className="text-xs font-normal text-zinc-500">/ {goalState.dailyGoalMinutes} min</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-medium">
                        ({todayWords} words logged)
                      </span>
                    </div>

                    {/* SVG Radial loader */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle cx="28" cy="28" r="23" className="stroke-zinc-850" strokeWidth="4" fill="transparent" />
                        <circle 
                          cx="28" 
                          cy="28" 
                          r="23" 
                          className="stroke-indigo-500 transition-all duration-500" 
                          strokeWidth="4" 
                          fill="transparent" 
                          strokeDasharray={2 * Math.PI * 23}
                          strokeDashoffset={2 * Math.PI * 23 * (1 - Math.min(todayMinutes / goalState.dailyGoalMinutes, 1))}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-mono text-zinc-200 font-extrabold">
                        {Math.round(Math.min(todayMinutes / goalState.dailyGoalMinutes, 1) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Calendar logs tracker */}
                  <div className="md:col-span-7 lg:col-span-8 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-850 flex flex-col justify-between gap-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">7-Day Completion Tracker</span>
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-950/20 uppercase tracking-tight">Habit logs</span>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day) => {
                        const isToday = day.dateStr === todayStr;
                        const stats = goalState.dailyStats[day.dateStr] || { words: 0, minutes: 0 };
                        const isCompleted = stats.minutes >= goalState.dailyGoalMinutes;
                        
                        return (
                          <div key={day.dateStr} className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl ${isToday ? "bg-zinc-900 border border-zinc-800" : ""}`}>
                            <span className={`text-[10px] font-bold font-mono ${isToday ? "text-indigo-400" : "text-zinc-500"}`}>
                              {day.label}
                            </span>
                            
                            <div 
                              className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold transition-all border ${
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                  : stats.minutes > 0
                                  ? "bg-amber-400/10 text-amber-400 border-amber-400/25"
                                  : "bg-zinc-900 text-zinc-650 border-zinc-800"
                              }`}
                              title={`${stats.minutes.toFixed(1)}m read / ${stats.words} words`}
                            >
                              {isCompleted ? "✓" : stats.minutes > 0 ? "•" : day.dayNum}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Navigation row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-full border border-zinc-800 shrink-0">
                  <button
                    onClick={() => setHomeSubTab("for-you")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      homeSubTab === "for-you" 
                        ? "bg-zinc-900 text-[#fefaed] shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    For you
                  </button>
                  <button
                    onClick={() => setHomeSubTab("featured")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      homeSubTab === "featured" 
                        ? "bg-zinc-900 text-[#fefaed]" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Featured Classics
                  </button>
                </div>

                {/* Search query input */}
                <div className="relative max-w-xs flex-1 hidden md:block">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search library titles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-full pl-10 pr-4 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* SECTION: CONTINUE LISTENING */}
              {continueListeningItems.length > 0 && homeSubTab === "for-you" && (
                <div className="space-y-4">
                  <h3 className="font-display font-semibold text-lg text-zinc-300 tracking-tight">
                    Continue listening
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {continueListeningItems.map((bookItem) => {
                      const pct = Math.round((bookItem.progressSeconds / bookItem.durationSeconds) * 100);
                      return (
                        <div
                          key={bookItem.id}
                          onClick={() => setActiveBook(bookItem)}
                          className="group flex p-4.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-850 transition-all cursor-pointer items-center justify-between relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            {/* Colorful Gradient cover */}
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${bookItem.coverGradient} shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center p-3 text-center shadow`}>
                              <span className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                                {bookItem.title.split(" ").slice(0, 2).join(" ")}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-zinc-100 block group-hover:text-indigo-300 transition-colors truncate">
                                {bookItem.title}
                              </span>
                              <span className="text-xs text-zinc-400 block mt-0.5 select-none font-medium">
                                Left off at page {Math.round(pct / 10)} / ~{pct}% read
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 relative z-10">
                            <span className="text-xs font-mono font-medium text-zinc-500 shrink-0">
                              {Math.round((bookItem.durationSeconds - bookItem.progressSeconds) / 60)}m left
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExportingBook(bookItem);
                              }}
                              className="p-2 rounded-full bg-zinc-950 border border-zinc-850 text-indigo-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-inner shrink-0"
                              title="Export manuscript"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <div className="p-2 rounded-full bg-zinc-950 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors shadow-inner shrink-0">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                          </div>

                          {/* Inline slim loading percentage bar */}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950/40">
                            <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: UPLOAD & LISTEN QUICK ACTIONS */}
              {homeSubTab === "for-you" && (
                <div className="space-y-4">
                  <h3 className="font-display font-semibold text-lg text-zinc-300 tracking-tight">
                    Upload & listen
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        title: "Write text",
                        desc: "Draft script or write prompts",
                        icon: FileText,
                        badgeColor: "bg-amber-400",
                        action: () => setActiveTab("import")
                      },
                      {
                        title: "Upload a file",
                        desc: "Read plain text files in local shell",
                        icon: UploadCloud,
                        badgeColor: "bg-indigo-400",
                        action: () => setActiveTab("import")
                      },
                      {
                        title: "Scan text",
                        desc: "Visual OCR page scans",
                        icon: Camera,
                        badgeColor: "bg-rose-400",
                        action: () => setActiveTab("import")
                      },
                      {
                        title: "Paste a link",
                        desc: "Scrape and clean web articles",
                        icon: Link2,
                        badgeColor: "bg-teal-400",
                        action: () => setActiveTab("import")
                      }
                    ].map((act, idx) => (
                      <div
                        key={idx}
                        onClick={act.action}
                        className="group flex flex-col justify-between p-5 rounded-3xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 active:scale-95 transition-all text-left cursor-pointer shadow-lg hover:shadow-xl relative overflow-hidden"
                      >
                        <div className="space-y-4">
                          <div className={`w-10 h-10 rounded-2xl ${act.badgeColor}/10 border border-${act.badgeColor}/20 flex items-center justify-center text-zinc-100 group-hover:scale-105 transition-transform`}>
                            <act.icon className="w-5 h-5 text-zinc-100" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-zinc-250 block group-hover:text-indigo-300 transition-colors">
                              {act.title}
                            </span>
                            <span className="text-[11px] text-zinc-400 block mt-1 tracking-tight">
                              {act.desc}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: SUGGESTED LIBRARY STORY CHANNELS */}
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-lg text-zinc-300 tracking-tight">
                  {homeSubTab === "for-you" ? "Recommended collections" : "Classic Library Catalog"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(homeSubTab === "for-you" ? books.slice(0, 4) : books).map((b) => {
                    const pct = Math.round((b.progressSeconds / b.durationSeconds) * 100);
                    return (
                      <div
                        key={b.id}
                        onClick={() => setActiveBook(b)}
                        className="group relative rounded-3xl bg-zinc-950/40 border border-zinc-900/60 p-4.5 space-y-4 flex flex-col justify-between hover:bg-zinc-900/60 transition-all cursor-pointer shadow hover:shadow-xl hover:border-zinc-800"
                      >
                        {/* Cover Block with Gradient */}
                        <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${b.coverGradient} p-5 flex flex-col justify-between relative overflow-hidden shadow`}>
                          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                          
                          <div className="flex justify-between items-start z-10 text-[9px] font-mono tracking-wider font-bold">
                            <span className="bg-black/20 backdrop-blur-md text-white/80 px-2 py-0.5 rounded-full border border-white/5">
                              {b.author?.split(" ").pop()}
                            </span>
                          </div>

                          <div className="z-10 mt-12">
                            <h4 className="font-display font-bold text-sm text-white tracking-tight leading-tight line-clamp-2">
                              {b.title}
                            </h4>
                          </div>
                        </div>

                        {/* Summary and progress indicator */}
                        <div className="space-y-3.5">
                          <p className="text-xs text-zinc-400 leading-normal line-clamp-2">
                            {b.summary}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{Math.round(b.durationSeconds / 60)} min read</span>
                            </div>

                            {pct > 0 && (
                              <span className="text-indigo-450 text-xs font-semibold">{pct}% read</span>
                            )}
                          </div>
                        </div>

                        {/* Grouped hover action buttons */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportingBook(b);
                            }}
                            className="p-1.5 bg-zinc-950/90 text-indigo-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/80 rounded-full transition-all cursor-pointer shadow-md"
                            title="Export manuscript"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!b.isDefault && (
                            <button
                              onClick={(e) => handleDeleteBook(b.id, e)}
                              className="p-1.5 bg-zinc-950/90 text-zinc-400 hover:text-rose-450 hover:bg-zinc-900 border border-zinc-800/80 rounded-full transition-all cursor-pointer shadow-md"
                              title="Remove from Shelf"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : 
          
          /* SECTION TAB: EXPLORE / TRENDING SCRIPT DRAFTS */
          activeTab === "explore" ? (
            <div className="space-y-6 animate-fade-in">
              <div className="max-w-2xl mx-auto text-center space-y-2 mb-8">
                <span className="text-xs font-mono font-bold uppercase text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">Explore vocal talents</span>
                <h2 className="font-display text-2xl font-bold text-zinc-100 tracking-tight">Audiobook Inspiration Deck</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Generate beautiful narration scripts and story drafts based on creative prompts powered by Gemini AI, then convert them instantly to audio with ElevenLabs or OpenAI.
                </p>
              </div>

              <div id="explore-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {EXPLORE_SUGGESTIONS.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleGenerateExploreSuggestion(sug)}
                    className="group bg-zinc-900 border border-zinc-850 p-6 rounded-3xl flex flex-col justify-between hover:border-zinc-700/80 hover:-translate-y-0.5 transition-all text-left cursor-pointer shadow-lg"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        <span className="font-semibold text-sm text-zinc-200 group-hover:text-indigo-300 transition-colors">
                          {sug.title}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-4 leading-relaxed italic">
                        &ldquo;{sug.prompt}&rdquo;
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-950 flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="font-mono uppercase font-semibold">Style: {sug.style.split(",")[0]}</span>
                      <span className="text-indigo-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 uppercase">
                        Generate
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra community voices info card */}
              <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 text-center max-w-2xl mx-auto space-y-3">
                <HelpCircle className="w-6 h-6 text-zinc-500 mx-auto" />
                <h4 className="text-zinc-200 font-semibold text-xs uppercase tracking-wide">Bring your own voices</h4>
                <p className="text-xs text-zinc-400 leading-normal">
                  You can configure and test ElevenLabs voice keys or pick OpenAI audio endpoints. To listen instantly, we load default fallbacks of your browser&apos;s Web Speech drivers, so no credit card is ever required.
                </p>
              </div>
            </div>
          ) : 
          
          /* SECTION TAB: UPLOAD / INGEST WRITING & AUDIO FILE SOURCE */
          activeTab === "import" ? (
            <div className="space-y-6 animate-fade-in">
              <div className="max-w-xl mx-auto text-center space-y-2 mb-8">
                <h2 className="font-display text-2xl font-bold text-[#fefeeb] tracking-tight">Add Content to Library</h2>
                <p className="text-sm text-zinc-400">
                  Compose narratives directly, fetch clean articles, or perform multi-modal photo page transcribe OCR.
                </p>
              </div>
              <ImportContentForm onAddBook={handleAddNewBook} />
            </div>
          ) : 
          
          /* SECTION TAB: LIBRARY BOOKSHELF DISPLAY PANEL */
          activeTab === "library" ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-zinc-250">Your Private Shelf</h2>
                  <p className="text-xs text-zinc-500">Review, listen, and clear historical logs.</p>
                </div>

                <div className="flex items-center gap-3.5 flex-wrap">
                  {/* Custom select sorting dropdown */}
                  <div className="relative">
                    <select
                      id="library-shelf-sorting"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="bg-zinc-950 border border-zinc-800/80 px-4 py-2 pr-9 rounded-full text-[11px] font-mono font-bold tracking-wider text-zinc-400 hover:text-zinc-200 transition-all focus:outline-none appearance-none cursor-pointer uppercase shadow-inner animate-fade-in"
                    >
                      <option value="recent">Sort: Recently Added</option>
                      <option value="alphabetical">Sort: Alphabetical</option>
                      <option value="progress">Sort: Reading Progress</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-500">
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>

                  <button
                    onClick={handleResetRestoreDefaults}
                    className="px-3.5 py-2 border border-zinc-850 hover:bg-zinc-900 rounded-full text-[11px] font-semibold tracking-wider text-zinc-400 hover:text-zinc-100 transition-colors uppercase cursor-pointer"
                  >
                    Restore Defaults
                  </button>
                </div>
              </div>

              {sortedAndFilteredBooks.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 space-y-3 bg-zinc-950/20 border border-zinc-900 rounded-3xl">
                  <BookOpen className="w-8 h-8 mx-auto text-zinc-650" />
                  <p className="text-sm">No books found matching search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {sortedAndFilteredBooks.map((b) => {
                    const pct = Math.round((b.progressSeconds / b.durationSeconds) * 100);
                    return (
                      <div
                        key={b.id}
                        onClick={() => setActiveBook(b)}
                        className="group relative rounded-3xl bg-zinc-900/40 p-5 border border-zinc-850 hover:bg-zinc-850/50 hover:border-zinc-700 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-semibold text-base text-zinc-150 block truncate group-hover:text-indigo-400 transition-colors">
                                {b.title}
                              </span>
                              <span className="text-xs text-zinc-500 block">by {b.author || "Unspecified"}</span>
                            </div>

                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${b.coverGradient} shrink-0`} />
                          </div>

                          <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                            {b.summary}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-950/50 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                          {pct > 0 ? (
                            <span className="text-indigo-400 font-semibold">{pct}% completed</span>
                          ) : (
                            <span className="text-zinc-500">Unread</span>
                          )}

                          <span className="text-zinc-400 inline-flex items-center gap-1 group-hover:translate-x-1 duration-150 uppercase tracking-wide font-bold">
                            Listen
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>

                        {/* Grouped hover action buttons */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportingBook(b);
                            }}
                            className="p-1.5 bg-zinc-950/90 text-indigo-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/80 rounded-full transition-all cursor-pointer shadow-md"
                            title="Export manuscript"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!b.isDefault && (
                            <button
                              onClick={(e) => handleDeleteBook(b.id, e)}
                              className="p-1.5 bg-zinc-950/90 text-zinc-400 hover:text-rose-450 hover:bg-zinc-900 border border-zinc-800/80 rounded-full transition-all cursor-pointer shadow-md"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : 
          
          /* SECTION TAB: VOICES & SPEECH API PREFERENCES */
          activeTab === "voices" ? (
            <div className="space-y-6">
              <VoiceConfiguration
                settings={settings}
                onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
              />
            </div>
          ) : null
        )}
      </main>

      {/* Floating Bottom Navigation (Designed for absolute mobile optimization) */}
      <nav id="floating-bottom-nav" className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/85 border-t border-zinc-900 backdrop-blur-xl z-30 flex items-center justify-around px-4 md:hidden">
        {[
          { tab: "home" as const, label: "Home", icon: Home },
          { tab: "explore" as const, label: "Explore", icon: Compass },
          { tab: "import" as const, label: "Import", icon: UploadCloud },
          { tab: "library" as const, label: "Library", icon: BookMarked },
          { tab: "voices" as const, label: "Voices", icon: Settings },
        ].map((item) => {
          const isSelected = activeTab === item.tab && !activeBook;
          return (
            <button
              key={item.tab}
              onClick={() => {
                setActiveBook(null);
                setActiveTab(item.tab);
              }}
              className={`flex flex-col items-center justify-center gap-1 w-14 h-12 cursor-pointer transition-colors ${
                isSelected ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] tracking-tight font-medium select-none uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Grid Side-Navigator visible on large browser desktops (touch padding guidelines aligned) */}
      <aside id="sidebar-aside" className="hidden md:flex fixed left-6 top-24 bottom-24 w-16 bg-zinc-950/70 border border-zinc-900/80 backdrop-blur rounded-full flex-col items-center justify-between py-8 space-y-6 z-30 shadow-2xl">
        <div className="flex flex-col gap-4">
          {[
            { tab: "home" as const, label: "Home", icon: Home },
            { tab: "explore" as const, label: "Explore", icon: Compass },
            { tab: "import" as const, label: "Import", icon: UploadCloud },
            { tab: "library" as const, label: "Library", icon: BookMarked },
          ].map((item) => {
            const isSelected = activeTab === item.tab && !activeBook;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setActiveBook(null);
                  setActiveTab(item.tab);
                }}
                className={`p-3.5 rounded-full cursor-pointer transition-all ${
                  isSelected ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/10" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setActiveBook(null);
            setActiveTab("voices");
          }}
          className={`p-3.5 rounded-full cursor-pointer transition-all ${
            activeTab === "voices" && !activeBook ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/10" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
          title="Voice Studio"
        >
          <Settings className="w-5 h-5" />
        </button>
      </aside>

      {/* Export modal dialog */}
      {exportingBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Download className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-display font-medium text-lg text-zinc-100">Export Audiobook Content</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Choose a structured format to retrieve the narrated transcript of <span className="text-indigo-300 font-semibold">{exportingBook.title}</span>.
              </p>
            </div>

            <div className="space-y-4">
              {/* Scope Selection: Full Book vs Specific Part */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">Selection Scope</label>
                <div className="relative">
                  <select
                    value={exportParagraphIndex}
                    onChange={(e) => setExportParagraphIndex(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                  >
                    <option value="-1">Entire Book / Full Text ({exportingBook.content.split(/\n+/).filter(Boolean).length} paragraphs)</option>
                    {exportingBook.content.split(/\n+/).filter(p => p.trim()).map((para, idx) => (
                      <option key={idx} value={idx}>
                        Paragraph/Chapter {idx + 1}: &ldquo;{para.slice(0, 45)}...&rdquo;
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Action Buttons to Choose Format */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const paragraphs = exportingBook.content.split(/\n+/).map(p => p.trim()).filter(Boolean);
                    let contentToExport = "";
                    let fileSuffix = "all";

                    if (exportParagraphIndex === -1) {
                      contentToExport = `Title: ${exportingBook.title}
Author: ${exportingBook.author || "Unknown"}
Summary: ${exportingBook.summary}
Date Added: ${exportingBook.dateAdded || "N/A"}

========================================

${paragraphs.join("\n\n")}`;
                    } else {
                      contentToExport = paragraphs[exportParagraphIndex] || "";
                      fileSuffix = `paragraph-${exportParagraphIndex + 1}`;
                    }

                    const sanitizedTitle = exportingBook.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    downloadFile(contentToExport, `${sanitizedTitle}-${fileSuffix}.txt`, "text/plain;charset=utf-8");
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-850 rounded-2xl gap-2 cursor-pointer group transition-all"
                >
                  <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-indigo-400">[TXT]</span>
                  <span className="font-semibold text-xs text-zinc-200">Plain Text File</span>
                  <span className="text-[9px] text-zinc-500 text-center leading-tight">Best for offline readers or editing</span>
                </button>

                <button
                  onClick={() => {
                    const paragraphs = exportingBook.content.split(/\n+/).map(p => p.trim()).filter(Boolean);
                    let dataToExport: any = {};
                    let fileSuffix = "all";

                    if (exportParagraphIndex === -1) {
                      dataToExport = {
                        schema: "aurareader_book_v1",
                        id: exportingBook.id,
                        title: exportingBook.title,
                        author: exportingBook.author,
                        summary: exportingBook.summary,
                        coverGradient: exportingBook.coverGradient,
                        dateAdded: exportingBook.dateAdded,
                        durationSeconds: exportingBook.durationSeconds,
                        progressSeconds: exportingBook.progressSeconds,
                        paragraphs: paragraphs,
                        fullContent: exportingBook.content
                      };
                    } else {
                      dataToExport = {
                        bookId: exportingBook.id,
                        bookTitle: exportingBook.title,
                        paragraphIndex: exportParagraphIndex,
                        paragraphContent: paragraphs[exportParagraphIndex] || ""
                      };
                      fileSuffix = `paragraph-${exportParagraphIndex + 1}`;
                    }

                    const sanitizedTitle = exportingBook.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    downloadFile(JSON.stringify(dataToExport, null, 2), `${sanitizedTitle}-${fileSuffix}.json`, "application/json;charset=utf-8");
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-850 rounded-2xl gap-2 cursor-pointer group transition-all"
                >
                  <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-indigo-400">[JSON]</span>
                  <span className="font-semibold text-xs text-zinc-200">Structured JSON</span>
                  <span className="text-[9px] text-zinc-500 text-center leading-tight">Includes reading state & metadata</span>
                </button>
              </div>
            </div>

            {/* Close footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setExportingBook(null);
                  setExportParagraphIndex(-1);
                }}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

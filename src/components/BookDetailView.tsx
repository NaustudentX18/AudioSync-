import { useState, useEffect, useRef } from "react";
import { BookItem, UserSettings } from "../types";
import { VOICE_DEFAULTS } from "../data";
import { speakWebSpeech, synthesizeElevenLabs, synthesizeOpenAI } from "../utils/speech";
import AudioVisualizer from "./AudioVisualizer";
import { 
  Play, Pause, ChevronLeft, Volume2, SkipForward, SkipBack, 
  Download, Loader2, Sparkles, BookOpen, AlertCircle, RefreshCcw,
  Moon, Timer
} from "lucide-react";

interface BookDetailViewProps {
  book: BookItem;
  settings: UserSettings;
  onBack: () => void;
  onUpdateBookProgress: (bookId: string, progressSeconds: number) => void;
  onRecordReading?: (words: number, seconds: number) => void;
  effectiveOffline?: boolean;
}

export default function BookDetailView({ 
  book, 
  settings, 
  onBack, 
  onUpdateBookProgress,
  onRecordReading,
  effectiveOffline = false
}: BookDetailViewProps) {
  // Split content into clean individual paragraphs
  const paragraphs = book.content
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Sleep Timer states
  const [sleepTimerType, setSleepTimerType] = useState<"off" | "minutes" | "paragraphs">("off");
  const [sleepTimerTimeLeft, setSleepTimerTimeLeft] = useState<number>(0); // in seconds
  const [sleepTimerParagraphsLeft, setSleepTimerParagraphsLeft] = useState<number>(0);
  const [isTimerDropdownOpen, setIsTimerDropdownOpen] = useState<boolean>(false);

  // Time Countdown sleep timer effect
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && sleepTimerType === "minutes" && sleepTimerTimeLeft > 0) {
      interval = setInterval(() => {
        setSleepTimerTimeLeft(prev => {
          if (prev <= 1) {
            // Self pause
            if (audioRef.current) {
              audioRef.current.pause();
            }
            if (typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            setIsPlaying(false);
            setSleepTimerType("off");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, sleepTimerType, sleepTimerTimeLeft]);

  // Handler to set the timer
  const handleSetSleepTimer = (type: "off" | "minutes" | "paragraphs", amount: number) => {
    setSleepTimerType(type);
    if (type === "minutes") {
      setSleepTimerTimeLeft(amount * 60);
      setSleepTimerParagraphsLeft(0);
    } else if (type === "paragraphs") {
      setSleepTimerParagraphsLeft(amount);
      setSleepTimerTimeLeft(0);
    } else {
      setSleepTimerTimeLeft(0);
      setSleepTimerParagraphsLeft(0);
    }
    setIsTimerDropdownOpen(false);
  };

  // Audio playback references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [cachedAudioUrls, setCachedAudioUrls] = useState<Record<number, string>>({});

  // Active voice information
  const activeVoice = VOICE_DEFAULTS.find(v => v.id === settings.selectedVoiceId) || VOICE_DEFAULTS[0];

  // Stop everything when switching books or closing
  useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, []);

  // Update active index if progress changed
  useEffect(() => {
    if (book.progressSeconds > 0) {
      // rough calculation: estimate active paragraph
      const estimatedIndex = Math.min(
        Math.floor((book.progressSeconds / book.durationSeconds) * paragraphs.length),
        paragraphs.length - 1
      );
      if (estimatedIndex !== activeParagraphIndex && !isPlaying) {
        setActiveParagraphIndex(estimatedIndex);
      }
    }
  }, [book.id]);

  const stopAllPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  // Play a specific paragraph index
  const playParagraph = async (index: number) => {
    try {
      stopAllPlayback();
      setActiveParagraphIndex(index);
      setIsLoadingSpeech(true);
      setAudioError(null);

      const targetText = paragraphs[index];
      if (!targetText) return;

      // Track reading progress coordinates
      const estimationSec = Math.floor((index / paragraphs.length) * book.durationSeconds);
      onUpdateBookProgress(book.id, estimationSec);

      // Web Speech Synth Driver
      if (activeVoice.engine === "webspeech") {
        setIsLoadingSpeech(false);
        setIsPlaying(true);
        utteranceRef.current = speakWebSpeech(
          targetText,
          activeVoice.voiceIdValue,
          settings.playbackSpeed,
          () => {}, // boundary
          () => {
            // End handler - Trigger sequencer auto advance
            handleParagraphCompleted(index);
          },
          (err) => {
            console.error("Web Speech error:", err);
            setAudioError("Browser audio stream interrupted.");
            setIsPlaying(false);
          }
        );
      } 
      // API Key Synthesizer Engines (Cached locally in state)
      else {
        let audioUrl = cachedAudioUrls[index];

        if (!audioUrl) {
          if (activeVoice.engine === "openai") {
            if (!settings.openaiKey) {
              throw new Error("OpenAI key missing. Open settings (Voices tab) and provide standard key.");
            }
            audioUrl = await synthesizeOpenAI(targetText, activeVoice.voiceIdValue, settings.openaiKey);
          } else {
            if (!settings.elevenlabsKey) {
              throw new Error("ElevenLabs x-api-key missing. Set it in Speech settings to synthesise.");
            }
            audioUrl = await synthesizeElevenLabs(targetText, activeVoice.voiceIdValue, settings.elevenlabsKey);
          }

          setCachedAudioUrls(prev => ({ ...prev, [index]: audioUrl }));
        }

        setIsLoadingSpeech(false);
        
        const audio = new Audio(audioUrl);
        audio.playbackRate = settings.playbackSpeed;
        audioRef.current = audio;
        
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Audio trigger block:", err);
          setAudioError("Play aborted. Confirm browser audio activation.");
        });

        audio.onended = () => {
          handleParagraphCompleted(index);
        };

        audio.onerror = () => {
          setAudioError("Engine stream decoding stalled.");
          setIsPlaying(false);
        };
      }
    } catch (err: any) {
      console.error(err);
      setAudioError(err.message || "Failed voice synthesizer process.");
      setIsLoadingSpeech(false);
      setIsPlaying(false);
    }
  };

  const handleParagraphCompleted = (completedIndex: number) => {
    // 1. Record read statistics to the active day milestones
    const text = paragraphs[completedIndex];
    if (text) {
      const words = text.split(/\s+/).filter(Boolean).length;
      // Estimate 150 words per minute average speed
      const durationSeconds = Math.round((words / 150) * 60) || 8;
      onRecordReading?.(words, durationSeconds);
    }

    // 2. Sleep timer decrement and safety pause checks
    let timerStopped = false;
    if (sleepTimerType === "paragraphs" && sleepTimerParagraphsLeft > 0) {
      const nextLeft = sleepTimerParagraphsLeft - 1;
      setSleepTimerParagraphsLeft(nextLeft);
      if (nextLeft <= 0) {
        // Pausing everything cleanly
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsPlaying(false);
        setSleepTimerType("off");
        timerStopped = true;
      }
    }

    // 3. Sequencer step forward flow
    if (!timerStopped) {
      if (completedIndex < paragraphs.length - 1) {
        // Move to next paragraph
        playParagraph(completedIndex + 1);
      } else {
        // Completed book completely
        setIsPlaying(false);
        onUpdateBookProgress(book.id, book.durationSeconds);
        setActiveParagraphIndex(0);
      }
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAllPlayback();
    } else {
      playParagraph(activeParagraphIndex);
    }
  };

  const handleNextParagraph = () => {
    if (activeParagraphIndex < paragraphs.length - 1) {
      playParagraph(activeParagraphIndex + 1);
    }
  };

  const handlePrevParagraph = () => {
    if (activeParagraphIndex > 0) {
      playParagraph(activeParagraphIndex - 1);
    }
  };

  const progressPercentage = Math.round((activeParagraphIndex / paragraphs.length) * 100);

  return (
    <div id={`book-detail-${book.id}`} className="max-w-4xl mx-auto space-y-6 animate-fade-in mb-32">
      {/* Top Header Section */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            stopAllPlayback();
            onBack();
          }}
          className="flex items-center gap-1.5 px-4 py-2 border border-zinc-800 rounded-full bg-zinc-900/40 text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-800 transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-500" />
          Keep Listening on Library Dashboard
        </button>

        <div className="flex items-center gap-2">
          {/* Engine Indicator badge */}
          <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold uppercase ${
            activeVoice.engine === "elevenlabs" 
              ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/30" 
              : activeVoice.engine === "openai" 
              ? "bg-teal-950/80 text-teal-300 border border-teal-800/30" 
              : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/35"
          }`}>
            Vocalist: {activeVoice.name.split(" ")[0]} ({activeVoice.engine === "webspeech" ? "System" : activeVoice.engine})
          </span>
        </div>
      </div>

      {/* Main Reading Canvas & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: cover and Summary */}
        <div className="space-y-4 lg:col-span-1">
          <div className={`aspect-[3/4] rounded-3xl bg-gradient-to-br ${book.coverGradient} p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
            {/* Ambient inner soft lighting */}
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
            <div className="absolute -top-24 -left-20 w-48 h-48 rounded-full bg-white/5 filter blur-2xl group-hover:scale-120 transition-all" />
            
            <div className="flex justify-between items-start z-10">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-white/55 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5">
                {book.isDefault ? "Classic Library" : "User Import"}
              </span>
              <BookOpen className="w-5 h-5 text-white/70" />
            </div>

            <div className="z-10 space-y-2">
              <h1 className="font-display font-bold text-xl leading-tight text-white tracking-tight">
                {book.title}
              </h1>
              <p className="text-xs font-medium text-white/80">
                by {book.author || "Anonymous"}
              </p>
            </div>

            <div className="z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70 font-mono">
              <span>{paragraphs.length} paragraphs</span>
              <span>~{Math.round(book.durationSeconds / 60)}m listen</span>
            </div>
          </div>

          {/* AI Page/Summary details */}
          <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800/70 space-y-3">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              Story Digest
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {book.summary}
            </p>
          </div>
        </div>

        {/* Right Canvas: Scrollable interactive paragraphs */}
        <div className="lg:col-span-2 bg-zinc-900/55 border border-zinc-800 p-6 sm:p-8 rounded-3xl relative h-[520px] flex flex-col justify-between shadow-inner">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-zinc-400 font-mono">Interactive Reader Mode</span>
          </div>

          {/* Scroll container */}
          <div className="overflow-y-auto space-y-5 pr-2 flex-1 scroll-smooth">
            {paragraphs.map((para, i) => {
              const isActive = activeParagraphIndex === i;
              return (
                <div
                  key={i}
                  id={`paragraph-${i}`}
                  onClick={() => playParagraph(i)}
                  className={`group p-4 rounded-2xl cursor-pointer text-sm sm:text-base leading-relaxed transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-zinc-950 to-indigo-950/20 border-l-[3px] border-indigo-500 pl-4 text-zinc-100 font-medium scale-[1.01] shadow-[0_4px_20px_rgba(99,102,241,0.15)]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20 pl-2"
                  }`}
                >
                  {para}
                </div>
              );
            })}
          </div>

          {/* Prompt warning or errors */}
          {audioError && (
            <div className="mt-4 flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 p-3 border border-rose-900 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{audioError}</span>
              <button 
                onClick={() => playParagraph(activeParagraphIndex)}
                className="ml-auto text-[10px] underline font-bold uppercase text-rose-400 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Audio Desk (Docked at base) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-zinc-950/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-4 shadow-2xl z-40 space-y-3.5">
        
        {/* Upper Track status and control bar */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Metadata Display */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${book.coverGradient} shrink-0 shadow-md`} />
            <div className="min-w-0">
              <span className="font-semibold text-xs tracking-tight text-zinc-100 block truncate leading-tight">
                {book.title}
              </span>
              <span className="text-[10px] font-mono font-medium text-zinc-400 block mt-0.5 truncate uppercase">
                Voice: {activeVoice.name.split(" ")[0]} ({activeVoice.engine === "webspeech" ? "System" : "Premium"})
              </span>
            </div>
          </div>

          {/* Centered Controls */}
          <div className="flex items-center gap-3">
            {/* Skip Back */}
            <button
              onClick={handlePrevParagraph}
              disabled={activeParagraphIndex === 0}
              className="p-2 rounded-full cursor-pointer text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/Pause pill */}
            <button
              onClick={handleTogglePlay}
              className={`p-3 rounded-full cursor-pointer transition-all scale-105 hover:scale-110 active:scale-95 ${
                isPlaying 
                  ? "bg-indigo-600 text-white animate-pulse-subtle shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                  : "bg-zinc-100 text-zinc-950"
              }`}
            >
              {isLoadingSpeech ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={handleNextParagraph}
              disabled={activeParagraphIndex === paragraphs.length - 1}
              className="p-2 rounded-full cursor-pointer text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Sleep Timer Option Trigger (Sleek Theme compatible) */}
            <div className="relative">
              <button
                onClick={() => setIsTimerDropdownOpen(prev => !prev)}
                className={`p-2 rounded-full cursor-pointer transition-all relative border ${
                  sleepTimerType !== "off" 
                    ? "text-amber-400 bg-amber-400/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]" 
                    : "text-zinc-400 hover:text-white bg-transparent border-transparent"
                }`}
                title="Configure Sleep Timer"
              >
                <Moon className="w-4 h-4 fill-current opacity-75" />
                {sleepTimerType !== "off" && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              {/* Timer Options Dropup menu dialog */}
              {isTimerDropdownOpen && (
                <div className="absolute right-0 bottom-10 mb-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl z-55 space-y-2.5">
                  <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                    <Timer className="w-3.5 h-3.5 text-indigo-400 font-bold" />
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider">Set Sleep Timer</span>
                  </div>

                  {/* Active Timer state readout */}
                  {sleepTimerType !== "off" && (
                    <div className="bg-amber-400/10 border border-amber-500/15 p-2 rounded-xl text-[9.5px] font-mono text-amber-300 flex items-center justify-between">
                      <span>Active:</span>
                      <span className="font-bold">
                        {sleepTimerType === "minutes"
                          ? `${Math.floor(sleepTimerTimeLeft / 60)}m ${sleepTimerTimeLeft % 60}s`
                          : `${sleepTimerParagraphsLeft} blocks left`}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 font-sans">
                    <button
                      onClick={() => handleSetSleepTimer("off", 0)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wide text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    >
                      Turn Off Timer
                    </button>

                    <div className="border-t border-zinc-900 my-1 spacer" />
                    <span className="px-2 text-[9px] font-mono font-extrabold text-zinc-500 uppercase tracking-widest block mb-1">Minutes Timer</span>
                    
                    <div className="grid grid-cols-4 gap-1 px-1">
                      {[5, 15, 30, 45].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => handleSetSleepTimer("minutes", mins)}
                          className="px-1.5 py-1 bg-zinc-900 hover:bg-zinc-850 hover:text-indigo-400 border border-zinc-800/80 rounded-lg text-[10px] font-bold font-mono text-zinc-350 cursor-pointer transition-colors"
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-zinc-900 my-1 spacer" />
                    <span className="px-2 text-[9px] font-mono font-extrabold text-zinc-500 uppercase tracking-widest block mb-1">Paragraph blocks</span>

                    <div className="grid grid-cols-4 gap-1 px-1">
                      {[1, 2, 4, 8].map((paras) => (
                        <button
                          key={paras}
                          onClick={() => handleSetSleepTimer("paragraphs", paras)}
                          className="px-1.5 py-1 bg-zinc-900 hover:bg-zinc-850 hover:text-indigo-400 border border-zinc-800/80 rounded-lg text-[10px] font-bold font-mono text-zinc-350 cursor-pointer transition-colors"
                        >
                          {paras}p
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Waveform Visualization area */}
          <div className="hidden sm:block shrink-0">
            <AudioVisualizer isPlaying={isPlaying} />
          </div>
        </div>

        {/* Lower Progress slider & download logs */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400">
          <span>{progressPercentage}% read</span>
          
          {/* Progress bar block */}
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden relative cursor-pointer group">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Export synthesized paragraph option (Only for premium TTS engines) */}
          {activeVoice.engine !== "webspeech" && cachedAudioUrls[activeParagraphIndex] && (
            <a
              href={cachedAudioUrls[activeParagraphIndex]}
              download={`${book.id}-para-${activeParagraphIndex}.mp3`}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase bg-zinc-900 border border-zinc-800 text-indigo-400 rounded-lg shrink-0 transition-colors hover:bg-zinc-800 hover:text-white"
              title="Download generated voice track"
            >
              <Download className="w-3 h-3" />
              Export
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

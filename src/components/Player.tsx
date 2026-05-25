import React, { useEffect, useMemo, useRef, useState } from 'react';
import AudioVisualizer from './AudioVisualizer';
import { WaveformCanvas } from './WaveformCanvas';
import { type DownloadTask, type PlaybackProfile, type QueueItem, queueEnqueue, queueMove, queueRemove, queueShift } from '../lib/parity';
import { VOICES, VoiceId, BUILTIN_VOICES } from '../lib/tts';

type VoiceItem = {
  id: string;
  label: string;
  provider: 'kokoro' | 'openai' | 'stepfun';
};

const KOKORO_VOICES: VoiceItem[] = [
  { id: 'af_heart',    label: 'af_heart (Female)',   provider: 'kokoro' },
  { id: 'af_bella',    label: 'af_bella (Female)',   provider: 'kokoro' },
  { id: 'af_nicole',   label: 'af_nicole (Female)',  provider: 'kokoro' },
  { id: 'af_sky',      label: 'af_sky (Female)',     provider: 'kokoro' },
  { id: 'am_adam',     label: 'am_adam (Male)',      provider: 'kokoro' },
  { id: 'am_michael',  label: 'am_michael (Male)',   provider: 'kokoro' },
  { id: 'am_onyx',     label: 'am_onyx (Male)',      provider: 'kokoro' },
  { id: 'bf_emma',     label: 'bf_emma (Female)',    provider: 'kokoro' },
  { id: 'bf_isabella', label: 'bf_isabella (Female)',provider: 'kokoro' },
  { id: 'bm_george',   label: 'bm_george (Male)',    provider: 'kokoro' },
  { id: 'bm_lewis',    label: 'bm_lewis (Male)',     provider: 'kokoro' },
];

type SleepTimerMode = 'off' | 'duration' | 'chapter-end';
type BookmarkType = 'position' | 'note' | 'quote';
type QuickAction = 'play-next' | 'bookmark' | 'rewind';

interface BookmarkItem {
  id: string;
  time: number;
  chapterIndex: number;
  type: BookmarkType;
  note?: string;
  quote?: string;
}

const SMART_REWIND_SECONDS = 10;
const SWIPE_SEEK_SECONDS = 15;
const PROFILE_KEY = 'audiosync_profile_default-book';
const QUEUE_KEY = 'audiosync_queue_default-book';
const DOWNLOAD_KEY = 'audiosync_downloads_default-book';

const sanitize = (value: string) => value.replace(/[<>]/g, '').trim();

export function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [text, setText] = useState(
    'This is a test of AudioSync local TTS using Kokoro. Add your audiobook text here to generate chapter navigation and playback controls.',
  );
  const [ttsProvider, setTtsProvider] = useState<'kokoro' | 'openai' | 'stepfun'>('kokoro');
  const [stepfunApiKey, setStepfunApiKey] = useState('');
  const [voice, setVoice] = useState<string>('kokoro-af_heart');
  const [allVoices, setAllVoices] = useState<VoiceItem[]>(KOKORO_VOICES);
  const [status, setStatus] = useState('Ready');
  // Voice cloning modal
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneAudio, setCloneAudio] = useState<File | null>(null);
  const [clonePreview, setClonePreview] = useState<string | null>(null);
  const [cloneStatus, setCloneStatus] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [pcmData, setPcmData] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [sleepTimerMode, setSleepTimerMode] = useState<SleepTimerMode>('off');
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [liveViz, setLiveViz] = useState(false);
  const [aiChapters, setAiChapters] = useState<string[] | null>(null);
  const [smartRewindSeconds, setSmartRewindSeconds] = useState(SMART_REWIND_SECONDS);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('audiosync_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.ttsProvider) setTtsProvider(settings.ttsProvider);
        if (settings.stepfunApiKey) setStepfunApiKey(settings.stepfunApiKey);
        if (settings.selectedVoiceId) setVoice(settings.selectedVoiceId);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const lastPausedAtRef = useRef<number | null>(null);
  const voices = VOICES;

  const chapters = useMemo(() => {
    if (aiChapters?.length) {
      return aiChapters.map((title, index) => ({
        title,
        content: title,
        startRatio: index / aiChapters.length,
      }));
    }

    const chunks = text
      .split(/(?<=[.!?])\s+/)
      .map((c) => c.trim())
      .filter(Boolean);

    if (chunks.length <= 1) {
      return [{ title: 'Chapter 1', content: text.trim(), startRatio: 0 }];
    }

    return chunks.map((chunk, index) => ({
      title: `Chapter ${index + 1}`,
      content: chunk,
      startRatio: index / chunks.length,
    }));
  }, [text, aiChapters]);

  const markerRatios = useMemo(
    () => (duration > 0 ? bookmarks.map((b) => Math.min(1, Math.max(0, b.time / duration))) : []),
    [bookmarks, duration],
  );

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const rawProfile = localStorage.getItem(PROFILE_KEY);
    if (rawProfile) {
      try {
        const profile = JSON.parse(rawProfile) as PlaybackProfile;
        if (typeof profile.speed === 'number') setPlaybackRate(profile.speed);
        if (typeof profile.smartRewindSeconds === 'number') setSmartRewindSeconds(profile.smartRewindSeconds);
        if (typeof profile.voice === 'string') setVoice(profile.voice as VoiceId);
      } catch {}
    }
    const rawQueue = localStorage.getItem(QUEUE_KEY);
    if (rawQueue) {
      try {
        const parsed = JSON.parse(rawQueue) as QueueItem[];
        if (Array.isArray(parsed)) setQueue(parsed);
      } catch {}
    }
    const rawDownloads = localStorage.getItem(DOWNLOAD_KEY);
    if (rawDownloads) {
      try {
        const parsed = JSON.parse(rawDownloads) as DownloadTask[];
        if (Array.isArray(parsed)) setDownloads(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const profile: PlaybackProfile = {
      bookId: 'default-book',
      speed: playbackRate,
      smartRewindSeconds,
      voice,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [playbackRate, smartRewindSeconds, voice]);

  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem(DOWNLOAD_KEY, JSON.stringify(downloads));
  }, [downloads]);

  // Load voices when provider changes
  useEffect(() => {
    let cancelled = false;
    const loadVoices = async () => {
      if (ttsProvider === 'kokoro') {
        if (!cancelled) setAllVoices(KOKORO_VOICES);
        return;
      }
      if (ttsProvider === 'openai') {
        const voices = ['alloy','echo','fable','onyx','nova','shimmer'].map(v => ({
          id: v, label: v, provider: 'openai' as const,
        }));
        if (!cancelled) setAllVoices(voices);
        return;
      }
      if (ttsProvider === 'stepfun') {
        try {
          const { BUILTIN_VOICES } = mod;
          const voices = BUILTIN_VOICES.map(v => ({
            id: v.id, label: v.name, provider: 'stepfun' as const,
          }));
          if (!cancelled) setAllVoices(voices);
        } catch {
          if (!cancelled) setAllVoices(KOKORO_VOICES);
        }
      }
    };
    void loadVoices();
    return () => { cancelled = true; };
  }, [ttsProvider]);

  useEffect(() => {
    if (!isPlaying || sleepTimerMode !== 'duration' || sleepTimerSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setSleepTimerSeconds((prev) => {
        if (prev <= 1) {
          audioRef.current?.pause();
          setIsPlaying(false);
          setSleepTimerMode('off');
          setStatus('Sleep timer ended playback');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPlaying, sleepTimerMode, sleepTimerSeconds]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      const currentTotal = Number(localStorage.getItem('audiosync_stats_seconds') || '0');
      localStorage.setItem('audiosync_stats_seconds', String(currentTotal + 1));
      localStorage.setItem('audiosync_stats_last_day', today);

      const streak = Number(localStorage.getItem('audiosync_stats_streak') || '0');
      const recordedDay = localStorage.getItem('audiosync_stats_streak_day');
      if (recordedDay !== today) {
        localStorage.setItem('audiosync_stats_streak', String(streak + 1));
        localStorage.setItem('audiosync_stats_streak_day', today);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'j') seekBy(-smartRewindSeconds);
      if (event.key === 'l') seekBy(smartRewindSeconds);
      if (event.key === 'k') {
        if (audioRef.current?.paused) audioRef.current.play();
        else audioRef.current?.pause();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [smartRewindSeconds]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<QuickAction>;
      const action = custom.detail;
      if (action === 'play-next') playNextFromQueue();
      if (action === 'bookmark') addBookmark('position');
      if (action === 'rewind') rewindSmart();
    };
    window.addEventListener('audiosync:quick-action', handler);
    return () => window.removeEventListener('audiosync:quick-action', handler);
  });

  const vibrate = (ms = 15) => {
    if ('vibrate' in navigator) navigator.vibrate(ms);
  };

  const decodeWaveform = async (wavData: Uint8Array): Promise<void> => {
    const audioContext = new AudioContext();
    try {
      const copiedBuffer = wavData.buffer.slice(
        wavData.byteOffset,
        wavData.byteOffset + wavData.byteLength,
      ) as ArrayBuffer;
      const decoded = await audioContext.decodeAudioData(copiedBuffer);
      setDuration(decoded.duration);
      setPcmData(decoded.getChannelData(0));
    } finally {
      await audioContext.close();
    }
  };

  const attachMediaSession = () => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'AudioSync Playback',
      artist: voice,
      album: 'AudioSync',
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      await audioRef.current?.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => rewindSmart());
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(smartRewindSeconds));
    navigator.mediaSession.setActionHandler('nexttrack', () => playNextFromQueue());
    navigator.mediaSession.setActionHandler('previoustrack', () => rewindSmart());
    navigator.mediaSession.setActionHandler('stop', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
      setStatus('Stopped');
    });
  };

  const saveResumePosition = (seconds: number) => {
    const dbReq = indexedDB.open('audiosync-player', 1);
    dbReq.onupgradeneeded = () => {
      const db = dbReq.result;
      if (!db.objectStoreNames.contains('resume')) db.createObjectStore('resume');
      if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks');
    };
    dbReq.onsuccess = () => {
      const db = dbReq.result;
      const tx = db.transaction('resume', 'readwrite');
      tx.objectStore('resume').put(seconds, 'default-book');
    };
  };

  const saveBookmarks = (items: BookmarkItem[]) => {
    const dbReq = indexedDB.open('audiosync-player', 1);
    dbReq.onupgradeneeded = () => {
      const db = dbReq.result;
      if (!db.objectStoreNames.contains('resume')) db.createObjectStore('resume');
      if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks');
    };
    dbReq.onsuccess = () => {
      const db = dbReq.result;
      const tx = db.transaction('bookmarks', 'readwrite');
      tx.objectStore('bookmarks').put(items, 'default-book');
    };
  };

  const loadPersisted = async () => {
    const dbReq = indexedDB.open('audiosync-player', 1);
    dbReq.onupgradeneeded = () => {
      const db = dbReq.result;
      if (!db.objectStoreNames.contains('resume')) db.createObjectStore('resume');
      if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks');
    };
    dbReq.onsuccess = () => {
      const db = dbReq.result;
      const tx = db.transaction(['resume', 'bookmarks'], 'readonly');
      const resumeReq = tx.objectStore('resume').get('default-book');
      resumeReq.onsuccess = () => {
        if (typeof resumeReq.result === 'number' && audioRef.current) {
          audioRef.current.currentTime = resumeReq.result;
          setCurrentTime(resumeReq.result);
        }
      };

      const bookmarksReq = tx.objectStore('bookmarks').get('default-book');
      bookmarksReq.onsuccess = () => {
        if (Array.isArray(bookmarksReq.result)) {
          setBookmarks(bookmarksReq.result as BookmarkItem[]);
        }
      };
    };
  };

  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, time));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    saveResumePosition(nextTime);
  };

  const seekBy = (seconds: number) => seekTo((audioRef.current?.currentTime ?? currentTime) + seconds);

  const markDownloadsProgress = (id: string, state: DownloadTask['state'], progress: number) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, state, progress, updatedAt: new Date().toISOString() } : d)),
    );
  };

  const rampPlaybackRate = (target: number) => {
    const start = playbackRate;
    const steps = 8;
    const delta = (target - start) / steps;
    let current = 0;
    const interval = window.setInterval(() => {
      current += 1;
      setPlaybackRate((prev) => Number((prev + delta).toFixed(2)));
      if (current >= steps) {
        setPlaybackRate(target);
        window.clearInterval(interval);
      }
    }, 100);
  };

  const handlePlay = async () => {
    setIsPlaying(true);
    setStatus(`Synthesizing via ${ttsProvider}…`);

    try {
      // Resolve voice: strip provider prefix if present, else use as-is
      const voiceId = voice.includes('-') ? voice.split('-').slice(1).join('-') : voice;
      const audioBytes = await generateSpeech(ttsProvider, text, voiceId);
      await decodeWaveform(audioBytes);

      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

      const audioUrl = URL.createObjectURL(new Blob([audioBytes], { type: 'audio/wav' }));
      audioUrlRef.current = audioUrl;

      const audioElement = new Audio(audioUrl);
      audioElement.playbackRate = playbackRate;
      audioElement.onpause = () => {
        lastPausedAtRef.current = Date.now();
      };
      audioElement.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (sleepTimerMode === 'chapter-end') {
          setSleepTimerMode('off');
          setStatus('Stopped at chapter boundary');
        } else {
          setStatus('Ready');
        }
      };
      audioElement.ontimeupdate = () => {
        const time = audioElement.currentTime;
        setCurrentTime(time);
        saveResumePosition(time);
        if (duration > 0) {
          const index = Math.min(chapters.length - 1, Math.floor((time / duration) * chapters.length));
          if (index !== activeChapterIndex) {
            setActiveChapterIndex(index);
            rampPlaybackRate(playbackRate);
          }
        }
      };

      audioRef.current = audioElement;
      attachMediaSession();
      await loadPersisted();
      const pausedAt = lastPausedAtRef.current;
      if (pausedAt) {
        const pausedForMs = Date.now() - pausedAt;
        if (pausedForMs > 45_000) {
          const dynamicRewind = Math.min(60, Math.max(smartRewindSeconds, Math.floor(pausedForMs / 15000)));
          seekBy(-dynamicRewind);
        }
      }
      await audioElement.play();
      setStatus('Playing...');
    } catch (error) {
      console.error('TTS Error:', error);
      setStatus('Error generating speech');
      setIsPlaying(false);
    }
  };

  const jumpToChapter = (index: number) => {
    if (!audioRef.current || duration <= 0) return;
    const start = chapters[index]?.startRatio ?? 0;
    const t = Math.max(0, Math.min(duration, start * duration));
    seekTo(t);
    setActiveChapterIndex(index);
  };

  const rewindSmart = () => seekBy(-smartRewindSeconds);

  const addCurrentChapterToQueue = () => {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      title: chapters[activeChapterIndex]?.title ?? `Chapter ${activeChapterIndex + 1}`,
      chapterIndex: activeChapterIndex,
    };
    setQueue((prev) => queueEnqueue(prev, item));
    setStatus('Chapter queued');
  };

  const playNextFromQueue = () => {
    const shifted = queueShift(queue);
    if (!shifted.item) {
      setStatus('Queue is empty');
      return;
    }
    setQueue(shifted.queue);
    jumpToChapter(shifted.item.chapterIndex);
    setStatus(`Jumped to queued item: ${shifted.item.title}`);
  };

  const enqueueOfflineAudio = () => {
    const id = crypto.randomUUID();
    const task: DownloadTask = {
      id,
      label: `Chapter ${activeChapterIndex + 1}`,
      state: 'queued',
      progress: 0,
      updatedAt: new Date().toISOString(),
    };
    setDownloads((prev) => [...prev, task]);
    setStatus('Offline export queued');
    window.setTimeout(() => markDownloadsProgress(id, 'downloading', 0.5), 300);
    window.setTimeout(() => markDownloadsProgress(id, 'completed', 1), 900);
  };

  const addBookmark = (type: BookmarkType) => {
    const chapter = chapters[activeChapterIndex];
    const quote =
      type === 'quote'
        ? chapter?.content
            ?.split(/\s+/)
            .slice(0, 14)
            .join(' ') || ''
        : undefined;
    const newBookmark: BookmarkItem = {
      id: crypto.randomUUID(),
      time: audioRef.current?.currentTime ?? currentTime,
      chapterIndex: activeChapterIndex,
      type,
      note: sanitize(bookmarkNote) || undefined,
      quote,
    };
    const next = [...bookmarks, newBookmark].sort((a, b) => a.time - b.time);
    setBookmarks(next);
    saveBookmarks(next);
    setBookmarkNote('');
    vibrate();
    setStatus(type === 'quote' ? 'Quote bookmark added' : 'Bookmark added');
  };

  const runAiChapterDetection = async () => {
    setStatus('Detecting chapters with Gemini fallback...');
    const { detectChapters } = await import('../lib/gemini');
    const detected = await detectChapters(text);
    if (detected.length > 0) {
      setAiChapters(detected);
      setStatus(`Detected ${detected.length} chapters (AI)`);
    } else {
      setStatus('AI chapter detection unavailable; using local chapter split');
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800" aria-label="AudioSync player panel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">AudioSync Player</h2>
          <p className="text-sm text-zinc-400 mt-1">Multi-Provider TTS · Kokoro · OpenAI · StepFun</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">STATUS</div>
          <div className="text-sm font-mono text-amber-400" aria-live="polite">{status}</div>
        </div>
      </div>

      <div className="mb-4">
        <WaveformCanvas
          pcmData={pcmData}
          currentTime={currentTime}
          duration={duration}
          markerRatios={markerRatios}
          onSeek={(ratio) => seekTo(ratio * duration)}
          onDoubleTapSide={(side) => seekBy(side === 'left' ? -smartRewindSeconds : smartRewindSeconds)}
          onSwipeSeek={(direction) => {
            seekBy(direction === 'left' ? -SWIPE_SEEK_SECONDS : SWIPE_SEEK_SECONDS);
            vibrate(10);
          }}
          onLongPress={() => addBookmark('position')}
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <label className="text-xs text-zinc-300 flex items-center gap-2">
          <input type="checkbox" checked={liveViz} onChange={(e) => setLiveViz(e.target.checked)} />
          Live visualization
        </label>
        <button
          onClick={runAiChapterDetection}
          className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500"
        >
          AI Chapter Detect
        </button>
      </div>
      {liveViz && <AudioVisualizer isPlaying={isPlaying} />}

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <div className="text-xs text-zinc-400 mb-2">Chapter Navigation</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {chapters.slice(0, 20).map((c, i) => (
              <button
                key={c.title + i}
                onClick={() => jumpToChapter(i)}
                className={`w-full text-left px-2 py-1 rounded text-xs border focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  i === activeChapterIndex
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
          <div className="text-xs text-zinc-400">Playback & Sleep</div>
          <label className="text-xs text-zinc-300 flex items-center gap-2" htmlFor="speed-range">
            Speed
            <input
              id="speed-range"
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="flex-1"
              aria-label="Playback speed"
            />
            <span>{playbackRate.toFixed(1)}×</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={rewindSmart} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500">
              Smart Rewind (-{smartRewindSeconds}s)
            </button>
            <button
              onClick={() => {
                setSleepTimerMode('duration');
                setSleepTimerSeconds(15 * 60);
              }}
              className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500"
            >
              Sleep 15m
            </button>
            <button
              onClick={() => setSleepTimerMode('chapter-end')}
              className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500"
            >
              Sleep @ Chapter End
            </button>
          </div>
          <div className="text-xs text-zinc-500">
            Timer: {sleepTimerMode === 'duration' ? `${Math.ceil(sleepTimerSeconds / 60)}m left` : sleepTimerMode}
          </div>
          <label className="text-xs text-zinc-300 flex items-center gap-2">
            Rewind seconds
            <input
              type="number"
              min={5}
              max={60}
              value={smartRewindSeconds}
              onChange={(e) => setSmartRewindSeconds(Math.max(5, Math.min(60, Number(e.target.value) || 10)))}
              className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5"
            />
          </label>
        </div>
      </div>

      <div className="mb-4 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
        <div className="text-xs text-zinc-400 mb-2">Queue & Offline</div>
        <div className="flex gap-2 flex-wrap mb-2">
          <button onClick={addCurrentChapterToQueue} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500">
            Queue current chapter
          </button>
          <button onClick={playNextFromQueue} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500">
            Play next in queue
          </button>
          <button onClick={enqueueOfflineAudio} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500">
            Queue offline export
          </button>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1 mb-2">
          {queue.length === 0 ? (
            <div className="text-xs text-zinc-500">No queued chapters yet.</div>
          ) : (
            queue.map((item, i) => (
              <div key={item.id} className="flex items-center gap-1">
                <button className="flex-1 text-left text-xs px-2 py-1 rounded border border-zinc-800 hover:border-zinc-600" onClick={() => jumpToChapter(item.chapterIndex)}>
                  {i + 1}. {item.title}
                </button>
                <button className="text-xs px-1 border border-zinc-800 rounded" onClick={() => setQueue((prev) => queueMove(prev, i, Math.max(0, i - 1)))}>↑</button>
                <button className="text-xs px-1 border border-zinc-800 rounded" onClick={() => setQueue((prev) => queueMove(prev, i, Math.min(prev.length - 1, i + 1)))}>↓</button>
                <button className="text-xs px-1 border border-zinc-800 rounded" onClick={() => setQueue((prev) => queueRemove(prev, item.id))}>×</button>
              </div>
            ))
          )}
        </div>
        <div className="max-h-20 overflow-y-auto space-y-1">
          {downloads.map((d) => (
            <div key={d.id} className="text-[11px] text-zinc-400">
              {d.label}: {d.state} ({Math.round(d.progress * 100)}%)
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
        <div className="text-xs text-zinc-400 mb-2">Bookmarks & Quotes</div>
        <div className="flex gap-2 mb-2 flex-wrap">
          <input
            value={bookmarkNote}
            onChange={(e) => setBookmarkNote(e.target.value)}
            placeholder="Optional note"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
            aria-label="Bookmark note"
          />
          <button onClick={() => addBookmark('note')} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500">
            Add Note Bookmark
          </button>
          <button onClick={() => addBookmark('quote')} className="px-2 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500">
            Add Quote Bookmark
          </button>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1">
          {bookmarks.length === 0 ? (
            <div className="text-xs text-zinc-500">No bookmarks yet. Long press waveform to add one.</div>
          ) : (
            bookmarks.map((b) => (
              <button
                key={b.id}
                onClick={() => seekTo(b.time)}
                className="w-full text-left text-xs px-2 py-1 rounded border border-zinc-800 hover:border-zinc-600"
              >
                [{b.type}] {Math.floor(b.time)}s · Chapter {b.chapterIndex + 1}
                {b.note ? ` · ${b.note}` : ''}
                {b.quote ? ` · “${b.quote}...”` : ''}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="sr-only" htmlFor="tts-text">Text to synthesize</label>
        <textarea
          id="tts-text"
          value={text}
          onChange={(e) => {
            setAiChapters(null);
            setText(e.target.value);
          }}
          className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm resize-none focus:outline-none focus:border-amber-500"
          placeholder="Enter text to synthesize..."
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="flex-1 py-3.5 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPlaying ? 'Generating...' : 'Play Voice'}
        </button>

        <div className="flex gap-2 items-center">
          <select
            value={ttsProvider}
            onChange={(e) => { setTtsProvider(e.target.value as any); setVoice(`${e.target.value}-default`); }}
            className="bg-zinc-950 border border-zinc-800 text-white px-3 rounded-xl text-xs"
            aria-label="TTS provider"
          >
            <option value="kokoro">Kokoro (local)</option>
            <option value="openai">OpenAI</option>
            <option value="stepfun">StepFun</option>
          </select>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-white px-5 rounded-xl font-mono text-sm"
            aria-label="Voice model"
          >
            {allVoices.map((v) => (
              <option key={v.id} value={`${v.provider}-${v.id}`}>
                [{v.provider}] {v.label}
              </option>
            ))}
          </select>
          {ttsProvider === 'stepfun' && (
            <button
              onClick={() => setShowCloneModal(true)}
              className="px-3 py-2 text-xs rounded-xl border border-amber-600 text-amber-400 hover:bg-amber-600/10 whitespace-nowrap"
            >
              + Clone Voice
            </button>
          )}
        </div>
      </div>
      {/* Voice Cloning Modal */}
      {showCloneModal && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCloneModal(false)}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-2">Clone Voice (StepFun)</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Upload a 5–20 second WAV/MP3 reference sample. StepFun will create a custom voice you can use in TTS.
          </p>

          <label className="block text-xs text-zinc-300 mb-1">Voice Name</label>
          <input
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="My Custom Voice"
            className="w-full mb-3 px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800"
          />

          <label className="block text-xs text-zinc-300 mb-1">Reference Audio</label>
          <input
            type="file"
            accept="audio/wav,audio/mpeg"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setCloneAudio(f); }}
            className="w-full mb-2 text-xs"
          />
          {cloneAudio && (
            <div className="text-xs text-zinc-400 mb-3">
              {cloneAudio.name} ({(cloneAudio.size / 1024).toFixed(0)} KB)
            </div>
          )}

          {clonePreview && (
            <div className="mb-3">
              <div className="text-xs text-zinc-400 mb-1">Preview</div>
              <audio src={clonePreview} controls className="w-full h-8" />
            </div>
          )}

          {cloneStatus && <div className="text-xs text-amber-400 mb-3">{cloneStatus}</div>}

          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!cloneAudio || !cloneName.trim()) {
                  setCloneStatus('Name and audio file required');
                  return;
                }
                setIsCloning(true);
                setCloneStatus('Uploading reference audio…');
                try {
                  const client = new StepFunTTS(
                    stepfunApiKey || '',
                    'https://api.stepfun.ai/v1',
                    'step-tts-2',
                  );
                  setCloneStatus('Uploading…');
                  const fileId = await client.uploadReferenceAudio(cloneAudio);
                  setCloneStatus('Creating voice clone…');
                  const result = await client.cloneVoice({
                    model: 'step-tts-2',
                    file_id: fileId,
                    sample_text: cloneName,
                  });
                  const audioB64 = result.sample_audio;
                  setClonePreview(`data:audio/wav;base64,${audioB64}`);
                  setCloneStatus(`Voice cloned! ID: ${result.id}`);
                  setShowCloneModal(false);
                  // Refresh voice list
                  const { BUILTIN_VOICES } = mod2;
                  setAllVoices(BUILTIN_VOICES.map(v => ({
                    id: v.id, label: v.name, provider: 'stepfun' as const, isCloned: true,
                  })));
                } catch (err) {
                  setCloneStatus(`Error: ${err}`);
                } finally {
                  setIsCloning(false);
                }
              }}
              disabled={isCloning}
              className="flex-1 py-2 text-sm rounded-xl bg-amber-600 text-white font-semibold disabled:opacity-50"
            >
              {isCloning ? 'Cloning…' : 'Clone Voice'}
            </button>
            <button
              onClick={() => setShowCloneModal(false)}
              className="px-4 py-2 text-sm rounded-xl border border-zinc-700 text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </div>

  );
}

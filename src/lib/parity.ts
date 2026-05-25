export interface SyncEnvelope<T> {
  key: string;
  value: T;
  updatedAt: string;
  deviceId: string;
}

export interface SyncConflict<T> {
  key: string;
  local: SyncEnvelope<T>;
  remote: SyncEnvelope<T>;
  resolved: SyncEnvelope<T>;
  resolvedAt: string;
}

export function mergeLww<T>(local: SyncEnvelope<T>, remote: SyncEnvelope<T>): {
  winner: SyncEnvelope<T>;
  conflict?: SyncConflict<T>;
} {
  const localTs = new Date(local.updatedAt).getTime();
  const remoteTs = new Date(remote.updatedAt).getTime();
  const winner = localTs >= remoteTs ? local : remote;
  const differentPayload = JSON.stringify(local.value) !== JSON.stringify(remote.value);
  if (differentPayload && localTs !== remoteTs) {
    return {
      winner,
      conflict: {
        key: local.key,
        local,
        remote,
        resolved: winner,
        resolvedAt: new Date().toISOString(),
      },
    };
  }
  return { winner };
}

export interface RetryJob {
  id: string;
  endpoint: string;
  payload: string;
  retries: number;
  nextAttemptAt: number;
  lastError?: string;
}

export function scheduleRetry(job: RetryJob, baseMs = 1500): RetryJob {
  const retries = job.retries + 1;
  const backoff = Math.min(60_000, baseMs * 2 ** retries);
  return {
    ...job,
    retries,
    nextAttemptAt: Date.now() + backoff,
  };
}

export interface QueueItem {
  id: string;
  title: string;
  chapterIndex: number;
}

export function queueEnqueue(queue: QueueItem[], item: QueueItem): QueueItem[] {
  return [...queue, item];
}

export function queueRemove(queue: QueueItem[], id: string): QueueItem[] {
  return queue.filter((i) => i.id !== id);
}

export function queueMove(queue: QueueItem[], from: number, to: number): QueueItem[] {
  if (from < 0 || to < 0 || from >= queue.length || to >= queue.length) return queue;
  const next = [...queue];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function queueShift(queue: QueueItem[]): { item: QueueItem | null; queue: QueueItem[] } {
  if (!queue.length) return { item: null, queue };
  return { item: queue[0], queue: queue.slice(1) };
}

export interface PlaybackProfile {
  bookId: string;
  speed: number;
  smartRewindSeconds: number;
  voice: string;
  updatedAt: string;
}

export interface DownloadTask {
  id: string;
  label: string;
  state: 'queued' | 'downloading' | 'paused' | 'failed' | 'completed';
  progress: number;
  updatedAt: string;
}

export interface PlatformShellCapabilities {
  mediaSession: boolean;
  vibration: boolean;
  serviceWorker: boolean;
  touch: boolean;
}

export function detectPlatformShellCapabilities(win: Window = window): PlatformShellCapabilities {
  return {
    mediaSession: 'mediaSession' in navigator,
    vibration: 'vibrate' in navigator,
    serviceWorker: 'serviceWorker' in navigator,
    touch: 'ontouchstart' in win || navigator.maxTouchPoints > 0,
  };
}

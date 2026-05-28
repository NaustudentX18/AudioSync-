export interface SyncRetryJob {
  id: string;
  type: 'upload' | 'download' | 'merge';
  payload: unknown;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

export interface SyncConflict {
  id: string;
  localBookId: string;
  remoteBookId: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  resolved: boolean;
  resolution?: 'keep-local' | 'keep-remote' | 'merge';
  createdAt: string;
}

const RETRY_KEY = 'audiosync_sync_retry_jobs';
const CONFLICT_KEY = 'audiosync_sync_conflicts';

export class SyncManager {
  private retryJobs: SyncRetryJob[] = [];
  private conflicts: SyncConflict[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(RETRY_KEY);
      this.retryJobs = saved ? JSON.parse(saved) : [];
    } catch {
      this.retryJobs = [];
    }
    try {
      const saved = localStorage.getItem(CONFLICT_KEY);
      this.conflicts = saved ? JSON.parse(saved) : [];
    } catch {
      this.conflicts = [];
    }
  }

  private persistRetryJobs(): void {
    localStorage.setItem(RETRY_KEY, JSON.stringify(this.retryJobs));
  }

  private persistConflicts(): void {
    localStorage.setItem(CONFLICT_KEY, JSON.stringify(this.conflicts));
  }

  enqueueJob(job: Omit<SyncRetryJob, 'id' | 'createdAt' | 'retryCount'>): SyncRetryJob {
    const newJob: SyncRetryJob = {
      ...job,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.retryJobs.push(newJob);
    this.persistRetryJobs();
    return newJob;
  }

  getPendingJobs(): SyncRetryJob[] {
    return this.retryJobs.filter(j => j.retryCount < j.maxRetries);
  }

  getFailedJobs(): SyncRetryJob[] {
    return this.retryJobs.filter(j => j.retryCount >= j.maxRetries);
  }

  async processRetryQueue(
    onProcess: (job: SyncRetryJob) => Promise<boolean>
  ): Promise<{ succeeded: number; failed: number }> {
    const pending = this.getPendingJobs();
    let succeeded = 0;
    let failed = 0;

    for (const job of pending) {
      try {
        const ok = await onProcess(job);
        if (ok) {
          this.retryJobs = this.retryJobs.filter(j => j.id !== job.id);
          succeeded++;
        } else {
          const existing = this.retryJobs.find(j => j.id === job.id);
          if (existing) existing.retryCount++;
          failed++;
        }
      } catch (e) {
        const existing = this.retryJobs.find(j => j.id === job.id);
        if (existing) {
          existing.retryCount++;
          existing.lastError = e instanceof Error ? e.message : String(e);
        }
        failed++;
      }
      this.persistRetryJobs();
    }

    return { succeeded, failed };
  }

  addConflict(conflict: Omit<SyncConflict, 'id' | 'createdAt' | 'resolved'>): SyncConflict {
    const newConflict: SyncConflict = {
      ...conflict,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    this.conflicts.push(newConflict);
    this.persistConflicts();
    return newConflict;
  }

  getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  resolveConflict(id: string, resolution: SyncConflict['resolution']): void {
    const conflict = this.conflicts.find(c => c.id === id);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution;
      this.persistConflicts();
    }
  }

  clearConflicts(): void {
    this.conflicts = [];
    this.persistConflicts();
  }

  clearAllJobs(): void {
    this.retryJobs = [];
    this.persistRetryJobs();
  }

  exportConflicts(): string {
    return JSON.stringify(this.conflicts, null, 2);
  }

  exportJobs(): string {
    return JSON.stringify(this.retryJobs, null, 2);
  }

  getStats(): {
    pending: number;
    failed: number;
    unresolvedConflicts: number;
    resolvedConflicts: number;
  } {
    return {
      pending: this.getPendingJobs().length,
      failed: this.getFailedJobs().length,
      unresolvedConflicts: this.conflicts.filter(c => !c.resolved).length,
      resolvedConflicts: this.conflicts.filter(c => c.resolved).length,
    };
  }
}

export const syncManager = new SyncManager();

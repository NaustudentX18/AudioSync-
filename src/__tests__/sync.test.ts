import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../lib/sync';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('SyncManager', () => {
  let mgr: SyncManager;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    mgr = new SyncManager();
  });

  describe('retry jobs', () => {
    it('enqueues a job and persists to localStorage', () => {
      const job = mgr.enqueueJob({
        type: 'upload',
        payload: { bookId: 'abc', content: 'test' },
        maxRetries: 3,
      });

      expect(job.id).toBeDefined();
      expect(job.type).toBe('upload');
      expect(job.retryCount).toBe(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'audiosync_sync_retry_jobs',
        expect.any(String)
      );
    });

    it('returns pending jobs', () => {
      mgr.enqueueJob({ type: 'upload', payload: {}, maxRetries: 3 });
      const pending = mgr.getPendingJobs();
      expect(pending).toHaveLength(1);
    });

    it('returns failed jobs when retryCount >= maxRetries', async () => {
      mgr.enqueueJob({ type: 'upload', payload: {}, maxRetries: 1 });

      const result = await mgr.processRetryQueue(async () => false);
      expect(result.failed).toBe(1);
      const failed = mgr.getFailedJobs();
      expect(failed).toHaveLength(1);
      expect(failed[0].retryCount).toBeGreaterThanOrEqual(1);
    });

    it('removes succeeded jobs from the queue', async () => {
      mgr.enqueueJob({ type: 'upload', payload: {}, maxRetries: 3 });
      mgr.enqueueJob({ type: 'download', payload: {}, maxRetries: 3 });

      const result = await mgr.processRetryQueue(async () => true);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mgr.getPendingJobs()).toHaveLength(0);
    });

    it('records lastError on exception', async () => {
      mgr.enqueueJob({ type: 'upload', payload: {}, maxRetries: 1 });

      const result = await mgr.processRetryQueue(async () => {
        throw new Error('network timeout');
      });

      expect(result.failed).toBe(1);
      const failed = mgr.getFailedJobs();
      expect(failed[0].lastError).toBe('network timeout');
    });

    it('clearAllJobs removes all jobs', () => {
      mgr.enqueueJob({ type: 'upload', payload: {}, maxRetries: 3 });
      mgr.clearAllJobs();
      expect(mgr.getPendingJobs()).toHaveLength(0);
    });
  });

  describe('conflicts', () => {
    it('adds a conflict and persists to localStorage', () => {
      const conflict = mgr.addConflict({
        localBookId: 'local-1',
        remoteBookId: 'remote-1',
        field: 'title',
        localValue: 'My Book',
        remoteValue: 'My Book (Edited)',
      });

      expect(conflict.id).toBeDefined();
      expect(conflict.resolved).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'audiosync_sync_conflicts',
        expect.any(String)
      );
    });

    it('getConflicts returns all conflicts', () => {
      mgr.addConflict({
        localBookId: 'a', remoteBookId: 'b',
        field: 'author', localValue: 'Alice', remoteValue: 'Bob',
      });
      mgr.addConflict({
        localBookId: 'c', remoteBookId: 'd',
        field: 'title', localValue: 'X', remoteValue: 'Y',
      });
      expect(mgr.getConflicts()).toHaveLength(2);
    });

    it('resolveConflict marks a conflict as resolved', () => {
      const c = mgr.addConflict({
        localBookId: 'a', remoteBookId: 'b',
        field: 'title', localValue: 'A', remoteValue: 'B',
      });
      mgr.resolveConflict(c.id, 'keep-local');
      const conflicts = mgr.getConflicts();
      const resolved = conflicts.find(x => x.id === c.id)!;
      expect(resolved.resolved).toBe(true);
      expect(resolved.resolution).toBe('keep-local');
    });

    it('clearConflicts removes all conflicts', () => {
      mgr.addConflict({
        localBookId: 'a', remoteBookId: 'b',
        field: 'title', localValue: 'A', remoteValue: 'B',
      });
      mgr.clearConflicts();
      expect(mgr.getConflicts()).toHaveLength(0);
    });

    it('exportConflicts returns JSON string', () => {
      mgr.addConflict({
        localBookId: 'a', remoteBookId: 'b',
        field: 'title', localValue: 'A', remoteValue: 'B',
      });
      const json = mgr.exportConflicts();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].field).toBe('title');
    });
  });

  describe('stats', () => {
    it('getStats returns correct counts', () => {
      mgr.enqueueJob({ type: 'upload', payload: {}, maxRetries: 3 });
      mgr.addConflict({
        localBookId: 'a', remoteBookId: 'b',
        field: 'title', localValue: 'A', remoteValue: 'B',
      });

      const stats = mgr.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.unresolvedConflicts).toBe(1);
      expect(stats.resolvedConflicts).toBe(0);
    });
  });
});

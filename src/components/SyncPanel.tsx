import React, { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncConflict, SyncRetryJob } from '../lib/sync';

export default function SyncPanel() {
  const [retryJobs, setRetryJobs] = useState<SyncRetryJob[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [stats, setStats] = useState(syncManager.getStats());
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(() => {
    setRetryJobs(syncManager.getPendingJobs().concat(syncManager.getFailedJobs()));
    setConflicts(syncManager.getConflicts());
    setStats(syncManager.getStats());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleProcessRetries = async () => {
    setProcessing(true);
    setMessage('Processing retry queue...');
    const result = await syncManager.processRetryQueue(async (job) => {
      // Simulate processing — in real usage this would call the actual sync endpoint
      await new Promise(r => setTimeout(r, 100));
      return Math.random() > 0.3; // 70% success for demo
    });
    refresh();
    setMessage(`Done: ${result.succeeded} succeeded, ${result.failed} still queued.`);
    setProcessing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleResolve = (id: string, resolution: SyncConflict['resolution']) => {
    syncManager.resolveConflict(id, resolution);
    refresh();
  };

  const handleClearConflicts = () => {
    syncManager.clearConflicts();
    refresh();
    setMessage('All conflicts cleared.');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleExportConflicts = () => {
    const blob = new Blob([syncManager.exportConflicts()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-conflicts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearJobs = () => {
    syncManager.clearAllJobs();
    refresh();
    setMessage('All retry jobs cleared.');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Sync Manager
        </h3>
        <span className="text-xs text-zinc-500 font-mono">
          {stats.pending} pending · {stats.failed} failed · {stats.unresolvedConflicts} conflicts
        </span>
      </div>

      {message && (
        <div className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-300 animate-fade-in">
          {message}
        </div>
      )}

      {/* Retry Queue */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Retry Queue ({retryJobs.length})
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleProcessRetries}
              disabled={processing || retryJobs.length === 0}
              className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-black rounded-lg font-semibold transition-all cursor-pointer"
            >
              {processing ? 'Processing...' : 'Process Retries'}
            </button>
            <button
              onClick={handleClearJobs}
              disabled={retryJobs.length === 0}
              className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {retryJobs.length === 0 ? (
          <p className="text-xs text-zinc-600 py-3 text-center">No pending retry jobs.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {retryJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="truncate flex-1">
                  <span className={`font-mono ${job.retryCount >= job.maxRetries ? 'text-rose-400' : 'text-amber-400'}`}>
                    {job.type}
                  </span>
                  <span className="text-zinc-500 ml-2">
                    ({job.retryCount}/{job.maxRetries})
                  </span>
                  {job.lastError && <span className="text-rose-500 ml-2 truncate">{job.lastError}</span>}
                </div>
                <div className="text-zinc-600 ml-2">{new Date(job.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflicts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Conflicts ({conflicts.length})
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleExportConflicts}
              disabled={conflicts.length === 0}
              className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 rounded-lg transition-all cursor-pointer"
            >
              Export
            </button>
            <button
              onClick={handleClearConflicts}
              disabled={conflicts.length === 0}
              className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {conflicts.length === 0 ? (
          <p className="text-xs text-zinc-600 py-3 text-center">No sync conflicts.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {conflicts.map(conflict => (
              <div
                key={conflict.id}
                className={`px-3 py-2 rounded-lg border text-xs ${
                  conflict.resolved
                    ? 'bg-zinc-950/50 border-zinc-800/50 opacity-60'
                    : 'bg-zinc-950 border-rose-900/30'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-zinc-300 font-medium">{conflict.field}</span>
                    <span className="text-zinc-600 ml-2">({conflict.localBookId})</span>
                  </div>
                  {conflict.resolved && (
                    <span className="text-emerald-500 text-[10px] uppercase font-bold">
                      {conflict.resolution}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-[11px] mt-1">
                  <div className="flex-1 bg-zinc-900 rounded px-2 py-1">
                    <span className="text-zinc-500">local: </span>
                    <span className="text-zinc-300">{String(conflict.localValue)}</span>
                  </div>
                  <div className="flex-1 bg-zinc-900 rounded px-2 py-1">
                    <span className="text-zinc-500">remote: </span>
                    <span className="text-zinc-300">{String(conflict.remoteValue)}</span>
                  </div>
                </div>
                {!conflict.resolved && (
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => handleResolve(conflict.id, 'keep-local')}
                      className="text-[10px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-all cursor-pointer"
                    >
                      Keep Local
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id, 'keep-remote')}
                      className="text-[10px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-all cursor-pointer"
                    >
                      Keep Remote
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id, 'merge')}
                      className="text-[10px] px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded transition-all cursor-pointer"
                    >
                      Merge
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

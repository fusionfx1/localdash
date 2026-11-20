import { useEffect, useMemo, useState } from 'react';
import { ImageOff, RefreshCw, Square } from 'lucide-react';
import { apiRequest, formatRelativeDate } from '../lib/api.ts';
import type { BuildJobRecord } from '../shared/types.ts';
import { StatusIndicator } from '../components/StatusBadge.tsx';
import { useToast } from '../components/Toast.tsx';

export function BuildQueuePage({
  onInspectWebsite,
}: {
  onInspectWebsite: (websiteId: string) => void;
}) {
  const { pushToast } = useToast();
  const [jobs, setJobs] = useState<BuildJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'failed' | 'completed'>('all');
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      const res = await apiRequest<{ jobs: BuildJobRecord[] }>('/api/jobs');
      setJobs(res.jobs);
    } catch (err) {
      pushToast(
        'Failed to load build queue',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const hasActiveJobs = useMemo(
    () => jobs.some((j) => j.status === 'running' || j.status === 'queued'),
    [jobs]
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => {
      void loadJobs();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs]);

  const filtered = useMemo(() => {
    if (filter === 'all') return jobs;
    if (filter === 'active') {
      return jobs.filter((j) => j.status === 'running' || j.status === 'queued');
    }
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const handleRefreshSiteStatus = async (job: BuildJobRecord) => {
    setBusyJobId(job.id);
    try {
      await apiRequest('/api/mcp/website-status', {
        method: 'POST',
        body: JSON.stringify({ websiteId: job.websiteId }),
      });
      await loadJobs();
      pushToast('Synced job status', 'info');
    } catch (err) {
      pushToast(
        'Status refresh failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleStopBuild = async (job: BuildJobRecord) => {
    setBusyJobId(job.id);
    try {
      await apiRequest('/api/mcp/stop-build', {
        method: 'POST',
        body: JSON.stringify({ websiteId: job.websiteId }),
      });
      await loadJobs();
      pushToast('Build stop requested via MCP', 'info');
    } catch (err) {
      pushToast(
        'Stop build failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleRetryImages = async (job: BuildJobRecord) => {
    setBusyJobId(job.id);
    try {
      await apiRequest('/api/mcp/retry-images', {
        method: 'POST',
        body: JSON.stringify({ websiteId: job.websiteId }),
      });
      await loadJobs();
      pushToast('Image retry completed', 'success');
    } catch (err) {
      pushToast(
        'Retry images failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Build Queue
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Monitor active MCP builds, inspect failure diagnostics, and retry failed image generations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadJobs()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit">
        {(['all', 'active', 'failed', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No build jobs in this filter.
          </div>
        ) : (
          filtered.map((job) => (
            <div key={job.id} className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onInspectWebsite(job.websiteId)}
                      className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50 hover:underline"
                    >
                      {job.websiteBrand}
                    </button>
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {job.websiteDomain}
                    </span>
                    <span className="text-xs text-zinc-400">·</span>
                    <span className="font-mono text-xs text-zinc-500">
                      {job.jobType} ({job.mcpMode.toUpperCase()})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {job.currentStep}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusIndicator status={job.status} />
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    {job.progressPct}%
                  </span>
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    job.status === 'failed'
                      ? 'bg-red-600'
                      : job.status === 'completed'
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                  }`}
                  style={{ width: `${job.progressPct}%` }}
                />
              </div>

              {job.errorMessage && (
                <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-800 dark:text-red-300">
                  {job.errorMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="font-mono">
                  Started {formatRelativeDate(job.startedAt)}
                  {job.completedAt && ` · Finished ${formatRelativeDate(job.completedAt)}`}
                </div>
                <div className="flex items-center gap-2">
                  {(job.status === 'running' || job.status === 'queued') && (
                    <>
                      <button
                        type="button"
                        disabled={busyJobId === job.id}
                        onClick={() => handleRefreshSiteStatus(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Poll MCP Status</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyJobId === job.id}
                        onClick={() => handleStopBuild(job)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Square className="w-3 h-3" />
                        <span>Stop Build</span>
                      </button>
                    </>
                  )}
                  {(job.status === 'failed' || job.imageFailuresCount > 0) && (
                    <button
                      type="button"
                      disabled={busyJobId === job.id}
                      onClick={() => handleRetryImages(job)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 font-medium"
                    >
                      <ImageOff className="w-3 h-3" />
                      <span>Retry Images ({job.imageFailuresCount})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

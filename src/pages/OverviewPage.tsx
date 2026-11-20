import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Globe,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
} from 'lucide-react';
import {
  apiRequest,
  formatRelativeDate,
  formatUsd,
  WORKFLOW_STAGE_LABELS,
} from '../lib/api.ts';
import type { OverviewData } from '../shared/types.ts';
import { StatusIndicator } from '../components/StatusBadge.tsx';
import { useToast } from '../components/Toast.tsx';
import type { PageKey } from '../components/Sidebar.tsx';

interface OverviewPageProps {
  onNavigate: (page: PageKey) => void;
  onInspectWebsite: (websiteId: string) => void;
}

export function OverviewPage({
  onNavigate,
  onInspectWebsite,
}: OverviewPageProps) {
  const { pushToast } = useToast();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingRemote, setSyncingRemote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<OverviewData>('/api/overview');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRemote = async () => {
    setSyncingRemote(true);
    try {
      const res = await apiRequest<{
        isDemo: boolean;
        syncedCount?: number;
        remoteCount?: number;
      }>('/api/mcp/list-websites', { method: 'POST' });
      pushToast(
        res.isDemo
          ? 'Synced portfolio (DEMO MODE)'
          : `Synced ${res.syncedCount ?? res.remoteCount ?? 0} live websites from LocalSites.pro`,
        'success'
      );
      await load();
    } catch (err) {
      pushToast(
        'Remote sync failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSyncingRemote(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 p-6">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          {error || 'Unable to load dashboard overview.'}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { metrics, mcpStatus, recentWebsites, recentJobs, costByWebsite } = data;

  return (
    <div className="space-y-6">
      {mcpStatus.isDemoMode && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-semibold">DEMO MODE Active:</span>{' '}
              LocalSites.pro MCP credentials and live transport are not configured yet. Dry-runs, builds, QA audits, and cost metrics operate against simulated Neon PostgreSQL data.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <span>Configure MCP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!mcpStatus.isDemoMode && mcpStatus.connected && mcpStatus.remoteAccount && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                LocalSites.pro Live
              </span>
              {mcpStatus.remoteAccount.account && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono">{mcpStatus.remoteAccount.account}</span>
                </>
              )}
              {mcpStatus.remoteAccount.plan && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="uppercase font-medium text-emerald-700 dark:text-emerald-400">
                    {mcpStatus.remoteAccount.plan}
                  </span>
                </>
              )}
              {mcpStatus.remoteAccount.remoteWebsitesCount !== null && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">
                    {mcpStatus.remoteAccount.remoteWebsitesCount} remote sites
                  </span>
                </>
              )}
              <span aria-hidden="true"> · </span>
              <span>
                OpenRouter {mcpStatus.remoteAccount.openrouterKeyConfigured ? 'ready' : 'not set'}
              </span>
              {mcpStatus.remoteAccount.cloudflareAccounts.length > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Cloudflare ({mcpStatus.remoteAccount.cloudflareAccounts.length})
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={syncingRemote}
            onClick={() => void handleSyncRemote()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingRemote ? 'animate-spin' : ''}`} />
            <span>{syncingRemote ? 'Syncing...' : 'Sync Remote Websites'}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Portfolio Operations
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            US Loans Education &amp; Referral network status, active MCP builds, and AI cost ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Website</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total Websites
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-zinc-950 dark:text-zinc-50 tabular-nums">
              {metrics.totalWebsites}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {metrics.publishedWebsites} published
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Build &amp; Approval Pipeline
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-zinc-950 dark:text-zinc-50 tabular-nums">
              {metrics.buildingWebsites + metrics.pendingApprovalCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {metrics.buildingWebsites} active · {metrics.pendingApprovalCount} approval
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Build Failures &amp; QA Blocks
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                metrics.failedJobs + metrics.qaBlockedCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-950 dark:text-zinc-50'
              }`}
            >
              {metrics.failedJobs + metrics.qaBlockedCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {metrics.failedJobs} job err · {metrics.qaBlockedCount} QA
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tracked AI Spend
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-zinc-950 dark:text-zinc-50 tabular-nums">
              {formatUsd(metrics.totalSpendUsd)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {formatUsd(metrics.contentSpendUsd)} text · {formatUsd(metrics.imageSpendUsd)} img
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Recent Websites & Build Queue + Cost Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-500" />
              <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Recent Websites
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('websites')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all websites
            </button>
          </div>

          {recentWebsites.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No websites configured yet. Create your first US loan education property.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 px-4">Website</th>
                    <th className="py-2.5 px-4">Workflow Stage</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                  {recentWebsites.map((site) => (
                    <tr
                      key={site.id}
                      onClick={() => onInspectWebsite(site.id)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-zinc-950 dark:text-zinc-50">
                          {site.brandName}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{site.domain}</span>
                          <span aria-hidden="true"> · </span>
                          <span>
                            {site.locationCity}, {site.locationState}
                          </span>
                          {site.isDemo && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="text-amber-700 dark:text-amber-400">Demo</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {WORKFLOW_STAGE_LABELS[site.workflowStage] || site.workflowStage}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusIndicator status={site.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatRelativeDate(site.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-zinc-500" />
                <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Recent Build Jobs
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('queue')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open queue
              </button>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {recentJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-950 dark:text-zinc-50 truncate">
                      {job.websiteBrand || job.websiteDomain}
                    </span>
                    <StatusIndicator status={job.status} />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {job.errorMessage || job.currentStep}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>{job.jobType}</span>
                    <span>{job.progressPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Top AI Spend by Site
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('costs')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Analytics
              </button>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {costByWebsite.slice(0, 4).map((c) => (
                <div
                  key={c.websiteId}
                  className="px-4 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-950 dark:text-zinc-50 truncate">
                      {c.brandName}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                      {c.domain}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs font-semibold text-zinc-950 dark:text-zinc-50 tabular-nums shrink-0">
                    {formatUsd(c.totalUsd)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

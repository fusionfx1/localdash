import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Play,
  RefreshCw,
  Rocket,
  XCircle,
} from 'lucide-react';
import { apiRequest, formatRelativeDate } from '../lib/api.ts';
import type { QaCategory, QaCheckRecord, WebsiteRecord } from '../shared/types.ts';
import { StatusIndicator } from '../components/StatusBadge.tsx';
import { useToast } from '../components/Toast.tsx';

const CATEGORY_LABELS: Record<QaCategory, string> = {
  seo: 'SEO & Schema',
  content: 'Content Depth',
  canonical: 'Canonicals',
  disclosure: 'US Disclosures',
  image: 'Images & Alt',
  link: 'Link Integrity',
};

export function QaCenterPage({
  initialWebsiteId,
}: {
  initialWebsiteId: string | null;
}) {
  const { pushToast } = useToast();
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [checks, setChecks] = useState<QaCheckRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    initialWebsiteId || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [busySiteId, setBusySiteId] = useState<string | null>(null);

  const loadQa = async (siteId = selectedSiteId) => {
    setLoading(true);
    try {
      const qs = siteId && siteId !== 'all' ? `?websiteId=${siteId}` : '';
      const res = await apiRequest<{
        checks: QaCheckRecord[];
        websites: WebsiteRecord[];
      }>(`/api/qa${qs}`);
      setWebsites(res.websites);
      setChecks(res.checks);
    } catch (err) {
      pushToast(
        'Failed to load QA Center',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialWebsiteId) {
      setSelectedSiteId(initialWebsiteId);
      void loadQa(initialWebsiteId);
    } else {
      void loadQa('all');
    }
  }, [initialWebsiteId]);

  const filteredChecks = useMemo(() => {
    return checks.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      return true;
    });
  }, [checks, categoryFilter]);

  const summary = useMemo(() => {
    return {
      pass: filteredChecks.filter((c) => c.status === 'pass').length,
      warn: filteredChecks.filter((c) => c.status === 'warn').length,
      fail: filteredChecks.filter((c) => c.status === 'fail').length,
    };
  }, [filteredChecks]);

  const handleRunAudit = async (websiteId: string) => {
    setBusySiteId(websiteId);
    try {
      await apiRequest(`/api/qa/${websiteId}/run`, { method: 'POST' });
      await loadQa(selectedSiteId);
      pushToast('QA audit completed', 'success');
    } catch (err) {
      pushToast(
        'QA audit failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusySiteId(null);
    }
  };

  const handleUpdateCheck = async (
    checkId: string,
    status: 'pass' | 'warn' | 'fail'
  ) => {
    try {
      await apiRequest(`/api/qa/check/${checkId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadQa(selectedSiteId);
      pushToast('QA check status updated', 'info');
    } catch (err) {
      pushToast(
        'Update failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handlePublishReadySite = async (websiteId: string) => {
    setBusySiteId(`pub-${websiteId}`);
    try {
      const res = await apiRequest<{ publishedUrl: string }>(
        '/api/mcp/publish-website',
        {
          method: 'POST',
          body: JSON.stringify({ websiteId }),
        }
      );
      await loadQa(selectedSiteId);
      pushToast('Website published', 'success', res.publishedUrl);
    } catch (err) {
      pushToast(
        'Publish blocked',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusySiteId(null);
    }
  };

  const sortedWebsites = useMemo(() => {
    return [...websites].sort((a, b) => {
      if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1;
      return a.brandName.localeCompare(b.brandName);
    });
  }, [websites]);

  const selectedWebsite = sortedWebsites.find((w) => w.id === selectedSiteId);
  const isLiveHtmlAuditTarget = Boolean(
    selectedWebsite &&
      !selectedWebsite.isDemo &&
      selectedWebsite.publishedUrl &&
      /^https?:\/\//i.test(selectedWebsite.publishedUrl)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            QA Center
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {isLiveHtmlAuditTarget && selectedWebsite?.publishedUrl
              ? `Live HTML audit ready for ${selectedWebsite.publishedUrl} (checks real meta tags, canonicals, disclosures, images, and links).`
              : 'Validate SEO, content depth, canonicals, US loan disclosures, image health, and internal links.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSiteId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSiteId(val);
              void loadQa(val);
            }}
            aria-label="Select website for QA"
            className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs max-w-xs"
          >
            <option value="all">All Audited Websites</option>
            {sortedWebsites.map((w) => (
              <option key={w.id} value={w.id}>
                [{w.isDemo ? 'DEMO' : 'LIVE'}] {w.brandName} ({w.domain})
              </option>
            ))}
          </select>

          {selectedWebsite && (
            <>
              <button
                type="button"
                disabled={busySiteId === selectedWebsite.id}
                onClick={() => handleRunAudit(selectedWebsite.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {busySiteId === selectedWebsite.id
                    ? 'Auditing...'
                    : isLiveHtmlAuditTarget
                      ? 'Run Live HTML Audit'
                      : 'Run Full QA Audit'}
                </span>
              </button>
              {selectedWebsite.status !== 'published' && (
                <button
                  type="button"
                  disabled={busySiteId === `pub-${selectedWebsite.id}`}
                  onClick={() => handlePublishReadySite(selectedWebsite.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Category & Summary Bar */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-md">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium ${
              categoryFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            All Categories
          </button>
          {(Object.keys(CATEGORY_LABELS) as QaCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                categoryFilter === cat
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums px-1">
          <span className="text-emerald-700 dark:text-emerald-400">
            {summary.pass} passed
          </span>
          <span className="text-amber-700 dark:text-amber-400">
            {summary.warn} warnings
          </span>
          <span className="text-red-700 dark:text-red-400">
            {summary.fail} failed
          </span>
        </div>
      </div>

      {/* QA Matrix */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No QA checks recorded for this selection yet.
            </p>
            {selectedWebsite && (
              <button
                type="button"
                onClick={() => handleRunAudit(selectedWebsite.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run QA Audit Now</span>
              </button>
            )}
          </div>
        ) : (
          filteredChecks.map((qc) => (
            <div
              key={qc.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {qc.websiteBrand}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{qc.websiteDomain}</span>
                  <span aria-hidden="true">·</span>
                  <span>{CATEGORY_LABELS[qc.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{formatRelativeDate(qc.checkedAt)}</span>
                </div>

                <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {qc.title}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {qc.details}
                </p>
                {qc.autoFixHint && qc.status !== 'pass' && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Recommended fix: {qc.autoFixHint}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusIndicator status={qc.status} />
                <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden ml-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateCheck(qc.id, 'pass')}
                    title="Mark Passed"
                    className={`p-1.5 text-xs ${
                      qc.status === 'pass'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCheck(qc.id, 'fail')}
                    title="Mark Failed"
                    className={`p-1.5 text-xs border-l border-zinc-200 dark:border-zinc-800 ${
                      qc.status === 'fail'
                        ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                        : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { WEBSITE_STATUS_LABELS } from '../lib/api.ts';

export function StatusIndicator({ status }: { status: string }) {
  const label = WEBSITE_STATUS_LABELS[status] || status;

  switch (status) {
    case 'published':
    case 'completed':
    case 'pass':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{status === 'pass' ? 'Passed' : status === 'completed' ? 'Completed' : label}</span>
        </span>
      );
    case 'ready_to_publish':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'building':
    case 'running':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span>{status === 'running' ? 'Running' : label}</span>
        </span>
      );
    case 'awaiting_approval':
    case 'qa_review':
    case 'queued':
    case 'warn':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
          {status === 'warn' ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {status === 'warn' ? 'Warning' : status === 'queued' ? 'Queued' : label}
          </span>
        </span>
      );
    case 'failed':
    case 'fail':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{status === 'fail' ? 'Failed' : label}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </span>
      );
  }
}

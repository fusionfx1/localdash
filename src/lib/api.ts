export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const SESSION_STORAGE_KEY = 'wf_owner_session_token';
let inMemorySessionToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function getSessionToken(): string | null {
  if (inMemorySessionToken) return inMemorySessionToken;
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      inMemorySessionToken = stored;
      return stored;
    }
  } catch {
    // Ignore restricted storage environments
  }
  return null;
}

export function setSessionToken(token: string | null): void {
  inMemorySessionToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore restricted storage environments
  }
}

export function setUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      setSessionToken(null);
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    const msg =
      typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(val || 0);
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  configuration: '1. Site Configuration',
  validation: '2. Validation',
  dry_run: '3. MCP Dry-run',
  build_brief: '4. Build Brief',
  user_approval: '5. User Approval',
  mcp_build: '6. MCP Build',
  monitoring: '7. Status Monitoring',
  qa: '8. QA Review',
  publish_approval: '9. Publish Approval',
  published: 'Published Live',
};

export const WEBSITE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  validated: 'Validated',
  dry_run_ready: 'Dry-run Ready',
  awaiting_approval: 'Awaiting Approval',
  building: 'Building',
  qa_review: 'QA Review',
  ready_to_publish: 'Ready to Publish',
  published: 'Published',
  failed: 'Action Needed',
};

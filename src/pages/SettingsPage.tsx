import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Save,
  Server,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import type {
  AppSettingsPublic,
  AuthStatus,
  McpSetupStatus,
  McpTransportMode,
} from '../shared/types.ts';
import { useToast } from '../components/Toast.tsx';

interface SettingsPageProps {
  authStatus: AuthStatus;
  onStatusChanged: (mcpStatus: McpSetupStatus) => void;
}

export function SettingsPage({
  authStatus,
  onStatusChanged,
}: SettingsPageProps) {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<AppSettingsPublic | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);

  const [transportMode, setTransportMode] = useState<McpTransportMode>('demo');
  const [mcpEndpointUrl, setMcpEndpointUrl] = useState('');
  const [mcpAuthType, setMcpAuthType] = useState<'bearer' | 'api_key' | 'none'>('bearer');
  const [newMcpApiKey, setNewMcpApiKey] = useState('');
  const [clearMcpApiKey, setClearMcpApiKey] = useState(false);
  const [stdioCommand, setStdioCommand] = useState('');
  const [stdioArgs, setStdioArgs] = useState('');
  const [stdioEnvJson, setStdioEnvJson] = useState('');
  const [contentModel, setContentModel] = useState('claude-3-7-sonnet');
  const [imageModel, setImageModel] = useState('flux-1.1-pro');
  const [monthlyBudgetLimitUsd, setMonthlyBudgetLimitUsd] = useState(250);
  const [requireQaPassBeforePublish, setRequireQaPassBeforePublish] = useState(true);

  const [passcodeForm, setPasscodeForm] = useState({
    currentPasscode: '',
    newPasscode: '',
    confirmPasscode: '',
  });
  const [rotatingPasscode, setRotatingPasscode] = useState(false);
  const [confirmPurgeDemo, setConfirmPurgeDemo] = useState(false);
  const [purgingDemo, setPurgingDemo] = useState(false);

  const onStatusChangedRef = React.useRef(onStatusChanged);
  onStatusChangedRef.current = onStatusChanged;

  useEffect(() => {
    apiRequest<{ settings: AppSettingsPublic; mcpStatus: McpSetupStatus }>(
      '/api/settings'
    )
      .then((res) => {
        setSettings(res.settings);
        setMcpStatus(res.mcpStatus);
        onStatusChangedRef.current(res.mcpStatus);

        setTransportMode(res.settings.transportMode);
        setMcpEndpointUrl(res.settings.mcpEndpointUrl);
        setMcpAuthType(res.settings.mcpAuthType);
        setStdioCommand(res.settings.stdioCommand);
        setStdioArgs(res.settings.stdioArgs);
        setContentModel(res.settings.contentModel);
        setImageModel(res.settings.imageModel);
        setMonthlyBudgetLimitUsd(res.settings.monthlyBudgetLimitUsd);
        setRequireQaPassBeforePublish(res.settings.requireQaPassBeforePublish);
      })
      .catch((err) => {
        pushToast(
          'Failed to load settings',
          'error',
          err instanceof Error ? err.message : undefined
        );
      })
      .finally(() => setLoading(false));
  }, [pushToast]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest<{
        settings: AppSettingsPublic;
        mcpStatus: McpSetupStatus;
      }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          transportMode,
          mcpEndpointUrl,
          mcpAuthType,
          mcpApiKey: newMcpApiKey || undefined,
          clearMcpApiKey,
          stdioCommand,
          stdioArgs,
          stdioEnvJson: stdioEnvJson || undefined,
          contentModel,
          imageModel,
          monthlyBudgetLimitUsd: Number(monthlyBudgetLimitUsd),
          requireQaPassBeforePublish,
        }),
      });
      setSettings(res.settings);
      setMcpStatus(res.mcpStatus);
      onStatusChanged(res.mcpStatus);
      setNewMcpApiKey('');
      setClearMcpApiKey(false);
      pushToast('Settings saved on server', 'success', res.mcpStatus.message);
    } catch (err) {
      pushToast(
        'Save failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const handleProbeMcp = async () => {
    setProbing(true);
    try {
      const status = await apiRequest<McpSetupStatus>('/api/mcp/setup-status');
      setMcpStatus(status);
      onStatusChanged(status);
      pushToast(
        status.isDemoMode
          ? 'MCP Probe: DEMO MODE'
          : status.connected
            ? 'MCP Connected'
            : 'MCP Connection Failed',
        status.connected ? 'success' : status.isDemoMode ? 'info' : 'error',
        status.message
      );
    } catch (err) {
      pushToast(
        'Probe failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setProbing(false);
    }
  };

  const handleRotatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeForm.newPasscode.length < 6) {
      pushToast('New passcode must be at least 6 characters', 'error');
      return;
    }
    if (passcodeForm.newPasscode !== passcodeForm.confirmPasscode) {
      pushToast('New passcodes do not match', 'error');
      return;
    }
    setRotatingPasscode(true);
    try {
      await apiRequest('/api/auth/change-passcode', {
        method: 'POST',
        body: JSON.stringify({
          currentPasscode: passcodeForm.currentPasscode,
          newPasscode: passcodeForm.newPasscode,
        }),
      });
      setPasscodeForm({
        currentPasscode: '',
        newPasscode: '',
        confirmPasscode: '',
      });
      pushToast('Master passcode updated', 'success');
    } catch (err) {
      pushToast(
        'Passcode update failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setRotatingPasscode(false);
    }
  };

  const handlePurgeDemo = async () => {
    setPurgingDemo(true);
    try {
      const res = await apiRequest<{ ok: boolean; deletedCount: number }>(
        '/api/websites/demo/purge',
        { method: 'DELETE' }
      );
      setConfirmPurgeDemo(false);
      pushToast(
        res.deletedCount > 0
          ? `Removed ${res.deletedCount} demo seed website(s)`
          : 'No demo websites remaining',
        'success'
      );
    } catch (err) {
      pushToast(
        'Failed to purge demo data',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setPurgingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
        <div className="h-64 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Configure server-side LocalSites.pro MCP transport, AI model defaults, and owner passcode security.
        </p>
      </div>

      {/* Live MCP Status Probe */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-zinc-500" />
            <div>
              <h2 className="font-display text-sm font-semibold">
                LocalSites.pro MCP Adapter Status
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {mcpStatus?.transportLabel} · {mcpStatus?.endpointSummary}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={probing}
            onClick={handleProbeMcp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
            <span>Test get_setup_status</span>
          </button>
        </div>

        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {mcpStatus?.message}
        </p>

        {mcpStatus?.remoteAccount && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Account &amp; Plan</div>
              <div className="font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                {mcpStatus.remoteAccount.account || '—'}
                {mcpStatus.remoteAccount.plan
                  ? ` · ${mcpStatus.remoteAccount.plan.toUpperCase()}`
                  : ''}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Remote Portfolio</div>
              <div className="font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                {mcpStatus.remoteAccount.remoteWebsitesCount ?? '—'} websites
              </div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Providers</div>
              <div className="text-zinc-900 dark:text-zinc-100 mt-0.5">
                OpenRouter: {mcpStatus.remoteAccount.openrouterKeyConfigured ? 'Ready' : 'Not set'}
                {' · '}
                Web3Forms: {mcpStatus.remoteAccount.web3formsKeyConfigured ? 'Ready' : 'Optional'}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">Cloudflare Accounts</div>
              <div className="font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                {mcpStatus.remoteAccount.cloudflareAccounts.length > 0
                  ? mcpStatus.remoteAccount.cloudflareAccounts
                      .map((c) => c.label)
                      .join(', ')
                  : 'None linked'}
              </div>
            </div>
          </div>
        )}

        {mcpStatus?.remoteAccount && mcpStatus.remoteAccount.missing.length > 0 && (
          <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Missing on LocalSites.pro: {mcpStatus.remoteAccount.missing.join(', ')}
            </span>
          </div>
        )}

        {mcpStatus && mcpStatus.availableTools.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 pt-1">
            {mcpStatus.availableTools.map((tool) => (
              <span key={tool} className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{tool}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MCP Transport & Model Configuration */}
      <form
        onSubmit={handleSaveSettings}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6"
      >
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold">
              MCP Transport &amp; Server Credentials
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Credentials are stored exclusively on the Node.js server in PostgreSQL and are never sent back to the browser.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { id: 'demo', label: 'DEMO MODE (Simulated)' },
                { id: 'http_sse', label: 'HTTP / SSE Transport' },
                { id: 'stdio', label: 'Stdio Process Transport' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTransportMode(opt.id)}
                className={`px-3 py-2.5 rounded-md border text-xs font-medium text-left transition-colors ${
                  transportMode === opt.id
                    ? 'border-zinc-950 dark:border-zinc-50 bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {transportMode === 'http_sse' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  LocalSites.pro MCP Endpoint URL
                </label>
                <input
                  type="url"
                  value={mcpEndpointUrl}
                  onChange={(e) => setMcpEndpointUrl(e.target.value)}
                  placeholder="https://mcp.localsites.pro/sse"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Auth Header Type</label>
                <select
                  value={mcpAuthType}
                  onChange={(e) =>
                    setMcpAuthType(e.target.value as 'bearer' | 'api_key' | 'none')
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="bearer">OAuth Bearer Token</option>
                  <option value="api_key">X-API-Key Header</option>
                  <option value="none">No Auth Header</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  MCP API Key / OAuth Token{' '}
                  {settings?.hasMcpApiKey && (
                    <span className="font-mono text-zinc-500">
                      (Saved: {settings.maskedMcpApiKey})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={newMcpApiKey}
                  onChange={(e) => setNewMcpApiKey(e.target.value)}
                  placeholder={
                    settings?.hasMcpApiKey
                      ? 'Leave blank to keep existing key'
                      : 'Enter server-side API key'
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
                {settings?.hasMcpApiKey && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-zinc-500 mt-1.5">
                    <input
                      type="checkbox"
                      checked={clearMcpApiKey}
                      onChange={(e) => setClearMcpApiKey(e.target.checked)}
                    />
                    <span>Clear saved credential</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {transportMode === 'stdio' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium mb-1">Stdio Command</label>
                <input
                  type="text"
                  value={stdioCommand}
                  onChange={(e) => setStdioCommand(e.target.value)}
                  placeholder="npx"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Command Arguments</label>
                <input
                  type="text"
                  value={stdioArgs}
                  onChange={(e) => setStdioArgs(e.target.value)}
                  placeholder="-y @localsites/mcp-server"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Server-Side Process Env JSON{' '}
                  {settings?.hasStdioEnv && (
                    <span className="text-zinc-500">(Env variables saved)</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={stdioEnvJson}
                  onChange={(e) => setStdioEnvJson(e.target.value)}
                  placeholder='{"LOCALSITES_API_KEY": "..."}'
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-5 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          <h2 className="font-display text-base font-semibold">
            AI Model &amp; Governance Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Content Model</label>
              <select
                value={contentModel}
                onChange={(e) => setContentModel(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
              >
                <option value="claude-3-7-sonnet">claude-3-7-sonnet</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Image Model</label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
              >
                <option value="flux-1.1-pro">flux-1.1-pro</option>
                <option value="gpt-image-1">gpt-image-1</option>
                <option value="imagen-4">imagen-4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Monthly Budget Alert (USD)
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                value={monthlyBudgetLimitUsd}
                onChange={(e) => setMonthlyBudgetLimitUsd(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={requireQaPassBeforePublish}
              onChange={(e) => setRequireQaPassBeforePublish(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span>
              Require all blocking QA Center checks (including US loan disclosures) to pass before publish_website
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Owner Authentication Rotation */}
      <form
        onSubmit={handleRotatePasscode}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-zinc-500" />
          <h2 className="font-display text-base font-semibold">
            Owner Master Passcode
          </h2>
        </div>

        {authStatus.envPasscodeManaged ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Passcode is currently managed by the <span className="font-mono">OWNER_PASSCODE</span> environment variable. Update it in your deployment environment to rotate.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Current Passcode</label>
                <input
                  type="password"
                  required
                  value={passcodeForm.currentPasscode}
                  onChange={(e) =>
                    setPasscodeForm((p) => ({
                      ...p,
                      currentPasscode: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">New Passcode</label>
                <input
                  type="password"
                  required
                  value={passcodeForm.newPasscode}
                  onChange={(e) =>
                    setPasscodeForm((p) => ({ ...p, newPasscode: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Confirm New</label>
                <input
                  type="password"
                  required
                  value={passcodeForm.confirmPasscode}
                  onChange={(e) =>
                    setPasscodeForm((p) => ({
                      ...p,
                      confirmPasscode: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={rotatingPasscode}
                className="px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {rotatingPasscode ? 'Updating...' : 'Rotate Passcode'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Demo Data Management */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold">
            Demo Seed Data Management
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Remove all initial DEMO MODE sample websites (along with their simulated jobs, QA checks, and cost entries) while preserving live synced LocalSites.pro websites and blueprints.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {confirmPurgeDemo ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmPurgeDemo(false)}
                className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgingDemo}
                onClick={() => void handlePurgeDemo()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purgingDemo ? 'Purging...' : 'Confirm Purge Demo Sites'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmPurgeDemo(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Demo Websites</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Moon, Sun } from 'lucide-react';
import { apiRequest, setSessionToken } from '../lib/api.ts';
import type { AuthStatus } from '../shared/types.ts';
import { useTheme } from './ThemeContext.tsx';

interface AuthGateProps {
  authStatus: AuthStatus;
  onAuthenticated: (next: AuthStatus) => void;
}

export function AuthGate({ authStatus, onAuthenticated }: AuthGateProps) {
  const { theme, toggleTheme } = useTheme();
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSetupMode = !authStatus.initialized;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetupMode) {
      if (passcode.length < 6) {
        setError('Master passcode must be at least 6 characters.');
        return;
      }
      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match.');
        return;
      }
    } else if (!passcode.trim()) {
      setError('Enter your master passcode to unlock.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isSetupMode ? '/api/auth/setup' : '/api/auth/login';
      const next = await apiRequest<AuthStatus & { sessionToken?: string }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({ passcode }),
        }
      );
      if (next.sessionToken) {
        setSessionToken(next.sessionToken);
      }
      onAuthenticated({
        initialized: next.initialized,
        authenticated: next.authenticated,
        envPasscodeManaged: next.envPasscodeManaged,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col justify-between p-6">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 flex items-center justify-center font-display font-bold text-xs">
            WF
          </div>
          <span className="font-display font-semibold text-sm tracking-tight">
            Website Factory
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7">
          <div className="flex items-center gap-2.5 text-zinc-950 dark:text-zinc-50 mb-2">
            {isSetupMode ? (
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Lock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            )}
            <h1 className="font-display text-lg font-semibold tracking-tight">
              {isSetupMode ? 'Initialize Master Passcode' : 'Unlock Website Factory'}
            </h1>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
            {isSetupMode
              ? 'Create a private owner passcode for your US Loans Education & Referral operations console. It is hashed with scrypt and stored in PostgreSQL.'
              : 'Enter your private master passcode to access your LocalSites.pro MCP workspace.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="master-passcode"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Master Passcode
              </label>
              <div className="relative">
                <input
                  id="master-passcode"
                  type={showPasscode ? 'text' : 'password'}
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={isSetupMode ? 'Minimum 6 characters' : 'Enter passcode'}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-3 pr-10 py-2 text-sm text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showPasscode ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {!isSetupMode && authStatus.envPasscodeManaged && (
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Using <span className="font-mono">OWNER_PASSCODE</span> configured in environment secrets.
                </p>
              )}
            </div>

            {isSetupMode && (
              <div>
                <label
                  htmlFor="confirm-passcode"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Confirm Master Passcode
                </label>
                <input
                  id="confirm-passcode"
                  type="password"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter passcode"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              <span>
                {submitting
                  ? 'Verifying...'
                  : isSetupMode
                    ? 'Save Passcode & Enter Workspace'
                    : 'Unlock Workspace'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-500 mt-4">
          Session secured via HTTP-only HMAC cookie · You can also set OWNER_PASSCODE in .env
        </p>
      </div>

      <div className="text-center text-xs text-zinc-500 dark:text-zinc-500">
        Website Factory · US Loans Education &amp; Referral Operations
      </div>
    </div>
  );
}

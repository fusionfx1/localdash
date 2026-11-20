import {
  Activity,
  BarChart3,
  BookTemplate,
  Globe,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import type { McpSetupStatus } from '../shared/types.ts';
import { useTheme } from './ThemeContext.tsx';

export type PageKey =
  | 'overview'
  | 'websites'
  | 'create'
  | 'queue'
  | 'qa'
  | 'blueprints'
  | 'costs'
  | 'settings';

export const NAV_ITEMS: Array<{
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'websites', label: 'Websites', icon: Globe },
  { key: 'create', label: 'Create Website', icon: Plus },
  { key: 'queue', label: 'Build Queue', icon: Activity },
  { key: 'qa', label: 'QA Center', icon: ShieldCheck },
  { key: 'blueprints', label: 'Blueprints', icon: BookTemplate },
  { key: 'costs', label: 'Cost Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  mcpStatus: McpSetupStatus | null;
  failedJobsCount: number;
  onLogout: () => void;
}

export function Sidebar({
  activePage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  mcpStatus,
  failedJobsCount,
  onLogout,
}: SidebarProps) {
  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 w-64 shrink-0">
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            onNavigate('overview');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left"
        >
          <div className="w-7 h-7 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 flex items-center justify-center font-display font-bold text-xs shrink-0">
            WF
          </div>
          <span className="font-display font-semibold text-sm tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap">
            Website Factory
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNavigate(item.key);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.key === 'queue' && failedJobsCount > 0 && (
                <span className="font-mono text-xs text-red-600 dark:text-red-400 tabular-nums">
                  {failedJobsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <button
          type="button"
          onClick={() => {
            onNavigate('settings');
            onCloseMobile();
          }}
          className="w-full text-left rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="text-xs font-medium text-zinc-950 dark:text-zinc-100">
            {mcpStatus?.isDemoMode !== false
              ? 'DEMO MODE'
              : mcpStatus?.connected
                ? 'LocalSites.pro MCP'
                : 'MCP Disconnected'}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {mcpStatus?.isDemoMode !== false
              ? 'Simulated adapter · Configure in Settings'
              : mcpStatus?.endpointSummary}
          </div>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock Workspace</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex h-screen sticky top-0">{navContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}

interface TopBarProps {
  activePage: PageKey;
  mcpStatus: McpSetupStatus | null;
  onOpenMobile: () => void;
  onCreateNew: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  activePage,
  mcpStatus,
  onOpenMobile,
  onCreateNew,
  onOpenSettings,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const currentTitle =
    NAV_ITEMS.find((i) => i.key === activePage)?.label || 'Overview';

  return (
    <header className="h-14 sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline whitespace-nowrap">
            Website Factory
          </span>
          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
          <h2 className="font-display font-semibold text-zinc-950 dark:text-zinc-50 truncate">
            {currentTitle}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {mcpStatus?.isDemoMode !== false ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap shrink-0"
          >
            <span>DEMO MODE</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSettings}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 ${
              mcpStatus.connected
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            }`}
          >
            <span>{mcpStatus.connected ? 'MCP Live' : 'MCP Offline'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          aria-label="Toggle light and dark theme"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Website</span>
        </button>
      </div>
    </header>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, setSessionToken, setUnauthorizedHandler } from './lib/api.ts';
import type {
  AuthStatus,
  BlueprintRecord,
  McpSetupStatus,
  WebsiteRecord,
} from './shared/types.ts';
import { ThemeProvider } from './components/ThemeContext.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { Sidebar, TopBar, type PageKey } from './components/Sidebar.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { WebsitesPage } from './pages/WebsitesPage.tsx';
import { CreateWebsitePage } from './pages/CreateWebsitePage.tsx';
import { BuildQueuePage } from './pages/BuildQueuePage.tsx';
import { QaCenterPage } from './pages/QaCenterPage.tsx';
import { BlueprintsPage } from './pages/BlueprintsPage.tsx';
import { CostAnalyticsPage } from './pages/CostAnalyticsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

function WorkspaceApp() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [activePage, setActivePage] = useState<PageKey>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [mcpStatus, setMcpStatus] = useState<McpSetupStatus | null>(null);
  const [failedJobsCount, setFailedJobsCount] = useState(0);

  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [qaWebsiteId, setQaWebsiteId] = useState<string | null>(null);
  const [draftBlueprint, setDraftBlueprint] = useState<BlueprintRecord | null>(null);
  const [resumeWebsite, setResumeWebsite] = useState<WebsiteRecord | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthStatus((prev) =>
        prev ? { ...prev, authenticated: false } : { initialized: true, authenticated: false, envPasscodeManaged: false }
      );
    });
    apiRequest<AuthStatus>('/api/auth/status')
      .then((res) => setAuthStatus(res))
      .catch(() =>
        setAuthStatus({
          initialized: true,
          authenticated: false,
          envPasscodeManaged: false,
        })
      );
  }, []);

  const refreshMeta = useCallback(async () => {
    try {
      const overview = await apiRequest<{
        mcpStatus: McpSetupStatus;
        metrics: { failedJobs: number };
      }>('/api/overview');
      setMcpStatus(overview.mcpStatus);
      setFailedJobsCount(overview.metrics.failedJobs);
    } catch {
      // Ignore transient errors while locking/navigating
    }
  }, []);

  useEffect(() => {
    if (authStatus?.authenticated) {
      void refreshMeta();
    }
  }, [authStatus?.authenticated, refreshMeta, activePage]);

  const handleLogout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setSessionToken(null);
    setAuthStatus((prev) => (prev ? { ...prev, authenticated: false } : null));
  };

  if (!authStatus) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-xs text-zinc-500">
        Loading Website Factory...
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <AuthGate
        authStatus={authStatus}
        onAuthenticated={(next) => setAuthStatus(next)}
      />
    );
  }

  const navigateToCreate = () => {
    setDraftBlueprint(null);
    setResumeWebsite(null);
    setActivePage('create');
  };

  const inspectWebsite = (websiteId: string) => {
    setSelectedWebsiteId(websiteId);
    setActivePage('websites');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          if (page === 'create') {
            setDraftBlueprint(null);
            setResumeWebsite(null);
          }
          setActivePage(page);
        }}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        mcpStatus={mcpStatus}
        failedJobsCount={failedJobsCount}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activePage={activePage}
          mcpStatus={mcpStatus}
          onOpenMobile={() => setMobileNavOpen(true)}
          onCreateNew={navigateToCreate}
          onOpenSettings={() => setActivePage('settings')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activePage === 'overview' && (
            <OverviewPage
              onNavigate={setActivePage}
              onInspectWebsite={inspectWebsite}
            />
          )}

          {activePage === 'websites' && (
            <WebsitesPage
              selectedWebsiteId={selectedWebsiteId}
              onSelectWebsite={setSelectedWebsiteId}
              onNavigate={(p) => {
                if (p === 'create') navigateToCreate();
                else setActivePage(p);
              }}
              onOpenQaForSite={(id) => {
                setQaWebsiteId(id);
                setActivePage('qa');
              }}
              onResumeCreateWorkflow={(site) => {
                setDraftBlueprint(null);
                setResumeWebsite(site);
                setActivePage('create');
              }}
            />
          )}

          {activePage === 'create' && (
            <CreateWebsitePage
              initialBlueprint={draftBlueprint}
              resumeWebsite={resumeWebsite}
              onFinishedToWebsites={(id) => {
                setSelectedWebsiteId(id);
                setActivePage('websites');
              }}
            />
          )}

          {activePage === 'queue' && (
            <BuildQueuePage onInspectWebsite={inspectWebsite} />
          )}

          {activePage === 'qa' && (
            <QaCenterPage initialWebsiteId={qaWebsiteId} />
          )}

          {activePage === 'blueprints' && (
            <BlueprintsPage
              onUseBlueprint={(bp) => {
                setResumeWebsite(null);
                setDraftBlueprint(bp);
                setActivePage('create');
              }}
            />
          )}

          {activePage === 'costs' && (
            <CostAnalyticsPage onInspectWebsite={inspectWebsite} />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              authStatus={authStatus}
              onStatusChanged={(status) => setMcpStatus(status)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WorkspaceApp />
      </ToastProvider>
    </ThemeProvider>
  );
}

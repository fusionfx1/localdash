import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (title: string, variant?: ToastVariant, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  pushToast: () => undefined,
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, variant: ToastVariant = 'info', description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, variant, description }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm transition-all duration-150"
          >
            {t.variant === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {t.variant === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            {t.variant === 'info' && (
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                {t.title}
              </p>
              {t.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 break-words">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

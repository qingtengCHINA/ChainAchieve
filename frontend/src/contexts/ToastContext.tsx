import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
}

interface ToastCtx {
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastCtx>({
  success: () => {},
  error: () => {},
  info: () => {},
});

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'rgba(159,232,112,0.12)',
    border: 'rgba(159,232,112,0.35)',
    icon: '#163300',
    text: '#9fe870',
  },
  error: {
    bg: 'rgba(208,50,56,0.10)',
    border: 'rgba(208,50,56,0.30)',
    icon: '#d03238',
    text: '#d03238',
  },
  info: {
    bg: 'rgba(56,200,255,0.08)',
    border: 'rgba(56,200,255,0.25)',
    icon: '#38c8ff',
    text: '#38c8ff',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string, detail?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, message, detail }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const success = useCallback((m: string, d?: string) => add('success', m, d), [add]);
  const error = useCallback((m: string, d?: string) => add('error', m, d), [add]);
  const info = useCallback((m: string, d?: string) => add('info', m, d), [add]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Toast renderer */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 'min(360px, calc(100vw - 2rem))' }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const c = colors[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="pointer-events-auto rounded-2xl p-4 flex items-start gap-3 glass"
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{
                    background: t.type === 'success' ? '#9fe870' : c.border,
                    color: t.type === 'success' ? '#163300' : c.icon,
                  }}
                >
                  {icons[t.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-snug" style={{ color: 'var(--text)' }}>
                    {t.message}
                  </p>
                  {t.detail && (
                    <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                      {t.detail}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

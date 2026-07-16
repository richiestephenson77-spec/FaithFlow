import { useEffect, useState } from 'react';

// Flat, muted toast. Success is brief (~2s); errors linger (~4s) and read
// clearer. Self-hides via `visible` so it works both standalone (a page passes
// a message string) and through ToastProvider (which also clears via onDone).
export default function Toast({ message, type = 'success', onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const dur = type === 'error' ? 4200 : 2000;
    const hide = setTimeout(() => setVisible(false), dur);
    const done = setTimeout(() => onDone && onDone(), dur + 250);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [message, type]);

  if (!visible) return null;

  const isError = type === 'error';
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] max-w-sm w-full px-4 fade-in"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-2.5"
        style={{
          background: isError ? 'rgba(150,44,44,0.96)' : 'rgba(44,64,85,0.96)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
        }}
      >
        <span style={{ fontSize: 14 }}>{isError ? '⚠️' : '✓'}</span>
        <p className="text-sm font-medium text-white">{message}</p>
      </div>
    </div>
  );
}

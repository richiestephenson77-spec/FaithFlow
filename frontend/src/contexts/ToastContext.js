import { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(() => {});

// showToast(message, type?) — type: 'success' (default) | 'error'
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    if (!message) return;
    idRef.current += 1;
    setToast({ message, type, id: idRef.current });
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast((t) => (t && t.id === toast.id ? null : t))}
        />
      )}
    </ToastContext.Provider>
  );
}

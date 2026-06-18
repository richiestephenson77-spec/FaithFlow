import { useEffect, useState } from 'react';

export default function Toast({ message }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!visible) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 fade-in">
      <div className="bg-faith-700 text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
        <span className="text-xl">🙏</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

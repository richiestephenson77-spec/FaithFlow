import { useState, useEffect } from 'react';

// Tracks connectivity via navigator.onLine + the online/offline events.
// Returns true when online. Note: navigator.onLine only knows about the network
// interface, not real reachability, so treat it as a hint — API calls still have
// their own error handling.
export default function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

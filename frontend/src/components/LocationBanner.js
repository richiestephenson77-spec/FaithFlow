import { useState } from 'react';
import api from '../utils/api';
import { WaterButton } from './water';

export default function LocationBanner({ onLocationGranted }) {
  const [loading, setLoading] = useState(false);

  function handleEnable() {
    if (!navigator.geolocation) {
      localStorage.setItem('location_denied', 'true');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await api.patch('/users/location', { latitude, longitude });
          localStorage.setItem('user_lat', latitude);
          localStorage.setItem('user_lng', longitude);
          onLocationGranted({ latitude, longitude });
        } catch {}
        setLoading(false);
      },
      () => {
        localStorage.setItem('location_denied', 'true');
        setLoading(false);
        onLocationGranted(null);
      },
      { timeout: 10000 }
    );
  }

  function handleDismiss() {
    localStorage.setItem('location_denied', 'true');
    onLocationGranted(null);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
      <span className="text-xl flex-shrink-0">📍</span>
      <p className="text-xs text-amber-800 leading-snug flex-1">
        See prayers from people near you — <span className="font-semibold">Enable Location</span>
      </p>
      <WaterButton variant="primary" onClick={handleEnable} disabled={loading} className="flex-shrink-0 text-xs font-bold px-3 py-1.5" style={{ borderRadius: 12 }}>
        {loading ? '...' : 'Enable'}
      </WaterButton>
      <button onClick={handleDismiss} className="flex-shrink-0 text-amber-400 hover:text-amber-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

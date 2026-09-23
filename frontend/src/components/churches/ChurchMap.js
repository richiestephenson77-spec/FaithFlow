import { useEffect, useRef, useState } from 'react';
import { HAIRLINE, MUTED, INK } from './ChurchUI';

// A real Google map, loaded lazily.
//
// TWO KEYS, ON PURPOSE. This uses REACT_APP_GOOGLE_MAPS_KEY — a browser key,
// restricted to the Maps JavaScript API and to the app's HTTP referrers. It is
// NOT the server's GOOGLE_PLACES_KEY, which stays on the backend and is never
// shipped to a client. If the browser key is not configured the map degrades to
// an honest notice and a link out to Google Maps; it never falls back to the
// server key.
//
// Loaded only when the map is actually opened, because a Dynamic Map load is a
// billed SKU — browsing the list costs nothing here.

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
let loaderPromise = null;

function loadMapsScript() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error('Maps failed to initialise')));
    s.onerror = () => reject(new Error('Maps failed to load'));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/**
 * @param {{lat:number,lng:number}} center
 * @param {Array<{placeId:string,name:string,lat:number,lng:number}>} markers
 * @param {(placeId:string)=>void} onMarkerClick
 */
export default function ChurchMap({ center, markers = [], onMarkerClick, height = 380 }) {
  const holder = useRef(null);
  const mapRef = useRef(null);
  const markerObjs = useRef([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!MAPS_KEY) return;
    let cancelled = false;
    loadMapsScript()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        mapRef.current = new maps.Map(holder.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          // Google's own controls and branding stay visible — the attribution
          // and terms links on the map are required and must not be hidden.
        });
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current) return;
    markerObjs.current.forEach(m => m.setMap(null));
    markerObjs.current = markers
      .filter(m => typeof m.lat === 'number' && typeof m.lng === 'number')
      .map((m) => {
        const marker = new maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: mapRef.current,
          title: m.name || undefined,
        });
        if (onMarkerClick) marker.addListener('click', () => onMarkerClick(m.placeId));
        return marker;
      });
    if (mapRef.current && center) mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
  }, [markers, center, onMarkerClick]);

  if (!MAPS_KEY || error) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ height, border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 20, background: '#FFFFFF' }}
      >
        <p style={{ fontSize: 13.5, color: INK }}>
          {MAPS_KEY ? 'The map could not be loaded.' : 'Map view is not available yet.'}
        </p>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45, maxWidth: 260 }}>
          {MAPS_KEY
            ? 'You can still browse the list, or open these churches in Google Maps.'
            : 'This build has no browser Maps key configured. The list works as normal.'}
        </p>
        <a
          href={`https://www.google.com/maps/search/churches/@${center.lat},${center.lng},13z`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#2C4055', marginTop: 14, textDecoration: 'underline' }}
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div
      ref={holder}
      role="application"
      aria-label="Map of nearby churches"
      style={{ height, borderRadius: 16, overflow: 'hidden', border: `1px solid ${HAIRLINE}` }}
    />
  );
}

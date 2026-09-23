// Presentation helpers for the church directory.

const API_BASE = process.env.REACT_APP_API_URL || 'https://faithflow-production.up.railway.app/api';

/**
 * URL for a Google photo, served through OUR backend.
 *
 * The client never sees a Google URL or our API key: the backend resolves the
 * reference and redirects to a short-lived image link. Photos are fetched only
 * when an <img> actually enters the viewport, because every fetch is billed.
 */
export function photoUrl(ref, width = 400) {
  if (!ref) return null;
  return `${API_BASE}/find-churches/photo?ref=${encodeURIComponent(ref)}&w=${width}`;
}

// Countries that read distances in miles. Everywhere else in this app's
// markets uses kilometres; India explicitly so.
const MILE_COUNTRIES = new Set(['US', 'GB', 'LR', 'MM']);

/** Straight-line distance between two points, in km. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * A distance label that is honest about what it is.
 *
 * This is straight-line ("as the crow flies"), NOT driving distance, and the
 * caller is expected to render the wording below rather than implying a route.
 * Units follow the country being browsed: km in India, miles in the US.
 */
export function formatDistance(km, countryCode) {
  if (km == null) return null;
  const useMiles = MILE_COUNTRIES.has((countryCode || '').toUpperCase());
  const value = useMiles ? km * 0.621371 : km;
  const unit = useMiles ? 'mi' : 'km';
  if (value < 1) return `${(value * 10).toFixed(0) / 10 || 0.1} ${unit}`;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

/**
 * Best-effort country for unit choice, from the browser's own locale. Used
 * only to pick km vs miles — never to infer anything about a church.
 */
export function viewerCountry() {
  try {
    const loc = new Intl.Locale(navigator.language || 'en-US');
    if (loc.region) return loc.region.toUpperCase();
  } catch {
    /* fall through */
  }
  const m = /[-_]([A-Za-z]{2})$/.exec(navigator.language || '');
  return m ? m[1].toUpperCase() : 'US';
}

/** The country whose results we are browsing, for search context. */
export const SEARCH_COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
];

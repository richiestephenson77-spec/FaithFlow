import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, List as ListIcon, Map as MapIcon, Plus } from 'lucide-react';
import api from '../utils/api';
import { hapticLight } from '../utils/haptics';
import ChurchMap from '../components/churches/ChurchMap';
import {
  ChurchHeader, LazyPhoto, GoogleAttribution, PrimaryButton, OutlineButton,
  CardSkeleton, INK, MUTED, HAIRLINE, ACCENT,
} from '../components/churches/ChurchUI';
import {
  haversineKm, formatDistance, viewerCountry, SEARCH_COUNTRIES,
} from '../utils/churchFormat';

const RADII = [2000, 5000, 10000, 20000, 50000];

// List state survives a trip into a church and back, so returning restores the
// same results, radius, tab and scroll position rather than re-searching.
const VIEW_STATE = { scrollTop: 0, view: 'list' };

export default function FindChurches({ embedded = false }) {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

  const [origin, setOrigin] = useState(null);          // { lat, lng, label, kind }
  const [country, setCountry] = useState(() => (viewerCountry() === 'IN' ? 'IN' : 'US'));
  const [churches, setChurches] = useState(null);
  const [radius, setRadius] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState(VIEW_STATE.view);

  // Manual location search
  const [query, setQuery] = useState('');
  const [choices, setChoices] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const search = useCallback(async (o, r) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/find-churches/nearby?lat=${o.lat}&lng=${o.lng}&radius=${r}`);
      setChurches(res.data.churches || []);
    } catch (err) {
      setChurches(null);
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not load churches right now');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * GPS is only ever used when the reader asks for it, and a stored origin is
   * only reused while it is fresh — a stale GPS fix silently standing in for
   * "near me" is exactly what must not happen.
   */
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setPermissionDenied(true); return; }
    hapticLight();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'your location', kind: 'gps' };
        setPermissionDenied(false);
        setOrigin(o);
        search(o, radius);
      },
      () => setPermissionDenied(true),
      { maximumAge: 5 * 60 * 1000, timeout: 10000 },
    );
  }, [radius, search]);

  /** Resolve a typed place on SUBMIT — never per keystroke. */
  async function resolvePlace(e) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setResolving(true);
    setError('');
    setChoices(null);
    try {
      const res = await api.get(`/find-churches/locations?q=${encodeURIComponent(q)}&country=${country}`);
      const results = res.data.results || [];
      if (results.length === 0) setError(`Nothing found for "${q}" in ${country === 'IN' ? 'India' : 'the United States'}`);
      else if (results.length === 1) pickPlace(results[0]);
      else setChoices(results);  // genuinely ambiguous — the reader chooses
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || 'Could not look that up');
    } finally {
      setResolving(false);
    }
  }

  function pickPlace(p) {
    const o = { lat: p.lat, lng: p.lng, label: p.label || p.name, kind: 'manual' };
    setChoices(null);
    setOrigin(o);
    search(o, radius);
  }

  function changeRadius(r) {
    setRadius(r);
    if (origin) search(origin, r);
  }

  useEffect(() => { VIEW_STATE.view = view; }, [view]);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (VIEW_STATE.scrollTop) el.scrollTop = VIEW_STATE.scrollTop;
    const onScroll = () => { VIEW_STATE.scrollTop = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const open = (c) => navigate(`/find-churches/${c.placeId}`);

  const withDistance = (churches || []).map(c => ({
    ...c,
    distanceKm: origin ? haversineKm(origin.lat, origin.lng, c.lat, c.lng) : null,
  }));

  return (
    <div ref={scrollerRef} className={embedded ? '' : 'min-h-full'} style={{ background: '#FFFFFF', color: INK }}>
      {!embedded && (
        <ChurchHeader
          title="Churches"
          subtitle="Find a place to worship"
          onBack={() => navigate('/explore')}
        />
      )}

      {/* Where to look ------------------------------------------------------ */}
      <div style={{ padding: '8px 16px 0' }}>
        <form onSubmit={resolvePlace} className="flex gap-2">
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 12, padding: '0 12px', height: 44 }}
          >
            <Search size={16} strokeWidth={2} color={MUTED} className="flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={country === 'IN' ? 'City or PIN code' : 'City or ZIP code'}
              aria-label="Search by city, PIN or ZIP code"
              className="flex-1 min-w-0 bg-transparent focus:outline-none"
              // 16px stops iOS Safari zooming the page on focus.
              style={{ fontSize: 16, color: INK }}
            />
          </div>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            aria-label="Country"
            style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 12, height: 44, fontSize: 14, padding: '0 8px', background: '#FFFFFF', color: INK }}
          >
            {SEARCH_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </form>

        <div className="flex items-center gap-3 mt-2.5">
          <button
            onClick={useMyLocation}
            className="flex items-center gap-1.5"
            style={{ minHeight: 44, fontSize: 13.5, color: ACCENT, background: 'none', border: 0 }}
          >
            <MapPin size={15} strokeWidth={1.9} /> Use my location
          </button>
          {resolving && <span style={{ fontSize: 12.5, color: MUTED }}>Looking that up…</span>}
        </div>

        {permissionDenied && (
          <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>
            Location is off, which is fine — search by city, PIN or ZIP code instead.
          </p>
        )}

        {/* Ambiguous place names are resolved by asking, never by guessing. */}
        {choices && (
          <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, marginTop: 10, overflow: 'hidden' }}>
            <p style={{ fontSize: 12, color: MUTED, padding: '10px 14px 6px' }}>
              More than one match — which did you mean?
            </p>
            {choices.map(p => (
              <button
                key={p.placeId}
                onClick={() => pickPlace(p)}
                className="w-full text-left"
                style={{ padding: '11px 14px', borderTop: `1px solid ${HAIRLINE}`, fontSize: 13.5, background: 'none', border: 0, minHeight: 44 }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results ------------------------------------------------------------ */}
      {!origin ? (
        <div className="text-center" style={{ padding: '56px 28px' }}>
          <p className="type-heading" style={{ fontSize: 19 }}>Where should we look?</p>
          <p className="type-subtitle" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
            Search a city, PIN or ZIP code — or use your location. You don't need
            to share your location to browse.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3" style={{ padding: '16px 16px 0' }}>
            <p style={{ fontSize: 12, color: MUTED, minWidth: 0 }} className="truncate">
              {origin.kind === 'manual' ? `from ${origin.label}` : 'from your location'}
            </p>
            <div className="flex gap-1 flex-shrink-0" role="group" aria-label="View">
              {[
                { id: 'list', Icon: ListIcon, label: 'List' },
                { id: 'map', Icon: MapIcon, label: 'Map' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  aria-label={label}
                  className="flex items-center gap-1.5"
                  style={{
                    minHeight: 36, padding: '0 11px', borderRadius: 999, fontSize: 12.5,
                    border: `1px solid ${view === id ? ACCENT : HAIRLINE}`,
                    background: view === id ? ACCENT : '#FFFFFF',
                    color: view === id ? '#FFFFFF' : INK,
                  }}
                >
                  <Icon size={14} strokeWidth={1.9} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ padding: '12px 16px 4px' }}>
            {RADII.map(r => (
              <button
                key={r}
                onClick={() => changeRadius(r)}
                aria-pressed={radius === r}
                className="flex-shrink-0"
                style={{
                  minHeight: 36, padding: '0 14px', borderRadius: 999, fontSize: 12.5,
                  border: `1px solid ${radius === r ? ACCENT : HAIRLINE}`,
                  background: radius === r ? ACCENT : '#FFFFFF',
                  color: radius === r ? '#FFFFFF' : INK,
                }}
              >
                {formatDistance(r / 1000, country)}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ paddingTop: 8 }}>{[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}</div>
          ) : error ? (
            <div className="text-center" style={{ padding: '44px 28px' }}>
              <p className="type-heading" style={{ fontSize: 18 }}>Couldn't load churches</p>
              <p className="type-subtitle" style={{ fontSize: 13, marginTop: 6 }}>{error}</p>
              <div className="mt-5 flex justify-center">
                <OutlineButton onClick={() => search(origin, radius)}>Try again</OutlineButton>
              </div>
            </div>
          ) : view === 'map' ? (
            <div style={{ padding: '12px 16px 0' }}>
              <ChurchMap
                center={origin}
                markers={withDistance}
                onMarkerClick={(placeId) => navigate(`/find-churches/${placeId}`)}
              />
            </div>
          ) : withDistance.length === 0 ? (
            <div className="text-center" style={{ padding: '44px 28px' }}>
              <p className="type-heading" style={{ fontSize: 18 }}>No churches found nearby</p>
              <p className="type-subtitle" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                Try a wider radius, or search a different area. Listings in some
                places are sparse — that doesn't mean there's no church there.
              </p>
              {radius < 50000 && (
                <div className="mt-5 flex justify-center">
                  <PrimaryButton onClick={() => changeRadius(Math.min(radius * 2, 50000))}>
                    Search a wider area
                  </PrimaryButton>
                </div>
              )}
            </div>
          ) : (
            <div style={{ paddingTop: 6 }}>
              {withDistance.map(c => (
                <ChurchCard key={c.placeId} church={c} country={country} onOpen={() => open(c)} />
              ))}

              {/* Honest about what this list is. */}
              <p style={{ fontSize: 12, color: MUTED, padding: '14px 16px 0', lineHeight: 1.5 }}>
                These are nearby results, not a complete directory. Try a wider
                area or a different search to see more.
              </p>

              {/* Claim / add live BELOW useful results, not in a banner above them. */}
              <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <OutlineButton
                  disabled
                  style={{ flex: 1, minWidth: 180, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Plus size={15} strokeWidth={2} /> Add your church
                </OutlineButton>
              </div>
              <p style={{ fontSize: 11.5, color: MUTED, padding: '8px 16px 0', lineHeight: 1.45 }}>
                Adding and claiming a church is coming next — it isn't available yet.
              </p>
            </div>
          )}
        </>
      )}

      <GoogleAttribution />
    </div>
  );
}

/**
 * A list card. Deliberately minimal: name, distance, photo.
 *
 * NO "Open / Closed" — Google's opening hours describe the building, and
 * showing them here reads as "is there a service on", which they do not mean.
 * Denomination and languages are absent because Phase 1 has no sourced value
 * for either, and guessing from a name is exactly what must not happen.
 */
function ChurchCard({ church, country, onOpen }) {
  const distance = formatDistance(church.distanceKm, country);
  return (
    <button
      onClick={onOpen}
      className="w-full flex gap-3 text-left"
      style={{ padding: '12px 16px', borderBottom: `1px solid ${HAIRLINE}`, background: 'none', border: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: HAIRLINE }}
    >
      <LazyPhoto
        photoRef={church.photo?.ref}
        width={240}
        alt=""
        illustrationLabel={false}
        style={{ width: 88, height: 72, borderRadius: 12, flexShrink: 0, border: `1px solid ${HAIRLINE}` }}
      />
      <span className="flex-1 min-w-0 block">
        <span className="block" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>
          {church.name}
        </span>
        {distance && (
          <span className="block" style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
            {distance} away · approximate
          </span>
        )}
        {church.address && (
          <span className="block truncate" style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            {church.address}
          </span>
        )}
        {/* Service times are never inferred. Until a representative confirms
            them, this says so plainly. */}
        <span className="block" style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
          Service times not available
        </span>
      </span>
    </button>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation, Phone, Globe, Star, MapPin, ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import ChurchMap from '../components/churches/ChurchMap';
import {
  LazyPhoto, ChurchIllustration, GoogleAttribution, PhotoCredit, Section,
  NotAvailable, OutlineButton, CardSkeleton, INK, MUTED, HAIRLINE, ACCENT,
} from '../components/churches/ChurchUI';

export default function FindChurchDetail() {
  const { placeId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reviews are a separate, billed request — fetched only if opened.
  const [reviews, setReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  // The map is a billed load too, so it waits for a tap.
  const [mapOpen, setMapOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get(`/find-churches/details/${placeId}`);
      setData(res.data);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? 'This church is no longer listed.'
          : err.friendlyMessage || err.response?.data?.error || 'Could not load this church',
      );
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  async function openReviews() {
    setReviewsOpen(true);
    if (reviews || reviewsLoading) return;
    setReviewsLoading(true);
    try {
      const res = await api.get(`/find-churches/details/${placeId}/reviews`);
      setReviews(res.data);
    } catch {
      setReviews({ reviews: [], failed: true });
    } finally {
      setReviewsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <BackBar onBack={() => navigate(-1)} />
        <div style={{ height: 200, background: '#F5F5F5' }} />
        {[1, 2].map(i => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-full" style={{ background: '#FFFFFF' }}>
        <BackBar onBack={() => navigate(-1)} />
        <div className="text-center" style={{ padding: '56px 28px' }}>
          <p className="type-heading" style={{ fontSize: 19 }}>{error || 'Church not found'}</p>
          <div className="mt-5 flex justify-center">
            <OutlineButton onClick={() => navigate(-1)}>Go back</OutlineButton>
          </div>
        </div>
      </div>
    );
  }

  const g = data.google;
  const hasPhotos = g.photos?.length > 0;
  const mapsQuery = g.lat != null && g.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}&query_place_id=${encodeURIComponent(g.placeId)}`
    : g.googleMapsUri;

  return (
    <div className="min-h-full" style={{ background: '#FFFFFF', color: INK }}>
      {/* 1 — Photo gallery, or an unmistakable illustration -------------------- */}
      <div style={{ position: 'relative' }}>
        {hasPhotos ? (
          <div className="flex overflow-x-auto no-scrollbar snap-x" style={{ height: 220 }}>
            {g.photos.map((p, i) => (
              <LazyPhoto
                key={p.ref}
                photoRef={p.ref}
                width={800}
                alt={i === 0 ? g.name || '' : ''}
                className="snap-start flex-shrink-0"
                style={{ width: g.photos.length > 1 ? '86%' : '100%', height: 220 }}
              />
            ))}
          </div>
        ) : (
          <div style={{ height: 220 }}><ChurchIllustration /></div>
        )}
        <BackBar floating onBack={() => navigate(-1)} />
      </div>
      {hasPhotos && <PhotoCredit attributions={g.photos[0].attributions} />}

      {/* 2 — Identity and source status --------------------------------------- */}
      <div style={{ padding: '16px 16px 0' }}>
        <h1 className="type-heading" style={{ fontSize: 26, lineHeight: 1.2 }} lang={g.nameLanguage || undefined}>
          {g.name}
        </h1>
        {g.address && (
          <p className="type-subtitle" style={{ fontSize: 13.5, marginTop: 6 }}>{g.address}</p>
        )}
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.45 }}>
          Listing information from Google. This church hasn't been claimed by a
          representative yet, so details haven't been confirmed by the church.
        </p>
      </div>

      {/* 3 — Actions ----------------------------------------------------------- */}
      <div className="flex gap-2" style={{ padding: '16px 16px 0' }}>
        {mapsQuery && (
          <ActionButton href={mapsQuery} Icon={Navigation} label="Directions" />
        )}
        {g.phoneNational && (
          <ActionButton href={`tel:${g.phoneInternational || g.phoneNational}`} Icon={Phone} label="Call" />
        )}
        {g.website && (
          <ActionButton href={g.website} Icon={Globe} label="Website" external />
        )}
      </div>

      {/* 4 — Worship services -------------------------------------------------- */}
      <Section title="Worship services" source={data.sources.worshipServices.label}>
        <NotAvailable hint="Service times come from the church itself. Until someone from this church confirms them, we won't guess — and Google's opening hours are not service times.">
          Service times not available.
        </NotAvailable>
      </Section>

      {/* 5 — About: only shown when there is something sourced to show.
             Omitted entirely rather than rendered as a column of blanks. */}
      <Section title="About this church" source="Not available">
        <NotAvailable hint="Denomination, languages and leadership are only shown when a church representative provides them. Guessing them from a name would often be wrong.">
          No confirmed details yet.
        </NotAvailable>
      </Section>

      {/* 6 — Address and map ---------------------------------------------------- */}
      {g.lat != null && g.lng != null && (
        <Section title="Find it" source="From Google">
          <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 16 }}>
            <p className="flex items-start gap-2" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
              <MapPin size={15} strokeWidth={1.8} color={MUTED} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{g.address || 'Address not listed'}</span>
            </p>
            {!mapOpen ? (
              <button
                onClick={() => setMapOpen(true)}
                style={{ marginTop: 12, minHeight: 44, fontSize: 13.5, color: ACCENT, background: 'none', border: 0 }}
              >
                Show map
              </button>
            ) : (
              <div style={{ marginTop: 12 }}>
                <ChurchMap
                  center={{ lat: g.lat, lng: g.lng }}
                  markers={[{ placeId: g.placeId, name: g.name, lat: g.lat, lng: g.lng }]}
                  height={240}
                />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 7 — Building hours. Its OWN section, explicitly labelled as the
             premises' opening hours from Google, never as worship times. */}
      {g.openingHours?.weekdayDescriptions?.length > 0 && (
        <Section title="Building / office hours" source="Google listing">
          <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.45 }}>
              When the building is open according to Google. These are not
              worship service times.
            </p>
            {g.openingHours.weekdayDescriptions.map((line, i) => (
              <p key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>{line}</p>
            ))}
          </div>
        </Section>
      )}

      {/* 8 — Ratings and reviews, both secondary and both opt-in ---------------- */}
      {(g.rating != null || g.userRatingCount) && (
        <Section title="On Google" source="From Google">
          <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 16 }}>
            <p className="flex items-center gap-2" style={{ fontSize: 13.5 }}>
              <Star size={15} strokeWidth={1.8} color={MUTED} />
              <span>
                {g.rating != null ? `${g.rating} average` : 'No rating'}
                {g.userRatingCount ? ` · ${g.userRatingCount} ratings` : ''}
              </span>
            </p>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
              A Google rating reflects visitor reviews. It is not a measure of a
              church or its teaching.
            </p>

            {!reviewsOpen ? (
              <button
                onClick={openReviews}
                style={{ marginTop: 12, minHeight: 44, fontSize: 13.5, color: ACCENT, background: 'none', border: 0 }}
              >
                Show Google reviews
              </button>
            ) : reviewsLoading ? (
              <p style={{ fontSize: 13, color: MUTED, marginTop: 12 }}>Loading reviews…</p>
            ) : !reviews?.reviews?.length ? (
              <p style={{ fontSize: 13, color: MUTED, marginTop: 12 }}>
                {reviews?.failed ? 'Reviews could not be loaded.' : 'No reviews available.'}
              </p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {reviews.reviews.map((r) => (
                  <div key={r.name} style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 12, marginTop: 12 }}>
                    <p style={{ fontSize: 12.5, color: MUTED }}>
                      {r.rating}★ ·{' '}
                      {/* Author attribution and link are required. */}
                      {r.author?.uri ? (
                        <a href={r.author.uri} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: 'underline' }}>
                          {r.author.displayName || 'Google user'}
                        </a>
                      ) : (r.author?.displayName || 'Google user')}
                      {r.relativeTime ? ` · ${r.relativeTime}` : ''}
                    </p>
                    {r.text && (
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginTop: 5 }} lang={r.languageCode || undefined}>
                        {r.text}
                      </p>
                    )}
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: MUTED, marginTop: 12, lineHeight: 1.45 }}>
                  {reviews.note || 'A selection of Google reviews, not all of them.'}
                  {g.googleMapsUri && (
                    <>
                      {' '}
                      <a href={g.googleMapsUri} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline' }}>
                        See on Google Maps
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 9 — Correction / claim. Present but honestly disabled until Phase 2. */}
      <Section title="Is something wrong?">
        <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.45 }}>
            Corrections and claiming aren't open yet.
          </p>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
            Soon, someone from this church will be able to claim it and confirm
            its service times, languages and leadership. Until then this page
            shows only what Google lists.
          </p>
          <div className="flex gap-2 flex-wrap" style={{ marginTop: 14 }}>
            <OutlineButton disabled>Suggest a correction</OutlineButton>
            <OutlineButton disabled>Claim this church</OutlineButton>
          </div>
        </div>
      </Section>

      <div style={{ height: 8 }} />
      <GoogleAttribution />
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  );
}

function BackBar({ onBack, floating }) {
  if (floating) {
    return (
      <button
        onClick={onBack}
        aria-label="Back"
        className="grid place-items-center"
        style={{
          position: 'absolute', left: 12,
          top: 'calc(12px + env(safe-area-inset-top))',
          width: 40, height: 40, borderRadius: 999,
          background: 'rgba(255,255,255,0.92)', border: `1px solid ${HAIRLINE}`,
        }}
      >
        <ChevronLeft size={22} strokeWidth={1.9} color={INK} />
      </button>
    );
  }
  return (
    <div style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))', paddingLeft: 8 }}>
      <button onClick={onBack} aria-label="Back" style={{ minHeight: 44, padding: 10, background: 'none', border: 0 }}>
        <ChevronLeft size={24} strokeWidth={1.9} color={INK} />
      </button>
    </div>
  );
}

function ActionButton({ href, Icon, label, external }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex-1 flex flex-col items-center justify-center gap-1"
      style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 12, padding: '11px 6px', minHeight: 60, color: INK, textDecoration: 'none' }}
    >
      <Icon size={17} strokeWidth={1.8} color={ACCENT} />
      <span style={{ fontSize: 12 }}>{label}</span>
    </a>
  );
}

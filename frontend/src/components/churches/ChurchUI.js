import { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { photoUrl } from '../../utils/churchFormat';

// Shared chrome for the church directory. Same flat surfaces as the rest of
// the app: white, 1px #EFEFEF hairlines, 16px corners, #2C4055 actions,
// #0A0A0A headings, Fraunces via .type-heading. No gradients, glass or shadow.

export const INK = '#0A0A0A';
export const MUTED = '#8E8E8E';
export const HAIRLINE = '#EFEFEF';
export const ACCENT = '#2C4055';

export function ChurchHeader({ title, subtitle, onBack, action }) {
  return (
    <div
      className="flex items-center gap-3 px-4"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))', paddingBottom: 8 }}
    >
      <button onClick={onBack} aria-label="Back" className="-ml-1 p-1 flex-shrink-0" style={{ minHeight: 44 }}>
        <ChevronLeft size={24} strokeWidth={1.9} color={INK} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="type-heading text-xl truncate">{title}</h1>
        {subtitle && <p className="type-subtitle text-xs mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * The generic church illustration.
 *
 * This is DECORATIVE and unmistakably a drawing — never a stock or generated
 * photo of a building presented as this church. It appears only when Google
 * genuinely returns no photo, and is always paired with "Photo not available"
 * so nobody mistakes it for the real place.
 *
 * Drawn in the same flat line language as the Explore tiles.
 */
export function ChurchIllustration({ height = '100%', label = true }) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-1.5"
      style={{ height, background: '#F5F5F5' }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 64 56"
        width="44"
        height="38"
        fill="none"
        stroke="#A9B2BC"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 3v8M28 6.5h8" />
        <path fill="#FFFFFF" d="M14 51V24l18-11 18 11v27Z" />
        <path d="M14 51V24l18-11 18 11v27Z" />
        <path fill="#E9EDF1" stroke="none" d="M26 51V38q6-9 12 0v13Z" />
        <path d="M26 51V38q6-9 12 0v13" />
        <circle cx="32" cy="26" r="4" />
        <path d="M6 51h52" />
      </svg>
      {label && (
        <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: 0.2 }}>Photo not available</span>
      )}
    </div>
  );
}

/**
 * A Google photo that is only fetched once it is actually about to be seen.
 *
 * Every photo request is billed, so this holds off until an IntersectionObserver
 * says the image is near the viewport — a list the reader never scrolls to
 * costs nothing. Falls back to the illustration on a missing ref OR a failed
 * load, because a Google photo reference can expire at any time.
 */
export function LazyPhoto({ photoRef, width = 400, alt = '', className = '', style, illustrationLabel = true }) {
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const src = visible && photoRef && !failed ? photoUrl(photoRef, width) : null;

  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden', ...style }}>
      {!photoRef || failed ? (
        <ChurchIllustration label={illustrationLabel} />
      ) : src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        // Placeholder while out of view — no request has been made yet.
        <div className="w-full h-full" style={{ background: '#F5F5F5' }} />
      )}
    </div>
  );
}

/**
 * Required Google attribution. Present wherever Google content is shown,
 * including list-only views.
 */
export function GoogleAttribution({ children, className = '' }) {
  return (
    <p className={`text-center ${className}`} style={{ fontSize: 11, color: MUTED, padding: '14px 16px' }}>
      {children || 'Powered by Google'}
    </p>
  );
}

/** Contributor credit for a Google photo, which the terms require alongside it. */
export function PhotoCredit({ attributions }) {
  if (!attributions?.length) return null;
  const a = attributions[0];
  return (
    <p style={{ fontSize: 10.5, color: MUTED, padding: '6px 16px 0' }}>
      Photo by{' '}
      {a.uri ? (
        <a href={a.uri} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: 'underline' }}>
          {a.displayName || 'a Google contributor'}
        </a>
      ) : (
        a.displayName || 'a Google contributor'
      )}
    </p>
  );
}

export function Section({ title, source, children, style }) {
  return (
    <section style={{ padding: '20px 16px 0', ...style }}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 className="type-heading" style={{ fontSize: 17 }}>{title}</h2>
        {source && <span style={{ fontSize: 10.5, color: MUTED, flexShrink: 0 }}>{source}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * An honest empty state for a section we cannot fill yet.
 *
 * Used where the answer depends on a church representative (Phase 2) or on
 * their official website (Phase 3). It says what is missing and why, rather
 * than showing a blank row or, worse, something invented.
 */
export function NotAvailable({ children, hint }) {
  return (
    <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: 16 }}>
      <p style={{ fontSize: 13.5, color: INK }}>{children}</p>
      {hint && <p style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>{hint}</p>}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, full, type = 'button', style }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={full ? 'w-full' : ''}
      style={{
        minHeight: 44, borderRadius: 10, padding: '11px 16px', border: 0,
        background: ACCENT, color: '#FFFFFF', fontWeight: 500, fontSize: 14,
        opacity: disabled ? 0.5 : 1, ...style,
      }}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, onClick, disabled, full, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={full ? 'w-full' : ''}
      style={{
        minHeight: 44, borderRadius: 10, padding: '11px 16px',
        background: '#FFFFFF', color: ACCENT, fontWeight: 500, fontSize: 14,
        border: `1px solid ${HAIRLINE}`, opacity: disabled ? 0.5 : 1, ...style,
      }}
    >
      {children}
    </button>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse" style={{ padding: '12px 16px', borderBottom: `1px solid ${HAIRLINE}` }}>
      <div style={{ width: 88, height: 72, borderRadius: 12, background: '#F0F0F0', flexShrink: 0 }} />
      <div className="flex-1 space-y-2 pt-1.5">
        <div style={{ height: 12, width: '65%', borderRadius: 99, background: '#F0F0F0' }} />
        <div style={{ height: 10, width: '45%', borderRadius: 99, background: '#F0F0F0' }} />
        <div style={{ height: 10, width: '55%', borderRadius: 99, background: '#F0F0F0' }} />
      </div>
    </div>
  );
}
